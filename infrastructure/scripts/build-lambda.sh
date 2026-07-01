#!/usr/bin/env bash
# infrastructure/scripts/build-lambda.sh
#
# Build Lambda worker ZIP artifact.
# Output: infrastructure/outputs/worker-lambda.zip
#
# Prisma engine decision (Bước 0.7):
#   Using @prisma/adapter-pg (PrismaPg, Prisma v7 queryCompiler GA).
#   Queries route through pg driver — NO native query engine binary needed.
#   Lambda zip is clean: bundle + node_modules only, no .so engine.
#
# Usage:
#   bash infrastructure/scripts/build-lambda.sh
#
# Requirements:
#   - Node.js 20+ in PATH
#   - Run from repo root OR from infrastructure/scripts/
#   - backend/node_modules must be installed (npm ci)
#
# Idempotent: safe to run multiple times; cleans dist-lambda/ before each run.

set -euo pipefail

# ── Resolve paths ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
INFRA_OUTPUTS="${REPO_ROOT}/infrastructure/outputs"
DIST_LAMBDA="${BACKEND_DIR}/dist-lambda"
ZIP_PATH="${INFRA_OUTPUTS}/worker-lambda.zip"

echo "=== Quillo — Lambda Worker Build ==="
echo "  Repo root   : ${REPO_ROOT}"
echo "  Backend     : ${BACKEND_DIR}"
echo "  Output ZIP  : ${ZIP_PATH}"
echo ""

# ── Pre-flight checks ──────────────────────────────────────────
if [ ! -f "${BACKEND_DIR}/package.json" ]; then
  echo "ERROR: ${BACKEND_DIR}/package.json not found. Run from repo root." >&2
  exit 1
fi

if [ ! -d "${BACKEND_DIR}/node_modules" ]; then
  echo "ERROR: node_modules not found. Run 'npm ci' in backend/ first." >&2
  exit 1
fi

# Ensure esbuild is available
if ! node -e "require.resolve('esbuild')" --require "tsconfig-paths/register" 2>/dev/null; then
  if [ ! -x "${BACKEND_DIR}/node_modules/.bin/esbuild" ]; then
    echo "ERROR: esbuild not found. Install with: npm install --save-dev esbuild" >&2
    exit 1
  fi
fi

# ── Step 1: Clean previous build & Prisma generate ────────────
echo "[1/3] Cleaning dist-lambda/ & running prisma generate ..."
rm -rf "${DIST_LAMBDA}"
mkdir -p "${DIST_LAMBDA}"
mkdir -p "${INFRA_OUTPUTS}"

cd "${BACKEND_DIR}"
npx prisma generate

# ── Step 2: esbuild bundle ─────────────────────────────────────
echo "[2/3] Bundling worker.ts with esbuild ..."
node esbuild.lambda.mjs

if [ ! -f "${DIST_LAMBDA}/index.js" ]; then
  echo "ERROR: dist-lambda/index.js not generated." >&2
  exit 1
fi

echo "  Bundle size: $(du -sh "${DIST_LAMBDA}/index.js" | cut -f1)"

# ── Step 3: Create ZIP ────────────────────────────────────────
echo "[3/3] Creating ZIP: ${ZIP_PATH} ..."
rm -f "${ZIP_PATH}"
cd "${DIST_LAMBDA}"
zip -q "${ZIP_PATH}" index.js

ZIP_SIZE=$(du -sh "${ZIP_PATH}" | cut -f1)
echo ""
echo "=== BUILD COMPLETE ==="
echo "  Output  : ${ZIP_PATH}"
echo "  Size    : ${ZIP_SIZE}"
echo ""
echo "Next steps (human):"
echo "  aws lambda update-function-code \\"
echo "    --function-name quillo-worker \\"
echo "    --zip-file fileb://${ZIP_PATH} \\"
echo "    --region ap-southeast-1"
