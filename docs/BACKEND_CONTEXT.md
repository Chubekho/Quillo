# Backend Context — Quillo

Express + TypeScript API server. Đọc QUILLO_PROJECT_CONTEXT.md trước
để nắm tổng quan.

---

## Architecture Pattern
Request → app.ts (middleware) → routes/ → controllers/ → services/ → DB/AWS
- **Controllers** xử lý HTTP, validate input, gọi service/prisma trực tiếp
- **Services** (chỉ có /ai/) xử lý business logic phức tạp
- **Worker** (worker.ts) chạy độc lập, consume SQS, không expose HTTP

---

## Files đã implement ✅
src/
├── config/
│   ├── aws.ts          ← SQSClient, S3Client, BedrockClient, SecretsManagerClient
│   │                      IS_LOCAL=true khi NODE_ENV!=production
│   │                      S3 cần forcePathStyle=true cho LocalStack
│   ├── database.ts     ← PrismaClient singleton với logging
│   ├── logger.ts       ← Winston (dev: colorize, prod: JSON)
│   └── redis.ts        ← ioredis + helpers: cacheGet/Set/Del, checkOrgRateLimit
│                          CACHE_TTL: PERSONA=1800s, JOB_STATUS=300s
├── controllers/
│   ├── auth.controller.ts    ← register (tạo org+user transaction), login,
│   │                            refresh (token rotation), logout, me
│   ├── campaign.controller.ts← CRUD campaigns
│   ├── content.controller.ts ← list(filter+paginate), create, get, update,
│   │                            remove(soft-archive), generate/rewrite/expand/shorten
│   │                            (→ GenerationQueueService), getJobStatus, versions
│   │                            assertQuota() gọi checkQuota() trước mỗi enqueue
│   ├── export.controller.ts  ← POST /:id/export (validate format ∈ PDF/DOCX/HTML),
│   │                            GET /:id/exports (list), delegate export.service
│   ├── org.controller.ts     ← GET /org (trả org info + usage embedded),
│   │                            PATCH /org (role guard OWNER/ADMIN, validate quota≥0)
│   ├── persona.controller.ts ← CRUD + setDefault + Redis cache invalidation
│   └── usage.controller.ts   ← GET /usage, delegate getUsageSummary
├── middlewares/
│   ├── auth.middleware.ts    ← authenticate() verify JWT + check DB
│   │                            requireRole(...roles) role guard
│   ├── errorHandler.ts       ← AppError class + Prisma P2002/P2025 mapping
│   └── notFound.ts
├── routes/                   ← 8 files, tất cả dùng authenticate()
├── services/
│   ├── campaign.service.ts   ← xử lý logic CRUD cho campaigns, filter orgId
│   ├── export.service.ts     ← generateHtml/generatePdf/generateDocx, exportContent
│   │                            (S3 upload + presigned URL TTL 1h)
│   ├── org.service.ts        ← getOrg (embed getUsageSummary), updateOrg (validate fields)
│   ├── usage.service.ts      ← getCurrentMonthUsage, getUsageByModel, getUsageSummary,
│   │                            checkQuota (shared cho cả API và worker)
│   └── ai/                    ← AI provider abstraction layer
│       ├── providers/
│       │   ├── bedrock.provider.ts   ← Bedrock SDK implementation (giữ lại, inactive khi AI_PROVIDER!=bedrock)
│       │   ├── gemini.provider.ts    ← Gemini 2.5 Flash via @google/generative-ai SDK (active default)
│       │   └── mock.provider.ts      ← Mock provider (BEDROCK_MOCK logic, dùng khi AI_PROVIDER=mock)
│       ├── ai.service.ts             ← Dispatcher: đọc AI_PROVIDER env → import provider tương ứng
│       │                                Export: invoke(prompt, type) → GenerationResult (contract không đổi)
│       └── generationQueue.service.ts ← SQS enqueue (không thay đổi)
├── app.ts    ← helmet, cors, rateLimit, compression, morgan, routes
├── server.ts ← bootstrap(): prisma.$connect, redis.ping, app.listen
└── worker.ts ← pollLocal() (dev) / handler() (Lambda prod) ← processMessage():
               checkQuota() → load piece+persona → invoke AI provider (ai.service.ts → gemini/bedrock/mock)
               → transaction(version+job+usageLog+org.currentMonthTokens)
               quota exceeded: FAILED + return (không throw → tránh retry/DLQ)

---

## Files CẦN implement ❌
src/
└── dlq-monitor.ts               ← cron check DLQ, alert nếu có message (Day 11+)

---

## Database Notes

- **Multi-tenancy**: mọi bảng có `organizationId` FK → filter bắt buộc trong mọi query
- **Soft delete**: content_pieces dùng `status='ARCHIVED'`, không xóa thật
- **Version system**: `content_versions.isActive` = phiên bản đang hiển thị
  - Khi tạo version mới: updateMany isActive=false, rồi tạo mới isActive=true
- **Job lifecycle**: `QUEUED → PROCESSING → COMPLETED | FAILED`
- **Quota**: `organizations.currentMonthTokens` tăng sau mỗi Bedrock call
  - Reset hàng tháng (cần cron job — chưa implement)

---

## Quan trọng: SQS local

LocalStack SQS endpoint: `http://localhost:4566/000000000000/{queue-name}`

Tạo queue thủ công nếu chưa có:
```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=ap-southeast-1 \
aws sqs create-queue --queue-name quillo-generation-queue \
  --endpoint-url http://localhost:4566
```

---

## AI Provider Notes

- Active provider: Gemini 2.5 Flash (AI_PROVIDER=gemini)
- Token tracking: gemini.provider.ts đọc usageMetadata.promptTokenCount / candidatesTokenCount
- Switching provider: đổi AI_PROVIDER env var (gemini | mock | bedrock), restart server
- Bedrock: giữ trong providers/bedrock.provider.ts, cần AWS credentials thật để hoạt động
- Gemini free tier: 1500 req/day, 15 RPM — đủ cho demo, billing OFF để giữ free tier

---

## Coding Rules

```typescript
// 1. Luôn filter theo orgId
const piece = await prisma.contentPiece.findFirst({
  where: { id, organizationId: req.user!.orgId }  // ← KHÔNG được bỏ orgId
})

// 2. Không viết logic trong route, viết trong controller
// 3. Mọi async controller dùng try/catch + next(err)
// 4. Async operations (generate/rewrite/...) return 202, không return content
// 5. Redis cache key format: `{entity}:{orgId}` hoặc `{entity}:{id}`
```