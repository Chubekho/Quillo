#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-ap-southeast-1}

# Need to run from repo root ideally, to resolve backend/
if [ ! -d "backend" ]; then
  echo "ERROR: 'backend' directory not found. Please run this script from the repository root."
  exit 1
fi

if [ ! -f "infrastructure/outputs/ecr-outputs.txt" ]; then
  echo "ERROR: infrastructure/outputs/ecr-outputs.txt not found. Run setup-ecr.sh first."
  exit 1
fi

source infrastructure/outputs/ecr-outputs.txt

REGISTRY_URL=$(echo "$ECR_REPO_URI" | cut -d/ -f1)

echo "=== Quillo Docker Build & Push ==="
echo "Registry: $REGISTRY_URL"
echo "Repo URI: $ECR_REPO_URI"

echo "[1/4] Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY_URL"

echo "[2/4] Building image (quillo-api:latest) for linux/amd64 architecture..."
docker buildx build --platform linux/amd64 -f backend/Dockerfile -t quillo-api:latest --load backend/

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAGGED_LATEST="${ECR_REPO_URI}:latest"
IMAGE_TAGGED_TS="${ECR_REPO_URI}:${TIMESTAMP}"

echo "[3/4] Tagging images..."
docker tag quillo-api:latest "$IMAGE_TAGGED_LATEST"
docker tag quillo-api:latest "$IMAGE_TAGGED_TS"

echo "[4/4] Pushing images to ECR..."
docker push "$IMAGE_TAGGED_LATEST"
docker push "$IMAGE_TAGGED_TS"

echo ""
echo "=== PUSH COMPLETE ==="
echo "Image successfully pushed to ECR."
echo "Latest URI for Launch Template:"
echo "$IMAGE_TAGGED_LATEST"
