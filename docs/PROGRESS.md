# Quillo — Progress Tracker

> Human-managed. Cập nhật cuối mỗi ngày bằng cách distill từ AGENT_LOG.md.
> Agent KHÔNG tự ghi file này. Xem GEMINI_INSTRUCTION.md để biết quy tắc.

---

## Trạng thái hiện tại

**Sprint:** Tuần 2 / 2 | **Ngày:** Day 7 ✅ DONE
**Branch:** main  
**Last updated:** 2026-06-26

---

## Đã hoàn thành ✅

**[Backend — Session 1-2]**
- Monorepo scaffold + Docker Compose (PostgreSQL + Redis + LocalStack)
- Prisma schema 11 bảng multi-tenant + seed data
- Config layer: database, redis, aws (LocalStack-aware), logger
- Express app với đầy đủ middleware (helmet, cors, rateLimit, morgan)
- Auth flow: register/login/refresh/logout/me + JWT rotation
- Brand Persona: CRUD + Redis cache 30 phút + setDefault
- Content: CRUD + async AI operations (generate/rewrite/expand/shorten) → SQS
- worker.ts: SQS consumer → Bedrock → ContentVersion → UsageLog
- Fix Prisma v7 breaking change: migrate sang prisma.config.ts + adapter-pg

**[Frontend — Session 2]**
- Vite bootstrap: index.html, vite.config.ts, tsconfig, tailwind, postcss
- App.tsx skeleton routing + main.tsx với QueryClient + Toaster
- api.ts: Axios client + auto-refresh interceptor + typed API methods
- auth.store.ts: Zustand global auth state
- useJobPoller.ts: polling hook mỗi 2.5s, auto-stop khi job xong

**[Infrastructure — Session 1-2]**
- setup-local.sh: one-shot setup script (tạo lại Day 3)
- Fix LocalStack SQS URL: `http://localhost:4566/000000000000/{queue}`
- Fix localstack-init.sh: đổi queue-url format từ sqs.region.localhost.localstack.cloud → localhost:4566

**[Docs — Session 2]**
- docs/: 5 context files (Project, Backend, Frontend, Infra, Progress)
- docs/GEMINI_INSTRUCTION.md + docs/AGENT_LOG.md

**[Backend — Day 3]**
- Campaign CRUD: campaign.service.ts + campaign.controller.ts + routes
  - GET /campaigns, POST /campaigns, GET /campaigns/:id, PATCH /campaigns/:id, DELETE /campaigns/:id
  - Multi-tenant filter đúng, soft delete → status=ARCHIVED
- Fix persona.controller.ts: normalize exampleOutputs String → String[]
- Fix generationQueue.service.ts: xóa MessageDeduplicationId (FIFO-only param)
- Fix aws.ts: BedrockRuntimeClient không dùng LocalStack endpoint (delete AWS_ENDPOINT_URL)
- E2E test verified: Register → Login → Persona → Content → Generate (QUEUED) → Poll job
- Worker verified: SQS polling active, nhận message, update DB đúng

**[Backend — Day 4]**
- BEDROCK_MOCK=true: mockInvoke() + buildMockContent() trong bedrock.service.ts
  - Persona-aware mock copy theo content type (BLOG_POST/SOCIAL_MEDIA/EMAIL/AD_COPY)
  - sleep(800ms) giả lập latency, đúng shape GenerationResult mà worker.ts parse
  - Worker không bị sửa, tắt mock chỉ cần đổi env var
- Export service: generateHtml/generatePdf/generateDocx/exportContent
  - PDF: pdfkit parse marked tokens (heading/paragraph/list/blockquote)
  - DOCX: html-to-docx, HTML: marked + inline CSS
  - Upload S3 LocalStack, presigned URL TTL 1h
  - Multi-tenant filter organizationId mọi query, error → status=FAILED
- Export controller + route: POST /:id/export, GET /:id/exports, mount vào app.ts
- Fix S3Client: thêm forcePathStyle: true (fix ENOTFOUND virtual-hosted URL)
- E2E verified: generate (mock) → COMPLETED → export PDF/DOCX/HTML → download OK

**[Backend — Day 5]**
- Usage tracking: GET /api/v1/usage trả summary tháng hiện tại
  - getCurrentMonthUsage / getUsageByModel / getUsageSummary
  - Prisma aggregate + groupBy theo calendar month UTC, multi-tenant
  - Org không có usage_logs → trả 0, không throw
  - monthlyTokenQuota null → quota=null, unlimited
- Quota enforcement: checkQuota() dùng chung cho API + worker
  - API (content.controller.ts): 429 QUOTA_EXCEEDED trước khi enqueue SQS
  - Worker (worker.ts): FAILED + return khi quota exceeded, không throw → tránh retry/DLQ
- Org settings: GET + PATCH /api/v1/org
  - GET trả org info + embedded usage summary
  - PATCH: chỉ OWNER/ADMIN, validate quota >= 0, plan hợp lệ
  - Role check trong controller, MEMBER/VIEWER → 403
- E2E verified: usage update sau generate, quota reject 429, org update đúng role
**[Frontend — Day 6]**
- ProtectedRoute.tsx: kiểm tra isAuthenticated, hydrate user qua fetchMe() khi có token nhưng chưa có user (reload trang), spinner trong lúc chờ, redirect /login kèm location.state
- App.tsx: cấu trúc routing đầy đủ — public (/login, /register), protected (/, /content, /personas, /campaigns, /usage) bọc trong ProtectedRoute + AppLayout, catch-all → /
- Placeholder pages: Dashboard, ContentList, PersonaList, CampaignList, UsagePage (stub, chưa implement nội dung)
- Login.tsx: react-hook-form + zod, validate email format + password ≥ 8 ký tự, toast lỗi API, redirect navigate(from, { replace: true })
- Register.tsx: fields orgName/name/email/password/confirmPassword, zod .refine() so khớp password, confirmPassword không gửi lên API, auto-login sau register → redirect /
- AppLayout.tsx: layout 2 cột responsive, sidebar với NavLink highlight active, lucide-react icons, hiển thị user.name + org.name từ auth.store, logout gọi authApi.logout() → clear store → /login (lỗi vẫn clear)
- vite-env.d.ts: thêm reference vite/client, fix lỗi TS2339 ImportMeta
- Fix: navigate(from, { replace: true }) trong Login — tránh Back button quay lại /login sau khi đã đăng nhập

**[Frontend — Day 7]**
- Spinner.tsx: component dùng chung, prop size optional, Tailwind animation
- Badge.tsx: component dùng chung, ánh xạ màu cho ContentType (BLOG_POST/SOCIAL_MEDIA/AD_COPY/EMAIL) và ContentStatus/JobStatus
- api.ts: bổ sung orgApi.get(), orgApi.update(), usageApi.getSummary() theo đúng pattern hiện có
- Dashboard.tsx: full implement — usage widget (token tháng/quota + progress bar, xử lý quota=null → "Không giới hạn"), recent content 5 item mới nhất, 3 quick action điều hướng /content /personas /campaigns
- ContentList.tsx: full implement — list content với Badge type/status/ngày, filter server-side (type/status/campaignId params), dropdown campaign từ GET /campaigns, 2 empty state phân biệt, row click TODO Day 9
- TanStack Query cho mọi fetch: loading (Spinner) + error state đầy đủ

---

## Đang bị block 🔴

- **Bedrock API invocation**: free tier không hỗ trợ technical, sẽ mượn account team có quyền Bedrock; tạm dùng BEDROCK_MOCK.

---

## Tiếp theo 🟡 (Day 8)

1. PersonaList.tsx: list personas + badge "default" + actions
2. PersonaEditor.tsx: form tạo/sửa persona (tone, voice, targetAudience, keywords, avoidWords, exampleOutputs)
3. Set default persona flow

---

## Known Issues ⚠️

- Bedrock blocked: dùng BEDROCK_MOCK=true tạm thời, sẽ mượn account team bootcamp có quyền Bedrock
- Worker cần SQS queue tồn tại trước khi start (chạy setup-local.sh)

---

## Decisions đã chốt 📌

| Quyết định | Lý do |
|-----------|-------|
| Polling 2.5s thay vì WebSocket | Đơn giản hơn, đủ cho bootcamp |
| Soft delete (status=ARCHIVED) | Giữ history, dễ restore |
| Prisma v7 + adapter-pg | Không downgrade, học đúng version mới |
| Redis cache persona 30 phút | Persona ít thay đổi, giảm DB load |
| Lambda Worker tách khỏi API | Không block request khi AI generate |
| BedrockRuntimeClient tách endpoint riêng | LocalStack không emulate Bedrock |
| AWS_REGION=us-east-1 cho Bedrock | Cross-region inference profile us.* chỉ support US regions |
| Export sync (không qua SQS) | Text export nhanh, không cần queue |
| S3 forcePathStyle: true | LocalStack không support virtual-hosted style |
| BEDROCK_MOCK flag | Unblock pipeline, tắt khi có account thật, không sửa code |
| checkQuota() dùng chung API + worker | Không duplicate logic, tắt DLQ retry khi quota exceeded |
| Role check trong controller (không middleware) | Trả 403 message rõ ràng, flexible hơn |
| react-hook-form + zod cho mọi form | Type-safe validation, ít boilerplate, tái dùng pattern cho PersonaEditor Day 8 |
| navigate(from, { replace: true }) sau login | Tránh Back button quay lại /login, UX chuẩn |
| Server-side filter cho GET /content | Backend hỗ trợ params type/status/campaignId, tránh load toàn bộ data về client |