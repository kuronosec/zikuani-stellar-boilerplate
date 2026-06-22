"use strict";

/**
 * Generates an OFAC non-membership Groth16 proof for a single address, in
 * the same `{ proof, public }` JSON shape used elsewhere in this repo (see
 * example-proof.json) — fed straight to `identity_gate::verify_identity` by
 * src/services/ofacProver.js.
 *
 * Usage:
 *   node helpers/prove-ofac.js <addressBigInt> [outputFile]
 *
 *   <addressBigInt> The address as a decimal or "0x..." hex BigInt literal.
 *                   Callers (e.g. src/services/ofacProver.js) are
 *                   responsible for decoding their own address format
 *                   (Stellar StrKey, EVM, ...) into this form first.
 *   [outputFile]    Where to write the proof JSON. Defaults to stdout.
 *
 * Generation only -- this does not locally verify the proof it produces.
 * Verification is the on-chain verifier contract's job (identity_gate /
 * ofac_verifier), not the prover's.
 *
 * IMPORTANT: this sources the blacklist from OFAC_ADDRESSES below, which is
 * randomly-generated placeholder data, NOT the real OFAC SDN crypto address
 * list -- there is no real sanctions feed wired into this repo yet. Replace
 * it before relying on this for anything beyond local testing.
 *
 * Also note: the resulting `ofacRoot` (logged to stderr) is only a valid
 * public signal if it matches whatever root `identity_gate` currently
 * accepts (set via `initialize` / `set_ofac_root`). Changing this address
 * list produces a different root.
 */

const fs = require("fs");
const snarkjs = require("snarkjs");
const { buildOFACTree, generateProofInputs } = require("./generate-inputs");

// Placeholder-only addresses for local testing. Replace with the real OFAC
// SDN crypto address list before using this for anything beyond that.
const OFAC_ADDRESSES = [
    "0x3fab6412b683db374a5ed8854801cab36e459bc",
    "0x8bb2b7c04cdbd4f1c2e6c29fc462c5edb7eec49",
    "0xb261d681cc2e1802124fb2c1c2621b0b0ec678c",
].map(BigInt);

async function proveOfacNonMembership(addressBigInt) {
    const { tree, poseidon } = await buildOFACTree(OFAC_ADDRESSES);
    const inputs = await generateProofInputs(tree, poseidon, addressBigInt);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        "build/ofac-blacklist_js/ofac-blacklist.wasm",
        "build/ofac-blacklist_final.zkey"
    );

    return { proof, public: publicSignals, ofacRoot: inputs.ofacRoot, addressHash: inputs.addressHash };
}

async function main() {
    const [addressArg, outputFile] = process.argv.slice(2);
    if (!addressArg) {
        console.error("Usage: node helpers/prove-ofac.js <addressBigInt> [outputFile]");
        process.exit(1);
    }

    const addressBigInt = BigInt(addressArg);
    const { proof, public: publicSignals, ofacRoot, addressHash } = await proveOfacNonMembership(addressBigInt);

    console.error("ofacRoot:   ", ofacRoot.toString());
    console.error("addressHash:", addressHash.toString());

    const output = JSON.stringify({ public: publicSignals, proof }, null, 2);
    if (outputFile) {
        fs.writeFileSync(outputFile, output);
        console.error(`Proof written to ${outputFile}`);
    } else {
        process.stdout.write(output + "\n");
    }
}

module.exports = { proveOfacNonMembership };

if (require.main === module) {
    // snarkjs/ffjavascript's field-arithmetic WASM bindings leave worker
    // threads running that never let the event loop drain on their own, so
    // exit explicitly once the actual work (proof generation + output) is done.
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
