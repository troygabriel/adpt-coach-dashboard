# CLAUDE.md

## Project Overview

ADPT Coach Dashboard — web dashboard for fitness coaches. Part of the ADPT B2B coaching platform (Trainerize alternative).

- **Framework:** Next.js 16 App Router
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Backend:** Supabase (shared with mobile app)
- **Deployment:** Vercel

## Commands

```bash
npm run dev       # Dev server (Turbopack, port 3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Architecture

### Routing (Next.js App Router, file-based)
```
src/app/
├── (auth)/             # Sign-in/up (centered layout, no sidebar)
├── (dashboard)/        # Coach-only (sidebar layout, role guard)
│   ├── dashboard/      # Home overview
│   ├── clients/        # Client management
│   ├── check-ins/      # Check-in review
│   ├── programs/       # Program builder
│   ├── messages/       # Real-time messaging
│   ├── analytics/      # Business metrics
│   └── settings/       # Coach profile, billing
└── api/auth/callback/  # Supabase PKCE callback
```

### Key Directories
- `src/components/ui/` — shadcn/ui generated components (do not manually edit)
- `src/components/layout/` — Sidebar, topbar, mobile nav
- `src/lib/supabase/` — Browser, server, middleware clients
- `src/types/` — TypeScript interfaces for coaching domain

### Data Flow
- Server Components fetch data via `createClient()` from `lib/supabase/server.ts`
- Client Components use `createClient()` from `lib/supabase/client.ts`
- Middleware refreshes auth sessions on every request
- Coach role enforced in `(dashboard)/layout.tsx`

## Conventions

- **TypeScript strict mode.** Avoid `any`.
- **Server Components by default.** Only use `"use client"` for interactive components.
- **Imports:** React/Next first, third-party, then `@/` local imports. Use `import type` for type-only.
- **Styling:** Tailwind utility classes. Use `cn()` from `lib/utils.ts` for conditional classes. Design tokens are CSS custom properties in `globals.css`.
- **Colors:** Always use semantic tokens (`text-primary`, `bg-card`, `text-muted-foreground`), never raw hex values.
- **Naming:** camelCase for variables/functions, PascalCase for components/types, kebab-case for files.
- **No Prettier.** Follow existing file style. 2-space indent, semicolons.

## Design System

Matches the ADPT mobile app. Light mode, black-and-white, minimal.
- Primary: `#000000` (black CTAs, active states)
- Background: `#FFFFFF`
- Card: `#FFFFFF` (with subtle border)
- Sidebar: `#F9FAFB` (light gray)
- Text: `#000000`
- Muted: `#9CA3AF`
- No color accents except functional (success green, error red)

## Environment Variables

### Required (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
