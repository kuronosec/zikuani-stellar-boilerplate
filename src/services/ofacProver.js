const { execFile } = require('child_process');
const { StrKey } = require('@stellar/stellar-sdk');

// `prover/helpers/prove-ofac.js` takes a plain BigInt address (decimal or
// "0x..." hex) and doesn't know about any particular network's address
// format -- so the Stellar StrKey decoding happens here, once, instead of
// duplicating a second address codec inside the prover.
function stellarAddressToBigInt(walletAddress) {
    const rawKey = StrKey.decodeEd25519PublicKey(walletAddress);
    return BigInt(`0x${Buffer.from(rawKey).toString('hex')}`);
}

// Generates a live OFAC non-membership proof for `walletAddress` by shelling
// out to the vendored prover (prover/helpers/prove-ofac.js), which builds
// the SMT, runs the witness/Groth16 proving, and prints the resulting
// `{ public, proof }` JSON to stdout. Verification of the proof happens
// on-chain (identity_gate/ofac_verifier), not here.
function generateOfacProof(walletAddress, proverDir) {
    let addressBigInt;
    try {
        addressBigInt = stellarAddressToBigInt(walletAddress);
    } catch (error) {
        return Promise.reject(new Error(`Invalid Stellar wallet address for OFAC proof generation: ${error.message}`));
    }
    if (!proverDir) {
        return Promise.reject(new Error('OFAC_PROVER_DIR is not configured'));
    }

    return new Promise((resolve, reject) => {
        execFile(
            'node',
            ['helpers/prove-ofac.js', addressBigInt.toString()],
            { cwd: proverDir, maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`OFAC proof generation failed: ${stderr || error.message}`));
                    return;
                }

                try {
                    resolve(JSON.parse(stdout));
                } catch (parseError) {
                    reject(new Error(`OFAC prover returned invalid JSON: ${parseError.message}`));
                }
            }
        );
    });
}

module.exports = { generateOfacProof };
