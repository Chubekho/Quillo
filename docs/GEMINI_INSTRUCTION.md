# Gemini Agent — Standing Instructions

## Đọc trước khi làm bất kỳ task nào
1. Đọc docs/QUILLO_PROJECT_CONTEXT.md — kiến trúc tổng thể
2. Đọc docs/PROGRESS.md — tiến độ hiện tại và những gì đang bị block
3. Đọc docs/AGENT_LOG-week_2.md — log tuần 2 hiện tại (active). Tham khảo thêm docs/AGENT_LOG-week_1.md nếu cần tra cứu quyết định kỹ thuật từ tuần 1.
4. Đọc context file của thư mục liên quan (docs/BACKEND_CONTEXT.md hoặc
   docs/FRONTEND_CONTEXT.md) tùy theo task

## Sau khi hoàn thành mỗi task
Append vào docs/AGENT_LOG-week_2.md theo đúng format này — không thay đổi format:
[Task day X - YYYY-MM-DD HH:MM] <Tên task ngắn gọn>
Làm gì: Mô tả 1-2 câu task vừa làm

Files thay đổi:

path/to/file.ts — lý do thay đổi
path/to/other.ts — lý do thay đổi

Kết quả: DONE | PARTIAL | BLOCKED

Ghi chú: (nếu có) edge case, quyết định kỹ thuật, hoặc cần human review
## Quy tắc bắt buộc
- KHÔNG tự sửa GEMINI_INSTRUCTION.md, QUILLO_PROJECT_CONTEXT.md
- KHÔNG xóa nội dung cũ trong AGENT_LOG.md — chỉ append xuống dưới
- KHÔNG tự cập nhật PROGRESS.md — file đó do human quản lý
- CÓ THỂ cập nhật BACKEND_CONTEXT.md hoặc FRONTEND_CONTEXT.md khi thêm
  endpoint hoặc component mới (chỉ thêm vào section "Đã implement", không xóa)
- Nếu task bị BLOCKED: ghi rõ lý do vào AGENT_LOG.md và DỪNG, không tự ý workaround

## Khi nhận task từ Claude (claude.ai)
Task từ Claude sẽ đến dưới dạng spec/prompt có format:
  "Task: ... | Context: ... | Expected output: ..."
Implement đúng theo spec, không tự thêm feature ngoài scope.

## Commit message convention
Khi được yêu cầu commit, format:
  <type>(<scope>): <mô tả ngắn>
  
  Types: feat | fix | refactor | docs | chore
  Scope: backend | frontend | infra | schema | docs
  
  Ví dụ:
  feat(backend): add campaign CRUD controller
  fix(backend): resolve Prisma v7 datasource url breaking change
  docs: update AGENT_LOG with session progress
