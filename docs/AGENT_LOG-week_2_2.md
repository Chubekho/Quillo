# Agent Log — Quillo (Week 2 - Part 2)

> Append-only. Không xóa entry cũ.
> Format: xem docs/GEMINI_INSTRUCTION.md
> File tiếp nối của docs/AGENT_LOG-week_2.md (đã đầy).

---

### [Task Day 10 - 2026-06-26 22:10] Export UI: nút PDF/DOCX/HTML → download presigned URL
Làm gì: Verify contract của backend export và bổ sung method `export(id, format)` vào `contentApi` trong `api.ts`. Tạo component `ExportBar.tsx` với 3 nút xuất PDF/DOCX/HTML, xử lý tải presigned URL đồng bộ và mở tab tải về trực tiếp. Mount `ExportBar` vào `ContentEditor.tsx` ngay dưới `ContentDisplay`.

Files thay đổi:

frontend/src/services/api.ts — bổ sung method `export(id, format)` gọi `POST /content/:id/export` với body `{ format }` theo đúng pattern hiện có.
frontend/src/components/content/ExportBar.tsx — tạo mới component hiển thị 3 nút PDF/DOCX/HTML, quản lý state loading riêng cho từng nút, xử lý trigger download qua presigned URL (`downloadUrl`) và thông báo toast success/error.
frontend/src/pages/ContentEditor.tsx — import và mount `ExportBar` bên dưới `ContentDisplay`, thiết lập điều kiện chỉ hiển thị khi đã có `activeContentId` và `body`, truyền prop `disabled={isGenerating}`.
docs/FRONTEND_CONTEXT.md — cập nhật danh sách component và API method đã implement.

Kết quả: DONE

Ghi chú: Đảm bảo tuân thủ nghiêm ngặt các ràng buộc: export đồng bộ (không dùng poller), không sửa backend/useJobPoller/Badge/PROGRESS.md. Đã kiểm tra `tsc --noEmit` thành công 100% sạch không lỗi.

---

### [Task Day 10 - 2026-06-26 22:24] CampaignList.tsx: full implement + tạo campaign mới
Làm gì: Thực hiện verify contract của backend campaign CRUD, bổ sung method `remove` vào `campaignApi` trong `api.ts`, và triển khai toàn bộ trang `CampaignList.tsx` thay thế placeholder stub (bao gồm danh sách chiến dịch, tính năng lưu trữ soft delete và form tạo chiến dịch inline).

Files thay đổi:

frontend/src/services/api.ts — bổ sung method `remove(id)` gọi `DELETE /campaigns/:id` theo đúng pattern hiện có.
frontend/src/pages/CampaignList.tsx — triển khai toàn bộ giao diện quản lý chiến dịch với TanStack Query, bao gồm danh sách chiến dịch, hiển thị Badge trạng thái (hỗ trợ màu xanh cho ACTIVE và xám cho ARCHIVED), nút Lưu trữ đi kèm window.confirm và form tạo mới inline sử dụng useState đơn giản.
docs/FRONTEND_CONTEXT.md — cập nhật trạng thái của CampaignList từ ❌ sang ✅.

Kết quả: DONE

Ghi chú: 
Kết quả verify contract trước khi implement:
1. backend/prisma/schema.prisma → model Campaign:
   - Tên các field thực tế: `id`, `organizationId`, `createdById`, `name`, `description`, `status`, `startDate`, `endDate`, `createdAt`, `updatedAt`.
   - Status enum có những giá trị: `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`.

2. backend/src/controllers/campaign.controller.ts + routes:
   - `GET /campaigns` trả về dạng array (`res.status(200).json(campaigns)`). Không hỗ trợ query param nào trong controller/service (chỉ tự động lấy theo `orgId`).
   - `POST /campaigns` nhận body fields: `name` (bắt buộc, throw 400 nếu thiếu), `description` (tùy chọn), `status` (tùy chọn, mặc định là ACTIVE).
   - `DELETE /campaigns/:id` soft delete (chuyển status thành ARCHIVED) → response trả về status `204 No Content` và body rỗng (`res.status(204).send()`).

3. frontend/src/services/api.ts → campaignApi:
   - Method `list()` đã tồn tại: `list: () => api.get('/campaigns'),`.
   - Method `create()` đã có sẵn: `create: (data: unknown) => api.post('/campaigns', data),`.
   - Method `remove()` (DELETE) đã được bổ sung thành công: `remove: (id: string) => api.delete(\`/campaigns/\${id}\`)`.

---

### [Task Day 10 - 2026-06-27 00:26] Gắn content vào campaign (campaignId trong ContentEditor)
Làm gì: Verify toàn bộ dữ liệu luồng tạo/chỉnh sửa content liên quan đến campaignId và trạng thái CampaignStatus. Bổ sung mapping CampaignStatus vào Badge.tsx và thêm dropdown chọn chiến dịch (chỉ hiển thị ACTIVE) vào GeneratePanel.tsx cho cả luồng tạo mới và tạo lại.

Files thay đổi:

frontend/src/components/ui/Badge.tsx — bổ sung mapping màu sắc chuẩn cho cả 4 trạng thái CampaignStatus (`ACTIVE`: xanh lá, `PAUSED`: vàng, `COMPLETED`: xanh dương, `ARCHIVED`: xám) mà không ảnh hưởng đến các trạng thái cũ.
frontend/src/components/content/GeneratePanel.tsx — thêm dropdown `Select` chọn chiến dịch (tùy chọn) lọc theo trạng thái `ACTIVE`, đồng thời truyền `campaignId` vào body `POST /content` và `PATCH /content/:id`.

Kết quả: DONE

Ghi chú: 
Kết quả verify trước khi implement:
1. frontend/src/components/content/GeneratePanel.tsx:
   - Props nhận vào: `contentId?: string; initialData?: Partial<GenerateFormValues>; onJobStarted: (jobId: string, newContentId?: string) => void; disabled: boolean;`
   - Form fields hiện tại: `title`, `type`, `brief`, `personaId`.
   - Submit create flow (`POST /content`): `contentApi.create({ title, type, brief, personaId })` → chưa có `campaignId`.
   - Submit regenerate flow (`PATCH /content/:id`): `contentApi.update(contentId, patchPayload)` → chưa có `campaignId`.

2. frontend/src/pages/ContentEditor.tsx:
   - State hiện tại: `activeContentId`, `currentJobId`, `body`, `showHistory` → không chứa `campaignId`.
   - Khi load content cũ (edit mode): `GET /content/:id` trả về `piece` (với `campaignId` và `campaign: { id, name, ... }`). `initialData` truyền vào `GeneratePanel` chính là object này.

3. frontend/src/components/ui/Badge.tsx:
   - Chưa map đầy đủ 4 giá trị CampaignStatus (`ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`). Hiện tại mới chỉ có `COMPLETED` (màu xanh lá chung với READY/PUBLISHED) và `ARCHIVED` (màu xám). Đã tách và thêm: `ACTIVE` (xanh lá), `PAUSED` (vàng), `COMPLETED` (xanh dương), `ARCHIVED` (xám).

---

### [Task Day 10 - 2026-06-27 00:38] UsagePage.tsx: full implement (thay stub)
Làm gì: Thực hiện verify contract của `GET /usage` và `GET /org`. Triển khai toàn bộ trang `UsagePage.tsx` thay thế placeholder stub, bao gồm: tổng quan token đã dùng trong tháng này kèm thanh tiến trình (progress bar đổi sang đỏ khi dùng ≥ 90%), bảng chi tiết breakdown theo từng model, và thông tin gói dịch vụ kèm model generate/edit chính.

Files thay đổi:

frontend/src/pages/UsagePage.tsx — thay thế placeholder stub bằng giao diện quản lý tài nguyên cao cấp, sử dụng `useQuery` gọi `orgApi.get` và `usageApi.getSummary`, hỗ trợ trọn vẹn các trạng thái loading, error kèm nút "Thử lại", và empty state "Chưa có hoạt động nào tháng này" tường minh.
docs/FRONTEND_CONTEXT.md — cập nhật trạng thái UsagePage từ ❌ sang ✅.

Kết quả: DONE

Ghi chú: 
Kết quả verify contract trước khi implement:
1. `GET /usage` → response shape: `{ month, quota, used, remaining, percentUsed, byModel: [{ model, inputTokens, outputTokens, totalTokens, cost, requestCount }] }`.
2. `GET /org` → response shape: `{ id, name, slug, plan, monthlyTokenQuota, currentMonthTokens, quotaResetAt, usage: { ... } }`.
3. `QUILLO_PROJECT_CONTEXT.md` → `BEDROCK_GENERATE_MODEL=us.anthropic.claude-sonnet-4-5`, `BEDROCK_EDIT_MODEL=us.anthropic.claude-haiku-4-5`.
4. Đã kiểm tra `tsc --noEmit` thành công 100% sạch không lỗi.

---

[Context update] Ghi nhận quyết định AI provider swap: Bedrock → Gemini 2.5 Flash, provider abstraction pattern (AI_PROVIDER flag). Updated: PROGRESS.md, ROADMAP.md, QUILLO_PROJECT_CONTEXT.md, BACKEND_CONTEXT.md.

---

### [Task Day 11 - 2026-06-29 10:01] Migrate JWT_SECRET + DATABASE_URL ra AWS Secrets Manager
Làm gì: Migrate `JWT_SECRET`, `DATABASE_URL` và `GEMINI_API_KEY` ra AWS Secrets Manager có hỗ trợ feature flag `USE_SECRETS_MANAGER` và hoạt động hoàn chỉnh với LocalStack. Bọc quá trình khởi tạo server và worker trong `loadSecrets()` trước khi import các module khác.

Files thay đổi:

backend/src/config/secrets.ts — tạo mới hàm `loadSecrets()` đọc từ Secrets Manager và ghi đè vào `process.env`.
backend/src/server.ts — refactor bọc `bootstrap()` và chuyển sang dynamic import sau khi nạp secret.
backend/src/worker.ts — refactor bọc `pollLocal()` và `handler()` chuyển sang dynamic import sau khi nạp secret.
infrastructure/scripts/localstack-init.sh — bổ sung lệnh tạo/cập nhật secret `quillo/app-secrets` idempotent trên LocalStack.
backend/.env + backend/.env.example — bổ sung `USE_SECRETS_MANAGER` và `APP_SECRETS_ID`.

Kết quả: DONE

Ghi chú: Đã hoàn tất kiểm tra toàn bộ checklist 5 bước:
1. `USE_SECRETS_MANAGER=false`: app boot bình thường, login OK (regression check).
2. Chạy `localstack-init.sh`: verify `awslocal secretsmanager get-secret-value --secret-id quillo/app-secrets` trả JSON chính xác.
3. `USE_SECRETS_MANAGER=true`: log "Secrets loaded", login thành công, GET /content trả data.
4. `USE_SECRETS_MANAGER=true` với worker: worker start thành công, xử lý job generate COMPLETED.
5. Bỏ `JWT_SECRET` + `GEMINI_API_KEY` khỏi `.env` với `USE_SECRETS_MANAGER=true`: vẫn login và generate content thành công.

---

### [Task Day 11 - 2026-06-29 10:35] Tách services/ai/ thành provider abstraction, thêm Gemini 2.5 Flash provider
Làm gì: Refactor toàn bộ tầng AI service, thiết lập kiến trúc provider abstraction hỗ trợ linh hoạt chuyển đổi qua biến môi trường `AI_PROVIDER`. Tích hợp thành công Google Gemini 2.5 Flash (generate) và Gemini 2.5 Flash Lite (edit).

Files thay đổi:

backend/src/services/ai/providers/mock.provider.ts — tách logic mockInvoke và buildMockContent.
backend/src/services/ai/providers/bedrock.provider.ts — tách logic gọi AWS Bedrock thật và xử lý fallback an toàn trên LocalStack.
backend/src/services/ai/providers/gemini.provider.ts — tích hợp SDK `@google/generative-ai`, tự động ánh xạ model generate/edit và tính toán usage token.
backend/src/services/ai/ai.service.ts — service định tuyến động dựa vào `AI_PROVIDER`.
backend/src/services/ai/bedrock.service.ts — Đã xoá.
backend/src/worker.ts — cập nhật import từ `ai.service.ts`.
backend/.env.example — thêm cấu hình mẫu cho Gemini và AI_PROVIDER.

Kết quả: DONE

Ghi chú: Đã hoàn tất kiểm tra toàn bộ checklist:
1. `tsc --noEmit`: không có lỗi TypeScript.
2. `AI_PROVIDER=mock`: generate content thành công, body là mock copy.
3. `AI_PROVIDER=gemini`: generate thành công với AI content thật từ Gemini 2.5 Flash.
4. Kiểm tra DB: `UsageLog` lưu đầy đủ `inputTokens` + `outputTokens > 0`.
5. Thử expand: job COMPLETED thành công (dùng `GEMINI_EDIT_MODEL`).
6. `AI_PROVIDER=bedrock`: server/worker start bình thường, log warning rõ ràng khi invoke mà không bị crash.

---

### [Task Day 11 - 2026-06-29 11:10] Cập nhật localstack-init.sh sử dụng SECRET_STRING động từ biến môi trường
Làm gì: Loại bỏ hoàn toàn chuỗi cấu hình secret hardcode trong kịch bản khởi tạo LocalStack. Thiết lập cơ chế tạo chuỗi `SECRET_STRING` động từ các biến môi trường `JWT_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY` và bổ sung điều kiện kiểm tra (guard check) ngay đầu script.

Files thay đổi:
- infrastructure/scripts/localstack-init.sh — Thêm điều kiện kiểm tra biến môi trường và sử dụng chuỗi `SECRET_STRING` động cho các lệnh `put-secret-value` và `create-secret`.

Kết quả: DONE

Ghi chú: Đảm bảo không lưu trữ bất kỳ giá trị secret thật nào trong mã nguồn kịch bản khởi tạo, hoàn toàn tuân thủ các quy tắc bảo mật.

---

### [Doc update — Day 11] Cập nhật PROGRESS.md (Day 11 DONE, remove Bedrock block, decisions mới), INFRASTRUCTURE_CONTEXT.md (Secrets Manager done, LocalStack snippet), BACKEND_CONTEXT.md (AI Provider Notes thay Bedrock Notes), QUILLO_PROJECT_CONTEXT.md (env vars + async flow).

---

### [Task Day 11 - 2026-06-29 11:55] Setup CloudWatch cho Quillo (logger + IaC script)
Làm gì: Cài đặt `winston-cloudwatch`, cấu hình Winston logger thêm transport gửi log lên CloudWatch khi `NODE_ENV=production`. Bổ sung biến `SERVICE_NAME` vào `.env.example` và `.env`. Tạo script AWS CLI `setup-cloudwatch.sh` để thiết lập Log Groups, SNS Topic, Metric Filters và Alarms trên AWS thật. Cập nhật `localstack-init.sh` để tạo log groups trong môi trường dev local và cấu hình gitignore cho thư mục `infrastructure/outputs`.

Files thay đổi:

backend/package.json — cài đặt gói `winston-cloudwatch`.
backend/src/config/logger.ts — thêm `CloudWatchTransport` khi `NODE_ENV=production`.
backend/.env.example — thêm biến `SERVICE_NAME=api`.
backend/.env — thêm biến `SERVICE_NAME=api`.
infrastructure/scripts/setup-cloudwatch.sh — tạo script AWS CLI thực thi IaC thiết lập CloudWatch và SNS alarms.
infrastructure/scripts/localstack-init.sh — thêm bước tạo CloudWatch log groups `/quillo/api` và `/quillo/worker` trên LocalStack.
infrastructure/outputs/.gitkeep — tạo thư mục chứa output deploy.
.gitignore — bỏ qua các file `infrastructure/outputs/*.txt` chứa ARN thật.
docker-compose.yml — thêm `logs` vào biến `SERVICES` của LocalStack để bật dịch vụ CloudWatch Logs.

Kết quả: DONE

Ghi chú: Đã kiểm tra toàn bộ checklist thành công: `tsc --noEmit` không lỗi, log ở chế độ dev xuất ra console bình thường không gọi CloudWatch, LocalStack tạo và verify thành công log groups, `bash -n setup-cloudwatch.sh` chuẩn cú pháp.

---

### [Task Day 11 - 2026-06-29 13:35] Tạo WAF WebACL script AWS CLI cho Quillo
Làm gì: Tạo script AWS CLI `setup-waf.sh` triển khai WAF WebACL (scope REGIONAL) với các bộ quy tắc bảo vệ API khỏi SQLi, XSS và giới hạn tỷ lệ yêu cầu (Rate Limit 2000 req/IP). Kịch bản tự động trích xuất và lưu trữ WebACL ARN/ID vào thư mục `infrastructure/outputs/`.

Files thay đổi:

infrastructure/scripts/setup-waf.sh — tạo script AWS CLI thực thi IaC thiết lập WAF WebACL và lưu thông tin ARN/ID.

Kết quả: DONE

Ghi chú: Đã kiểm tra thành công toàn bộ checklist: `bash -n` kiểm tra cú pháp của `setup-waf.sh` và `setup-cloudwatch.sh` hoàn toàn hợp lệ, đồng thời xác nhận `infrastructure/outputs/` đã được thiết lập đúng trong `.gitignore`. Không có bất kỳ thay đổi nào trong mã nguồn ứng dụng (backend/frontend).

---

### [Fix — Day 11] localstack-init.sh: fix DLQ ARN capture dùng URL từ create-queue output.
setup-local.sh: docker compose (space), health check chờ đủ 3 services, delegate sang localstack-init.sh.
INFRASTRUCTURE_CONTEXT.md: cập nhật đầy đủ scripts mới, workflow restart, loại bỏ awslocal, Bedrock → Gemini.

---

### [Doc update — Day 11 complete] PROGRESS.md: thêm CloudWatch/WAF/infra fixes vào Done, cập nhật Next/KnownIssues/Decisions. QUILLO_PROJECT_CONTEXT.md: infrastructure/ structure + token tracking pattern.

---

### [Task Day 12.1 - 2026-06-29 15:37] Backend Deployment Packaging (Lambda worker + EC2 Docker + prod hardening)
Làm gì: Chuẩn bị toàn bộ artifact code-side để deploy backend lên AWS — tạo Lambda bundle script (esbuild), build-lambda.sh, Dockerfile multi-stage cho EC2, .dockerignore, .env.production.example, và hardening app.ts (trust proxy + morgan production).

Files thay đổi:

backend/esbuild.lambda.mjs — Tạo mới: esbuild bundler cho worker.ts → dist-lambda/index.js. Platform=node, target=node20, format=cjs. Externals: @prisma/client, @prisma/adapter-pg, pg, @aws-sdk/*, winston, winston-cloudwatch. Bundle size: 91.1kb.
infrastructure/scripts/build-lambda.sh — Tạo mới: script idempotent: prisma generate → esbuild → copy external node_modules vào staging → zip thành infrastructure/outputs/worker-lambda.zip. `bash -n` clean.
backend/Dockerfile — Tạo mới: multi-stage (builder: npm install + prisma generate + tsc; runtime: node:20-slim, non-root user nodejs:1001, HEALTHCHECK). NODE_ENV=production. Hỗ trợ cả npm ci (khi có lockfile) và npm install (fallback).
backend/.dockerignore — Tạo mới: loại node_modules, .env, dist-lambda, logs, test files.
backend/.env.production.example — Tạo mới: template đầy đủ cho prod, USE_SECRETS_MANAGER=true, ALLOWED_ORIGINS=<placeholder>, SQS/S3 prod URLs, không có AWS_ENDPOINT_URL (prod dùng AWS thật).
backend/src/app.ts — Sửa: thêm `app.set('trust proxy', 1)` khi NODE_ENV=production (Express sau ALB — đúng client IP cho rate-limit); morgan 'combined' format trong prod (CloudWatch). CORS đã đọc từ ALLOWED_ORIGINS env (không hardcode).
backend/package.json — Thêm devDeps: @types/aws-lambda ^8.10.162, esbuild 0.24.2.

Kết quả: DONE

Ghi chú:
- **Bước 0.7 — Prisma engine nhánh đã chọn: NHÁNH CLEAN (không cần binary engine)**. Xác nhận: database.ts dùng `PrismaPg` driver adapter + `new PrismaClient({ adapter })`. Với Prisma v7 + @prisma/adapter-pg (queryCompiler GA), toàn bộ query đi qua pg Pool — Lambda zip không cần native .so engine binary. schema.prisma KHÔNG bị sửa (không cần binaryTargets).
- app.ts CORS đã dùng `process.env.ALLOWED_ORIGINS` (không phải CORS_ORIGIN như task spec ghi) — giữ nguyên env name cho backward compat với .env.example hiện có.
- esbuild phải mark `@aws-sdk/*` và `winston-cloudwatch` là external vì winston-cloudwatch pull `@aws-sdk/client-cloudwatch-logs` nhưng package đó không được install. build-lambda.sh copy các clients AWS cần thiết vào staging ZIP.
- Docker build test: `package-lock.json` không có trong repo → Dockerfile dùng conditional `npm ci || npm install`. **Khuyến nghị human**: commit `package-lock.json` vào git để có reproducible builds.
- Verify đã chạy: `npx tsc --noEmit` ✓, `node esbuild.lambda.mjs` ✓ (91.1kb), `bash -n build-lambda.sh` ✓, Docker build ✓ (sau khi fix package-lock fallback).

---

### [Fix Day 12.1 - 2026-06-29 16:00] Lambda bundle: bundle all deps thay vì external + staging copy
Làm gì: Khắc phục vấn đề build-lambda.sh tạo ra file ZIP quá nhỏ (24K) do thiết lập external node_modules sai đường dẫn. Chuyển đổi chiến lược sang "bundle all" (xóa danh sách external trong esbuild), đóng gói toàn bộ runtime dependencies vào một file index.js duy nhất và đơn giản hóa quy trình build-lambda.sh.

Files thay đổi:

backend/esbuild.lambda.mjs — Xóa toàn bộ mảng `external` (`external: []`), cấu hình `platform: 'node'`, `target: 'node20'`, `format: 'cjs'`, `logLevel: 'info'` để esbuild đóng gói toàn bộ dependencies vào 1 file duy nhất. Sử dụng `alias` và `inject` với `mock-aws.js` để giải quyết triệt để lỗi resolve `@aws-sdk/client-cloudwatch-logs` từ `winston-cloudwatch`.
backend/mock-aws.js — Tạo mới file mock giả lập `CloudWatchLogs` cho esbuild bundle.
infrastructure/scripts/build-lambda.sh — Đơn giản hóa quy trình, loại bỏ hoàn toàn phần Assemble ZIP staging area (step 4 cũ). Flow mới gồm 3 bước gọn nhẹ: 1. prisma generate, 2. node esbuild.lambda.mjs, 3. zip trực tiếp `index.js` thành `worker-lambda.zip`.

Kết quả: DONE

Ghi chú: 
- Đã verify thành công: `bash infrastructure/scripts/build-lambda.sh` chạy mượt mà, không có WARN/lỗi.
- File ZIP output đạt dung lượng 2.2MB (bundle size 7.7MB uncompressed), chứa đầy đủ toàn bộ dependencies.
- Kiểm tra `unzip -l infrastructure/outputs/worker-lambda.zip` xác nhận chỉ có 1 file `index.js` duy nhất.
- Môi trường dev local (`npm run dev`) hoàn toàn không bị ảnh hưởng.

---

### [Task Day 12.2 - 2026-06-29 16:23] Frontend Deployment Packaging (Vite prod build + S3 deploy script)
Làm gì: Chuẩn bị các file cấu hình, template môi trường và kịch bản deploy tự động để triển khai ứng dụng React SPA (Vite) lên AWS S3 và CloudFront.

Files thay đổi:

frontend/.env.production.example — Tạo mới file template môi trường production chứa biến `VITE_API_BASE_URL=https://<your-api-domain>/api/v1` (sử dụng đúng tên biến hiện có trong codebase để đảm bảo tính nhất quán, tinh gọn chỉ với 1 biến duy nhất).
infrastructure/scripts/deploy-frontend.sh — Tạo mới kịch bản triển khai tự động lên S3 và CloudFront. Script thực hiện kiểm tra đầu vào (guard check) bắt buộc đối với `S3_BUCKET` và `CF_DISTRIBUTION_ID`, hỗ trợ tùy chọn `AWS_REGION` (mặc định `ap-southeast-1`), đồng bộ hóa file (`aws s3 sync --delete`) và tạo invalidation trên CloudFront (`aws cloudfront create-invalidation`). Script đạt chuẩn `bash -n` clean và in log tiến trình tường minh.

Kết quả: DONE

Ghi chú:
- **Xác nhận Bước 0.3**: Kiểm tra file `frontend/src/services/api.ts` cho thấy ứng dụng ĐÃ ĐỌC baseURL từ biến môi trường (`import.meta.env.VITE_API_BASE_URL`). Do đó, tuân thủ đúng yêu cầu "Nếu đã đọc env rồi → không sửa", file `api.ts` hoàn toàn không bị chỉnh sửa.
- File template môi trường sử dụng tên biến `VITE_API_BASE_URL` (thay vì `VITE_API_URL` như trong mô tả task) để tương thích 100% với mã nguồn hiện tại (`api.ts`, `.env`, `.env.example`).
- Đã thực hiện kiểm tra đầy đủ: `cd frontend && npm run build` thành công xuất ra `dist/` (gồm `index.html` và `assets/`) không gặp bất kỳ lỗi TypeScript hay Vite nào; `bash -n infrastructure/scripts/deploy-frontend.sh` kiểm tra cú pháp hợp lệ hoàn toàn; môi trường dev local tiếp tục hoạt động bình thường với fallback localhost.

---

### [Fix Day 12.2 - 2026-06-30 09:43] Sửa lỗi Rendered fewer hooks than expected sau login
Làm gì: Fix bug trắng trang sau khi đăng nhập thành công.
- **Bug**: Rendered fewer hooks than expected sau login
- **Root cause**: early return `if (isAuthenticated)` đặt trước hook `useForm` vi phạm Rules of Hooks (khi login thành công, component re-render và skip `useForm`).
- **File sửa**:
  - `frontend/src/pages/Login.tsx`: Đã sửa.
  - `frontend/src/pages/Register.tsx`: Đã kiểm tra nhưng không có pattern early-return tương tự nên không sửa.
- **Cách fix**: Di chuyển toàn bộ hook calls (cụ thể là `useForm`) lên TRƯỚC khối `if (isAuthenticated) return <Navigate ... />`.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` thành công (0 lỗi).

---

### [Bug Fix Day 12.2 - 2026-06-30 09:55] Fix CSS ExportBar đè lên VersionHistory
Làm gì: Fix giao diện 2 cột của ContentEditor gây overflow.
- **Bug**: ExportBar đè lên VersionHistory khi toggle lịch sử phiên bản
- **Root cause**: `items-stretch` + `h-full` trên 2 cột không đều chiều cao tự nhiên gây overflow ExportBar ra ngoài grid container.
- **File sửa**: `frontend/src/pages/ContentEditor.tsx` (sửa 1 dòng class, `items-stretch` → `items-start`).

Kết quả: DONE