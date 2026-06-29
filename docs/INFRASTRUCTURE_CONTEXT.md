# Infrastructure Context — Quillo

AWS services list + local dev setup. Đọc QUILLO_PROJECT_CONTEXT.md trước.

---

## AWS Services (Production)

| Service | Mục đích | Notes |
|---------|----------|-------|
| EC2 (private subnet) | Express API server | t3.small minimum |
| Lambda | SQS worker (worker.ts) | Node 20 runtime |
| Gemini API (external) | AI content generation | Gemini 2.5 Flash via AI_PROVIDER flag |
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
localstack: localhost:4566  → emulate SQS + S3 + SecretsManager + CloudWatch Logs
```

---

## LocalStack Resources

Tạo tự động khi chạy setup lần đầu. Workflow:

```bash
# Lần đầu setup:
bash infrastructure/scripts/setup-local.sh

# Sau mỗi lần restart LocalStack (cần env vars):
source export-env.sh   # load JWT_SECRET, DATABASE_URL, GEMINI_API_KEY từ backend/.env
bash infrastructure/scripts/localstack-init.sh
```

Resources được tạo bởi localstack-init.sh:
- S3: quillo-exports (có CORS), quillo-assets
- SQS: quillo-generation-dlq, quillo-generation-queue (với RedrivePolicy → DLQ)
- Secrets Manager: quillo/app-secrets (JSON: JWT_SECRET + DATABASE_URL + GEMINI_API_KEY)
- CloudWatch Logs: /quillo/api, /quillo/worker

Verify sau khi chạy:
```bash
aws --endpoint-url http://localhost:4566 sqs list-queues
aws --endpoint-url http://localhost:4566 logs describe-log-groups --region ap-southeast-1
aws --endpoint-url http://localhost:4566 secretsmanager get-secret-value \
  --secret-id quillo/app-secrets --region ap-southeast-1
```

⚠️ KHÔNG dùng awslocal — dùng aws --endpoint-url http://localhost:4566 cho mọi LocalStack command.

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

## Deployment Scripts (Day 12-13)

Thứ tự chạy khi deploy production:
1. bash infrastructure/scripts/setup-cloudwatch.sh  (cần ALARM_EMAIL env var)
2. bash infrastructure/scripts/setup-waf.sh
3. Tạo EC2 + ALB → lấy ALB ARN
4. aws wafv2 associate-web-acl \
     --web-acl-arn $(cat infrastructure/outputs/waf-webacl-arn.txt) \
     --resource-arn <ALB_ARN> \
     --region ap-southeast-1

---

## Scripts
infrastructure/scripts/
├── setup-local.sh        ← One-shot first-time setup: Docker + LocalStack init + npm + migrate + seed
├── localstack-init.sh    ← Re-run sau mỗi LocalStack restart (source export-env.sh trước)
├── setup-cloudwatch.sh   ← Real AWS: tạo Log Groups, SNS Topic, Metric Filters, Alarms
├── setup-waf.sh          ← Real AWS: tạo WAF WebACL (REGIONAL) với SQLi/XSS/RateLimit rules
├── build-lambda.sh       ← Bundle worker.ts → dist-lambda/index.js → worker-lambda.zip (esbuild bundle-all)
└── deploy-frontend.sh    ← S3 sync frontend/dist/ + CloudFront invalidation (cần S3_BUCKET + CF_DISTRIBUTION_ID)

export-env.sh ← Local only, gitignored. Load JWT_SECRET/DATABASE_URL/GEMINI_API_KEY từ backend/.env

---

## Chưa implement (cần khi deploy Day 12-13)
- CDK/Terraform IaC thay thế AWS CLI scripts (optional)
- CI/CD pipeline (GitHub Actions)
- Lambda deploy: worker-lambda.zip đã sẵn, chạy aws lambda update-function-code
- ECR repository + push Docker image quillo-api (hoặc deploy EC2 trực tiếp từ git pull)
- CloudFront distribution tạo mới, S3 bucket quillo-frontend với static website hosting
- RDS backup policy
- WAF associate với ALB (sau khi tạo ALB xong)
- CloudWatch alarms + SNS subscription confirm (chạy setup-cloudwatch.sh + confirm email)
- Secrets Manager production secret (giá trị production thật — hiện LocalStack only)