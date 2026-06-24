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

### [2026-06-24 11:15] Implement Campaign Controller + CRUD
Làm gì: Tạo CampaignService và CampaignController hỗ trợ CRUD campaign với filter multi-tenant theo organizationId, thay thế stub 501 trong campaign.routes.ts.

Files thay đổi:

backend/src/services/campaign.service.ts — tạo mới service xử lý logic CRUD cho campaign
backend/src/controllers/campaign.controller.ts — tạo mới controller nhận request HTTP và gọi service
backend/src/routes/campaign.routes.ts — thay thế stub 501 bằng routes thực tế trỏ tới controller

Kết quả: DONE

Ghi chú: Đảm bảo multi-tenant filter theo organizationId trong mọi thao tác, soft delete set status = ARCHIVED.
---

### [2026-06-24 13:57] Tạo lại setup-local.sh + Fix localstack-init.sh
Làm gì: Tạo lại script one-shot `setup-local.sh` khởi tạo Docker Compose, chờ services ready, tạo SQS queues/S3 buckets, cài đặt npm dependencies và chạy Prisma migrate/seed. Sửa lỗi định dạng URL của SQS trong `localstack-init.sh` thành `http://localhost:4566`.

Files thay đổi:

infrastructure/scripts/setup-local.sh — tạo mới script one-shot setup local đầy đủ các bước theo yêu cầu
infrastructure/scripts/localstack-init.sh — sửa định dạng queue-url từ sqs.region.localhost.localstack.cloud thành localhost:4566

Kết quả: DONE

Ghi chú: Các script đã được thiết lập chuẩn xác, sẵn sàng cho việc khởi tạo môi trường dev local.
---

### [2026-06-24 15:32] Fix BedrockRuntimeClient không dùng LocalStack endpoint
Làm gì: Sửa lỗi BedrockRuntimeClient tự động nhận endpoint LocalStack từ biến môi trường AWS_ENDPOINT_URL bằng cách xóa biến này khỏi process.env sau khi cấu hình awsConfig đã được khởi tạo. Điều này giúp Bedrock gọi trực tiếp AWS thật, trong khi các dịch vụ khác (SQS, S3, Secrets Manager) vẫn giữ nguyên kết nối LocalStack.

Files thay đổi:

backend/src/config/aws.ts — Xóa biến môi trường AWS_ENDPOINT_URL sau khi cấu hình cho LocalStack đã được thiết lập

Kết quả: DONE

Ghi chú: Đã kiểm chứng qua middleware rằng BedrockRuntimeClient gửi request đúng tới AWS endpoint, còn SQSClient vẫn gửi tới LocalStack.
---

