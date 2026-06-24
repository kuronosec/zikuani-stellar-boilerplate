const axios = require('axios');
const querystring = require('querystring');

const {
    AUTH_SERVER_URL,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SOROBAN_RPC_URL,
    SOROBAN_NETWORK_PASSPHRASE,
    IDENTITY_GATE_CONTRACT_ID,
    SOROBAN_SECRET_KEY,
    SOROBAN_ALLOW_HTTP
} = require('./config');
const { renderHomePage } = require('./renderers/homePage');
const { renderPassportPage } = require('./renderers/passportPage');
const { renderCallbackErrorPage, renderCallbackSuccessPage } = require('./renderers/callbackPage');
const { escapeHtml } = require('./renderers/common');
const { translations } = require('./translations');
const { createState, getLang, getLanguageFromState, getWalletFromState } = require('./utils/language');
const { parseJwt } = require('./utils/token');
const { verifyIdentityOnChain } = require('./services/sorobanVerifier');
const { generateOfacProof, computeWalletSignalHash } = require('./services/ofacProver');

// Prefer the wallet address straight from the token response (same
// request/response cycle as the proof, so nothing can drop it in transit)
// over the one we tucked into the OAuth `state` round trip. `state` is only
// a fallback now, since some auth-server flows (e.g. ones that hop through
// an external signing step) may not echo our exact `state` value all the
// way back to `/callback`.
function getWalletFromTokenResponse(tokenResponse) {
    if (tokenResponse.user_id) {
        return tokenResponse.user_id;
    }

    const claims = tokenResponse.access_token ? parseJwt(tokenResponse.access_token) : null;
    return (claims && (claims.user_id || claims.sub || claims.wallet || claims.address)) || null;
}

function maybeParseJson(value) {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
}

function handleHome(req, res) {
    const lang = getLang(req);
    const texts = translations[lang];
    res.send(renderHomePage(lang, texts));
}

function buildFirmaDigitalUrl({ user, state, signal }) {
    return (
        `${AUTH_SERVER_URL}/authorize?` +
        querystring.stringify({
            grant_type: 'code',
            client_id: CLIENT_ID,
            user_id: user,
            redirect_uri: REDIRECT_URI,
            scope: 'zk-firma-digital',
            state,
            nullifier_seed: String(Math.floor(Math.random() * 10000)),
            // Tells the issuer to commit to our precomputed Poseidon(addressLo,
            // addressHi) as this proof's signalHash, so it matches the OFAC
            // proof's addressHash for the same wallet (see identity_gate's
            // signalHash == addressHash check). The Firma circuit's signalHash
            // is an unconstrained free input -- it isn't hashed anywhere on
            // generation, so whatever raw value we send here is what ends up
            // embedded verbatim as the proof's public signalHash.
            //
            // ASSUMPTION: `signal` as the param name follows the EVM reference
            // flow's convention (zikuani/contracts/scripts/createVC.ts); this
            // hasn't been confirmed against the live app.sakundi.io API.
            signal
        })
    );
}

function buildPassportQuery({ user, country, state }) {
    return {
        grant_type: 'code',
        client_id: CLIENT_ID,
        user_id: user,
        redirect_uri: REDIRECT_URI,
        scope: 'zk-passport',
        state,
        nullifier_seed: String(Math.floor(Math.random() * 10000)),
        data: encodeURIComponent(
            JSON.stringify({
                id: user,
                type: 'user',
                attributes: {
                    age_lower_bound: 18,
                    uniqueness: true,
                    nationality: country,
                    nationality_check: true,
                    event_id: Math.floor(Math.random() * 100000)
                }
            })
        )
    };
}

async function handlePassportLogin(req, res, { lang, texts, user, country, state }) {
    const queryParams = buildPassportQuery({ user, country, state });
    const authUrl = `${AUTH_SERVER_URL}/authorize?${querystring.stringify(queryParams)}`;

    try {
        const response = await axios.get(authUrl, { headers: { Accept: 'application/json' } });

        if (response.data && response.data.link) {
            const verificationLink = response.data.link;
            const encodedUserId = encodeURIComponent(user || '');
            const checkUrl = `${AUTH_SERVER_URL}/check-validated?user_id=${encodedUserId}&scope=zk-passport`;
            const confirmUrl = `${AUTH_SERVER_URL}/confirm-authorize?${querystring.stringify(queryParams)}`;
            res.send(
                renderPassportPage(lang, texts, {
                    verificationLink,
                    confirmUrl,
                    checkUrl
                })
            );
            return;
        }

        if (response.data && response.data.status === 'created') {
            const confirmUrl = `${AUTH_SERVER_URL}/confirm-authorize?${querystring.stringify(queryParams)}`;
            res.redirect(confirmUrl);
            return;
        }

        res.status(500).json({ error: texts.errors.authFetchFailed });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: texts.errors.authFetchFailed });
    }
}

async function handleLogin(req, res) {
    const lang = getLang(req);
    const texts = translations[lang];
    const { method, user, country } = req.query;
    const state = createState(lang, user);

    if (method === 'firma-digital') {
        try {
            const signal = (await computeWalletSignalHash(user)).toString();
            const authUrl = buildFirmaDigitalUrl({ user, state, signal });
            res.redirect(authUrl);
        } catch (error) {
            console.error('Failed to compute wallet signal hash:', error);
            res.status(400).send(texts.errors.invalidMethod);
        }
        return;
    }

    if (method === 'passport') {
        handlePassportLogin(req, res, { lang, texts, user, country, state });
        return;
    }

    res.status(400).send(texts.errors.invalidMethod);
}

async function handleCallback(req, res) {
    const langFromState = getLanguageFromState(req.query.state);
    const fallbackLang = getLang(req);
    const lang = translations[langFromState] ? langFromState : fallbackLang;
    const texts = translations[lang] || translations.es;
    const { code, scope } = req.query;

    if (!code) {
        res.status(400).send(texts.errors.missingCode);
        return;
    }

    try {
        const response = await axios.post(
            `${AUTH_SERVER_URL}/token`,
            querystring.stringify({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                scope,
                grant_type: 'authorization_code'
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const tokenResponse = maybeParseJson(response.data) || {};
        const { access_token, expires_in, proof } = tokenResponse;
        let verifierResult = null;
        const verifierAttempted = scope === 'zk-firma-digital';
        const proofPayload = maybeParseJson(proof);
        const wallet = getWalletFromTokenResponse(tokenResponse) || getWalletFromState(req.query.state);

        if (verifierAttempted) {
            try {
                if (!wallet) {
                    throw new Error('No wallet address found in state');
                }

                const ofacProofPayload = await generateOfacProof(wallet);

                verifierResult = await verifyIdentityOnChain(wallet, proofPayload, ofacProofPayload, {
                    rpcUrl: SOROBAN_RPC_URL,
                    networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
                    contractId: IDENTITY_GATE_CONTRACT_ID,
                    secretKey: SOROBAN_SECRET_KEY,
                    allowHttp: SOROBAN_ALLOW_HTTP
                });
            } catch (verificationError) {
                console.error('Soroban verifier error:', verificationError);
            }
        }

        res.send(
            renderCallbackSuccessPage(lang, texts, {
                verifierResult,
                verifierAttempted
            })
        );
    } catch (error) {
        console.error('Error exchanging authorization code:', error);
        res.send(renderCallbackErrorPage(lang, texts));
    }
}

function registerRoutes(app) {
    app.get('/', handleHome);
    app.get('/login', handleLogin);
    app.get('/callback', handleCallback);
}

module.exports = {
    registerRoutes
};
