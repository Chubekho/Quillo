#!/bin/bash
# Chạy tự động khi LocalStack khởi động xong

if [ -z "$JWT_SECRET" ] || [ -z "$DATABASE_URL" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: JWT_SECRET, DATABASE_URL, GEMINI_API_KEY phải được set trong env trước khi chạy script"
  exit 1
fi

echo "==> Quillo: Khởi tạo AWS resources trên LocalStack..."

REGION=ap-southeast-1
ENDPOINT=http://localhost:4566

# ── S3 Buckets ──────────────────────────────────────────────
echo "  Creating S3 buckets..."
aws --endpoint-url http://localhost:4566 s3 mb s3://quillo-exports --region $REGION
aws --endpoint-url http://localhost:4566 s3 mb s3://quillo-assets --region $REGION

aws --endpoint-url http://localhost:4566 s3api put-bucket-cors --bucket quillo-exports --cors-configuration '{
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
DLQ_URL=$(aws --endpoint-url http://localhost:4566 sqs create-queue \
  --queue-name quillo-generation-dlq \
  --region $REGION \
  --query 'QueueUrl' --output text)

DLQ_ARN=$(aws --endpoint-url http://localhost:4566 sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Main generation queue với DLQ
MAIN_URL=$(aws --endpoint-url http://localhost:4566 sqs create-queue \
  --queue-name quillo-generation-queue \
  --region $REGION \
  --attributes "{
    \"VisibilityTimeout\": \"120\",
    \"MessageRetentionPeriod\": \"86400\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }" \
  --query 'QueueUrl' --output text)
echo "  Queue URL: $MAIN_URL"

# Capture ARN từ MAIN_URL:
MAIN_ARN=$(aws --endpoint-url http://localhost:4566 sqs get-queue-attributes \
  --queue-url "$MAIN_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)
echo "  Queue ARN: $MAIN_ARN"

# ── Secrets Manager ─────────────────────────────────────────
echo "  Creating Secrets Manager secret..."
SECRET_STRING=$(cat <<EOF
{"JWT_SECRET":"${JWT_SECRET}","DATABASE_URL":"${DATABASE_URL}","GEMINI_API_KEY":"${GEMINI_API_KEY}"}
EOF
)

if aws --endpoint-url http://localhost:4566 secretsmanager describe-secret --secret-id quillo/app-secrets --region $REGION >/dev/null 2>&1; then
  aws --endpoint-url http://localhost:4566 secretsmanager put-secret-value \
    --secret-id quillo/app-secrets \
    --secret-string "$SECRET_STRING" \
    --region $REGION
else
  aws --endpoint-url http://localhost:4566 secretsmanager create-secret \
    --name quillo/app-secrets \
    --secret-string "$SECRET_STRING" \
    --region $REGION
fi

# CloudWatch Log Groups (local dev)
echo "  Creating CloudWatch log groups..."
aws --endpoint-url http://localhost:4566 logs create-log-group --log-group-name /quillo/api --region $REGION 2>/dev/null || true
aws --endpoint-url http://localhost:4566 logs create-log-group --log-group-name /quillo/worker --region $REGION 2>/dev/null || true
echo "  CloudWatch log groups: OK"

echo "==> Quillo: LocalStack init done ✓"

