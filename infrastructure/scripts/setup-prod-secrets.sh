#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo SQS & Secrets Manager Provisioning ==="
echo "Region: $REGION"

if [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: GEMINI_API_KEY env var must be set."
  echo "Usage: export GEMINI_API_KEY=<key> && bash infrastructure/scripts/setup-prod-secrets.sh"
  exit 1
fi

if [ ! -f "infrastructure/outputs/rds-outputs.txt" ] || [ ! -f "infrastructure/outputs/rds-master-password.txt" ]; then
  echo "ERROR: RDS outputs not found. Please run setup-rds.sh first."
  exit 1
fi

source infrastructure/outputs/rds-outputs.txt
DB_PASSWORD=$(cat infrastructure/outputs/rds-master-password.txt)

DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}"

# Generate new JWT_SECRET (48 chars)
JWT_SECRET=$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-48)

# 1. SQS Dead Letter Queue
echo "Creating DLQ: quillo-generation-dlq-prod..."
DLQ_URL=$(aws sqs create-queue \
  --queue-name quillo-generation-dlq-prod \
  --region $REGION \
  --query 'QueueUrl' --output text)

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text \
  --region $REGION)

# 2. SQS Main Queue
echo "Creating Main Queue: quillo-generation-queue-prod..."
MAIN_URL=$(aws sqs create-queue \
  --queue-name quillo-generation-queue-prod \
  --attributes "{
    \"VisibilityTimeout\": \"300\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }" \
  --region $REGION \
  --query 'QueueUrl' --output text)

MAIN_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$MAIN_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text \
  --region $REGION)

mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/sqs-prod-outputs.txt
QUEUE_URL=$MAIN_URL
QUEUE_ARN=$MAIN_ARN
DLQ_URL=$DLQ_URL
DLQ_ARN=$DLQ_ARN
EOF
echo "  SQS queues created/updated."

# 3. Secrets Manager
echo "Creating/Updating Secret: quillo/app-secrets-prod..."

# Avoid printing secret value to standard output securely
SECRET_STRING=$(cat <<EOF
{"JWT_SECRET":"${JWT_SECRET}","DATABASE_URL":"${DATABASE_URL}","GEMINI_API_KEY":"${GEMINI_API_KEY}"}
EOF
)

if aws secretsmanager describe-secret --secret-id quillo/app-secrets-prod --region $REGION >/dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id quillo/app-secrets-prod \
    --secret-string "$SECRET_STRING" \
    --region $REGION >/dev/null
  echo "  Secret updated successfully."
else
  aws secretsmanager create-secret \
    --name quillo/app-secrets-prod \
    --secret-string "$SECRET_STRING" \
    --region $REGION >/dev/null
  echo "  Secret created successfully."
fi

echo ""
echo "=== Provisioning DONE ==="
echo "SQS outputs saved to: infrastructure/outputs/sqs-prod-outputs.txt"
echo "Secrets Manager updated: quillo/app-secrets-prod"
