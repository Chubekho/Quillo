# Quillo — Project Context

> AI marketing copy platform in your brand's voice  
> Stack: Node/Express + React + PostgreSQL + AWS  
> Trạng thái: Tuần 1 / 2 tuần — đang xây foundation

---

## Tài liệu liên quan
| File | Mục đích |
|------|----------|
| docs/PROGRESS.md | Tiến độ hiện tại, task tiếp theo — đọc trước khi làm |
| docs/ROADMAP.md | Lộ trình 2 tuần, feature scope, milestones |
| docs/BACKEND_CONTEXT.md | API endpoints, patterns, files đã/chưa implement |
| docs/FRONTEND_CONTEXT.md | Component plan, data flow |
| docs/INFRASTRUCTURE_CONTEXT.md | AWS services, local setup |
| docs/GEMINI_INSTRUCTION.md | Standing orders cho agent |
| docs/AGENT_LOG.md | Append-only task log |

---

## Mục tiêu dự án
SaaS platform cho phép doanh nghiệp tự động hóa sản xuất nội dung marketing
bằng Generative AI (Amazon Bedrock / Claude). Điểm khác biệt cốt lõi: **Brand Persona**
— mọi content được sinh ra theo đúng giọng thương hiệu đã định nghĩa.

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Zustand + TanStack Query |
| Backend | Node.js + Express + TypeScript + Prisma ORM |
| Database | PostgreSQL (RDS) — local: Docker |
| AI | Amazon Bedrock (Claude Sonnet cho generate, Claude Haiku cho edit) |
| Queue | Amazon SQS + DLQ — local: LocalStack |
| Storage | Amazon S3 — local: LocalStack |
| Cache | Redis (ElastiCache) — local: Docker |
| Auth | JWT (access + refresh token rotation) |

---

## Cấu trúc thư mục
quillo/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ← 11 bảng, đã hoàn chỉnh
│   │   └── seed.ts              ← Dev seed data
│   └── src/
│       ├── config/              ← database, redis, aws, logger
│       ├── controllers/         ← auth ✅  content ✅  persona ✅
│       ├── middlewares/         ← auth, errorHandler, notFound
│       ├── routes/              ← 8 route files
│       ├── services/ai/         ← bedrock.service, generationQueue.service
│       ├── app.ts               ← Express setup
│       ├── server.ts            ← Entry point
│       └── worker.ts            ← SQS consumer (Lambda in prod)
├── frontend/
│   └── src/
│       ├── components/          ← đã có: ProtectedRoute.tsx, ui/(Badge, Spinner, Button, Input, Select), layout/AppLayout.tsx, persona/PersonaForm.tsx
│       ├── hooks/               ← useJobPoller.ts ✅
│       ├── pages/               ← đã có: Login, Register, Dashboard, ContentList, PersonaList, PersonaEditor (chưa có: ContentEditor, CampaignList (full), UsagePage (full))
│       ├── services/api.ts      ← Axios client + typed methods ✅
│       └── store/auth.store.ts  ← Zustand auth store ✅
├── infrastructure/
│   └── scripts/
│       ├── setup-local.sh       ← One-shot setup script
│       └── localstack-init.sh   ← LocalStack queue/bucket init
└── docker-compose.yml           ← PostgreSQL + Redis + LocalStack
└── docs/
    ├── QUILLO_PROJECT_CONTEXT.md
    ├── BACKEND_CONTEXT.md
    ├── FRONTEND_CONTEXT.md
    ├── INFRASTRUCTURE_CONTEXT.md
    ├── PROGRESS.md
    ├── GEMINI_INSTRUCTION.md
    └── ROADMAP.md
    └── AGENT_LOG.md

---

## Database Schema (11 bảng)
organizations (multi-tenant root)
├── users → refresh_tokens
├── brand_personas ← CORE DIFFERENTIATOR
├── campaigns
│   └── content_pieces
│       ├── content_versions  (AI + human edit history)
│       ├── generation_jobs   (async job tracking)
│       ├── exports           (PDF/DOCX/HTML → S3)
│       └── usage_logs        (token tracking, cost)
└── assets (logo, brand images → S3)

---

## API Endpoints (base: /api/v1)
POST   /auth/register          ← tạo org + user đầu tiên
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

GET    /personas               ← list (có Redis cache 30 min)
POST   /personas
PUT    /personas/:id
DELETE /personas/:id
PATCH  /personas/:id/set-default

GET    /content
POST   /content                ← tạo content piece (status: DRAFT)
GET    /content/:id
PATCH  /content/:id
POST   /content/:id/generate   ← enqueue SQS job → trả về {jobId}
POST   /content/:id/rewrite
POST   /content/:id/expand
POST   /content/:id/shorten
GET    /content/:id/jobs/:jobId ← POLLING endpoint
GET    /content/:id/versions
POST   /content/:id/versions/:vId/restore
GET    /content/:id/exports    ← list exports của content piece
POST   /content/:id/export     ← generate PDF/DOCX/HTML → S3 presigned URL


GET    /campaigns              ← stub, chưa implement

GET    /health

GET    /usage                  ← usage summary tháng hiện tại + per model

GET    /org                    ← org info + quota + plan + usage embedded
PATCH  /org                    ← update quota/plan (OWNER/ADMIN only)

---

## Async Generation Flow (QUAN TRỌNG)
POST /content/:id/generate
→ API tạo GenerationJob(status=QUEUED) trong DB
→ API gửi message vào SQS
→ API trả về { jobId } NGAY (không chờ)

Worker (worker.ts / Lambda):
→ Nhận SQS message
→ Check quota của org
→ Load ContentPiece + BrandPersona
→ Build prompt (persona-aware)
→ Gọi Amazon Bedrock
→ Lưu ContentVersion vào DB
→ Update job status = COMPLETED
→ Ghi UsageLog

Frontend poll GET /content/:id/jobs/:jobId mỗi 2.5s
→ Khi COMPLETED: fetch content mới nhất

---

## Environment Variables Cần Thiết (backend/.env)
DATABASE_URL=postgresql://quillo:quillo_secret@localhost:5432/quillo_dev
JWT_SECRET=<min 32 chars>
REDIS_URL=redis://localhost:6379
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=test            ← dùng "test" cho LocalStack
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566
SQS_GENERATION_QUEUE_URL=http://localhost:4566/000000000000/quillo-generation-queue
SQS_DLQ_URL=http://localhost:4566/000000000000/quillo-generation-dlq
S3_EXPORTS_BUCKET=quillo-exports
BEDROCK_GENERATE_MODEL=us.anthropic.claude-sonnet-4-5
BEDROCK_EDIT_MODEL=us.anthropic.claude-haiku-4-5

---

> Xem tiến độ chi tiết tại docs/PROGRESS.md

---

## Patterns & Conventions

### Backend
- Controller nhận req/res, gọi service, không viết business logic trực tiếp
- Mọi error đi qua `next(err)` → `errorHandler` middleware
- Multi-tenant: mọi query đều filter `organizationId: req.user!.orgId`
- Async jobs KHÔNG block API — luôn trả về `{ jobId }` và `202 Accepted`
- Token tracking: mọi Bedrock call phải ghi `UsageLog`

### Frontend  
- Zustand cho global state (auth)
- TanStack Query cho server state (content, personas)
- `useJobPoller(contentId, jobId)` hook cho async polling

### Không làm (scope constraints)
- Multi-model comparison UI
- Real-time WebSocket (dùng polling thay)
- Multi-language UI (chỉ Vietnamese content)
- Image generation

---

## Local Dev Quick Start

```bash
bash infrastructure/scripts/setup-local.sh  # first time only
npm run dev                                  # API:3001 + Frontend:5173
cd backend && npm run worker:dev             # SQS worker (terminal 2)
npm run db:studio                            # Prisma Studio
```

Login demo: `admin@acme.demo` / `password123`
