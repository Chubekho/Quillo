#!/bin/bash
set -e

echo "==> 1. Starting Docker Compose (detached)..."
docker-compose up -d

echo "==> 2. Waiting for services ready..."
echo "Waiting for PostgreSQL..."
sleep 8

echo "Waiting for LocalStack..."
timeout=30
elapsed=0
while [ $elapsed -lt $timeout ]; do
  if curl -s http://localhost:4566/_localstack/health | grep '"sqs": "available"' > /dev/null; then
    echo "LocalStack is ready!"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "==> 3. Creating SQS queues..."
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

aws sqs create-queue \
   --queue-name quillo-generation-dlq \
   --endpoint-url http://localhost:4566 || true

DLQ_ARN=$(aws sqs get-queue-attributes \
   --queue-url http://localhost:4566/000000000000/quillo-generation-dlq \
   --attribute-names QueueArn \
   --query 'Attributes.QueueArn' \
   --output text \
   --endpoint-url http://localhost:4566)

aws sqs create-queue \
   --queue-name quillo-generation-queue \
   --attributes "{\"VisibilityTimeout\":\"120\",\"MessageRetentionPeriod\":\"86400\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
   --endpoint-url http://localhost:4566 || aws sqs set-queue-attributes \
   --queue-url http://localhost:4566/000000000000/quillo-generation-queue \
   --attributes "{\"VisibilityTimeout\":\"120\",\"MessageRetentionPeriod\":\"86400\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
   --endpoint-url http://localhost:4566

aws sqs list-queues --endpoint-url http://localhost:4566

echo "==> 4. Creating S3 buckets..."
aws s3 mb s3://quillo-exports --endpoint-url http://localhost:4566 || true
aws s3 mb s3://quillo-assets --endpoint-url http://localhost:4566 || true

echo "==> 5. Installing npm dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend && npm install

echo "Installing frontend dependencies..."
cd ../frontend && npm install

echo "==> 6. Running Prisma migrate & seed..."
cd ../backend
npx prisma migrate deploy
npx prisma db seed

echo "==> 7. Print success summary"
echo "✅ Setup done!"
echo "   API:    http://localhost:3001"
echo "   Front:  http://localhost:5173"
echo "   SQS:    http://localhost:4566/000000000000/quillo-generation-queue"
echo ""
echo "Next steps:"
echo "   Terminal 1: npm run dev"
echo "   Terminal 2: cd backend && npm run worker:dev"
