const { StrKey } = require('@stellar/stellar-sdk');
const { proveOfacNonMembership } = require('../../prover/helpers/prove-ofac');
const { computeAddressHash } = require('../../prover/helpers/generate-inputs');

// `prover/helpers/prove-ofac.js` takes a plain BigInt address (decimal or
// "0x..." hex) and doesn't know about any particular network's address
// format -- so the Stellar StrKey decoding happens here, once, instead of
// duplicating a second address codec inside the prover.
function stellarAddressToBigInt(walletAddress) {
    const rawKey = StrKey.decodeEd25519PublicKey(walletAddress);
    return BigInt(`0x${Buffer.from(rawKey).toString('hex')}`);
}

// Generates a live OFAC non-membership proof for `walletAddress` by calling
// the vendored prover (prover/helpers/prove-ofac.js) directly in-process,
// which builds the SMT and runs the witness/Groth16 proving. Verification of
// the proof happens on-chain (identity_gate/ofac_verifier), not here.
async function generateOfacProof(walletAddress) {
    const addressBigInt = parseWalletAddress(walletAddress);
    return proveOfacNonMembership(addressBigInt);
}

// `Poseidon(addressLo, addressHi)` for `walletAddress` -- the same hash the
// OFAC proof embeds as `addressHash`. identity_gate requires the Firma
// Digital proof's `signalHash` to equal this exact value, so the Firma proof
// request must be told to commit to it as its `signal` (see buildFirmaDigitalUrl
// in routes.js) -- the Firma circuit's `signalHash` is an unconstrained free
// input, not computed from a hash inside that circuit.
async function computeWalletSignalHash(walletAddress) {
    const addressBigInt = parseWalletAddress(walletAddress);
    return computeAddressHash(addressBigInt);
}

function parseWalletAddress(walletAddress) {
    try {
        return stellarAddressToBigInt(walletAddress);
    } catch (error) {
        throw new Error(`Invalid Stellar wallet address: ${error.message}`);
    }
}

module.exports = { generateOfacProof, computeWalletSignalHash };
