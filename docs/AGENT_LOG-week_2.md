# Agent Log — Quillo (Week 2)

> Append-only. Không xóa entry cũ.
> Format: xem docs/GEMINI_INSTRUCTION.md

---

### [Task day 6 - 2026-06-25 15:05] Hoàn thiện ProtectedRoute và cấu trúc routing trong App.tsx
Làm gì: Tạo component ProtectedRoute xử lý kiểm tra authentication và tự động hydrate user khi có token nhưng chưa có dữ liệu user trong store (khi reload trang). Thiết lập cấu trúc routing đầy đủ trong App.tsx với các public routes, protected routes (bọc trong ProtectedRoute và AppLayout), cùng catch-all route.

Files thay đổi:

frontend/src/components/ProtectedRoute.tsx — tạo mới, đọc state isAuthenticated/user từ auth.store, xử lý hydrate user qua fetchMe() khi có accessToken, hiển thị spinner trong lúc chờ và redirect về /login kèm location state nếu chưa đăng nhập hoặc lỗi.
frontend/src/components/layout/AppLayout.tsx — tạo mới placeholder component bọc nested Outlet cho các protected routes.
frontend/src/pages/Login.tsx — tạo mới placeholder component cho trang đăng nhập.
frontend/src/pages/Register.tsx — tạo mới placeholder component cho trang đăng ký.
frontend/src/pages/Dashboard.tsx — tạo mới placeholder component cho trang Dashboard.
frontend/src/pages/ContentList.tsx — tạo mới placeholder component cho trang ContentList.
frontend/src/pages/PersonaList.tsx — tạo mới placeholder component cho trang PersonaList.
frontend/src/pages/CampaignList.tsx — tạo mới placeholder component cho trang CampaignList.
frontend/src/pages/UsagePage.tsx — tạo mới placeholder component cho trang UsagePage.
frontend/src/App.tsx — cập nhật toàn bộ cấu trúc routing phân chia rõ public, protected (nested trong AppLayout) và catch-all routes.
frontend/src/vite-env.d.ts — thêm type reference cho vite/client để tránh lỗi TS2339 với ImportMeta.

Kết quả: DONE

Ghi chú: Đảm bảo auth.store.ts và api.ts giữ nguyên không bị phá vỡ. Kiểm tra tsc --noEmit hoàn toàn không có lỗi TS.

---

### [Task Day 6 - 2026-06-25 15:20] Tạo trang Login và Register với form validation + redirect
Làm gì: Xây dựng hoàn chỉnh giao diện trang đăng nhập (Login) và đăng ký (Register) sử dụng Tailwind CSS, react-hook-form kết hợp zod validation và react-hot-toast.

Files thay đổi:

frontend/src/pages/Login.tsx — cập nhật giao diện form login, validate email/password, gọi useAuthStore.login(), hiển thị toast/lỗi inline và redirect về location.state.from hoặc /.
frontend/src/pages/Register.tsx — cập nhật giao diện form register với các field orgName, name, email, password, confirmPassword khớp 100% với authApi.register(), validate client-side confirmPassword, gọi useAuthStore.register() và redirect về /.

Kết quả: DONE

Ghi chú: Nút submit disable tự động khi đang gửi, xử lý lỗi API mượt mà không crash.

---

### [Task Day 6 - 2026-06-25 15:30] Tạo AppLayout làm shell cho mọi protected page
Làm gì: Tạo component AppLayout với thiết kế 2 cột responsive (sidebar trái cố định + vùng nội dung phải chứa Outlet) kèm hiển thị thông tin user/org và tính năng đăng xuất.

Files thay đổi:

frontend/src/components/AppLayout.tsx — tạo mới layout shell chính chứa sidebar điều hướng với NavLink highlight active, tích hợp icon lucide-react, hiển thị user.name và user.organization.name từ auth.store, nút đăng xuất gọi authApi.logout() và redirect về /login.
frontend/src/App.tsx — cập nhật đường dẫn import AppLayout sang ./components/AppLayout.
frontend/src/components/layout/AppLayout.tsx — xóa file placeholder cũ không còn sử dụng.

Kết quả: DONE

Ghi chú: Layout responsive hỗ trợ mobile toggle menu, đảm bảo logout thành công hoặc lỗi vẫn clear local state để không kẹt user.

---

### [Task Day 6 - 2026-06-25 16:11] Cập nhật docs sau khi hoàn thành Day 6 frontend
Làm gì: Cập nhật 3 file docs phản ánh đúng trạng thái sau khi hoàn thành toàn bộ Day 6 frontend (ProtectedRoute, App.tsx routing, Login, Register, AppLayout).

Files thay đổi:

docs/GEMINI_INSTRUCTION.md — sửa step 3 trỏ đến AGENT_LOG-week_2.md là file active, tham khảo week_1 nếu cần tra cứu lịch sử tuần 1.
docs/PROGRESS.md — cập nhật sprint sang Tuần 2 / Day 6, thêm section [Frontend — Day 6] vào Đã hoàn thành, cập nhật Tiếp theo sang Day 7, thêm 2 quyết định kỹ thuật (react-hook-form+zod, navigate replace).
docs/FRONTEND_CONTEXT.md — thêm ProtectedRoute, AppLayout, Login, Register, placeholder pages vào section ✅; xóa các file đã implement khỏi ❌ và cập nhật ghi chú placeholder cho Dashboard/ContentList/PersonaList/CampaignList.

Kết quả: DONE

---

### [Task Day 6 - 2026-06-25 16:24] Cập nhật FRONTEND_CONTEXT.md sau Day 6
Làm gì: Di chuyển files đã implement từ ❌ sang ✅ dựa theo cấu trúc thực tế trên disk (find frontend/src -name "*.tsx"). Thêm App.tsx, main.tsx, ProtectedRoute.tsx, components/layout/AppLayout.tsx, và tất cả pages stub (Login, Register, Dashboard, ContentList, PersonaList, CampaignList, UsagePage) vào block ✅. Xóa các dòng tương ứng khỏi block ❌.

Files thay đổi:
  docs/FRONTEND_CONTEXT.md — cập nhật trạng thái implement

Kết quả: DONE

---

### [Task Day 7 - 2026-06-26 13:40] Implement Dashboard.tsx và các UI component dùng chung (Spinner, Badge)
Làm gì: Xây dựng hoàn chỉnh trang Dashboard.tsx thay thế placeholder cũ, bao gồm widget hiển thị mức sử dụng token (hỗ trợ quota = null "Không giới hạn"), danh sách nội dung gần đây (tối đa 5 item) và các nút thao tác nhanh. Tạo 2 UI component dùng chung Spinner.tsx và Badge.tsx. Bổ sung các typed API method cho orgApi và usageApi trong api.ts.

Files thay đổi:

frontend/src/components/ui/Spinner.tsx — tạo mới component Spinner Tailwind hỗ trợ prop size optional.
frontend/src/components/ui/Badge.tsx — tạo mới component Badge dùng chung hỗ trợ ánh xạ màu cho ContentType, ContentStatus và JobStatus.
frontend/src/services/api.ts — bổ sung typed method cho orgApi.get, orgApi.update và usageApi.getSummary theo đúng pattern hiện có.
frontend/src/pages/Dashboard.tsx — triển khai hoàn chỉnh giao diện Dashboard sử dụng TanStack Query với đầy đủ trạng thái loading/error cho usage widget và recent content.

Kết quả: DONE

Ghi chú: Xử lý mượt mà edge case quota = null (không render progress bar, không lỗi NaN), empty state khi chưa có nội dung, điều hướng chính xác các quick action.

---

### [Task Day 7 - 2026-06-26 13:50] Implement ContentList.tsx với tính năng lọc server-side (type/status/campaign)
Làm gì: Xây dựng hoàn chỉnh trang ContentList.tsx thay thế placeholder cũ, hiển thị danh sách nội dung (title, Badge type, Badge status, ngày tạo) và tích hợp bộ lọc đa tầng (loại nội dung, trạng thái, chiến dịch). Sử dụng TanStack Query để truy vấn dữ liệu từ API.

Files thay đổi:

frontend/src/pages/ContentList.tsx — triển khai giao diện danh sách nội dung, tích hợp query `GET /content` (hỗ trợ params filter server-side) và `GET /campaigns` (cho dropdown filter). Thiết lập các trạng thái loading, error, và 2 empty state phân biệt rõ ràng giữa "Chưa có nội dung nào" và "Không tìm thấy nội dung phù hợp với bộ lọc".

Kết quả: DONE

Ghi chú: Đã kiểm tra xác nhận `GET /content` trên backend có hỗ trợ đầy đủ query param (`type`, `status`, `campaignId`), do đó đã lựa chọn thực hiện **filter server-side** (gửi param qua `contentApi.list(params)`). Click vào row tạm thời không navigate (ghi `// TODO Day 9`) để tránh lỗi route.

---

### [Task Day 7 - 2026-06-26] Cập nhật docs sau Day 7
Làm gì: Verify FRONTEND_CONTEXT.md, cập nhật PROGRESS.md (Day 7 done + section mới), tick checkbox ROADMAP.md
Files thay đổi:
  docs/FRONTEND_CONTEXT.md — verify và sửa nếu cần
  docs/PROGRESS.md — sprint status, section Day 7, tiếp theo Day 8, decision mới
  docs/ROADMAP.md — tick [x] Day 7 checkboxes
Kết quả: DONE

---

### [Task Day 8 - 2026-06-26 14:30] Implement PersonaList.tsx với đầy đủ trạng thái và actions
Làm gì: Triển khai trang quản lý PersonaList.tsx thay thế placeholder cũ, bao gồm hiển thị danh sách brand personas, badge "Mặc định", và các tính năng tạo, sửa, xóa, đặt mặc định. Bổ sung method remove vào personaApi trong api.ts.

Files thay đổi:

frontend/src/services/api.ts — bổ sung method remove(id) gọi DELETE /personas/:id theo đúng pattern hiện có mà không đổi các method signature cũ.
frontend/src/pages/PersonaList.tsx — triển khai giao diện danh sách Brand Persona với TanStack Query, các mutation setDefaultMutation và deleteMutation, thiết lập đủ 3 trạng thái loading (Spinner), error (thông báo + nút thử lại) và empty (thông báo + nút tạo persona đầu tiên).

Kết quả: DONE

Ghi chú: Xử lý disable các nút hành động khi mutation đang pending, xác nhận xóa với window.confirm, hiển thị thông báo toast success/error mượt mà. Đã kiểm tra tsc --noEmit không có lỗi.

---

### [Task Day 8 - 2026-06-26 14:43] Implement Persona create/edit flow (PersonaForm, PersonaEditor, Routes)
Làm gì: Triển khai hoàn chỉnh luồng tạo mới và chỉnh sửa Brand Persona bao gồm form dùng chung `PersonaForm.tsx`, trang quản lý `PersonaEditor.tsx`, các UI component nhỏ (`Button`, `Input`, `Select`) và tích hợp 2 route vào `App.tsx`.

1. Thông tin đọc từ `backend/prisma/schema.prisma` (để verify):
   - `tone`: kiểu `String` (bắt buộc, không phải Prisma enum). Comment trong schema gợi ý các giá trị: `"professional"`, `"playful"`, `"empathetic"`.
   - `voice`: kiểu `String?` (tùy chọn, không phải Prisma enum). Comment gợi ý: `"Chúng tôi là người bạn đồng hành tin cậy..."`.
   - `formalityLevel`: kiểu `Int` với `@default(3)` (từ 1=rất casual đến 5=rất formal).
   - Các field required: `name`, `tone`, `targetAudience`, `language`, `formalityLevel`, `isDefault`.
   - Các field optional: `voice`, `ageRange`, `industry`.
   - Các field array: `keywords`, `avoidWords`, `exampleOutputs`.

2. Files tạo mới & sửa đổi:
   - `frontend/src/components/ui/Button.tsx` — tạo mới component Button Tailwind hỗ trợ variant và isLoading.
   - `frontend/src/components/ui/Input.tsx` — tạo mới component Input Tailwind hỗ trợ label và error message.
   - `frontend/src/components/ui/Select.tsx` — tạo mới component Select Tailwind hỗ trợ label, error message và options.
   - `frontend/src/components/persona/PersonaForm.tsx` — tạo mới form dùng chung cho create/edit mode sử dụng react-hook-form và zod, xử lý mượt mà mảng keywords, avoidWords (nhập + Enter tạo chip, click X xóa) và exampleOutputs (list textarea, nút thêm/xóa).
   - `frontend/src/pages/PersonaEditor.tsx` — tạo mới trang quản lý create/edit, sử dụng `useParams()`, fetch dữ liệu qua `useQuery`, xử lý mutation create/update với `toast.success`, `invalidateQueries` và `navigate`.
   - `frontend/src/services/api.ts` — bổ sung method `get(id)` gọi `GET /personas/:id` theo đúng pattern hiện có mà không đổi các method signature cũ.
   - `frontend/src/App.tsx` — thêm 2 route protected: `/personas/new` (đặt trước) và `/personas/:id/edit` bọc trong `ProtectedRoute` và `AppLayout`.

Kết quả: DONE

Ghi chú: Luồng hoạt động trơn tru, kết nối chính xác từ PersonaList sang PersonaEditor, kiểm tra `tsc --noEmit` hoàn toàn không có lỗi.

---

### [Bug Fix Day 8 - 2026-06-26 15:00] Sửa lỗi PersonaForm không pre-fill keywords và avoidWords trong edit mode
Làm gì: Sửa lỗi hiển thị rỗng cho các mảng `keywords` và `avoidWords` khi vào trang chỉnh sửa `/personas/:id/edit` (kể cả khi DB có dữ liệu).

1. Root Cause:
   - Trước đây form sử dụng cơ chế `watch('keywords')` kết hợp với giá trị mặc định hoặc `useState`, nhưng do `useState([])` không tự động tái tạo khi `defaultValues` được tải về từ `useQuery` và cơ chế mảng nguyên thủy (primitive arrays) của react-hook-form không tự động đồng bộ đầy đủ các phần tử phi cấu trúc (chips) nếu không có binding rõ ràng.
   - Kiểm tra `exampleOutputs`: Trường này cũng là mảng (`string[]`), do đó hoàn toàn có rủi ro tương tự về việc mất đồng bộ state nếu quản lý thủ công mà không dùng `useFieldArray`.

2. Cách Fix (Áp dụng Cách A - `useFieldArray`):
   - Chuyển đổi định nghĩa mảng trong Zod schema sang mảng object chứa value: `z.array(z.object({ value: z.string() }))`.
   - Chuẩn hóa đầu vào `defaultValues` bằng cách map `string[]` sang `{ value: string }[]`.
   - Dùng `useFieldArray` của react-hook-form để quản lý trực tiếp cả 3 trường `keywords`, `avoidWords`, và `exampleOutputs`.
   - Với các mảng chip (`keywords`, `avoidWords`), gắn thêm thẻ `<input type="hidden" {...register(...)} />` vào mỗi chip để đảm bảo react-hook-form thu thập chính xác 100% dữ liệu khi submit.
   - Trong hàm `onSubmit`, map ngược các mảng `{ value: string }[]` về lại `string[]` trước khi gọi API.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` thành công hoàn toàn không có lỗi. Form hoạt động ổn định, pre-fill chuẩn xác ngay khi mở trang edit mode.

---

### [Task Day 9 - 2026-06-26 15:35] Bước 0 — Verify Backend Contract
Làm gì: Đọc và xác minh chính xác hợp đồng giao tiếp (contract) của backend và hook poller trước khi implement ContentEditor core.

Files thay đổi:
docs/AGENT_LOG-week_2.md — ghi lại kết quả verify 4 câu hỏi bắt buộc.

Kết quả: DONE

Ghi chú:
1. `backend/src/controllers/content.controller.ts` + routes + service:
   - `POST /content/:id/generate` lấy `brief` và `persona` từ DB (thông qua ContentPiece đã lưu), không nhận trong request body. Body shape của request là rỗng `{}`.
   - `POST /content` tạo DRAFT nhận các field: `title`, `type`, `brief` (bắt buộc), `campaignId`, `personaId`, `targetAudience`, `meta` (tùy chọn) và trả về nguyên object ContentPiece vừa tạo kèm `id` và `status: 'DRAFT'`.

2. `GET /content/:id` trả về trọn bộ thông tin object ContentPiece (kèm include `persona`, `campaign`), đồng thời CÓ EMBED sẵn `activeVersion` (chứa `body` của phiên bản active mới nhất). Không cần gọi riêng `GET /content/:id/versions`. Các field trả về: `id`, `organizationId`, `title`, `type`, `brief`, `status`, `campaignId`, `personaId`, `targetAudience`, `meta`, `createdAt`, `updatedAt`, `persona`, `campaign`, `activeVersion`.

3. `GET /content/:id/jobs/:jobId` (polling) khi COMPLETED trả về object `{ job, result }`. Trong đó `job` chứa thông tin GenerationJob (không chứa body), còn `result` được backend query tự động chứa thông tin phiên bản ContentVersion mới nhất đang active (`id`, `versionNo`, `body`, `source`, `createdAt`). Do đó lấy được ngay `body` mà không cần fetch riêng.

4. `useJobPoller.ts`:
   - Return object: `{ status, result, error }`.
   - Khi completed, `result` chứa `{ id: string; body: string; versionNo: number }`.
   - Auto-stop (gọi `clearInterval`) khi `jobStatus === 'completed'` hoặc `jobStatus === 'failed'`, hoặc khi unmount/lỗi catch.

-> DỪNG và báo cáo kết quả xác minh hợp đồng giao tiếp (contract) của backend và hook poller.

---

### [Task Day 9 - 2026-06-26 15:55] Task 1 — ContentEditor core: vòng lặp generate → poll → display (happy path)
Làm gì: Triển khai giao diện lõi của ContentEditor hỗ trợ vòng lặp generate -> poll -> display happy path theo đúng contract backend đã verify ở Bước 0.

Files thay đổi:

frontend/src/components/content/GeneratePanel.tsx — tạo mới component form thiết lập nội dung (title, type, personaId, brief) với react-hook-form + zod, xử lý tự động chọn default persona, gọi api create/generate và báo onJobStarted lên parent.
frontend/src/components/content/ContentDisplay.tsx — tạo mới component hiển thị kết quả AI (chỉ hiển thị, chưa có edit actions), hỗ trợ spinner khi isGenerating và hiển thị text whitespace-pre-wrap khi có body.
frontend/src/pages/ContentEditor.tsx — tạo mới trang chính quản lý state activeContentId, currentJobId, body, fetch dữ liệu content hiện tại, kết nối hook poller useJobPoller và cập nhật URL với replace: true khi tạo mới.
frontend/src/App.tsx — bổ sung 2 route /content/new và /content/:id bọc trong ProtectedRoute và AppLayout.
frontend/src/pages/ContentList.tsx — thêm nút Tạo nội dung ở header và onClick navigate chuyển trang khi click vào row.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` hoàn toàn thành công, không có lỗi TypeScript.

---

### [Task Day 9 - 2026-06-26 16:05] Task 2 — Thêm 3 action Rewrite/Expand/Shorten vào ContentDisplay
Làm gì: Xác nhận contract của 3 endpoint rewrite/expand/shorten và triển khai các nút thao tác nhanh trên giao diện ContentDisplay, kết nối trực tiếp vào hạ tầng polling hiện có của ContentEditor.

1. Xác nhận hợp đồng giao tiếp (Contract verification):
   - Kiểm tra `backend/src/controllers/content.controller.ts` xác nhận cả 3 endpoint `POST /content/:id/rewrite`, `POST /content/:id/expand`, và `POST /content/:id/shorten` đều trả về `{ jobId: job.id, status: 'queued' }` (hoàn toàn khớp với contract của `generate`).
   - Kiểm tra `frontend/src/services/api.ts` xác nhận 3 method `contentApi.rewrite`, `contentApi.expand`, `contentApi.shorten` đã tồn tại sẵn và chuẩn xác.

2. Files thay đổi:
   - `frontend/src/components/content/ContentDisplay.tsx` — bổ sung hàng nút action (Viết lại, Mở rộng, Rút gọn) ở cuối vùng hiển thị, chỉ xuất hiện khi có `body` và không ở trạng thái `isGenerating`. Bổ sung props `onAction` và `disabled`.
   - `frontend/src/pages/ContentEditor.tsx` — bổ sung hàm `handleAction(op)` gọi API tương ứng, nhận `jobId` và truyền vào `setCurrentJobId` để tận dụng 100% cơ chế poller hiện có mà không tạo poller mới. Xử lý disable/ẩn các thao tác khi `isGenerating = true`.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` thành công 100%, không có lỗi TypeScript.

---

### [Task Day 9 - 2026-06-26 16:15] Task 3 — VersionHistory: list các phiên bản + restore
Làm gì: Xác nhận contract của endpoint list versions và restore version, đồng thời triển khai tính năng theo dõi lịch sử phiên bản và khôi phục nội dung trong ContentEditor.

1. Xác nhận hợp đồng giao tiếp (Contract verification):
   - `GET /content/:id/versions` trả về mảng các version với các field cụ thể: `id`, `versionNo`, `source`, `isActive`, `createdAt`, `inputTokens`, `outputTokens` (không trích xuất `body` trong danh sách để tối ưu dung lượng tải).
   - `POST /content/:id/versions/:versionId/restore` hoạt động đồng bộ (synchronous transaction), ngay lập tức cập nhật tất cả các version khác thành `isActive: false` và version được chọn thành `isActive: true`. Trả về payload `{ message: 'Version restored' }`.
   - `frontend/src/services/api.ts` — bổ sung 2 method `contentApi.listVersions(id)` và `contentApi.restoreVersion(id, versionId)` theo đúng chuẩn pattern hiện có.

2. Files thay đổi:
   - `frontend/src/components/content/VersionHistory.tsx` — tạo mới component hiển thị lịch sử phiên bản, thể hiện rõ `versionNo`, `source` (sử dụng thẻ span styled text thường để hiển thị chính xác mọi giá trị AI/HUMAN mà không can thiệp sửa `Badge.tsx`), `createdAt`, trạng thái `active`, cùng nút `Khôi phục` đi kèm `window.confirm`. Hỗ trợ đầy đủ 3 trạng thái loading, error + retry, và empty state.
   - `frontend/src/pages/ContentEditor.tsx` — bổ sung nút toggle "Lịch sử phiên bản" trên header, hiển thị panel `VersionHistory` ở bên dưới khi kích hoạt, xử lý `onRestored` gọi `refetch()` để cập nhật dữ liệu `body` mới nhất lên `ContentDisplay`.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` thành công 100%, hoàn toàn không có lỗi TypeScript. Không can thiệp sửa `Badge.tsx`, `useJobPoller.ts`, hay `PROGRESS.md`.

---

### [Bug Fix Day 9 - 2026-06-26 21:05] Fix 2 bug sau khi test ContentEditor
Làm gì: Sửa 2 bug phát sinh sau khi test tính năng ContentEditor trên môi trường thực tế.

1. Xác nhận field PATCH backend nhận:
   - `PATCH /content/:id` nhận: `title`, `campaignId`, `personaId`, `targetAudience`, `meta`.
   - `PATCH /content/:id` KHÔNG nhận: `type`, `brief` (2 field này chỉ được set khi tạo mới qua POST /content).

2. Bug 1 — VersionHistory không refresh sau khi generate/rewrite (phải F5):
   - Nguyên nhân: Khi poller báo `completed`, `ContentEditor.tsx` chỉ `invalidateQueries` cho key `['content', id]` mà KHÔNG invalidate `['versions', id]` → `VersionHistory` vẫn giữ nguyên cache cũ của TanStack Query.
   - Fix: Trong nhánh `pollState.status === 'completed'` của `ContentEditor.tsx`, bổ sung thêm dòng `queryClient.invalidateQueries({ queryKey: ['versions', activeContentId] })` ngay sau dòng invalidate `['content']` đã có. Fix này áp dụng cho TẤT CẢ các loại job (generate, rewrite, expand, shorten) vì đều dùng chung handler hoàn thành.

3. Bug 2 — Regenerate dùng dữ liệu cũ trong DB (form đã sửa nhưng output vẫn theo bản cũ):
   - Nguyên nhân: Backend `POST /content/:id/generate` đọc `brief`, `title`, `persona` TỪ DB. Đường regenerate (đã có contentId) gọi `generate` ngay mà không lưu các field form user vừa chỉnh sửa → DB vẫn còn dữ liệu cũ → AI generate theo dữ liệu cũ.
   - Fix: Trong `GeneratePanel.tsx`, nhánh `else` (đã có contentId), thêm bước gọi `contentApi.update(contentId, patchPayload)` TRƯỚC khi gọi `generate`. Payload PATCH chỉ gửi các field backend chấp nhận: `{ title }` (bắt buộc) và `personaId` (chỉ gửi nếu có giá trị, tránh xóa persona cũ). Không gửi `type`, `brief` vì backend không nhận trong PATCH.
   - Nút "Viết lại/Mở rộng/Rút gọn" trong ContentDisplay giữ nguyên (thao tác trên body, không đụng form).

4. Files thay đổi:
   - `frontend/src/pages/ContentEditor.tsx` — thêm 1 dòng invalidate `['versions', activeContentId]` trong handler job completed.
   - `frontend/src/components/content/GeneratePanel.tsx` — thêm PATCH `contentApi.update` trước generate trong nhánh regenerate.

Kết quả: DONE

Ghi chú: Đã kiểm tra `tsc --noEmit` thành công 100%, không có lỗi TypeScript.


---

### [Bug Fix Day 9 - 2026-06-26 21:40] Fix race condition poller + brief/type không persist khi regenerate
Làm gì: Sửa 2 bug: stale status từ job cũ gây toast sai và brief+type bị đọc từ DB cũ khi regenerate.

1. Bug 1 — Spinner/handler chạy sai do stale status từ job trước (race condition):
   - Nguyên nhân: Khi job mới bắt đầu, render đầu tiên của effect vẫn thấy pollState.status === 'completed' của job CŨ (poller chưa reset kịp) → handler bắn toast "Đã tạo xong" và setCurrentJobId(null) → giết job mới ngay lập tức.
   - Fix (A) useJobPoller.ts: Thêm field jobId: string | null vào interface PollResult. Mọi setState đều kèm đúng jobId của vòng poll hiện tại. Khi không có contentId/jobId, reset rõ ràng về { status:'idle', ..., jobId:null } thay vì return trần.
   - Fix (B) ContentEditor.tsx: Thêm guard if (pollState.jobId !== currentJobId) return; ngay đầu useEffect completed-handler. Bổ sung pollState.jobId vào dependency array.

2. Bug 2 — brief (và type) không lưu được khi regenerate:
   - Nguyên nhân A: PATCH /content/:id backend không nhận brief/type → user sửa brief → regenerate đọc brief cũ từ DB.
   - Nguyên nhân B (frontend): frontend chỉ gửi title trong patchPayload, thiếu brief và type.
   - Nguyên nhân C (frontend form reset): useEffect([initialData, reset]) gọi reset() mỗi lần refetch sau generate → đè giá trị user đang nhập.
   - Fix (A) backend/src/controllers/content.controller.ts: Thêm type, brief vào destructure req.body và vào data của prisma.contentPiece.update. Thêm validation enum VALID_TYPES cho type, ném AppError(400) nếu sai.
   - Fix (B) GeneratePanel.tsx: Thêm type: data.type và brief: data.brief vào patchPayload của nhánh regenerate.
   - Fix (C) GeneratePanel.tsx: Dùng useRef<string|undefined>(initializedId) làm khóa. useEffect chỉ gọi reset() khi (initialData as any).id ?? contentId thay đổi so với initializedId.current.

Files thay đổi:
- backend/src/controllers/content.controller.ts — mở brief+type cho PATCH, thêm enum validation.
- frontend/src/hooks/useJobPoller.ts — thêm field jobId vào PollResult, reset idle rõ ràng.
- frontend/src/pages/ContentEditor.tsx — guard jobId trong completed-handler.
- frontend/src/components/content/GeneratePanel.tsx — gửi brief+type trong PATCH + sửa reset form theo id-change.

Kết quả: DONE

Ghi chú: Đã kiểm tra tsc --noEmit thành công 100% cả frontend lẫn backend, không có lỗi TypeScript.
