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

    const proofJSON = JSON.parse(proofPayload);
    const pubSignals = proofJSON.proof.signatureValue.public;
    const proof = proofJSON.proof.signatureValue.proof;

    if (pubSignals.length < 5) {
        throw new Error('Proof payload does not contain 5 public signals');
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
                        pubSignals.slice(0, 5).map((value) => nativeToScVal(be32(value), { type: 'bytes' })),
                        { type: 'vec' }
                    )
                ]
            })
        )
        .setTimeout(30)
        .build();

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

        if (txResult.status === 'SUCCESS') {
            return {
                simulationResult: simulatedReturnValue,
                returnValue: 'returnValue' in txResult && txResult.returnValue
                    ? scValToNative(txResult.returnValue)
                    : undefined,
                txHash: txResult.txHash || sendResponse.hash,
                latestLedger: txResult.latestLedger
            };
        }

        if (txResult.status === 'FAILED') {
            throw new Error('Verifier transaction failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error(`Timed out waiting for transaction ${sendResponse.hash}`);
}

module.exports = {
    verifyProofOnChain
};
