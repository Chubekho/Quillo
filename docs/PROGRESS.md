# Quillo — Progress Tracker

> Human-managed. Cập nhật cuối mỗi ngày bằng cách distill từ AGENT_LOG.md.
> Agent KHÔNG tự ghi file này. Xem GEMINI_INSTRUCTION.md để biết quy tắc.

---

## Trạng thái hiện tại

**Sprint:** Tuần 1 / 2 | **Ngày:** Day 3  
**Branch:** main  
**Last updated:** 2025-01-XX

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
- setup-local.sh: one-shot setup script
- Fix LocalStack SQS URL: `http://localhost:4566/000000000000/{queue}`

**[Docs — Session 2]**
- docs/: 5 context files (Project, Backend, Frontend, Infra, Progress)
- docs/GEMINI_INSTRUCTION.md + docs/AGENT_LOG.md

---

## Đang bị block 🔴

*(trống — điền khi có issue mới)*

---

## Tiếp theo 🟡

1. `campaign.controller.ts` + routes (stub hiện trả 501)
2. `export.service.ts` — PDF/DOCX/HTML → S3 presigned URL
3. Login.tsx + Register.tsx pages
4. Test end-to-end: register → persona → content → generate → poll job

---

## Known Issues ⚠️

- Bedrock không có LocalStack emulation — cần AWS credentials thật để test AI
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