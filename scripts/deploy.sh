#!/usr/bin/env bash
#
# Builds and deploys all Soroban contracts in this repo, recording each
# deployed contract address in deployments/<network>.json. Also initializes
# identity_gate, using the OFAC root produced by the placeholder address
# list in prover/helpers/prove-ofac.js -- see the warning printed below.
#
# Usage:
#   ./scripts/deploy.sh [network] [source-account]
#
#   network         stellar CLI network name (default: testnet)
#   source-account  stellar CLI identity used to sign deploys (default: kurono)
#
# Requires the Stellar CLI (`stellar`) and `jq` to be installed, Node.js
# dependencies installed (`yarn install`, for the OFAC root computation),
# and the given source account to already exist via `stellar keys add <name>`.
set -euo pipefail

NETWORK="${1:-testnet}"
SOURCE_ACCOUNT="${2:-kurono}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$REPO_ROOT/target/wasm32v1-none/release"
OUT_DIR="$REPO_ROOT/deployments"
OUT_FILE="$OUT_DIR/${NETWORK}.json"

# Order matters: zk_verifier and ofac_verifier are imported as cross-contract
# clients by identity_gate and zk_vote, so their wasm must exist before those
# build, even though deployment order itself doesn't matter.
CONTRACTS=(zk_verifier ofac_verifier identity_gate zk_vote)

mkdir -p "$OUT_DIR"
[ -f "$OUT_FILE" ] || echo '{}' > "$OUT_FILE"

# Submitting several transactions back-to-back from the same source account
# (as this script does, once per contract) can race the account's sequence
# number against ledger close and fail with TxBadSeq even though nothing is
# actually wrong -- retry a few times with backoff before giving up.
retry() {
  local attempt=1
  local max_attempts=5
  local delay=3
  local output
  while true; do
    if output="$("$@" 2>&1)"; then
      printf '%s\n' "$output"
      return 0
    fi
    if [ "$attempt" -ge "$max_attempts" ] || ! grep -q "TxBadSeq" <<< "$output"; then
      printf '%s\n' "$output" >&2
      return 1
    fi
    echo "    TxBadSeq (attempt $attempt/$max_attempts), retrying in ${delay}s..." >&2
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

echo "==> Building all contracts (network: $NETWORK, source: $SOURCE_ACCOUNT)"
(cd "$REPO_ROOT" && stellar contract build)

for name in "${CONTRACTS[@]}"; do
  wasm="$WASM_DIR/${name}.wasm"
  if [ ! -f "$wasm" ]; then
    echo "error: $wasm not found after build" >&2
    exit 1
  fi

  echo "==> Deploying $name"
  contract_id="$(
    retry stellar contract deploy \
      --wasm "$wasm" \
      --source-account "$SOURCE_ACCOUNT" \
      --network "$NETWORK" \
      --
  )" || exit 1
  contract_id="$(tail -n1 <<< "$contract_id")"

  echo "    $name -> $contract_id"

  tmp="$(mktemp)"
  jq --arg name "$name" \
     --arg id "$contract_id" \
     --arg deployed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     --arg network "$NETWORK" \
     --arg source_account "$SOURCE_ACCOUNT" \
     '.[$name] = {contract_id: $id, network: $network, source_account: $source_account, deployed_at: $deployed_at}' \
     "$OUT_FILE" > "$tmp"
  mv "$tmp" "$OUT_FILE"
done

echo
echo "==> All addresses recorded in $OUT_FILE"
jq . "$OUT_FILE"

ADMIN_ADDRESS="$(stellar keys address "$SOURCE_ACCOUNT")"
OFAC_ROOT="$(node -e "require('$REPO_ROOT/prover/helpers/prove-ofac').getOfacRootHex().then((hex) => process.stdout.write(hex))")"

echo
echo "==> OFAC root from prover/helpers/prove-ofac.js's placeholder address list: $OFAC_ROOT"
echo "    WARNING: this is NOT the real OFAC SDN crypto address list (see that file)."
echo "    Re-run this script (or call set_ofac_root) whenever that list changes."

echo
echo "==> Initializing identity_gate"
retry stellar contract invoke \
  --id "$(jq -r '.identity_gate.contract_id' "$OUT_FILE")" \
  --source-account "$SOURCE_ACCOUNT" --network "$NETWORK" -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --firma_verifier_id "$(jq -r '.zk_verifier.contract_id' "$OUT_FILE")" \
  --ofac_verifier_id "$(jq -r '.ofac_verifier.contract_id' "$OUT_FILE")" \
  --ofac_root "$OFAC_ROOT"

echo
echo "==> Next step: initialize zk_vote (not done automatically -- needs campaign-specific data)"
echo
echo "zk_vote.initialize needs: admin, verifier_id (zk_verifier), vote_params, proposal_descriptions"
echo "  stellar contract invoke --id \$(jq -r '.zk_vote.contract_id' $OUT_FILE) \\"
echo "    --source-account $SOURCE_ACCOUNT --network $NETWORK -- initialize \\"
echo "    --admin $ADMIN_ADDRESS \\"
echo "    --verifier_id \$(jq -r '.zk_verifier.contract_id' $OUT_FILE) \\"
echo "    --vote_params <VOTE_PARAMS_JSON> \\"
echo "    --proposal_descriptions '[\"Option A\",\"Option B\"]'"
