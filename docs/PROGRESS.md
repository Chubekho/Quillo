# Quillo — Progress Tracker

> Human-managed. Cập nhật cuối mỗi ngày bằng cách distill từ AGENT_LOG.md.
> Agent KHÔNG tự ghi file này. Xem GEMINI_INSTRUCTION.md để biết quy tắc.

---

## Trạng thái hiện tại

**Sprint:** Tuần 2 / 2 | **Ngày:** Day 11 ✅ DONE
**Branch:** main  
**Last updated:** 2026-06-29

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

**[Frontend — Day 8]**
- PersonaList.tsx: full implement — hiển thị danh sách brand personas, badge "Mặc định", các tính năng tạo, sửa, xóa (window.confirm), đặt mặc định, xử lý loading/error/empty state đầy đủ
- Button.tsx / Input.tsx / Select.tsx: các UI component Tailwind tái dùng hỗ trợ variant, isLoading, label, error message, options
- PersonaForm.tsx: form dùng chung cho create/edit mode với react-hook-form + zod, dùng useFieldArray quản lý mảng chips keywords/avoidWords và exampleOutputs
- PersonaEditor.tsx: trang quản lý create/edit, sử dụng useParams(), fetch dữ liệu qua useQuery, xử lý mutation create/update với toast.success, invalidateQueries và navigate
- api.ts: bổ sung method get(id) và remove(id) cho personaApi theo đúng pattern hiện có
- App.tsx: cấu trúc routing — thêm 2 route protected /personas/new và /personas/:id/edit bọc trong ProtectedRoute + AppLayout
- Bug fix: sửa lỗi PersonaForm không pre-fill keywords, avoidWords và exampleOutputs trong edit mode bằng cách áp dụng useFieldArray và chuẩn hóa defaultValues

**[Frontend — Day 9]**
- ContentEditor.tsx: trang chính, state activeContentId/currentJobId/body, edit mode load từ GET content+activeVersion, navigate replace khi tạo mới
- GeneratePanel.tsx: form rhf+zod (title/type/persona/brief), create flow (POST→generate), regenerate flow (PATCH title+type+brief+personaId → generate)
- ContentDisplay.tsx: render body whitespace-pre-wrap, isGenerating spinner, 3 nút Viết lại/Mở rộng/Rút gọn (chỉ hiện khi có body)
- VersionHistory.tsx: list versions, badge source, restore với window.confirm, 3 states
- Routes: /content/new + /content/:id wire vào App.tsx; ContentList row click + nút Tạo
- api.ts: bổ sung listVersions(id), restoreVersion(id, vId)
- Bug fixes: race condition poller (jobId guard), brief+type persist khi regenerate (backend mở PATCH + frontend gửi đủ field + form reset theo id-change)

**[Backend — Day 9 bugfix]**
- content.controller.ts: mở brief + type cho PATCH /content/:id, enum validation VALID_TYPES

**[Frontend — Day 10]**
- Export UI: ExportBar.tsx — 3 nút PDF/DOCX/HTML, loading state riêng từng nút,
  gọi POST /content/:id/export → nhận downloadUrl (presigned) → window.open tải về
  toast.success/error, disabled khi isGenerating
- api.ts: bổ sung contentApi.export(id, format) + campaignApi.remove(id)
- CampaignList.tsx: full implement — list campaigns với Badge status
  (ACTIVE/PAUSED/COMPLETED/ARCHIVED), inline create form (useState, POST /campaigns),
  soft delete → window.confirm → DELETE → toast → refetch
- Badge.tsx: bổ sung mapping đầy đủ 4 CampaignStatus
  (ACTIVE xanh lá / PAUSED vàng / COMPLETED xanh dương / ARCHIVED xám)
- GeneratePanel.tsx: thêm dropdown "Chiến dịch (tùy chọn)" lọc ACTIVE,
  pre-fill khi edit mode, truyền campaignId vào POST /content + PATCH /content/:id
- UsagePage.tsx: full implement — progress bar token/quota (đỏ khi ≥90%),
  quota=null → "Không giới hạn", breakdown byModel (model/tokens/requestCount/cost),
  thông tin plan + model generate/edit, 3 states (loading/error/empty)

**[Backend/Infra — Day 11]**
- Secrets Manager: bundle JWT_SECRET + DATABASE_URL + GEMINI_API_KEY vào 1 JSON secret (quillo/app-secrets)
  - secrets.ts: loadSecrets() đọc từ SecretsManagerClient, ghi đè process.env
  - Feature flag USE_SECRETS_MANAGER=true/false — false không đụng LocalStack (dev an toàn)
  - server.ts + worker.ts: dynamic import sau await loadSecrets() — đảm bảo thứ tự load đúng
  - localstack-init.sh: tạo/update secret idempotent, đọc từ env vars (không hardcode)

- AI Provider Swap: Bedrock → Gemini 2.5 Flash qua provider abstraction
  - providers/gemini.provider.ts: @google/generative-ai SDK, token mapping usageMetadata
  - providers/mock.provider.ts: tách từ bedrock.service.ts cũ
  - providers/bedrock.provider.ts: giữ lại, inactive khi AI_PROVIDER!=bedrock
  - ai.service.ts: dispatcher đọc AI_PROVIDER env, export invokeModel() contract không đổi
  - Worker không đổi — chỉ thay import sang ai.service.ts
  - E2E verified: AI_PROVIDER=gemini → generate COMPLETED, UsageLog có inputTokens+outputTokens>0

- CloudWatch: winston-cloudwatch transport (NODE_ENV=production), log groups /quillo/api + /quillo/worker
  - setup-cloudwatch.sh: SNS topic, metric filters (APIErrorCount/WorkerErrorCount), 3 alarms
  - localstack-init.sh: tạo log groups local, docker-compose.yml thêm logs service
  - Verified: awslocal logs describe-log-groups → /quillo/api + /quillo/worker ✅

- WAF: WebACL REGIONAL tạo thành công trên real AWS
  - setup-waf.sh: AWSManagedRulesCommonRuleSet + KnownBadInputsRuleSet + RateLimit 2000/IP
  - WebACL ARN/ID lưu vào infrastructure/outputs/ (gitignored)
  - Associate với ALB → Day 12-13 sau khi tạo ALB

- Infra fixes: localstack-init.sh fix DLQ ARN capture, setup-local.sh dùng docker compose + delegate sang localstack-init.sh
  - export-env.sh: helper load env vars cho LocalStack restart (gitignored)

---


## Tiếp theo 🟡 (Day 12-13)

1. AWS deploy: EC2 (Express API) + Lambda (worker.ts) + RDS PostgreSQL
2. S3 + CloudFront distribution cho React SPA (domain sẵn)
3. SQS queues production + Secrets Manager production secret
4. Chạy setup-cloudwatch.sh + setup-waf.sh trên real AWS → confirm SNS email
5. Associate WAF WebACL với ALB sau khi tạo
6. Run prisma migrate deploy trên RDS
7. Smoke test production endpoints

---

## Known Issues ⚠️

- LocalStack reset sau docker compose restart → cần chạy: source export-env.sh && bash infrastructure/scripts/localstack-init.sh
- DLQ RedrivePolicy trên LocalStack không verify được (subdomain URL mismatch) — không ảnh hưởng dev workflow
- WAF associate với ALB chờ Day 12-13
- CloudWatch alarms + SNS chờ chạy setup-cloudwatch.sh trên real AWS

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
| useJobPoller trả về jobId trong state | Guard pollState.jobId===currentJobId tránh race condition stale status |
| PATCH /content/:id mở thêm brief+type | brief/type cần persist khi regenerate, không chỉ khi tạo mới |
| Form reset theo id-change (useRef) | Tránh refetch sau generate đè giá trị user đang nhập |
| brief+type gửi trong PATCH khi regenerate | Backend đọc từ DB trước khi generate, phải lưu đúng |
| Export sync trả downloadUrl | Backend trả presigned URL trực tiếp trong response body field `downloadUrl` |
| campaignId optional trong GeneratePanel | Campaign không bắt buộc, gửi null nếu không chọn |
| CampaignList dùng useState cho inline form | Form 2 field đơn giản, không cần react-hook-form/zod |
| AI_PROVIDER flag + provider abstraction | Bedrock cần charge để unlock — tách providers/ thành bedrock/gemini/mock, dispatcher đọc AI_PROVIDER env, worker không đổi |
| Gemini 2.5 Flash cho generate, Flash-Lite cho edit | Free tier không cần thẻ, 1500 req/day đủ cho demo, rate limit 15 RPM tương thích pipeline async SQS |
| USE_SECRETS_MANAGER feature flag | false = đọc .env (dev), true = fetch Secrets Manager (prod) — pattern giống BEDROCK_MOCK |
| Dynamic import sau loadSecrets() | Tránh module-load race condition: config/prisma/jwt chỉ evaluate sau khi secret nạp xong |
| localstack-init.sh đọc từ env | Không hardcode secret trong script, đọc JWT_SECRET/DATABASE_URL/GEMINI_API_KEY từ shell env |
| Secret bundle 1 JSON object | 1 API call lấy hết JWT+DB+Gemini, đơn giản hơn 3 secret riêng lẻ |
| aws --endpoint-url thay awslocal | awslocal cần cài pip riêng, không có sẵn — dùng aws --endpoint-url http://localhost:4566 cho mọi LocalStack command |
| CloudWatch log groups local (LocalStack) | Verify dev logging path trước khi deploy, không cần real AWS |
| WAF scope REGIONAL (không CLOUDFRONT) | Gắn vào ALB — nếu sau thêm CloudFront thì tạo thêm WebACL scope CLOUDFRONT ở us-east-1 |
| infrastructure/outputs/ gitignored | ARN/ID thật không commit lên git, chỉ lưu local |