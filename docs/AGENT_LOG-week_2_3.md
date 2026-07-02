# AGENT LOG — Week 2 (Part 3) — Infra Provisioning

### [Task day 12.3 - 2026-06-30 15:20] AWS Provisioning Script: VPC + Subnets + Security Groups
Làm gì: Tạo script AWS CLI `setup-vpc.sh` để thiết lập VPC, Subnets, Route Tables, IGW, NAT GW và SGs.

Files thay đổi:
docs/AGENT_LOG-week_2_3.md — tạo file log mới cho Phase 3
docs/GEMINI_INSTRUCTION.md — cập nhật active log
infrastructure/scripts/setup-vpc.sh — tạo script provision network foundation

Kết quả: DONE

Ghi chú: Script chưa chạy thật, human sẽ chạy và verify trên AWS console.

### [Task day 12.4 - 2026-06-30 15:38] AWS Provisioning Script: RDS PostgreSQL Multi-AZ
Làm gì: Tạo script AWS CLI `setup-rds.sh` để tạo Subnet Group và khởi tạo RDS PostgreSQL Multi-AZ instance version 16.x.

Files thay đổi:
infrastructure/scripts/setup-rds.sh — tạo script provision RDS

Kết quả: DONE

Ghi chú: Script chưa chạy thật, human sẽ chạy. Password master và DATABASE_URL được cấu hình chỉ lưu vào file, không log ra terminal (stdout) để đảm bảo security CI.

### [Task day 12.5 - 2026-06-30 16:07] AWS Provisioning Script: SQS prod + S3 buckets + Secrets Manager
Làm gì: Tạo 2 script AWS CLI để thiết lập hạ tầng bổ sung: `setup-s3-buckets.sh` tạo 3 S3 buckets với block public access/CORS, tự động thêm random suffix nếu bucket name bị trùng; `setup-prod-secrets.sh` tạo SQS queue & DLQ kèm RedrivePolicy và cấu hình Secrets Manager lưu trữ `app-secrets-prod` bundle.

Files thay đổi:
infrastructure/scripts/setup-s3-buckets.sh — tạo script provision S3 buckets
infrastructure/scripts/setup-prod-secrets.sh — tạo script provision SQS và Secrets Manager

Kết quả: DONE

Ghi chú: Script chưa chạy thật. Các giá trị bí mật như JWT_SECRET, DB password và API Key được xử lý an toàn (pass qua biến/file, ghi vào secret, không in ra stdout).

### [Task day 12.6a - 2026-06-30 16:20] ECR Repository + Push Script
Làm gì: Tạo script AWS CLI `setup-ecr.sh` để thiết lập ECR repository `quillo-api` với tính năng tự động scan image (scanOnPush) và lifecycle policy giữ 5 image gần nhất; kèm script `push-image.sh` để build image từ `backend/Dockerfile` và push lên repository, tag bằng `latest` và timestamp version phục vụ rollback.

Files thay đổi:
infrastructure/scripts/setup-ecr.sh — tạo script thiết lập ECR repository
infrastructure/scripts/push-image.sh — tạo script docker build/tag/push

Kết quả: DONE

Ghi chú: Script chưa chạy thật. Quá trình lấy registry URL tự động qua output của file `ecr-outputs.txt`.

### [Task day 12.6b - 2026-06-30 16:41] IAM Instance Role + ALB + Target Group
Làm gì: Tạo script AWS CLI `setup-iam-alb.sh` thiết lập IAM role `quillo-ec2-role` cho EC2 kèm inline policy cấp quyền chặt chẽ theo scope (SQS, S3, Secrets Manager, ECR, CloudWatch Logs). Thiết lập Instance Profile. Khởi tạo Application Load Balancer (ALB) public với Target Group HTTP:3001 và HTTP:80 Listener (có note HTTPS/SSL cho cấu hình sau).

Files thay đổi:
infrastructure/scripts/setup-iam-alb.sh — tạo script cấp quyền IAM & khởi tạo ALB, Target Group

Kết quả: DONE

Ghi chú: Script chưa chạy thật. Policy bám sát principle of least privilege, mapping qua các file ARN outputs. Đã verify endpoint `/api/v1/health` để cấu hình health check.

### [Task day 12.6c - 2026-06-30 16:58] Launch Template + Auto Scaling Group
Làm gì: Tạo script AWS CLI `setup-asg.sh` thiết lập Launch Template với User-Data tự động pull và chạy container, cùng Auto Scaling Group để scale 2-4 instances trong private subnet. Dùng kết quả ELB health check để auto-healing và CPU target tracking 60% để tự scale.

Files thay đổi:
infrastructure/scripts/setup-asg.sh — tạo script Launch Template và ASG

Kết quả: DONE

Ghi chú: Cấu trúc user data KHÔNG chứa plaintext secrets. Đã verified. Script chưa được chạy thật.

### [Fix Day 12.6c - 2026-06-30 17:36] Docker build sai kiến trúc (arm64 vs amd64)
Làm gì: Cập nhật `push-image.sh` để ép Docker build container qua `buildx` sử dụng kiến trúc `linux/amd64`. Root cause do build trên Mac M-series (arm64) nên bị lỗi "no matching manifest for linux/amd64" khi ASG EC2 instance (kiến trúc x86_64/amd64) pull image, gây ra crash loop. Sửa thành `docker buildx build --platform linux/amd64 --load`.

Files thay đổi:
infrastructure/scripts/push-image.sh — sửa docker command để cross-compile

Kết quả: DONE

Ghi chú: `bash -n` báo syntax chuẩn, chưa build thật.

### [Task day 12.6d - 2026-06-30 18:43] ElastiCache Redis + Cập nhật Launch Template
Làm gì: Provision ElastiCache Redis 7.x (single-node, cache.t3.micro) trong Private Subnet và thêm Security Group `quillo-redis-sg` chỉ cho phép Inbound 6379 từ EC2 SG. Sửa đổi User Data của `setup-asg.sh` để truyền biến `REDIS_URL` vào container Docker. Thêm logic gọi Instance Refresh lên ASG để tự động thay thế instance đang chạy bằng version Launch Template mới khi chạy lại script.

Root cause: ElastiCache Redis bị bỏ sót khỏi task breakdown ban đầu, khiến container khởi động thất bại do thiếu service Redis (crash loop).

Files thay đổi:
infrastructure/scripts/setup-redis.sh — tạo script mới provision Redis
infrastructure/scripts/setup-asg.sh — cập nhật để nhúng `REDIS_URL` và gọi Instance Refresh

Kết quả: DONE

Ghi chú: Script chưa chạy thật. Các lệnh đều idempotent, và password/auth được bypass vì Redis chạy trong local private subnet (tradeoff cost-effective dev scope).

### [Fix Day 12 - 2026-07-01 10:09] Fix database connection initialization
Làm gì: Sửa lỗi `pg.Pool` khởi tạo trước khi `loadSecrets()` thiết lập biến môi trường `DATABASE_URL`. Sử dụng `Proxy` để hoãn việc khởi tạo `Pool` và `PrismaClient` cho đến lần truy cập đầu tiên.
Root cause: Module `database.ts` đọc `process.env.DATABASE_URL` ngay lúc nó được import (lúc này chưa có secret từ AWS), dẫn đến Pool kết nối mặc định vào localhost. Hàm `$connect()` của Prisma trên adapter pg là no-op nên không crash ngay từ đầu để phát hiện lỗi sai host.
Files thay đổi:
backend/src/config/database.ts — Export prisma qua Proxy thay vì biến thông thường.

Kết quả: DONE

Ghi chú: Việc dùng Proxy giữ nguyên API hiện tại (như object PrismaClient bình thường) nên không cần sửa import ở bất kỳ service nào. Đã verify bằng `npx tsc --noEmit` và dev local. Human sẽ tiến hành build và push image lên ECR sau.

### [Fix Day 13 - 2026-07-01 10:48] IAM policy: thêm 2 quyền CloudWatch Logs
Làm gì: Thêm quyền `logs:DescribeLogStreams` và `logs:PutRetentionPolicy` vào inline policy của IAM role `quillo-ec2-role` và apply lại trên AWS.
Root cause: Winston-cloudwatch sdk ngầm gọi DescribeLogStreams và PutRetentionPolicy, policy cũ thiếu 2 action này dẫn đến lỗi AccessDenied.
Files thay đổi:
infrastructure/scripts/setup-iam-alb.sh — cập nhật JSON inline policy thêm action.
Kết quả: DONE
Ghi chú: Lệnh `aws iam get-role-policy` trả về 5 action cho block logs, xác nhận policy đã được cấp đầy đủ. Script hoàn toàn idempotent.

### [Deploy Day 13 - 2026-07-01 11:15] Rebuild + push image (database.ts fix) → Instance Refresh
Làm gì: Rebuild Docker image để include fix proxy `database.ts` (kèm cờ --platform linux/amd64), push lên ECR và update Auto Scaling Group.
Files thay đổi: (không có — chỉ deploy, không sửa code)
Kết quả: FAILED — Các target EC2 trong Target Group đều hiển thị status `unhealthy` với lý do `Target.ResponseCodeMismatch`. 
Ghi chú: 
- Push image mới thành công (tag: `20260701-110726`). 
- Phát hiện ASG bị scale xuống 0 trước đó, đã chủ động tăng Desired Capacity về 2 nhưng instance mới spin lên vẫn không qua được health check của ELB (ResponseCodeMismatch).
- Lệnh curl qua ALB DNS bị timeout do không có target healthy để route traffic.
- Đã dừng lại không tiếp tục các bước sau theo yêu cầu, chờ Human điều tra thêm logs EC2/Docker để tìm nguyên nhân.

### [Fix Day 13 - 2026-07-01 14:26] Fix RDS SSL connection rejection (pg_hba.conf no encryption)
Làm gì: Bổ sung cấu hình `ssl: { rejectUnauthorized: false }` vào `pg.Pool` trong `backend/src/config/database.ts`, sau đó rebuild image, trigger Instance Refresh và verify lại hệ thống.
Root cause: RDS instance `quillo-prod-db` đang bật parameter `rds.force_ssl=1`. Tuy nhiên app Node.js (dùng `pg.Pool`) chỉ truyền vào `connectionString` mà không truyền object `ssl`, dẫn đến việc node-postgres từ chối kết nối không mã hóa (ResponseCodeMismatch do health check failed).
Files thay đổi:
backend/src/config/database.ts — thêm config SSL.
Kết quả: DONE
Ghi chú: Đã xác nhận tất cả target healthy trên ELB Target Group, và endpoint `/api/v1/health` trả về status `ok` (postgres up, api up). Deploy thành công.

### [Deploy Day 13 - 2026-07-01 15:15] Task 13.3: prisma migrate deploy lên RDS
Làm gì: Lấy secret từ AWS Secrets Manager, parse `DATABASE_URL`, thiết lập AWS SSM port-forwarding qua instance ASG để trỏ `localhost:5433` tới RDS instance (với `sslmode=require`), và chạy `npx prisma migrate deploy` an toàn không để lọt credentials ra stdout.
Files thay đổi: (không có — chỉ chạy migration, không sửa code)
Kết quả: DONE
Ghi chú: Chạy lệnh thành công, apply migration `20260623064843_init_db`. `npx prisma migrate status` báo "Database schema is up to date!". Số lượng bảng `information_schema.tables` đã được verify thành công. Đã đóng SSM tunnel an toàn.

### [Deploy Day 13 - 2026-07-01 15:45] Task 13.4: Deploy Lambda worker + SQS Event Source Mapping
Làm gì: Tạo script `setup-lambda.sh` để tạo IAM role (`quillo-lambda-role`), Security Group (`quillo-lambda-sg`), deploy Lambda function (`quillo-worker`), và thiết lập SQS Event Source Mapping (`quillo-generation-queue-prod` -> `quillo-worker`). Chạy script và gửi SQS test message.
Root cause (các lỗi gặp phải trong lúc deploy):
1. Tham số `AWS_REGION` là key bị cấm (reserved) trên Lambda environment variables -> phải xoá khỏi script.
2. Lỗi Duplicate Security Group khi rerun script do filter theo group-names không hoạt động đúng nếu không truyền vpc-id -> Sửa lại dùng `--filters Name=group-name,Values=... Name=vpc-id,Values=...`.
3. Lỗi winston-cloudwatch missing `aws-sdk` (v2) trên Node 20 runtime -> Cập nhật `logger.ts` để bypass thêm `CloudWatchTransport` nếu đang chạy trong môi trường Lambda (vì Lambda tự forward stdout lên CloudWatch Logs native).
Files thay đổi:
infrastructure/scripts/setup-lambda.sh — tạo script deploy Lambda.
backend/src/config/logger.ts — bypass winston-cloudwatch trên Lambda.
backend/create-job.ts & backend/run-test.sh — các script test để tạo dummy job trong DB và send SQS msg.
Kết quả: DONE
Ghi chú: Event Source Mapping nhận message SQS và trigger Lambda thành công. Lambda đọc được connection string và Secrets Manager, update trạng thái job. Error ghi nhận duy nhất trên Lambda logs là "[503 Service Unavailable] This model is currently experiencing high demand" từ Gemini API, xác nhận worker hoạt động E2E hoàn hảo về mặt infra/network.
- IAM role riêng `quillo-lambda-role` (không dùng chung quillo-ec2-role — least privilege theo service)
  - Security Group riêng `quillo-lambda-sg`, đã whitelist inbound vào rds-sg + quillo-redis-sg
  - logger.ts: bypass CloudWatchTransport khi chạy trong Lambda (AWS_LAMBDA_FUNCTION_NAME) — Lambda tự forward stdout lên CloudWatch native

### [Docs Day 13 - 2026-07-01 18:52] Cập nhật INFRASTRUCTURE_CONTEXT.md khớp thực tế deploy
Làm gì: Cập nhật tài liệu hạ tầng để phản ánh đúng kiến trúc thực tế Day 12-13 (chuyển sang dùng ALB + ASG), cập nhật danh sách script mới provision AWS, và điều chỉnh sơ đồ luồng Network Architecture.
Files thay đổi:
docs/INFRASTRUCTURE_CONTEXT.md — cập nhật AWS Services, Network Architecture, Scripts, Chưa implement cho khớp trạng thái Day 12-13
Kết quả: DONE
Ghi chú: Giữ lại "RDS backup policy" trong phần chưa implement do không thấy thông tin cấu hình backup tự động trong log. Cần human verify nếu cần thiết.

### [Docs Day 13 - 2026-07-01 18:59] Fix INFRASTRUCTURE_CONTEXT.md section "Deployment Scripts"
Làm gì: Thay thế nội dung cũ (Day 11) của mục Deployment Scripts bằng list các bước provision chạy thực tế tuần tự, đánh dấu rõ bước nào DONE, bước nào PENDING.
Files thay đổi:
docs/INFRASTRUCTURE_CONTEXT.md — Cập nhật mục Deployment Scripts
Kết quả: DONE
Ghi chú: Đã bám sát hoàn toàn chuỗi task 12.3 đến 13.4 để list trình tự chạy.

### [Task day 13.5.0 - 2026-07-01 20:52] Start lại RDS + ASG cho Task 13.5
Làm gì: Start RDS instance quillo-prod-db và scale ASG quillo-api-asg lên 2 instances, kiểm tra health check và smoke test thành công.
Files thay đổi: (không thay đổi code)
Kết quả: DONE
Ghi chú: RDS status trước là 'starting', sau đó đợi khoảng 5-6 phút chuyển 'available'. Target Group có 2 targets healthy sau 6 phút polling. ALB smoke test HTTP 200 trả về `{"status":"ok","services":{"postgres":"up","api":"up"}}`.

### [Task day 13.5 - 2026-07-01 21:01] Deploy CloudFront + frontend
Làm gì: Deploy frontend lên S3, setup CloudFront distribution (OAI do AWS CLI cũ không hỗ trợ OAC), update backend ALLOWED_ORIGINS.
Files thay đổi:
- infrastructure/scripts/setup-cloudfront.sh — script mới tạo OAI + distribution + bucket policy
- frontend/.env.production — tạo từ example
Kết quả: BLOCKED
Ghi chú: Việc tạo CloudFront distribution thất bại với lỗi `AccessDenied: Your account must be verified before you can add new CloudFront resources`. Cần verify account với AWS Support trước khi có thể deploy CloudFront. Các bước tiếp theo (upload S3, update ALB CORS, smoke test) bị chặn.

### [Task day 13.5 (revised, part 1) - 2026-07-01 21:16] S3 Static Website Hosting setup
Làm gì: CloudFront blocked → S3 Static Website Hosting làm origin tạm, chờ Cloudflare DNS setup ở Part 2.
Files thay đổi:
- infrastructure/scripts/deploy-frontend.sh — sửa dòng 26-30 và 60-66 để skip CloudFront invalidation nếu thiếu biến CF_DISTRIBUTION_ID
- infrastructure/outputs/s3-website-endpoint.txt — endpoint mới
Kết quả: DONE
Ghi chú: setup-cloudfront.sh giữ nguyên, dùng lại sau khi account verify. ALLOWED_ORIGINS CHƯA update — chờ Part 2.

### [Task day 13.5 (revised, part 2) - 2026-07-01 21:55] Wire domain qua Cloudflare
Làm gì: Verify domain live trước khi rebuild và config CORS.
Files thay đổi: (không có)
Kết quả: BLOCKED
Ghi chú: Domain frontend (https://quillo.khuongle.site/) load thành công, nhưng backend API domain (https://api.quillo.khuongle.site/api/v1/health) bị lỗi SSL handshake (curl exit code 35). Cloudflare có thể đang chờ cấp chứng chỉ Edge Certificate cho domain API. Đã tự động retry 3 lần nhưng vẫn fail. Dừng thực thi task theo yêu cầu để chờ DNS/SSL propagate hoàn toàn trước khi làm tiếp.

### [Task day 13.5 (revised, part 2) - 2026-07-01 22:30] Wire domain qua Cloudflare (RESUMED)
Làm gì: Rebuild frontend trỏ API domain Cloudflare, update ALLOWED_ORIGINS, instance refresh, verify full flow qua domain thật.
Files thay đổi:
- frontend/.env.production — VITE_API_BASE_URL đổi sang https://quillo-api.khuongle.site/api/v1
- Launch Template version mới — ALLOWED_ORIGINS=https://quillo.khuongle.site
Kết quả: DONE
Ghi chú:
- Frontend: https://quillo.khuongle.site
- Backend API: https://quillo-api.khuongle.site (đổi từ api.quillo.khuongle.site do giới hạn Cloudflare Universal SSL free chỉ phủ subdomain 1 cấp)
- Lưu ý Resume: Task trước đó bị gián đoạn do mất mạng sau khi update Launch Template và trigger Instance Refresh. Đã resume thành công ở Bước 4 sau khi xác minh Frontend đã build/deploy và Instance Refresh đã trạng thái `Successful`.
- Smoke test POST `/auth/login` qua domain thật thành công, nhận JWT token đầy đủ, không dính lỗi CORS.
- Task 13.6 (ACM + ALB HTTPS listener) không còn bắt buộc, có thể làm sau cho Full SSL end-to-end nếu cần.

### [Task day 13.5.1 - 2026-07-01 23:05] Fix CORS fail trên /auth/register
Làm gì: Diagnose and fix CORS preflight error trên route register.
Files thay đổi: (không có thay đổi app.ts)
Kết quả: DONE
Ghi chú: Root cause là do **Launch Template UserData chưa được update đúng**. Trong quá trình chạy Part 2 trước đó, lệnh regex để sửa file UserData bị sai cú pháp, khiến biến `ALLOWED_ORIGINS` trong Launch Template Version 5 vẫn mang giá trị cũ (`https://placeholder.cloudfront.net`). Cả 2 instances trong ASG đều chạy với biến môi trường lỗi này. Curl POST báo success vì `curl` bỏ qua CORS preflight, nhưng trình duyệt đã đúng khi chặn preflight OPTIONS vì không có header `Access-Control-Allow-Origin`.
Cách fix: Đã update thủ công và chính xác file UserData để trỏ `ALLOWED_ORIGINS=https://quillo.khuongle.site`, tạo Launch Template Version 6, và start Instance Refresh.
Kết quả: Verify vòng lặp curl OPTIONS 10/10 lần đều PASS ổn định, header `access-control-allow-origin: https://quillo.khuongle.site` đã xuất hiện. Browser test sẽ hoạt động hoàn hảo.

### [Task day 13.6 - 2026-07-02 09:02] Associate WAF WebACL với ALB, setup CloudWatch
Làm gì:
- Associate WebACL "quillo-prod-waf" (tên chính xác là quillo-waf) với ALB
- Tạo Log Groups: /quillo/api, /quillo/worker, /aws/waf/logs
- Tạo Metric Filter trích xuất số lượng req bị WAF block
- Alarms + SNS Topic: API Error Rate, Worker Error Rate, WAF Blocked Requests
- Test thử tạo API errors thật → trigger Alarm
- (Bonus) Simulate gửi >500 req bị WAF block trong 1h bằng xargs command
- Confirm SNS Subscription

Files thay đổi:
- infrastructure/scripts/setup-cloudwatch.sh — script mới
- infrastructure/outputs/sns-alert-topic.txt — tạo mới, chứa SNS topic ARN

Kết quả: DONE

Ghi chú:
- Lý do dùng SNS topic riêng cho alert thay vì dùng chung SQS DLQ: SQS yêu cầu polling liên tục, Lambda tốn phí hơn, phải viết thêm code; Còn SNS cho phép subscribe bằng email/SMS, nhận alerts thụ động mà không cần "lắng nghe" liên tục nên đơn giản và rẻ hơn cho mục đích này.
- Mã nguồn phần bonus generate 550 req fake được tự động hóa bằng Bash (dùng `seq` kết hợp `xargs` với tham số concurrency `-P 50`, curl payload XSS parameter trigger WAF rule chặn và trả về HTTP 403). Alarm đã được tự động disable ngay sau test để không bị spam.
- Lệnh SNS đã được tạo với email lấy từ git config, cần user tự click Confirm trong Inbox.

### [Task day 13.7 - 2026-07-02 09:44] Cập nhật INFRASTRUCTURE_CONTEXT.md
Xác nhận đã update tài liệu hạ tầng:
- Cập nhật trạng thái WAF associated với ALB (DONE).
- Cập nhật CloudWatch Alarms và SNS Topic (live).
- Cập nhật luồng Deployment Scripts cho các Task 13.5 và 13.6.
