# Infrastructure Context — Quillo

AWS services list + local dev setup. Đọc QUILLO_PROJECT_CONTEXT.md trước.

---

## AWS Services (Production)

| Service | Mục đích | Notes |
|---------|----------|-------|
| EC2 (private subnet) | Express API server | t3.small minimum |
| Lambda | SQS worker (worker.ts) | Node 20 runtime |
| Amazon Bedrock | Claude models | Cần enable trong AWS Console |
| SQS + DLQ | Async generation queue | Standard queue (không cần FIFO) |
| RDS PostgreSQL Multi-AZ | Database | db.t3.micro dev, t3.small prod |
| S3 (2 buckets) | quillo-exports, quillo-assets | |
| CloudFront | CDN cho React SPA | |
| API Gateway | Entry point + throttling | |
| WAF | SQLi/XSS/Bot protection | |
| Cognito | Auth (prod) | Hiện dùng JWT tự quản |
| ElastiCache Redis | Cache persona + rate limit | cache.t3.micro |
| Secrets Manager | DB creds, API keys | |
| CloudWatch | Logs + metrics + alarms | |

---

## Local Dev Stack (Docker)

```yaml
# docker-compose.yml
postgres:   localhost:5432  → quillo_dev (user: quillo, pass: quillo_secret)
redis:      localhost:6379
localstack: localhost:4566  → emulate SQS + S3 + SecretsManager
```

---

## LocalStack Resources

Tạo 1 lần bằng script hoặc lệnh thủ công:

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=ap-southeast-1

# SQS
aws sqs create-queue --queue-name quillo-generation-dlq --endpoint-url http://localhost:4566
aws sqs create-queue --queue-name quillo-generation-queue \
  --attributes "VisibilityTimeout=120" --endpoint-url http://localhost:4566

# S3
aws s3 mb s3://quillo-exports --endpoint-url http://localhost:4566
aws s3 mb s3://quillo-assets  --endpoint-url http://localhost:4566
```

Verify: `aws sqs list-queues --endpoint-url http://localhost:4566`

---

## Network Architecture
Internet → CloudFront → WAF → API Gateway → EC2 (private subnet)
↓
SQS Queue
↓
Lambda Worker
↓
Amazon Bedrock
VPC: 1 Region, 2 AZ  
Public subnet: ALB (nếu mở rộng)  
Private subnet: EC2, RDS

---

## Scripts
infrastructure/scripts/
├── setup-local.sh      ← One-shot: Docker + queues + S3 + npm install + migrate + seed
└── localstack-init.sh  ← Chạy tự động khi LocalStack start (qua docker-compose volume)

---

## Chưa implement

- CDK/Terraform IaC cho production deployment
- CI/CD pipeline (GitHub Actions)
- CloudWatch alarms setup
- WAF rules configuration
- Secrets Manager integration (hiện đang dùng .env)
- Lambda deployment package
- RDS backup policy