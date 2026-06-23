const {
    Account,
    BASE_FEE,
    Keypair,
    Networks,
    Operation,
    TransactionBuilder,
    nativeToScVal,
    rpc,
    scValToNative
} = require('@stellar/stellar-sdk');

function getNetworkPassphrase(network) {
    switch (network) {
        case 'testnet':
            return Networks.TESTNET;
        case 'mainnet':
            return Networks.PUBLIC;
        case 'standalone':
            return Networks.STANDALONE;
        case 'futurenet':
            return 'Test SDF Future Network ; October 2022';
        default:
            return network;
    }
}

function toBigInt(value) {
    return BigInt(value);
}

function toHex32(value) {
    return toBigInt(value).toString(16).padStart(64, '0');
}

function be32(value) {
    return Buffer.from(toHex32(value), 'hex');
}

function shouldAllowHttp(rpcUrl, allowHttp) {
    if (typeof allowHttp === 'boolean') {
        return allowHttp;
    }

    return rpcUrl.startsWith('http://');
}

// Accepts both the OAuth token's nested shape
// (`{ proof: { signatureValue: { proof, public } } }`) and the flat shape
// used by local fixture files (`{ proof, public }`).
function parseProofPayload(payload) {
    const json = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (json && json.proof && json.proof.signatureValue) {
        return {
            proof: json.proof.signatureValue.proof,
            pubSignals: json.proof.signatureValue.public
        };
    }

    const pubSignals = json.public || json.pub_signals || json.publicSignals;
    return { proof: json.proof, pubSignals };
}

function packGroth16ForSoroban(proof) {
    const a = Buffer.concat([
        be32(proof.pi_a[0]),
        be32(proof.pi_a[1])
    ]);

    const b = Buffer.concat([
        be32(proof.pi_b[0][1]),
        be32(proof.pi_b[0][0]),
        be32(proof.pi_b[1][1]),
        be32(proof.pi_b[1][0])
    ]);

    const c = Buffer.concat([
        be32(proof.pi_c[0]),
        be32(proof.pi_c[1])
    ]);

    return { a, b, c };
}

// `identity_gate::Proof` is a #[contracttype] struct with named fields
// (a, b, c, pub_signals). Soroban encodes such structs as a Map whose keys
// are Symbols sorted alphabetically, so the field names must be marked as
// `symbol` (not the SDK's default `string`) for the contract to decode them.
function buildProofScVal(proof, pubSignals) {
    const { a, b, c } = packGroth16ForSoroban(proof);

    return nativeToScVal(
        { a, b, c, pub_signals: pubSignals.map((value) => be32(value)) },
        { type: { a: ['symbol', 'bytes'], b: ['symbol', 'bytes'], c: ['symbol', 'bytes'], pub_signals: ['symbol', 'bytes'] } }
    );
}

async function submitAndAwait(server, tx, sourceKeypair) {
    const simulation = await server.simulateTransaction(tx);
    if ('error' in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
    }

    const simulatedReturnValue = simulation.result && simulation.result.retval
        ? scValToNative(simulation.result.retval)
        : undefined;

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(sourceKeypair);

    const sendResponse = await server.sendTransaction(prepared);
    if (!sendResponse.hash) {
        throw new Error('Transaction submission failed');
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const txResult = await server.getTransaction(sendResponse.hash);

        if (txResult.status === 'SUCCESS' || txResult.status === 'FAILED') {
            return {
                status: txResult.status,
                simulationResult: simulatedReturnValue,
                returnValue: 'returnValue' in txResult && txResult.returnValue
                    ? scValToNative(txResult.returnValue)
                    : undefined,
                txHash: txResult.txHash || sendResponse.hash,
                latestLedger: txResult.latestLedger
            };
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error(`Timed out waiting for transaction ${sendResponse.hash}`);
}

async function verifyProofOnChain(proofPayload, config) {
    const {
        rpcUrl,
        networkPassphrase,
        contractId,
        secretKey,
        allowHttp
    } = config;

    if (!rpcUrl || !networkPassphrase || !contractId || !secretKey) {
        throw new Error('Missing Soroban verifier configuration');
    }

    const { proof, pubSignals } = parseProofPayload(proofPayload);

    if (pubSignals.length === 0) {
        throw new Error('Proof payload does not contain any public signals');
    }

    const server = new rpc.Server(rpcUrl, { allowHttp: shouldAllowHttp(rpcUrl, allowHttp) });
    const sourceKeypair = Keypair.fromSecret(secretKey);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    const normalizedPassphrase = getNetworkPassphrase(networkPassphrase);
    const { a, b, c } = packGroth16ForSoroban(proof);

    const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: normalizedPassphrase
    })
        .addOperation(
            Operation.invokeContractFunction({
                contract: contractId,
                function: 'verify_proof',
                args: [
                    nativeToScVal(a, { type: 'bytes' }),
                    nativeToScVal(b, { type: 'bytes' }),
                    nativeToScVal(c, { type: 'bytes' }),
                    nativeToScVal(
                        pubSignals.map((value) => nativeToScVal(be32(value), { type: 'bytes' })),
                        { type: 'vec' }
                    )
                ]
            })
        )
        .setTimeout(30)
        .build();

    const result = await submitAndAwait(server, tx, sourceKeypair);
    if (result.status === 'FAILED') {
        throw new Error('Verifier transaction failed');
    }

    return result;
}

// Calls `identity_gate::verify_identity(wallet, firma_proof, ofac_proof)`,
// which checks the ZK Firma Digital credential proof and the OFAC
// non-sanctions proof together, binding both to the same underlying address.
//
// `wallet` should be the same Stellar address the user connected and sent as
// `user_id` for the firma-digital proof request, so the on-chain identity
// check is bound to that address.
async function verifyIdentityOnChain(wallet, firmaProofPayload, ofacProofPayload, config) {
    const {
        rpcUrl,
        networkPassphrase,
        contractId,
        secretKey,
        allowHttp
    } = config;

    if (!rpcUrl || !networkPassphrase || !contractId || !secretKey) {
        throw new Error('Missing identity gate verifier configuration');
    }
    if (!wallet) {
        throw new Error('Missing wallet address for identity verification');
    }

    const firma = parseProofPayload(firmaProofPayload);
    const ofac = parseProofPayload(ofacProofPayload);

    if (firma.pubSignals.length !== 5) {
        throw new Error('Firma Digital proof payload does not contain 5 public signals');
    }
    if (ofac.pubSignals.length !== 2) {
        throw new Error('OFAC proof payload does not contain 2 public signals');
    }

    const server = new rpc.Server(rpcUrl, { allowHttp: shouldAllowHttp(rpcUrl, allowHttp) });
    const sourceKeypair = Keypair.fromSecret(secretKey);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    const normalizedPassphrase = getNetworkPassphrase(networkPassphrase);

    const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: normalizedPassphrase
    })
        .addOperation(
            Operation.invokeContractFunction({
                contract: contractId,
                function: 'verify_identity',
                args: [
                    nativeToScVal(wallet, { type: 'address' }),
                    buildProofScVal(firma.proof, firma.pubSignals),
                    buildProofScVal(ofac.proof, ofac.pubSignals)
                ]
            })
        )
        .setTimeout(30)
        .build();

    const result = await submitAndAwait(server, tx, sourceKeypair);

    return {
        ...result,
        verified: result.status === 'SUCCESS'
    };
}

module.exports = {
    verifyProofOnChain,
    verifyIdentityOnChain
};
