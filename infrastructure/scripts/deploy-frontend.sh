#!/usr/bin/env bash
# infrastructure/scripts/deploy-frontend.sh
#
# Deploy React SPA (Vite build) to S3 bucket and invalidate CloudFront cache.
#
# Environment variables required:
#   S3_BUCKET           - Name of the S3 bucket for frontend hosting
#   CF_DISTRIBUTION_ID  - CloudFront distribution ID
#   AWS_REGION          - AWS Region (optional, defaults to ap-southeast-1 if not set)
#
# Usage:
#   S3_BUCKET=my-bucket CF_DISTRIBUTION_ID=E123456789 AWS_REGION=ap-southeast-1 bash infrastructure/scripts/deploy-frontend.sh

set -euo pipefail

echo "=== Quillo — Frontend Deployment to S3 & CloudFront ==="

# ── Step 1: Validate required environment variables ────────────
echo "[1/3] Validating required environment variables..."

if [ -z "${S3_BUCKET:-}" ]; then
  echo "ERROR: Environment variable S3_BUCKET is required but not set." >&2
  exit 1
fi

if [ -z "${CF_DISTRIBUTION_ID:-}" ]; then
  echo "ERROR: Environment variable CF_DISTRIBUTION_ID is required but not set." >&2
  exit 1
fi

# Set default AWS region if not provided in environment
export AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo "  S3 Bucket          : s3://${S3_BUCKET}"
echo "  CloudFront Dist ID : ${CF_DISTRIBUTION_ID}"
echo "  AWS Region         : ${AWS_REGION}"
echo "  Validation PASSED."
echo ""

# ── Step 2: Sync build artifacts to S3 ─────────────────────────
echo "[2/3] Syncing frontend/dist/ to s3://${S3_BUCKET} ..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIST="${REPO_ROOT}/frontend/dist"

if [ ! -d "${FRONTEND_DIST}" ]; then
  echo "ERROR: ${FRONTEND_DIST} does not exist. Run 'cd frontend && npm run build' first." >&2
  exit 1
fi

aws s3 sync "${FRONTEND_DIST}/" "s3://${S3_BUCKET}" --delete --region "${AWS_REGION}"

echo "  S3 sync complete."
echo ""

# ── Step 3: Invalidate CloudFront cache ────────────────────────
echo "[3/3] Creating CloudFront invalidation for distribution ${CF_DISTRIBUTION_ID} ..."

aws cloudfront create-invalidation \
  --distribution-id "${CF_DISTRIBUTION_ID}" \
  --paths "/*" \
  --region "${AWS_REGION}"

echo "  CloudFront invalidation triggered successfully."
echo ""
echo "=== DEPLOYMENT COMPLETE ==="
