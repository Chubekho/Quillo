# Quillo — Progress Tracker

> Human-managed. Cập nhật cuối mỗi ngày bằng cách distill từ AGENT_LOG.md.
> Agent KHÔNG tự ghi file này. Xem GEMINI_INSTRUCTION.md để biết quy tắc.

---

## Trạng thái hiện tại

**Sprint:** Tuần 1 / 2 | **Ngày:** Day 3 ✅ DONE  
**Branch:** main  
**Last updated:** 2026-06-24

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

---

## Đang bị block 🔴

- **Bedrock API invocation**: AWS account chưa được authorize cho Anthropic models
  - Error: "Operation not allowed"
  - AWS Support case đã tạo, đang chờ phản hồi
  - Không ảnh hưởng Day 4 tasks (Export service)

---

## Tiếp theo 🟡 (Day 4)

1. `export.service.ts` — PDF/DOCX/HTML generate từ content body → upload S3 → presigned URL
2. Export controller + route
3. Login.tsx + Register.tsx pages (có thể advance nếu export xong sớm)

---

## Known Issues ⚠️

- Bedrock blocked: AWS account authorization pending support case
- Worker cần SQS queue tồn tại trước khi start (chạy `setup-local.sh`)

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