#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo S3 Buckets Setup ==="
echo "Region: $REGION"

function create_bucket_unique() {
  local base_name=$1
  local bucket_name=$base_name
  
  local head_err
  head_err=$(aws s3api head-bucket --bucket "$bucket_name" --region $REGION 2>&1 >/dev/null || true)
  
  if [[ -z "$head_err" ]]; then
    >&2 echo "  Bucket $bucket_name already exists and owned by you."
  elif echo "$head_err" | grep -q "404"; then
    >&2 echo "  Creating bucket $bucket_name..."
    aws s3 mb s3://"$bucket_name" --region $REGION >&2
  else
    >&2 echo "  Bucket $bucket_name is not available (Status: $(echo "$head_err" | grep -o '[0-9][0-9][0-9]' || echo 'Unknown')). Using random suffix..."
    local suffix=$(openssl rand -hex 3)
    bucket_name="${base_name}-${suffix}"
    >&2 echo "  Creating bucket $bucket_name..."
    aws s3 mb s3://"$bucket_name" --region $REGION >&2
  fi
  
  echo "$bucket_name"
}

# 1. quillo-exports-prod
echo "Setting up quillo-exports-prod..."
EXPORTS_BUCKET=$(create_bucket_unique "quillo-exports-prod")
echo "  Applying CORS configuration to $EXPORTS_BUCKET..."
aws s3api put-bucket-cors --bucket "$EXPORTS_BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}' --region $REGION

# 2. quillo-assets-prod
echo "Setting up quillo-assets-prod..."
ASSETS_BUCKET=$(create_bucket_unique "quillo-assets-prod")
echo "  Enforcing Block Public Access for $ASSETS_BUCKET..."
aws s3api put-public-access-block \
    --bucket "$ASSETS_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region $REGION

# 3. quillo-frontend-prod
echo "Setting up quillo-frontend-prod..."
FRONTEND_BUCKET=$(create_bucket_unique "quillo-frontend-prod")
echo "  Enforcing Block Public Access for $FRONTEND_BUCKET (Note: OAC doesn't need public access)..."
aws s3api put-public-access-block \
    --bucket "$FRONTEND_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region $REGION

mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/s3-outputs.txt
EXPORTS_BUCKET=$EXPORTS_BUCKET
ASSETS_BUCKET=$ASSETS_BUCKET
FRONTEND_BUCKET=$FRONTEND_BUCKET
EOF

echo ""
echo "=== S3 setup DONE ==="
echo "Bucket names saved to: infrastructure/outputs/s3-outputs.txt"
