"use strict";

/**
 * Generates an OFAC non-membership Groth16 proof for a single address, in
 * the same `{ proof, public }` JSON shape used elsewhere in this repo (see
 * example-proof.json) — fed straight to `identity_gate::verify_identity` by
 * src/services/ofacProver.js, which calls `proveOfacNonMembership` directly
 * (no subprocess -- this is just a regular module).
 *
 * `proveOfacNonMembership(addressBigInt)` takes the address as a plain
 * BigInt. Callers are responsible for decoding their own address format
 * (Stellar StrKey, EVM, ...) into that form first.
 *
 * IMPORTANT: this sources the blacklist from OFAC_ADDRESSES below, which is
 * randomly-generated placeholder data, NOT the real OFAC SDN crypto address
 * list -- there is no real sanctions feed wired into this repo yet. Replace
 * it before relying on this for anything beyond local testing.
 *
 * Also note: the resulting `ofacRoot` is only a valid public signal if it
 * matches whatever root `identity_gate` currently accepts (set via
 * `initialize` / `set_ofac_root`). Changing this address list produces a
 * different root.
 */

const path = require("path");
const snarkjs = require("snarkjs");
const { buildOFACTree, generateProofInputs } = require("./generate-inputs");

const WASM_PATH = path.join(__dirname, "..", "build", "ofac-blacklist_js", "ofac-blacklist.wasm");
const ZKEY_PATH = path.join(__dirname, "..", "build", "ofac-blacklist_final.zkey");

// Placeholder-only addresses for local testing -- NOT the real OFAC SDN
// crypto address list (no real sanctions feed is wired into this repo yet).
// 20 EVM-style addresses (as raw hex BigInts) plus 20 Stellar addresses
// (pre-decoded to decimal BigInts, since this prover takes plain BigInts
// and leaves StrKey decoding to the caller -- see src/services/ofacProver.js).
const OFAC_ADDRESSES = [
    // EVM-style addresses
    "0x3fab6412b683db374a5ed8854801cab36e459bc",
    "0x8bb2b7c04cdbd4f1c2e6c29fc462c5edb7eec49",
    "0xb261d681cc2e1802124fb2c1c2621b0b0ec678c",
    "0x0671e4181e899012668771f550823338216ad79",
    "0x2a94a4f43cc05ff00e12cf1fc99e6fea62fa569",
    "0x6467f160262deff3f9de6ffcc4957987ea2062a",
    "0x04627911cda103dd80523babe5bca509058c155",
    "0x06a865d44b4de77957bf1ef590487c8f13ab907",
    "0x8c269e17ca48c9e8cfc0efabc23d82a966c5482",
    "0x7e4836b5b28d37211a573cea180df4b8a224f0f",
    "0xb11944b762ba947a180f2636603bf33e23c238a",
    "0xd5bbf4759896185de2da0253dfd872c4ff5ab1d",
    "0xaef4b45d0d2358907b8ad653190e38ba8c78498",
    "0x58f53532185d630074d09efcff6e5902b0d41dc",
    "0xa134f812657be649fbf86223f90a5965419f0a2",
    "0x4c2e13e24c23bd88717fcdda6ad17c024011dfe",
    "0xc086db2743ee1019ff06ff648b35dce02adf417",
    "0xf302aa4774eb7ab80aa53bc66477b5336cca404",
    "0xa08a07618b88babf4d8c516d149758d2f6f5c94",
    "0x51b95dcf4485087a1d46b9b71104776403288ad",
    // Stellar addresses, pre-decoded to decimal BigInts
    "109262540032979694755850815846287257935850389897591898259577295492760882694797",
    "21390934606451619339116182341623433188117960619133755005099223383208843823170",
    "16860037058888973610236616684162510236329926231251413907132010563012500037568",
    "58578301459893337266285074854388470374594922670400584299713228904059415864978",
    "48349726935329351142115869353196504419056649856297030468191098762968013282047",
    "73937295471622153693436454845104997509419940829692713441390856857717480258509",
    "74210203871778911455708928271883989727593920919785776045439032626682441363717",
    "4136822614069634236894825220258857162239751593381758263367630296856093764927",
    "49384305073641217048689595549144438751120157258014216145618320987484223133534",
    "22940787215870026284079599529480003600447478900982127247207770053214765550832",
    "9798024765435711853586723577896323911768237443018811824581368617942483624649",
    "114492717117837453362703138468909368620787868242273540732327872017018188642404",
    "112783684386843760981727289473041563414207922502850357831053644699978837207210",
    "27183060486123762026210729989394731847370388863637839751503839177759351511003",
    "108923071337446893943465286053311919594562194676050762239228503119219726646191",
    "71723842068618649339696386024837088479859937172359591769006444455212499856499",
    "105224002758961409548905022041395144544362338109360156459469655489792959867731",
    "53376750480891504268631777309515383403837821278534947940891170114143625212600",
    "36891869831217867265075050274475697832193585732917129867998570518078053365415",
    "19038005524328694881606840454817170355340511599223119109944008015523475453046",
    // GCRSQOUDGD4MOBVF4DYLCFKEPIAHBGA2QHQ5PWJJNGEOSP4C2KWIHYBB
    "73798072039862015032514065234673672220773568384628207489517731018044842617987",
].map(BigInt);

async function proveOfacNonMembership(addressBigInt) {
    const { tree, poseidon } = await buildOFACTree(OFAC_ADDRESSES);
    const inputs = await generateProofInputs(tree, poseidon, addressBigInt);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);

    return { proof, public: publicSignals, ofacRoot: inputs.ofacRoot, addressHash: inputs.addressHash };
}

// Just the SMT root for OFAC_ADDRESSES, as a 64-char hex string (32 bytes,
// matching identity_gate's `ofac_root: BytesN<32>`) -- without generating a
// full proof. Used by scripts/deploy.sh to initialize identity_gate with a
// root that actually matches what this prover will produce proofs against.
async function getOfacRootHex() {
    const { tree, poseidon } = await buildOFACTree(OFAC_ADDRESSES);
    const rootBigInt = poseidon.F.toObject(tree.root);
    return rootBigInt.toString(16).padStart(64, "0");
}

module.exports = { proveOfacNonMembership, getOfacRootHex };
