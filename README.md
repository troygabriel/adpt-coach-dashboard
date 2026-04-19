# ADPT Coach Dashboard

Web dashboard for fitness coaches to manage clients, programs, check-ins, and billing. Part of the ADPT platform — a modern alternative to Trainerize.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase (Postgres + Auth + Realtime + Storage)
- **Charts:** Recharts
- **Deployment:** Vercel

## Prerequisites

- Node.js 20+
- Access to the ADPT Supabase project

## Getting Started

```bash
# Clone the repo
git clone https://github.com/troygabriel/adpt-coach-dashboard.git
cd adpt-coach-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes |
| `NEXT_PUBLIC_APP_URL` | App URL (defaults to localhost:3000) | No |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up (centered layout)
│   ├── (dashboard)/      # Coach dashboard (sidebar layout, role-guarded)
│   │   ├── dashboard/    # Home overview
│   │   └── clients/      # Client management
│   └── api/auth/         # Supabase PKCE callback
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Sidebar, topbar, mobile nav
│   ├── dashboard/        # Stat cards, charts
│   └── clients/          # Client table, dialogs
├── lib/
│   ├── supabase/         # Browser, server, middleware clients
│   ├── utils.ts          # cn(), formatCurrency, etc.
│   └── constants.ts      # Routes, nav items
├── types/                # TypeScript interfaces
├── hooks/                # Custom React hooks
└── middleware.ts          # Auth session refresh + redirects
```

## Scripts

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Deployment

Deploy to Vercel:

1. Connect this repo to Vercel
2. Set the environment variables in Vercel project settings
3. Deploy

Framework will be auto-detected as Next.js.

## Related

- [ADPT Mobile App](https://github.com/troygabriel/ADPT) — Client-facing Expo/React Native app
