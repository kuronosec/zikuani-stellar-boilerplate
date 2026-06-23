# Zikuani Stellar Testnet Verifier

This project is a small Express web app that authenticates users with Zikuani and, for the `zk-firma-digital` flow, verifies the returned ZK Firma Digital proof together with an OFAC non-sanctions proof on the `identity_gate` Soroban smart contract deployed to Stellar Testnet.

The repository contains:

- A web client in [`src/`](zikuani-stellar/src)
- A Soroban verifier contract in [`contracts/zk_verifier/`](zikuani-stellar/contracts/zk_verifier)
- A helper script to invoke the Soroban verifier directly in [`contracts/invokeSorobanVerifier.ts`](zikuani-stellar/contracts/invokeSorobanVerifier.ts)

## How It Works

The application has two authentication paths:

- `zk-passport`: standard Zikuani passport flow
- `zk-firma-digital`: returns a proof payload that is verified on-chain on Stellar, together with an OFAC proof

High-level flow for `zk-firma-digital`:

1. The user connects a wallet via [`src/wallet/wallet-connect.js`](zikuani-stellar/src/wallet/wallet-connect.js); its address fills the hidden `user` field and starts the login flow.
2. `/login` sends that address as `user_id` to Zikuani and also encodes it into the OAuth `state` (see [`src/utils/language.js`](zikuani-stellar/src/utils/language.js)), since `state` is the only value the OAuth round trip guarantees to echo back unchanged.
3. Zikuani redirects back to `/callback` with an authorization code and that same `state`.
4. The app exchanges the code for a token and a ZK Firma Digital proof, and decodes the wallet address back out of `state`, in [`src/routes.js`](zikuani-stellar/src/routes.js).
5. The app generates a live OFAC non-membership proof for that same wallet address via [`generateOfacProof`](zikuani-stellar/src/services/ofacProver.js), which calls the vendored prover in [`prover/`](zikuani-stellar/prover) directly in-process.
6. The wallet address and both proofs are passed to [`verifyIdentityOnChain`](zikuani-stellar/src/services/sorobanVerifier.js), which invokes `identity_gate::verify_identity(wallet, firma_proof, ofac_proof)` — binding the same connected wallet address that was used as the firma-digital `user_id` to both proof checks.
7. The callback page shows whether the identity was verified on Stellar Testnet and displays the transaction hash.

Note: `verify_identity` does not call `wallet.require_auth()` — `wallet` is just the on-chain record key for the OFAC/Firma Digital check, not a value the caller has to authorize as. The transaction is signed by `SOROBAN_SECRET_KEY` regardless of which wallet address was checked.

## Project Structure

### Web app

- [`src/client.js`](zikuani-stellar/src/client.js): starts the Express server
- [`src/routes.js`](zikuani-stellar/src/routes.js): handles login and callback flows
- [`src/services/sorobanVerifier.js`](zikuani-stellar/src/services/sorobanVerifier.js): builds and submits the Soroban verification transaction
- [`src/services/ofacProver.js`](zikuani-stellar/src/services/ofacProver.js): decodes a Stellar address and calls the vendored prover in [`prover/`](zikuani-stellar/prover) directly in-process to generate a live OFAC proof
- [`src/renderers/callbackPage.js`](zikuani-stellar/src/renderers/callbackPage.js): renders the final authenticated page, including verifier status and transaction hash
- [`src/config.js`](zikuani-stellar/src/config.js): runtime configuration from environment variables

### OFAC prover (vendored)

- [`prover/helpers/prove-ofac.js`](zikuani-stellar/prover/helpers/prove-ofac.js): CLI entrypoint — takes an address as a BigInt and prints a `{ public, proof }` JSON proof
- [`prover/helpers/generate-inputs.js`](zikuani-stellar/prover/helpers/generate-inputs.js): builds the OFAC Sparse Merkle Tree and the circuit's witness inputs
- [`prover/build/`](zikuani-stellar/prover/build): the circuit's compiled witness calculator (`.wasm`) and Groth16 proving key (`.zkey`)

### Smart contracts

- [`contracts/zk_verifier/lib.rs`](zikuani-stellar/contracts/zk_verifier/lib.rs): Soroban ZK Firma Digital verifier entrypoint
- [`contracts/zk_verifier/vk.rs`](zikuani-stellar/contracts/zk_verifier/vk.rs): verification key constants encoded as bytes
- [`contracts/zk_verifier/xray.rs`](zikuani-stellar/contracts/zk_verifier/xray.rs): thin wrappers around Soroban BN254 host functions
- [`contracts/ofac_verifier/lib.rs`](zikuani-stellar/contracts/ofac_verifier/lib.rs): Soroban OFAC non-sanctions verifier entrypoint
- [`contracts/identity_gate/lib.rs`](zikuani-stellar/contracts/identity_gate/lib.rs): combines both verifiers via cross-contract calls and binds them to one wallet

## Soroban Verifier Design

The Soroban contract implements the same Groth16 verification logic as the Solidity verifier, but without EVM assembly.

The main entrypoint is [`verify_proof`](zikuani-stellar/contracts/zk_verifier/lib.rs#L30). It expects:

- `a`: G1 point encoded as 64 bytes
- `b`: G2 point encoded as 128 bytes
- `c`: G1 point encoded as 64 bytes
- `pub_signals`: 5 scalars encoded as 32-byte values

Internally it:

1. Confirms exactly 5 public signals were supplied.
2. Reconstructs `vk_x = IC0 + signal[0]*IC1 + ... + signal[4]*IC5`.
3. Negates proof point `A`.
4. Executes a BN254 multi-pairing check using Soroban host crypto functions.
5. Returns `true` if the proof is valid for the hardcoded verification key.

- Solidity `alphax` maps to Soroban `ALPHA_X`
- Solidity `alphay` maps to Soroban `ALPHA_Y`

This is just a representation change:

- Solidity stores large decimal `uint256` values
- Soroban stores the same value as a 32-byte big-endian byte array

## Proof Serialization

The web app and helper script both serialize the proof before calling the contract.

In [`src/services/sorobanVerifier.js`](zikuani-stellar/src/services/sorobanVerifier.js):

- `pi_a` becomes `a = x || y`
- `pi_b` becomes `b = x1 || x2 || y1 || y2`
- `pi_c` becomes `c = x || y`
- each public signal becomes a 32-byte big-endian byte string

The helper `be32(value)` converts a decimal value into the exact byte format expected by Soroban.

## Requirements

### Runtime

- Node.js
- Yarn

### Contract build and deployment

- Rust toolchain with `wasm32v1-none` support
- Stellar CLI

### Optional invocation helper

- `npx ts-node` for running [`contracts/invokeSorobanVerifier.ts`](zikuani-stellar/contracts/invokeSorobanVerifier.ts)

This repository does not currently include `ts-node` as a dependency, so using `npx ts-node ...` is the simplest ad hoc approach.

## Install and Run the Web App

Install dependencies:

```bash
yarn install
```

Start the web app:

```bash
yarn start
```

The server starts from [`src/client.js`](zikuani-stellar/src/client.js) and listens on `http://localhost:3000` by default.

## Environment Variables

The most important variables are:

```bash
PORT=3000
REACT_APP_CLIENT_ID=demo@sakundi.io
REACT_APP_CLIENT_SECRET=password
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
REACT_APP_AUTH_SERVER_URL=https://app.sakundi.io

SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_CONTRACT_ID=<deployed_zk_verifier_contract_id>
IDENTITY_GATE_CONTRACT_ID=<deployed_identity_gate_contract_id>
SOROBAN_SECRET_KEY=<funded_testnet_secret_key>
SOROBAN_ALLOW_HTTP=0
```

`SOROBAN_CONTRACT_ID` is only used by [`contracts/invokeSorobanVerifier.ts`](zikuani-stellar/contracts/invokeSorobanVerifier.ts) to test `zk_verifier` directly. The web app (`src/routes.js`) calls `identity_gate` via `IDENTITY_GATE_CONTRACT_ID`.

The OFAC proof is generated live for each request's wallet address by [`generateOfacProof`](zikuani-stellar/src/services/ofacProver.js), which decodes the Stellar address and calls `proveOfacNonMembership` from the vendored prover in [`prover/`](zikuani-stellar/prover) directly in-process (no subprocess — see [`prover/helpers/prove-ofac.js`](zikuani-stellar/prover/helpers/prove-ofac.js)). That prover still sources the blacklist from a small hardcoded placeholder list (no real OFAC SDN feed is wired in anywhere yet), and its `ofacRoot` must match whatever root `identity_gate` currently accepts (set via `initialize` / `set_ofac_root`).

## Build and Deploy the Contracts

Use [`scripts/deploy.sh`](zikuani-stellar/scripts/deploy.sh) to build and deploy all four contracts (`zk_verifier`, `ofac_verifier`, `identity_gate`, `zk_vote`) at once:

```bash
./scripts/deploy.sh testnet alice
```

This records each contract's address in `deployments/testnet.json` and prints the `stellar contract invoke ... initialize` commands needed for `identity_gate` and `zk_vote` (which need an admin address, the deployed verifier addresses, and contract-specific data such as the OFAC root).

To build and deploy a single contract manually instead:

```bash
stellar contract build
stellar keys generate alice --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/identity_gate.wasm \
  --source-account alice \
  --network testnet \
  --alias identity-gate
```

## Test the Contract Directly on Testnet

The easiest way to test the deployed verifier is the TypeScript helper:

```bash
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
export SOROBAN_NETWORK_PASSPHRASE='Test SDF Network ; September 2015'
export SOROBAN_CONTRACT_ID='<deployed_testnet_contract_id>'
export SOROBAN_SECRET_KEY='<funded_testnet_secret_key>'
export SOROBAN_PROOF_FILE=./example-proof.json

npx ts-node contracts/invokeSorobanVerifier.ts
```

Expected successful output:

```text
Simulation result: true
Submitted transaction hash: ...
Final on-chain return value: true
Transaction hash: ...
Proof verified.
```

What this proves:

- the contract is deployed correctly
- the proof serialization is correct
- the verification key matches the proof
- the verification succeeded on Stellar Testnet, not just locally

## Test Through the Web App

When the app receives a `zk-firma-digital` proof in [`src/routes.js`](zikuani-stellar/src/routes.js#L169), it calls the deployed Soroban contract and then renders the callback page.

On the final authenticated page, the user sees:

- whether the proof was verified on Stellar Testnet
- the transaction hash
- a link to the explorer transaction page

This UI is rendered in [`src/renderers/callbackPage.js`](zikuani-stellar/src/renderers/callbackPage.js).

## License

This repository is licensed under the Apache 2.0 license. See [`LICENSE`](zikuani-stellar/LICENSE).
