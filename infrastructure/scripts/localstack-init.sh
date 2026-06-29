#!/bin/bash
# Chạy tự động khi LocalStack khởi động xong

if [ -z "$JWT_SECRET" ] || [ -z "$DATABASE_URL" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: JWT_SECRET, DATABASE_URL, GEMINI_API_KEY phải được set trong env trước khi chạy script"
  exit 1
fi

echo "==> Quillo: Khởi tạo AWS resources trên LocalStack..."

REGION=us-east-1
ENDPOINT=http://localhost:4566

# ── S3 Buckets ──────────────────────────────────────────────
echo "  Creating S3 buckets..."
awslocal s3 mb s3://quillo-exports --region $REGION
awslocal s3 mb s3://quillo-assets --region $REGION

awslocal s3api put-bucket-cors --bucket quillo-exports --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

# ── SQS Queues ──────────────────────────────────────────────
echo "  Creating SQS queues..."

# Dead Letter Queue trước
awslocal sqs create-queue \
  --queue-name quillo-generation-dlq \
  --region $REGION

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/quillo-generation-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Main generation queue với DLQ
awslocal sqs create-queue \
  --queue-name quillo-generation-queue \
  --region $REGION \
  --attributes "{
    \"VisibilityTimeout\": \"120\",
    \"MessageRetentionPeriod\": \"86400\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }"

echo "  Queue ARN: $(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/quillo-generation-queue \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)"

# ── Secrets Manager ─────────────────────────────────────────
echo "  Creating Secrets Manager secret..."
SECRET_STRING=$(cat <<EOF
{"JWT_SECRET":"${JWT_SECRET}","DATABASE_URL":"${DATABASE_URL}","GEMINI_API_KEY":"${GEMINI_API_KEY}"}
EOF
)

if awslocal secretsmanager describe-secret --secret-id quillo/app-secrets --region $REGION >/dev/null 2>&1; then
  awslocal secretsmanager put-secret-value \
    --secret-id quillo/app-secrets \
    --secret-string "$SECRET_STRING" \
    --region $REGION
else
  awslocal secretsmanager create-secret \
    --name quillo/app-secrets \
    --secret-string "$SECRET_STRING" \
    --region $REGION
fi

echo "==> Quillo: LocalStack init done ✓"

