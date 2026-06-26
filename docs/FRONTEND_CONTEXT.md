# Frontend Context — Quillo

React 18 + Vite + TypeScript. Đọc QUILLO_PROJECT_CONTEXT.md trước.

---

## Stack

- **Build**: Vite 5
- **State (global)**: Zustand (`src/store/`)
- **State (server)**: TanStack Query v5 (`@tanstack/react-query`)
- **HTTP**: Axios với auto-refresh interceptor (`src/services/api.ts`)
- **Forms**: react-hook-form + zod resolver
- **Routing**: react-router-dom v6
- **UI**: Tailwind CSS (chưa có component library — tự build)
- **Icons**: lucide-react
- **Toast**: react-hot-toast

---

## Files đã implement ✅
src/
├── App.tsx                    ← Router setup: public/protected/catch-all, QueryClient, Toaster (thêm route /content/new + /content/:id)
├── main.tsx                   ← Entry point
├── services/api.ts            ← Axios instance + interceptor auto-refresh token
│                                 Typed methods: authApi, personaApi, contentApi (bổ sung listVersions(id), restoreVersion(id, vId), export(id, format)), campaignApi, orgApi, usageApi
├── store/
│   └── auth.store.ts          ← Zustand: { user, isAuthenticated, login, register,
│                                           logout, fetchMe }
│                                 Lưu tokens vào localStorage
├── hooks/
│   └── useJobPoller.ts        ← Poll GET /content/:id/jobs/:jobId mỗi 2.5s
│                                 Returns: { status, result, error, jobId } (thêm jobId field vào PollResult, reset idle rõ ràng)
│                                 Auto-stop khi status=completed|failed
├── components/
│   ├── ProtectedRoute.tsx     ← auth guard: check isAuthenticated, hydrate fetchMe()
│   │                             on reload, spinner + redirect /login kèm location.state
│   ├── persona/
│   │   └── PersonaForm.tsx    ← react-hook-form + zod, array chips keywords/avoidWords, exampleOutputs
│   ├── content/
│   │   ├── GeneratePanel.tsx  ← form create/regenerate với PATCH-then-generate
│   │   ├── ContentDisplay.tsx ← render body + 3 action buttons
│   │   ├── VersionHistory.tsx ← list + restore, 3 states
│   │   └── ExportBar.tsx      ← 3 nút xuất PDF/DOCX/HTML đồng bộ, download trực tiếp qua presigned URL
│   ├── ui/
│   │   ├── Badge.tsx          ← badge hiển thị ContentType, ContentStatus, JobStatus
│   │   ├── Spinner.tsx        ← spinner Tailwind đơn giản
│   │   ├── Button.tsx         ← button Tailwind tái dùng hỗ trợ variant, isLoading
│   │   ├── Input.tsx          ← input Tailwind tái dùng hỗ trợ label, error
│   │   └── Select.tsx         ← select Tailwind tái dùng hỗ trợ label, error, options
│   └── layout/
│       └── AppLayout.tsx      ← shell 2 cột: sidebar NavLink + Outlet, user/org info,
│                                 logout flow, responsive mobile toggle
└── pages/
    ├── Login.tsx              ← form react-hook-form+zod, redirect navigate(from,{replace:true})
    ├── Register.tsx           ← form orgName/name/email/password, confirmPassword client-only
    ├── Dashboard.tsx          ← full implement, không phải placeholder (usage widget, recent content, quick actions)
    ├── ContentList.tsx        ← full implement, server-side filter (list content, filter type/status/campaignId, row click navigate + nút "Tạo nội dung" ở header)
    ├── ContentEditor.tsx      ← state management, edit/create mode, poller integration
    ├── PersonaList.tsx        ← full implement, list brand personas + badge "mặc định" + actions (sửa / xóa / đặt mặc định)
    ├── PersonaEditor.tsx      ← create/edit mode, useParams, mutation create/update
    ├── CampaignList.tsx       ← full implement, list campaigns + tạo mới inline form + lưu trữ (soft delete)
    └── UsagePage.tsx          ← placeholder stub (implement Day 10)

---

## Files CẦN implement ❌
src/
└── components/
    └── content/
        └── ContentCard.tsx    ← card hiển thị trong list

---

## Luồng chính của UI (ContentEditor)
1. User chọn ContentType (BLOG_POST | SOCIAL_MEDIA | AD_COPY | EMAIL)
2. User chọn BrandPersona (dropdown, load từ GET /personas)
3. User nhập Marketing Brief (textarea)
4. Click "Generate" → POST /content/:id/generate → nhận { jobId }
5. useJobPoller(contentId, jobId) bắt đầu poll mỗi 2.5s
6. Show Spinner với text "Đang tạo nội dung..."
7. Khi status=COMPLETED → hiển thị content
8. Action buttons: Rewrite | Expand | Shorten | Export | Version History
9. Mỗi action lại tạo job mới → useJobPoller lại

---

## API Response Types cần define

```typescript
// src/types/index.ts
interface Organization { id, name, slug, plan, monthlyTokenQuota, currentMonthTokens }
interface User { id, email, name, role, organization: Organization }
interface BrandPersona { id, name, tone, voice, targetAudience, formalityLevel, 
                         keywords[], avoidWords[], isDefault }
interface ContentPiece { id, title, type, brief, status, persona?, campaign? }
interface ContentVersion { id, versionNo, body, source, isActive, createdAt }
interface GenerationJob { id, status, operation, errorMessage?, completedAt? }
```

---

## Patterns

- Protected routes: check `authStore.isAuthenticated`, redirect `/login`
- Fetch user on app mount: `authStore.fetchMe()` trong App.tsx useEffect
- Toast notifications: success/error sau mọi mutation
- Optimistic UI: KHÔNG dùng (content generation async, không biết kết quả trước)
- Form validation: tất cả dùng zod schema