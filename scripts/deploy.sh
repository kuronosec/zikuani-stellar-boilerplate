#!/usr/bin/env bash
#
# Builds and deploys all Soroban contracts in this repo, recording each
# deployed contract address in deployments/<network>.json.
#
# Usage:
#   ./scripts/deploy.sh [network] [source-account]
#
#   network         stellar CLI network name (default: testnet)
#   source-account  stellar CLI identity used to sign deploys (default: kurono)
#
# Requires the Stellar CLI (`stellar`) and `jq` to be installed, and the
# given source account to already exist via `stellar keys add <name>`.
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
    stellar contract deploy \
      --wasm "$wasm" \
      --source-account "$SOURCE_ACCOUNT" \
      --network "$NETWORK" \
      -- 2>/tmp/deploy_${name}.log
  )" || { cat "/tmp/deploy_${name}.log" >&2; exit 1; }

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

echo
echo "==> Next step: initialize identity_gate and zk_vote (not done automatically)"
echo
echo "identity_gate.initialize needs: admin, firma_verifier_id (zk_verifier), ofac_verifier_id (ofac_verifier), ofac_root"
echo "  stellar contract invoke --id \$(jq -r '.identity_gate.contract_id' $OUT_FILE) \\"
echo "    --source-account $SOURCE_ACCOUNT --network $NETWORK -- initialize \\"
echo "    --admin <ADMIN_ADDRESS> \\"
echo "    --firma_verifier_id \$(jq -r '.zk_verifier.contract_id' $OUT_FILE) \\"
echo "    --ofac_verifier_id \$(jq -r '.ofac_verifier.contract_id' $OUT_FILE) \\"
echo "    --ofac_root <OFAC_ROOT_HEX_32_BYTES>"
echo
echo "zk_vote.initialize needs: admin, verifier_id (zk_verifier), vote_params, proposal_descriptions"
echo "  stellar contract invoke --id \$(jq -r '.zk_vote.contract_id' $OUT_FILE) \\"
echo "    --source-account $SOURCE_ACCOUNT --network $NETWORK -- initialize \\"
echo "    --admin <ADMIN_ADDRESS> \\"
echo "    --verifier_id \$(jq -r '.zk_verifier.contract_id' $OUT_FILE) \\"
echo "    --vote_params <VOTE_PARAMS_JSON> \\"
echo "    --proposal_descriptions '[\"Option A\",\"Option B\"]'"
