#!/bin/bash
set -e

echo "==> 1. Starting Docker Compose (detached)..."
docker compose up -d

echo "==> 2. Waiting for services ready..."
echo "Waiting for PostgreSQL..."
sleep 8

echo "Waiting for LocalStack..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
  HEALTH=$(curl -s http://localhost:4566/_localstack/health 2>/dev/null)
  SQS_OK=$(echo $HEALTH | grep -c '"sqs".*"available"' || true)
  LOGS_OK=$(echo $HEALTH | grep -c '"logs".*"available"' || true)
  SECRET_OK=$(echo $HEALTH | grep -c '"secretsmanager".*"available"' || true)
  if [ "$SQS_OK" -gt 0 ] && [ "$LOGS_OK" -gt 0 ] && [ "$SECRET_OK" -gt 0 ]; then
    echo "LocalStack is ready! (sqs + logs + secretsmanager)"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
if [ $elapsed -ge $timeout ]; then
  echo "ERROR: LocalStack timeout after ${timeout}s"
  exit 1
fi

echo "==> 3. Initializing LocalStack resources (SQS + S3 + Secrets + CloudWatch)..."
echo "  NOTE: Requires JWT_SECRET, DATABASE_URL, GEMINI_API_KEY in env"
echo "  Run: source export-env.sh before this script if not already set"
if [ -z "$JWT_SECRET" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "  WARNING: Secret env vars not set — skipping localstack-init.sh"
  echo "  Run manually: source export-env.sh && bash infrastructure/scripts/localstack-init.sh"
else
  bash infrastructure/scripts/localstack-init.sh
fi

echo "==> 4. Installing npm dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend && npm install

echo "Installing frontend dependencies..."
cd ../frontend && npm install

echo "==> 5. Running Prisma migrate & seed..."
cd ../backend
npx prisma migrate deploy
npx prisma db seed

echo "==> 6. Print success summary"
echo "✅ Setup done!"
echo "   API:    http://localhost:3001"
echo "   Front:  http://localhost:5173"
echo "   SQS:    http://localhost:4566/000000000000/quillo-generation-queue"
echo ""
echo "Next steps:"
echo "   Terminal 1: npm run dev"
echo "   Terminal 2: cd backend && npm run worker:dev"
