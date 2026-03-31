# Zikuani Stellar Testnet Verifier

This project is a small Express web app that authenticates users with Zikuani and, for the `zk-firma-digital` flow, verifies the returned zero-knowledge proof on a Soroban smart contract deployed to Stellar Testnet.

The repository contains:

- A web client in [`src/`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src)
- An EVM Groth16 verifier reference in [`contracts/Verifier.sol`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/Verifier.sol)
- A Soroban verifier contract in [`contracts/zk_verifier/`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier)
- A helper script to invoke the Soroban verifier directly in [`contracts/invokeSorobanVerifier.ts`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/invokeSorobanVerifier.ts)

## How It Works

The application has two authentication paths:

- `zk-passport`: standard Zikuani passport flow
- `zk-firma-digital`: returns a proof payload that is also verified on-chain on Stellar

High-level flow for `zk-firma-digital`:

1. The user starts the login flow from the web app.
2. Zikuani redirects back to `/callback` with an authorization code.
3. The app exchanges that code for a token and proof in [`src/routes.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/routes.js).
4. The proof is passed to [`verifyProofOnChain`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/services/sorobanVerifier.js).
5. The app serializes the Groth16 proof into Soroban-friendly byte arrays and invokes the deployed contract function `verify_proof`.
6. The callback page shows whether the proof was verified on Stellar Testnet and displays the transaction hash.

## Project Structure

### Web app

- [`src/client.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/client.js): starts the Express server
- [`src/routes.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/routes.js): handles login and callback flows
- [`src/services/sorobanVerifier.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/services/sorobanVerifier.js): builds and submits the Soroban verification transaction
- [`src/renderers/callbackPage.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/renderers/callbackPage.js): renders the final authenticated page, including verifier status and transaction hash
- [`src/config.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/config.js): runtime configuration from environment variables

### Smart contracts

- [`contracts/Verifier.sol`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/Verifier.sol): generated Solidity Groth16 verifier used as the EVM reference
- [`contracts/zk_verifier/lib.rs`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier/lib.rs): Soroban verifier entrypoint
- [`contracts/zk_verifier/vk.rs`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier/vk.rs): verification key constants encoded as bytes
- [`contracts/zk_verifier/xray.rs`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier/xray.rs): thin wrappers around Soroban BN254 host functions

## Soroban Verifier Design

The Soroban contract implements the same Groth16 verification logic as the Solidity verifier, but without EVM assembly.

The main entrypoint is [`verify_proof`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier/lib.rs#L30). It expects:

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

The verification key in [`vk.rs`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/zk_verifier/vk.rs) is the Soroban byte-encoded equivalent of the constants in [`Verifier.sol`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/Verifier.sol). For example:

- Solidity `alphax` maps to Soroban `ALPHA_X`
- Solidity `alphay` maps to Soroban `ALPHA_Y`

This is just a representation change:

- Solidity stores large decimal `uint256` values
- Soroban stores the same value as a 32-byte big-endian byte array

## Proof Serialization

The web app and helper script both serialize the proof before calling the contract.

In [`src/services/sorobanVerifier.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/services/sorobanVerifier.js):

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

- `npx ts-node` for running [`contracts/invokeSorobanVerifier.ts`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/contracts/invokeSorobanVerifier.ts)

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

The server starts from [`src/client.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/client.js) and listens on `http://localhost:3000` by default.

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
SOROBAN_CONTRACT_ID=<deployed_testnet_contract_id>
SOROBAN_SECRET_KEY=<funded_testnet_secret_key>
SOROBAN_ALLOW_HTTP=0
```

Important:

- The defaults in [`src/config.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/config.js) still point to Futurenet unless overridden.
- If you want the web app to use Stellar Testnet, you must set `SOROBAN_RPC_URL`, `SOROBAN_NETWORK_PASSPHRASE`, `SOROBAN_CONTRACT_ID`, and `SOROBAN_SECRET_KEY` explicitly before starting the app.

## Build the Soroban Contract

From the repository root:

```bash
stellar contract build
```

The contract Wasm is generated at:

```text
target/wasm32v1-none/release/zk_verifier.wasm
```

## Deploy the Contract to Stellar Testnet

Create and fund a Testnet account:

```bash
stellar keys generate alice --network testnet --fund
```

Deploy the contract:

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zk_verifier.wasm \
  --source-account alice \
  --network testnet \
  --alias zk-verifier
```

The command returns a contract ID beginning with `C...`. Use that value as `SOROBAN_CONTRACT_ID`.

Important network detail:

- `Testnet` passphrase: `Test SDF Network ; September 2015`
- `Futurenet` passphrase: `Test SDF Future Network ; October 2022`

If your account was funded on Futurenet, it will not exist on Testnet. Deployment and invocation must use the same network where the source account is funded.

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

When the app receives a `zk-firma-digital` proof in [`src/routes.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/routes.js#L169), it calls the deployed Soroban contract and then renders the callback page.

On the final authenticated page, the user sees:

- whether the proof was verified on Stellar Testnet
- the transaction hash
- a link to the explorer transaction page

This UI is rendered in [`src/renderers/callbackPage.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/renderers/callbackPage.js).

## How to Confirm It Really Ran on Testnet

There are three strong checks:

1. The app or helper script uses:
   `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org`
   and
   `SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015`
2. The transaction status is `SUCCESS` in a Testnet explorer.
3. The contract returns `true` for a valid proof and `false` for a tampered proof.

You can inspect the transaction using the displayed transaction hash in a Stellar explorer such as:

```text
https://stellarchain.io/tx/<transaction_hash>
```

## Recommended Negative Test

To prove the verifier is actually checking the proof, not just returning `true`, perform a negative test:

1. Start from a valid proof JSON file.
2. Change one public signal value.
3. Run the invocation helper again.
4. Confirm the result becomes `false`.

If the valid proof succeeds and the tampered one fails on the same deployed contract, the on-chain verification path is working correctly.

## Notes About Soroban Spec Warnings

You may see warnings like:

```text
type 'G1' referenced by function 'verify_proof' input 'a' is not defined in the spec
```

These warnings come from Soroban contract spec generation, not from the proof verification logic itself.

The cause is that Rust aliases such as:

```rust
type G1 = BytesN<64>;
type G2 = BytesN<128>;
type Scalar = BytesN<32>;
```

are visible in the public API, but they are not standalone ABI type definitions in the generated contract spec. The contract can still run correctly, but some spec-driven CLI tooling may complain.

## Current Default Behavior

Out of the box, the app defaults to Futurenet in [`src/config.js`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/src/config.js). For any real Testnet usage, export Testnet values before launching the server.

## License

This repository is licensed under the Apache 2.0 license. See [`LICENSE`](/home/kurono/Documents/Sakundi/Software/blockchain-privacy/zikuani-stellar/LICENSE).
