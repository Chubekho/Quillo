# Quillo — Roadmap 2 tuần

> Lộ trình cố định. Không tự sửa file này.
> Trạng thái thực tế xem tại docs/PROGRESS.md

---

## Lưu ý quan trọng

- **Day 1-2 đã hoàn thành** — Setup AWS chi tiết (IaC, VPC, etc) để sau Deploy (Day 12-13)
- **Day 3-5 là critical path backend** — phải xong để Day 6-10 frontend test được API
- **Day 9 ContentEditor là milestone** — nếu delay sẽ ảnh hưởng demo ngày 14
- **Lộ trình này linh hoạt** — nếu task sớm xong hơn, có thể advance sang task tiếp theo

---

## Tuần 1 — Foundation & Core Pipeline

### Day 1-2 ✅ DONE
- Monorepo scaffold: backend + frontend + infrastructure
- Docker Compose: PostgreSQL + Redis + LocalStack
- Prisma schema 11 bảng multi-tenant
- Config layer: database, redis, aws, logger
- Express app + middleware
- Auth: register/login/refresh/logout/me + JWT rotation
- Brand Persona CRUD + Redis cache
- Content CRUD + async AI operations → SQS
- worker.ts: SQS consumer → Bedrock → ContentVersion → UsageLog
- Prisma v7 fix: prisma.config.ts + adapter-pg
- Frontend Vite bootstrap + App.tsx skeleton
- docs/: context files, GEMINI_INSTRUCTION.md, AGENT_LOG.md

### Day 3 ← ĐANG LÀM
- [x] Campaign controller + CRUD (thay stub 501)
- [x] Test end-to-end: register → persona → content → generate → poll job
- [x] Verify worker.ts chạy đúng với LocalStack SQS

### Day 4
- [x] Export service: PDF/DOCX/HTML generate từ content body
- [x] Upload export file lên S3 → trả về presigned URL
- [x] Export controller + route

### Day 5
- [x] Usage tracking: GET /usage theo tháng, per model
- [x] Quota enforcement: block generate khi vượt monthlyTokenQuota
- [x] Org settings: update quota, xem plan

---

## Tuần 2 — Frontend & Deploy

### Day 6
- [x] Login.tsx + Register.tsx (form + validation + redirect)
- [x] AppLayout.tsx: sidebar navigation
- [x] ProtectedRoute hoàn chỉnh

### Day 7
- [ ] Dashboard.tsx: token usage widget, recent content list, quick actions
- [ ] ContentList.tsx: list + filter by type/status/campaign

### Day 8
- [ ] PersonaList.tsx + PersonaEditor.tsx
- [ ] Form: tone, voice, targetAudience, keywords, avoidWords, exampleOutputs
- [ ] Set default persona flow

### Day 9 ← QUAN TRỌNG NHẤT
- [ ] ContentEditor.tsx: brief input + type selector + persona picker
- [ ] Generate button → useJobPoller → polling spinner → hiện kết quả
- [ ] Action buttons: Rewrite | Expand | Shorten
- [ ] VersionHistory.tsx: list versions + restore

### Day 10
- [ ] Export UI: button PDF/DOCX/HTML → download presigned URL
- [ ] CampaignList.tsx + tạo campaign mới
- [ ] Gắn content vào campaign

### Day 11
- [ ] CloudWatch: log groups, metric alarms (error rate, SQS queue depth)
- [ ] WAF: basic rules SQLi/XSS/rate limit
- [ ] Secrets Manager: migrate DB creds + JWT secret ra khỏi .env

### Day 12-13
- [ ] AWS deploy:
  - EC2 (private subnet): Express API
  - Lambda: worker.ts deployment package
  - RDS PostgreSQL Multi-AZ
  - S3 buckets + CloudFront distribution
  - SQS queues (production)
- [ ] Run prisma migrate deploy trên RDS
- [ ] Smoke test production endpoints

### Day 14
- [ ] CI/CD: GitHub Actions pipeline (lint → test → build → deploy)
- [ ] Demo prep: seed production data, test full flow
- [ ] README cập nhật: hướng dẫn deploy + architecture diagram

---

## Feature Scope (trong 2 tuần)

### IN scope ✅
- Brand Persona builder (tone, voice, audience, keywords)
- 4 loại content: BLOG_POST, SOCIAL_MEDIA, AD_COPY, EMAIL
- Async generation với SQS + Bedrock
- Content versioning (AI + human edit)
- Export PDF/DOCX/HTML
- Campaign grouping
- Token tracking + quota per org
- Multi-user per org (OWNER/ADMIN/MEMBER)

### OUT of scope ❌
- WebSocket real-time (dùng polling)
- Image generation
- Multi-language UI
- Multi-model comparison
- Billing/payment integration
- Mobile app

---

## Milestones

| Milestone | Ngày | Tiêu chí |
|-----------|------|----------|
| M1: Backend complete | Day 5 | Tất cả API endpoints hoạt động, worker xử lý được job |
| M2: Frontend MVP | Day 10 | User có thể login → tạo persona → generate content → export |
| M3: Production deploy | Day 13 | App chạy trên AWS, domain có HTTPS |
| M4: Demo ready | Day 14 | Full flow demo không lỗi, README hoàn chỉnh |
