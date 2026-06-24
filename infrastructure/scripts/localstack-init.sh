#!/bin/bash
# Chạy tự động khi LocalStack khởi động xong

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

echo "==> Quillo: LocalStack init done ✓"
