# Quillo — AI marketing copy in your brand's voice

> Nền tảng SaaS tự động hóa sản xuất nội dung marketing bằng Generative AI, triển khai trên AWS.

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- AWS account (chỉ cần cho Bedrock — AI)

```bash
# 1. Clone repo
git clone <repo-url>
cd quillo

# 2. Khởi động PostgreSQL + Redis + LocalStack
npm run docker:up

# 3. Cài dependencies
npm install

# 4. Setup backend env
cp backend/.env.example backend/.env
# Điền AWS credentials vào backend/.env

# 5. Chạy migrations + seed
npm run db:migrate
npm run db:seed

# 6. Start dev servers (API + Frontend đồng thời)
npm run dev

# (Optional) Chạy worker riêng để process generation jobs
# Terminal mới:
cd backend && npm run worker:dev
```

- **API:** http://localhost:3001/api/v1
- **Frontend:** http://localhost:5173
- **Prisma Studio:** `npm run db:studio`
- **LocalStack dashboard:** http://localhost:4566

### Tài khoản demo
```
Email:    admin@acme.demo
Password: password123
```

---

## 🏗 Cấu trúc dự án

```
quillo/
├── backend/                   # Express API + Worker
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (10 tables)
│   │   └── seed.ts            # Dev seed data
│   └── src/
│       ├── config/            # DB, Redis, AWS, Logger
│       ├── controllers/       # Route handlers
│       ├── middlewares/       # Auth, error handler
│       ├── routes/            # Express routers
│       ├── services/
│       │   └── ai/            # Bedrock + SQS queue
│       ├── app.ts             # Express app setup
│       ├── server.ts          # Entry point
│       └── worker.ts          # SQS consumer (Lambda in prod)
│
├── frontend/                  # React + Vite + TypeScript
│   └── src/
│       ├── components/        # UI components
│       ├── hooks/             # useJobPoller, custom hooks
│       ├── pages/             # Route pages
│       ├── services/          # API client (axios)
│       ├── store/             # Zustand stores
│       └── types/             # TypeScript types
│
├── infrastructure/
│   ├── cdk/                   # AWS CDK (IaC)
│   └── scripts/
│       └── localstack-init.sh # LocalStack bootstrap
│
├── docker-compose.yml          # Local: PostgreSQL + Redis + LocalStack
└── package.json                # Monorepo root
```

---

## 🗄 Database Schema

10 bảng PostgreSQL (Prisma ORM):

| Bảng | Mô tả |
|------|-------|
| `organizations` | Multi-tenant root — quota tracking |
| `users` | Users với role (OWNER/ADMIN/MEMBER/VIEWER) |
| `refresh_tokens` | JWT refresh token rotation |
| `brand_personas` | Persona thương hiệu — core differentiator |
| `campaigns` | Chiến dịch marketing |
| `content_pieces` | Content piece với state machine |
| `content_versions` | Lịch sử mọi phiên bản (AI + human edit) |
| `generation_jobs` | Job tracking cho async pipeline |
| `exports` | File exports (PDF/DOCX/HTML) + S3 keys |
| `assets` | Brand assets (logo, images) |
| `usage_logs` | Token tracking + cost estimation |

---

## ☁️ AWS Services

| Service | Dùng cho |
|---------|----------|
| EC2 (private subnet) | Express API |
| Lambda | SQS Worker (prod) |
| **Amazon Bedrock** | Claude — sinh nội dung AI |
| **SQS + DLQ** | Hàng đợi job async |
| RDS PostgreSQL Multi-AZ | Database chính |
| S3 | Exports (PDF/DOCX/HTML) + Assets |
| CloudFront | CDN + serve React SPA |
| API Gateway | Entry point + throttling |
| WAF | SQLi/XSS/Bot protection |
| Cognito | Auth (prod) |
| ElastiCache Redis | Cache persona + rate limit |
| Secrets Manager | DB credentials + API keys |
| CloudWatch | Logs + metrics + alarms |

---

## 📋 Content Types

- `BLOG_POST` — Bài blog chuẩn SEO
- `SOCIAL_MEDIA` — Post mạng xã hội (FB/IG/LinkedIn)
- `AD_COPY` — Nội dung quảng cáo
- `EMAIL` — Email marketing

## 🔄 Luồng generate content (async)

```
User tạo content → POST /content/:id/generate
→ API tạo GenerationJob (QUEUED) trong DB
→ API gửi message vào SQS
→ API trả về { jobId } ngay (không chờ)

Lambda Worker consume SQS:
→ Check quota
→ Load piece + persona
→ Build prompt (persona-aware)
→ Gọi Bedrock (Claude)
→ Ghi ContentVersion vào DB
→ Update job COMPLETED
→ Ghi UsageLog

Frontend poll GET /content/:id/jobs/:jobId mỗi 2.5s
→ Khi COMPLETED: hiện nội dung
```

---

## 📅 Lộ trình 2 tuần

**Tuần 1:** Foundation (Done ✓ scaffold) → Auth → Persona CRUD → Luồng async end-to-end

**Tuần 2:** Content editing → Export PDF/DOCX/HTML → Token tracking → Deploy AWS → CI/CD
