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
├── services/api.ts       ← Axios instance + interceptor auto-refresh token
│                           Typed methods: authApi, personaApi, contentApi, campaignApi
├── store/
│   └── auth.store.ts     ← Zustand: { user, isAuthenticated, login, register,
│                                       logout, fetchMe }
│                           Lưu tokens vào localStorage
└── hooks/
└── useJobPoller.ts   ← Poll GET /content/:id/jobs/:jobId mỗi 2.5s
Returns: { status, result, error }
Auto-stop khi status=completed|failed
---

## Files CẦN implement ❌
src/
├── pages/
│   ├── Login.tsx              ← form email+password → authStore.login()
│   ├── Register.tsx           ← form email+password+name+orgName
│   ├── Dashboard.tsx          ← overview: content count, token usage, recent
│   ├── ContentList.tsx        ← list + filter by type/status/campaign
│   ├── ContentEditor.tsx      ← MAIN PAGE: brief input, generate button,
│   │                             polling spinner, content display, edit actions
│   ├── PersonaList.tsx        ← list personas với badge "default"
│   ├── PersonaEditor.tsx      ← form tạo/sửa persona (tone, voice, keywords...)
│   └── Campaigns.tsx          ← list campaigns, tạo mới
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx      ← sidebar nav + main content area
│   │   └── Sidebar.tsx
│   ├── content/
│   │   ├── ContentCard.tsx    ← card hiển thị trong list
│   │   ├── GeneratePanel.tsx  ← brief input + type selector + persona picker
│   │   ├── ContentDisplay.tsx ← hiển thị generated text + action buttons
│   │   └── VersionHistory.tsx ← list versions, restore button
│   ├── persona/
│   │   └── PersonaForm.tsx    ← multi-field form cho persona
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Badge.tsx
│       └── Spinner.tsx        ← dùng khi polling
└── App.tsx                    ← Router setup + QueryClient + protected routes

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