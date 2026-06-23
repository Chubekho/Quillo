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
│   ├── content.controller.ts ← list(filter+paginate), create, get, update,
│   │                            remove(soft-archive), generate/rewrite/expand/shorten
│   │                            (→ GenerationQueueService), getJobStatus, versions
│   └── persona.controller.ts ← CRUD + setDefault + Redis cache invalidation
├── middlewares/
│   ├── auth.middleware.ts    ← authenticate() verify JWT + check DB
│   │                            requireRole(...roles) role guard
│   ├── errorHandler.ts       ← AppError class + Prisma P2002/P2025 mapping
│   └── notFound.ts
├── routes/                   ← 8 files, tất cả dùng authenticate()
├── services/ai/
│   ├── generationQueue.service.ts ← enqueue(): tạo DB job → gửi SQS message
│   └── bedrock.service.ts         ← invoke(): select model by operation,
│                                     buildPrompt() per ContentType + operation
│                                     4 operations: generate/rewrite/expand/shorten
├── app.ts    ← helmet, cors, rateLimit, compression, morgan, routes
├── server.ts ← bootstrap(): prisma.$connect, redis.ping, app.listen
└── worker.ts ← pollLocal() (dev) / handler() (Lambda prod) ← processMessage(): check quota → load piece+persona → invoke Bedrock → transaction(version+job+usage+quota)

---

## Files CẦN implement ❌
src/
├── controllers/
│   ├── campaign.controller.ts   ← CRUD campaigns (stub hiện tại trả 501)
│   ├── export.controller.ts     ← generate PDF/DOCX/HTML → S3 presigned URL
│   ├── org.controller.ts        ← update org settings, get usage stats
│   └── usage.controller.ts      ← GET /usage với filter by month, model
├── services/
│   ├── export/
│   │   └── export.service.ts    ← dùng pdfkit/puppeteer, docx npm package
│   └── storage/
│       └── storage.service.ts   ← S3 upload/download/presigned URL wrapper
├── queues/
└── dlq-monitor.ts               ← cron check DLQ, alert nếu có message

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

## Bedrock Notes

- Không có LocalStack support → cần AWS credentials thật để test AI
- Model IDs có thể thay đổi — verify trong AWS Console > Bedrock > Model catalog
- `us.` prefix cho cross-region inference (khuyến nghị dùng)
- Pricing ước tính trong `worker.ts::estimateCost()` — update theo AWS pricing page

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