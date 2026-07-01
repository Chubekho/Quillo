#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-ap-southeast-1}
REPO_NAME="quillo-api"

echo "=== Quillo ECR Setup ==="
echo "Region: $REGION"
echo "Repo: $REPO_NAME"

echo "[1/2] Checking repository..."
if aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "  Repository already exists."
else
  echo "  Creating repository with scanOnPush=true..."
  aws ecr create-repository \
    --repository-name "$REPO_NAME" \
    --image-scanning-configuration scanOnPush=true \
    --region "$REGION" >/dev/null
fi

echo "[2/2] Applying lifecycle policy (keep last 5 images)..."
LIFECYCLE_POLICY='{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 5 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 5
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}'
aws ecr put-lifecycle-policy \
  --repository-name "$REPO_NAME" \
  --lifecycle-policy-text "$LIFECYCLE_POLICY" \
  --region "$REGION" >/dev/null

echo "Fetching repository URI..."
REPO_URI=$(aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" --query 'repositories[0].repositoryUri' --output text)

mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/ecr-outputs.txt
ECR_REPO_NAME=$REPO_NAME
ECR_REPO_URI=$REPO_URI
EOF

echo ""
echo "=== ECR setup DONE ==="
echo "ECR_REPO_URI: $REPO_URI"
echo "Outputs saved to infrastructure/outputs/ecr-outputs.txt"
