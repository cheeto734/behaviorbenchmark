#!/usr/bin/env bash
set -euo pipefail

API_BASE="https://integrate.api.nvidia.com/v1"
SAMPLES=100
SEED=42
CONCURRENCY=1

MODELS=(
  "nvidia/nemotron-3-super-120b-a12b"
  "nvidia/nemotron-3-ultra-550b-a55b"
)

for MODEL in "${MODELS[@]}"; do
  PYTHONPATH="$PWD/src" .venv/bin/python -m behaviorbench.eval.main \
    --task multiround_behavior_dictator surv_resp_pred \
    --model-type openai \
    --model-name "$MODEL" \
    --api-base "$API_BASE" \
    --num-samples "$SAMPLES" \
    --seed "$SEED" \
    --concurrency "$CONCURRENCY" \
    --output-dir eval_results
done