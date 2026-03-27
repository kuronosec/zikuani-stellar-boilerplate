const axios = require('axios');
const querystring = require('querystring');

const {
    AUTH_SERVER_URL,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SOROBAN_RPC_URL,
    SOROBAN_NETWORK_PASSPHRASE,
    SOROBAN_CONTRACT_ID,
    SOROBAN_SECRET_KEY,
    SOROBAN_ALLOW_HTTP
} = require('./config');
const { renderHomePage } = require('./renderers/homePage');
const { renderPassportPage } = require('./renderers/passportPage');
const { renderCallbackErrorPage, renderCallbackSuccessPage } = require('./renderers/callbackPage');
const { escapeHtml } = require('./renderers/common');
const { translations } = require('./translations');
const { createState, getLang, getLanguageFromState } = require('./utils/language');
const { parseJwt } = require('./utils/token');
const { verifyProofOnChain } = require('./services/sorobanVerifier');

function handleHome(req, res) {
    const lang = getLang(req);
    const texts = translations[lang];
    res.send(renderHomePage(lang, texts));
}

function buildFirmaDigitalUrl({ user, state }) {
    return (
        `${AUTH_SERVER_URL}/authorize?` +
        querystring.stringify({
            grant_type: 'code',
            client_id: CLIENT_ID,
            user_id: user,
            redirect_uri: REDIRECT_URI,
            scope: 'zk-firma-digital',
            state,
            nullifier_seed: String(Math.floor(Math.random() * 10000))
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

function handleLogin(req, res) {
    const lang = getLang(req);
    const texts = translations[lang];
    const { method, user, country } = req.query;
    const state = createState(lang);

    if (method === 'firma-digital') {
        const authUrl = buildFirmaDigitalUrl({ user, state });
        res.redirect(authUrl);
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

        const { access_token, expires_in, proof } = response.data;
  
        let verifierResult = null;
        const proofPayload = JSON.parse(proof);

        if (scope === 'zk-firma-digital') {
            try {
                verifierResult = await verifyProofOnChain(proofPayload, {
                    rpcUrl: SOROBAN_RPC_URL,
                    networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
                    contractId: SOROBAN_CONTRACT_ID,
                    secretKey: SOROBAN_SECRET_KEY,
                    allowHttp: SOROBAN_ALLOW_HTTP
                });
            } catch (verificationError) {
                console.error('Soroban verifier error:', verificationError);
            }
        }

        const decodedToken = parseJwt(access_token);
        const tokenReadable = decodedToken ? JSON.stringify(decodedToken, null, 2) : access_token ? String(access_token) : '';
        const proofReadable = proofPayload ? JSON.stringify(proofPayload, null, 2) : texts.callback.noProof;
        const tokenPayload = escapeHtml(tokenReadable);
        const escapedProofPayload = escapeHtml(proofReadable);

        res.send(
            renderCallbackSuccessPage(lang, texts, {
                expiresIn: expires_in,
                tokenPayload,
                tokenRaw: tokenReadable,
                proofPayload: escapedProofPayload,
                proofRaw: proofReadable,
                verifierResult
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
