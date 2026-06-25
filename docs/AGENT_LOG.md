# Agent Log — Quillo

> Append-only. Không xóa entry cũ.
> Format: xem docs/GEMINI_INSTRUCTION.md

---

### [SESSION 1 — Day 1-3] Bootstrap & Foundation

**Làm gì:** Setup toàn bộ monorepo scaffold bởi Claude AI

**Files tạo mới:**
- docker-compose.yml — PostgreSQL + Redis + LocalStack local dev
- backend/prisma/schema.prisma — 11 bảng multi-tenant
- backend/prisma/seed.ts — dev seed data (org + user + 2 personas)
- backend/src/config/database.ts — PrismaClient singleton
- backend/src/config/redis.ts — ioredis + cache helpers
- backend/src/config/aws.ts — SQS/S3/Bedrock clients (LocalStack-aware)
- backend/src/config/logger.ts — Winston
- backend/src/app.ts — Express setup với middleware
- backend/src/server.ts — bootstrap entry point
- backend/src/worker.ts — SQS consumer + Bedrock invocation
- backend/src/controllers/auth.controller.ts
- backend/src/controllers/content.controller.ts
- backend/src/controllers/persona.controller.ts
- backend/src/services/ai/bedrock.service.ts
- backend/src/services/ai/generationQueue.service.ts
- backend/src/middlewares/auth.middleware.ts
- backend/src/middlewares/errorHandler.ts
- backend/src/routes/* (8 files)
- frontend/src/services/api.ts
- frontend/src/store/auth.store.ts
- frontend/src/hooks/useJobPoller.ts
- infrastructure/scripts/setup-local.sh
- infrastructure/scripts/localstack-init.sh
- docs/QUILLO_PROJECT_CONTEXT.md
- docs/BACKEND_CONTEXT.md
- docs/FRONTEND_CONTEXT.md
- docs/INFRASTRUCTURE_CONTEXT.md

**Kết quả:** DONE

---

### [SESSION 2 — Day 3] Fix Prisma v7 + Bootstrap Frontend

**Làm gì:** Fix breaking change Prisma v7, tạo Vite bootstrap files

**Files thay đổi:**
- backend/prisma/schema.prisma — xóa url khỏi datasource block
- backend/src/config/database.ts — thêm PrismaPg adapter
- backend/prisma.config.ts — tạo mới, defineConfig cho Prisma v7
- frontend/index.html — tạo mới
- frontend/vite.config.ts — tạo mới, proxy /api → localhost:3001
- frontend/tsconfig.json — tạo mới
- frontend/tailwind.config.js — tạo mới
- frontend/postcss.config.js — tạo mới
- frontend/src/index.css — tạo mới
- frontend/src/main.tsx — tạo mới
- frontend/src/App.tsx — tạo mới (skeleton routing)
- docs/PROGRESS.md — tạo mới
- docs/GEMINI_INSTRUCTION.md — tạo mới
- docs/AGENT_LOG.md — tạo mới (file này)

**Kết quả:** DONE

**Ghi chú:** 
- LocalStack SQS URL fix: dùng http://localhost:4566/000000000000/{queue}
  thay vì format sqs.region.localhost.localstack.cloud
- Prisma v7 cần thêm @prisma/adapter-pg — đã cài
- localhost:5173 cần Gemini verify chạy được sau khi tạo xong bootstrap files
---

### [Tasks day 3: 2026-06-24 11:15] Implement Campaign Controller + CRUD
Làm gì: Tạo CampaignService và CampaignController hỗ trợ CRUD campaign với filter multi-tenant theo organizationId, thay thế stub 501 trong campaign.routes.ts.

Files thay đổi:

backend/src/services/campaign.service.ts — tạo mới service xử lý logic CRUD cho campaign
backend/src/controllers/campaign.controller.ts — tạo mới controller nhận request HTTP và gọi service
backend/src/routes/campaign.routes.ts — thay thế stub 501 bằng routes thực tế trỏ tới controller

Kết quả: DONE

Ghi chú: Đảm bảo multi-tenant filter theo organizationId trong mọi thao tác, soft delete set status = ARCHIVED.
---

### [Tasks day 3: 2026-06-24 13:57] Tạo lại setup-local.sh + Fix localstack-init.sh
Làm gì: Tạo lại script one-shot `setup-local.sh` khởi tạo Docker Compose, chờ services ready, tạo SQS queues/S3 buckets, cài đặt npm dependencies và chạy Prisma migrate/seed. Sửa lỗi định dạng URL của SQS trong `localstack-init.sh` thành `http://localhost:4566`.

Files thay đổi:

infrastructure/scripts/setup-local.sh — tạo mới script one-shot setup local đầy đủ các bước theo yêu cầu
infrastructure/scripts/localstack-init.sh — sửa định dạng queue-url từ sqs.region.localhost.localstack.cloud thành localhost:4566

Kết quả: DONE

Ghi chú: Các script đã được thiết lập chuẩn xác, sẵn sàng cho việc khởi tạo môi trường dev local.
---

### [Task day 3: 2026-06-24 15:32] Fix BedrockRuntimeClient không dùng LocalStack endpoint
Làm gì: Sửa lỗi BedrockRuntimeClient tự động nhận endpoint LocalStack từ biến môi trường AWS_ENDPOINT_URL bằng cách xóa biến này khỏi process.env sau khi cấu hình awsConfig đã được khởi tạo. Điều này giúp Bedrock gọi trực tiếp AWS thật, trong khi các dịch vụ khác (SQS, S3, Secrets Manager) vẫn giữ nguyên kết nối LocalStack.

Files thay đổi:

backend/src/config/aws.ts — Xóa biến môi trường AWS_ENDPOINT_URL sau khi cấu hình cho LocalStack đã được thiết lập

Kết quả: DONE

Ghi chú: Đã kiểm chứng qua middleware rằng BedrockRuntimeClient gửi request đúng tới AWS endpoint, còn SQSClient vẫn gửi tới LocalStack.
---

### [Task day 4: 2026-06-24 20:48] Bedrock mock mode — unblock pipeline khi chưa có quyền Bedrock
Làm gì: Thêm mock mode vào `bedrock.service.ts` (BEDROCK_MOCK=true) trả persona-aware marketing copy giả lập đúng shape GenerationResult mà worker.ts parse, kèm sleep(800ms) latency. Thêm biến BEDROCK_MOCK vào .env + .env.example.

Files thay đổi:
- backend/src/services/ai/bedrock.service.ts — thêm mockInvoke() + buildMockContent() trả mock content theo content type/persona/operation
- backend/.env — thêm BEDROCK_MOCK=true
- backend/.env.example — thêm BEDROCK_MOCK=true

Kết quả: DONE

Ghi chú: Worker.ts không bị thay đổi. Mock content có heading markdown cho BLOG_POST, hashtag cho SOCIAL_MEDIA, subject/preheader cho EMAIL, CTA cho AD_COPY.
---

### [Task day 4: 2026-06-24 21:03] Export service — PDF/DOCX/HTML từ content → S3 → presigned URL
Làm gì: Tạo ExportService (generateHtml/generatePdf/generateDocx/exportContent) + ExportController (POST create, GET list) + cập nhật export.routes.ts mount dưới `/content`. Cài marked, pdfkit, html-to-docx. Thêm type declaration cho html-to-docx.

Files thay đổi:
- backend/src/services/export.service.ts — tạo mới, xử lý generate buffer theo format, upload S3, presigned URL TTL 1h
- backend/src/controllers/export.controller.ts — tạo mới, validate format ∈ [PDF,DOCX,HTML], delegate service
- backend/src/routes/export.routes.ts — thay stub 501, POST /:id/export + GET /:id/exports
- backend/src/app.ts — mount exportRoutes dưới /api/v1/content
- backend/src/types/html-to-docx.d.ts — tạo mới, type declaration cho html-to-docx
- backend/package.json — thêm marked, pdfkit, html-to-docx, @types/pdfkit

Kết quả: DONE

Ghi chú: Export sync trong request (không qua SQS). PDF dùng pdfkit parse marked tokens (heading/paragraph/list/blockquote/code/hr). Multi-tenant filter organizationId mọi query.
---


### [Task day 5: 2026-06-25 08:42] Usage tracking — GET /usage theo tháng + per model
Làm gì: Tạo UsageService (getCurrentMonthUsage/getUsageByModel/getUsageSummary), UsageController, và cập nhật usage.routes.ts để expose GET /api/v1/usage trả usage summary tháng hiện tại kèm quota/remaining/byModel.

Files thay đổi:

backend/src/services/usage.service.ts — tạo mới, Prisma aggregate + groupBy theo calendar month UTC, multi-tenant filter organizationId
backend/src/controllers/usage.controller.ts — tạo mới, delegate getUsageSummary, lỗi qua next(err)
backend/src/routes/usage.routes.ts — thay thế stub placeholder bằng route thực tế trỏ UsageController.getSummary

Kết quả: DONE

Ghi chú: Dùng Prisma.Decimal (public export) thay vì internal @prisma/client/runtime/library để tránh lỗi TS2307. Org không có usage_logs → trả 0, không throw. monthlyTokenQuota null → quota=null, remaining=null, percentUsed=null.

### [Task day 5: 2026-06-25 09:17] Quota enforcement — chặn generate khi vượt monthlyTokenQuota
Làm gì: Thêm checkQuota() vào UsageService, tích hợp vào content.controller.ts (429 trước enqueue) và worker.ts (FAILED + return, không throw để tránh retry/DLQ).

Files thay đổi:

backend/src/services/usage.service.ts — thêm QuotaCheckResult interface + checkQuota() method, tái dùng getCurrentMonthUsage
backend/src/controllers/content.controller.ts — thêm assertQuota() helper, gọi trước enqueue trong generate/rewrite/expand/shorten
backend/src/worker.ts — thay stub currentMonthTokens bằng usageService.checkQuota(), xử lý quota exceeded bằng FAILED + return (không throw)

Kết quả: DONE

Ghi chú: Worker không re-throw khi quota exceeded để SQS tự xóa message, tránh retry loop và DLQ. API trả 429 với code QUOTA_EXCEEDED và message hiển thị used/quota.

### [Task day 5: 2026-06-25 09:50] Org settings — xem/update quota + plan
Làm gì: Tạo OrgService (getOrg kèm usage summary, updateOrg validate fields), OrgController (GET + PATCH với role guard OWNER/ADMIN), cập nhật org.routes.ts thay stub 501.

Files thay đổi:

backend/src/services/org.service.ts — tạo mới, getOrg() gắn getUsageSummary, updateOrg() validate quota>=0 và plan hợp lệ
backend/src/controllers/org.controller.ts — tạo mới, GET delegate service, PATCH kiểm tra role OWNER/ADMIN trước khi update
backend/src/routes/org.routes.ts — thay stub 501 bằng GET + PATCH route thực tế

Kết quả: DONE

Ghi chú: Role check nằm trong controller (không ở route-level middleware) để trả response 403 với message rõ ràng. MEMBER/VIEWER chỉ được GET, không được PATCH.

### [Task day 5: 2026-06-25 10:16] Cập nhật BACKEND_CONTEXT.md cho đúng với trạng thái hiện tại
Làm gì: Cập nhật danh sách ✅/❌ trong BACKEND_CONTEXT.md — thêm các controller/service đã implement (export, org, usage), xóa các entry đã done khỏi phần ❌, giữ lại dlq-monitor.ts.

Files thay đổi:

docs/BACKEND_CONTEXT.md — cập nhật phần "Files đã implement ✅" và "Files CẦN implement ❌"

Kết quả: DONE
