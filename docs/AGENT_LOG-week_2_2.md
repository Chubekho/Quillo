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
