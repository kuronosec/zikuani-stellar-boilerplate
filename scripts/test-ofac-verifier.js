#!/usr/bin/env node
//
// Submits a real, freshly-generated OFAC non-membership proof to the
// deployed ofac_verifier contract's verify_proof, to confirm it was deployed
// correctly and verifies real proofs on-chain (not just the prover/circuit
// in isolation).
//
// Usage:
//   node scripts/test-ofac-verifier.js [network]
//
// Reads the ofac_verifier contract id from deployments/<network>.json
// (written by scripts/deploy.sh). Needs SOROBAN_RPC_URL,
// SOROBAN_NETWORK_PASSPHRASE and SOROBAN_SECRET_KEY (a funded account) set
// in the environment, e.g.:
//   set -a; source .env.testnet; set +a; node scripts/test-ofac-verifier.js

const fs = require('fs');
const path = require('path');
const { Keypair } = require('@stellar/stellar-sdk');

const { SOROBAN_RPC_URL, SOROBAN_NETWORK_PASSPHRASE, SOROBAN_SECRET_KEY, SOROBAN_ALLOW_HTTP } = require('../src/config');
const { verifyProofOnChain } = require('../src/services/sorobanVerifier');
const { generateOfacProof } = require('../src/services/ofacProver');

async function main() {
    const network = process.argv[2] || 'testnet';
    const deploymentsFile = path.join(__dirname, '..', 'deployments', `${network}.json`);

    if (!fs.existsSync(deploymentsFile)) {
        throw new Error(`No deployments file at ${deploymentsFile} -- run scripts/deploy.sh first`);
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8'));
    const contractId = deployments.ofac_verifier && deployments.ofac_verifier.contract_id;
    if (!contractId) {
        throw new Error(`No ofac_verifier contract id recorded in ${deploymentsFile}`);
    }

    if (!SOROBAN_SECRET_KEY) {
        throw new Error('SOROBAN_SECRET_KEY is not set (export it or source an .env file first)');
    }

    // A freshly random address is not in the prover's placeholder blacklist,
    // so this should always produce a valid, on-chain-accepted proof.
    const testAddress = Keypair.random().publicKey();
    console.log(`Generating OFAC proof for test address ${testAddress}...`);
    const proof = await generateOfacProof(testAddress);
    console.log('Proof generated, submitting to ofac_verifier:', contractId);

    const result = await verifyProofOnChain(proof, {
        rpcUrl: SOROBAN_RPC_URL,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
        contractId,
        secretKey: SOROBAN_SECRET_KEY,
        allowHttp: SOROBAN_ALLOW_HTTP
    });

    console.log('Transaction hash:', result.txHash);
    console.log('On-chain result:', result.returnValue);
    if (result.returnValue !== true) {
        throw new Error('ofac_verifier rejected a proof for a clean address -- something is misconfigured');
    }
    console.log('ofac_verifier is deployed correctly and accepts real proofs.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
