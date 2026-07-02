# Infrastructure Context — Quillo

AWS services list + local dev setup. Đọc QUILLO_PROJECT_CONTEXT.md trước.

---

## AWS Services (Production)

| Service | Mục đích | Notes |
|---------|----------|-------|
| EC2 (ASG, private subnet) | Express API server | Đứng sau ALB internet-facing, t3.small minimum |
| ALB | Public entry point | health check /api/v1/health |
| Auto Scaling Group | Quản lý EC2 instances | min=2 max=4, CPU target tracking 60% |
| Lambda | SQS worker (worker.ts) | Node 20 runtime |
| Gemini API (external) | AI content generation | Gemini 2.5 Flash via AI_PROVIDER flag |
| SQS + DLQ | Async generation queue | Standard queue (không cần FIFO) |
| RDS PostgreSQL Multi-AZ | Database | db.t3.micro dev, t3.small prod |
| S3 (2 buckets) | quillo-exports, quillo-assets | |
| CloudFront | CDN cho React SPA | BLOCKED (account chưa verify), dùng Cloudflare |
| WAF | SQLi/XSS/Bot protection | Associated với ALB (Task 13.6) |
| Cognito | Auth (prod) | Hiện dùng JWT tự quản |
| ElastiCache Redis | Cache persona + rate limit | cache.t3.micro, SG quillo-redis-sg |
| Secrets Manager | DB creds, API keys | |
| CloudWatch | Logs + metrics + alarms | Alarms + SNS live (quillo-prod-alerts) |

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

Internet → ALB (public subnet) → ASG/EC2 (private subnet)
↓
SQS Queue
↓
Lambda Worker (VPC, private subnet)
↓
Gemini API (external, qua NAT Gateway)

- CloudFront: BLOCKED (account chưa verify), thay bằng Cloudflare proxy (free)
  - Frontend: quillo.khuongle.site
  - Backend: quillo-api.khuongle.site (dùng subdomain 1 cấp thay vì api.quillo để tương thích Cloudflare Universal SSL free)
- WAF: WebACL "quillo-waf" (REGIONAL) associated với ALB (Task 13.6, DONE)

VPC: 1 Region, 2 AZ  
Public subnet: ALB, NAT Gateway  
Private subnet: EC2 (ASG), RDS, ElastiCache Redis, Lambda

---

## Deployment Scripts (Day 12-13)

Thứ tự chạy provision production thực tế (Task 12.3 → 13.4):
1. **[DONE]** `bash infrastructure/scripts/setup-vpc.sh`
2. **[DONE]** `bash infrastructure/scripts/setup-rds.sh`
3. **[DONE]** `bash infrastructure/scripts/setup-s3-buckets.sh` và `setup-prod-secrets.sh`
4. **[DONE]** `bash infrastructure/scripts/setup-ecr.sh` và `push-image.sh`
5. **[DONE]** `bash infrastructure/scripts/setup-iam-alb.sh`
6. **[DONE]** `bash infrastructure/scripts/setup-redis.sh`
7. **[DONE]** `bash infrastructure/scripts/setup-asg.sh`
8. **[DONE]** `bash infrastructure/scripts/setup-lambda.sh`
9. **[DONE]** `npx prisma migrate deploy` (qua SSM port-forwarding lên RDS)
10. **[DONE]** `bash infrastructure/scripts/setup-cloudwatch.sh` (cần confirm SNS email)
11. **[DONE]** WAF: associate WebACL (đã tạo sẵn) với ALB
12. **[BLOCKED]** CloudFront: account chưa verify — xem Known Issues

---

## Scripts
infrastructure/scripts/
├── setup-local.sh        ← One-shot first-time setup: Docker + LocalStack init + npm + migrate + seed
├── localstack-init.sh    ← Re-run sau mỗi LocalStack restart (source export-env.sh trước)
├── setup-vpc.sh          ← Real AWS: thiết lập VPC, Subnets, Route Tables, IGW, NAT GW và SGs
├── setup-rds.sh          ← Real AWS: tạo Subnet Group và RDS PostgreSQL Multi-AZ
├── setup-s3-buckets.sh   ← Real AWS: tạo S3 buckets (exports, assets) với block public access/CORS
├── setup-prod-secrets.sh ← Real AWS: tạo SQS, DLQ và Secrets Manager lưu app-secrets-prod
├── setup-ecr.sh          ← Real AWS: tạo ECR repository quillo-api với scanOnPush
├── push-image.sh         ← Real AWS: build Docker image (linux/amd64) và push lên ECR
├── setup-iam-alb.sh      ← Real AWS: thiết lập IAM role, ALB public và Target Group HTTP
├── setup-asg.sh          ← Real AWS: thiết lập Launch Template và Auto Scaling Group
├── setup-redis.sh        ← Real AWS: provision ElastiCache Redis trong Private Subnet
├── setup-lambda.sh       ← Real AWS: deploy Lambda worker + SQS Event Source Mapping
├── setup-cloudwatch.sh   ← Real AWS: tạo Log Groups, SNS Topic, Metric Filters, Alarms
├── setup-waf.sh          ← Real AWS: tạo WAF WebACL (REGIONAL) với SQLi/XSS/RateLimit rules
├── build-lambda.sh       ← Bundle worker.ts → dist-lambda/index.js → worker-lambda.zip (esbuild bundle-all)
└── deploy-frontend.sh    ← S3 sync frontend/dist/ + CloudFront invalidation (cần S3_BUCKET + CF_DISTRIBUTION_ID)

export-env.sh ← Local only, gitignored. Load JWT_SECRET/DATABASE_URL/GEMINI_API_KEY từ backend/.env

---

## Chưa implement (cần khi deploy Day 12-13)
- CloudFront distribution (BLOCKED — account chưa verify AWS Support). S3 static website hosting + Cloudflare proxy đã thay thế tạm thời.
- CI/CD pipeline (GitHub Actions)
- CDK/Terraform IaC thay thế AWS CLI scripts (optional)
- RDS backup policy