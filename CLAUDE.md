# CLAUDE.md — ADPT Coaching Platform

> Authoritative architecture + roadmap for the entire ADPT system.
> Future agents: read this first. Re-read after every major refactor.
> Last updated: 2026-05-02.

---

## 1. Mission & product shape

ADPT is a **B2B online fitness-coaching platform** — a Trainerize replacement built around the things Trainerize does badly: check-ins, periodized programming, analytics, and a calm UI. Troy (the founder) is coach #1 and dogfoods with his own clients before any external rollout.

**One user is one role.** Profiles have `role ∈ {client, coach, admin}` and the apps are split:

- **Mobile (Expo / React Native, this org's `ADPT` repo)** → client app. Clients log workouts, complete check-ins, message their coach, follow programs the coach assigns.
- **Web dashboard (Next.js 16, this repo)** → coach app. Coaches manage roster, build programs, review check-ins, message clients, see analytics.
- **Supabase** → shared backend. Single Postgres schema, RLS-enforced separation between coaches and clients.

There is **no consumer self-service mode**. Onboarding for clients is invitation-driven through their coach.

---

## 2. Repos

### `~/troyg/Projects/ADPT` — mobile client app
- Expo SDK 54, Expo Router 6, React 19.1, RN 0.81, TypeScript strict.
- 4-tab layout: Home / Calendar / Workouts / Meals. Messages reachable from Home header icon and the right-side drawer.
- Direct Supabase access via `lib/supabase.ts` (no Fastify layer — `api/` was deleted in Sprint 1).
- Conventions doc: `AGENTS.md` at repo root (~230 lines, authoritative). Audit history: `AUDIT.md`.
- Theme: light, black-on-white, Cal AI minimal — `src/theme.ts` + `useTheme()`. Never hardcode colors.

### `~/troyg/Projects/adpt-coach-dashboard` — coach web dashboard (this repo)
- Next.js 16 App Router, React 19.2, TypeScript strict.
- Tailwind v4 + shadcn/ui (`src/components/ui/` is generated — do not hand-edit).
- `@supabase/ssr` for Server Components + middleware-refreshed sessions.
- Routes: see § 4.

### Supabase project (shared)
- Migrations live in **`~/troyg/Projects/ADPT/supabase/migrations/`** — that is the **single source of truth** for the schema. The dashboard repo's `supabase/` folder is for dashboard-specific scripts/seeds, not schema.
- Never modify the hosted schema directly. Every change is a new migration in the mobile repo.
- Generated types: `~/troyg/Projects/ADPT/types/database.ts`. Re-generate with `supabase gen types typescript --linked > types/database.ts`. Wire-up to `createClient<Database>()` is deferred (see Sprint 2 in `AUDIT.md`); until then, expect un-typed `.from()` calls in both repos.

---

## 3. Database schema map

Tables grouped by domain. RLS on every table. Coach can read client data only when `coach_clients.status='active'` (or sometimes `paused`).

### Identity & relationships
- `profiles` — extends `auth.users`. `role`, `first_name`, `email`, `push_token`, body data, `units`, `onboarding_data`. Auto-created on auth signup via `handle_new_user()` trigger.
- `coaches` — coach profile (`display_name`, `bio`, `specialties`, `branding`, Stripe fields). Auto-created when `profiles.role` flips to `coach` via `handle_coach_role()` trigger.
- `coach_clients` — the relationship table. `(coach_id, client_id)` unique. `status ∈ {pending, active, paused, archived}`. Drives every cross-role RLS policy.
- `client_invitations` — pending invites with `token`. Accepted via `accept_invitation(token)` RPC, which upserts `coach_clients` to `active`.

### Programming
- `coaching_programs` — top-level program assigned to one client by one coach.
- `program_phases` — periodization blocks within a program (`phase_number`, `duration_weeks`, `goal`, `status`).
- `phase_workouts` — per-day workout templates within a phase. `exercises` stored as JSONB (`{exercise_id, name, sets, reps, rir, rest_seconds, notes, order, superset_group}`).
- `workout_templates` — reusable per-user templates (older system, predates programs; still used in mobile workout flow).
- `exercises` — global exercise library + custom user-created entries. Curated/reseeded in `20260429`/`20260430` migrations.

### Logging (mobile)
- `workout_sessions` / `workout_exercises` / `workout_sets` — what the client actually did. Coaches can read via `coach_clients.status='active'` RLS.
- `user_streaks` / `user_xp` / `xp_events` — engagement, gamification (legacy from B2C era; light-touch).
- `user_limitations` / `limitation_feedback` — injury/equipment limitations the generator respects.

### Check-ins
- `check_in_templates` — coach-defined questionnaire templates (`questions` JSONB).
- `check_ins` — client submissions. `status ∈ {pending, submitted, reviewed, flagged}`. `responses` JSONB. Auto-flag `flag_reasons` array.
- `check_in_photos` — references storage bucket `check-in-photos`.
- `body_stats` — weight + measurements time series (`unique(client_id, date, source)`).
- `progress_photos` — direct photo uploads not tied to a check-in.

### Communication
- `conversations` — `(coach_id, client_id)` unique. `last_message_at` for sorting. Auto-created by `auto_create_conversation` trigger when `coach_clients.status='active'`. Backfilled and made client-fillable via `find_or_create_conversation(p_coach_id)` RPC (added 2026-05-02).
- `messages` — `conversation_id`, `sender_id`, `recipient_id`, `content`, `message_type`, `read_at`. Realtime-published.

### Habits & nutrition
- `habit_assignments` / `habit_logs` — coach-assigned daily/weekly habits.
- `client_macros` — coach-set calorie/macro targets (added in `20260417_client_nutrition_and_sessions.sql`).
- `meal_plans` (planned, see roadmap) — coach-uploaded PDF or structured plan.

### Coach productivity
- `coach_tasks` (added `20260501`) — coach-scheduled tasks/reminders for a specific client on a specific date. Renders on the client's Home tab.

### Billing
- `client_subscriptions` — Stripe Connect subscription rows (UI deferred).

### Storage buckets
- `check-in-photos` — private; clients write to `<their-uuid>/...`; coaches read their active clients' folders.
- `progress-photos` — separate bucket added `20260501`.
- `avatars` — public.

### Helper RPCs (Postgres functions)
- `get_user_id_by_email(email)` — coach-side client lookup.
- `accept_invitation(token)` — invite → active relationship.
- `find_or_create_conversation(p_coach_id)` — client-side safety net.
- `get_coach_dashboard(coach_id)` — aggregate stats JSONB.
- `get_client_compliance(coach_id, client_id)` — workout/habit/check-in compliance JSONB.

---

## 4. Dashboard routing

```
src/app/
├── (auth)/                # centered layout, no sidebar
│   ├── sign-in/, sign-up/, forgot-password/, reset-password/
├── (dashboard)/           # role-guarded coach layout (sidebar + topbar)
│   ├── dashboard/         # home — stat strip, needs-attention list, activity feed
│   ├── clients/           # roster table → /clients/[clientId]/ detail
│   ├── check-ins/         # queue with auto-flag review
│   ├── programs/          # list → /programs/[id]/ builder (phases + day workouts)
│   ├── messages/          # conversation list + active thread (realtime)
│   ├── analytics/         # business + cohort metrics
│   └── settings/          # coach profile, branding, billing later
├── invite/[token]/        # public page clients land on from email — runs accept_invitation
└── api/
    ├── auth/callback/     # Supabase PKCE callback
    └── clients/invite/    # POST: send invite email
```

The dashboard layout (`src/app/(dashboard)/layout.tsx`) blocks non-coach roles and auto-creates the `coaches` row if missing.

---

## 5. Mobile routing

```
app/
├── _layout.tsx            # root: ErrorBoundary + onboarding provider
├── index.tsx              # auth gate → tabs or sign-in
├── sign-in.tsx, sign-up.tsx, welcome.tsx
├── settings.tsx
├── onboarding/            # minimal: auth-only since redesign 2026-04
├── (app)/
│   ├── _layout.tsx        # right-side drawer (Messages, Settings, Help, Sign Out)
│   ├── (tabs)/
│   │   ├── _layout.tsx    # 4 visible tabs: Home / Calendar / Workouts / Meals
│   │   ├── index.tsx      # Home (greeting, day strip, tasks, progress cards)
│   │   ├── calendar.tsx
│   │   ├── workout.tsx
│   │   ├── meals.tsx
│   │   ├── chat.tsx       # hidden tab — reachable from Home header & drawer
│   │   └── progress|social|checkin.tsx (legacy hidden, kept to satisfy router)
│   ├── log-progress.tsx, progress-photos.tsx, photo-history.tsx
└── (workout)/             # active workout flow (active, history, exercises, preview)
```

`ActiveWorkoutContext` (in `src/context/`) is the single source of truth for an in-progress workout; AsyncStorage-checkpointed after every set so a crash mid-leg-day doesn't lose the session.

---

## 6. Auth + role flow

1. Coach signs up directly on the dashboard. `handle_new_user()` makes a `profiles` row; coach manually flips `role='coach'` (or it's set during invite email handling). `handle_coach_role()` trigger seeds `coaches`.
2. Coach invites client by email → `client_invitations` row + email link to `/invite/[token]`.
3. Client follows link, signs up on **mobile app** (or accepts on web first, then installs mobile). `accept_invitation` upserts `coach_clients.status='active'`, which fires `auto_create_conversation`.
4. Mobile + dashboard pull data through the same Supabase Postgres with RLS scoping access by `auth.uid()`.

---

## 7. Coach-chat messaging — current state (post-2026-05-02)

End-to-end real coach↔client thread, no AI. Symmetric features on both sides:

- Conversation auto-created on `coach_clients.status='active'`. Backfill migration covers legacy rows. Mobile falls back to `find_or_create_conversation` RPC if the trigger missed.
- Realtime via `supabase_realtime` publication on `messages`. Both sides subscribe to INSERT + UPDATE filtered by `conversation_id`.
- Optimistic send on both sides with rollback on error.
- Date separators (`Today` / `Yesterday` / weekday / full date).
- Mark-as-read on render; sender sees "Read" tag once recipient opens the thread.
- Mobile: chat tab is hidden from the tab bar (4-tab mandate) but reachable via Home header chat icon (with unread badge) and the drawer.
- Mobile: live unread count via `useUnreadMessages` hook (counts `messages.recipient_id=me, read_at=null`, kept current via realtime).
- Dashboard: `messages/page.tsx` shows conversation list (with unread badges + last-message preview) on the left, active thread on the right.

**Known gaps (deferred)**:
- N+1 queries in dashboard `messages/page.tsx` for last-message + unread counts (acceptable for small rosters; collapse into RPC later).
- No pagination on long threads.
- No attachments / voice notes (schema supports it via `message_type` + `attachment_url`).
- No push notification on receive (hook is wired, payload not yet sent).
- No typing indicator / online presence.

---

## 8. Conventions (dashboard)

- **Server Components by default.** `"use client"` only when the component needs hooks, events, or browser APIs.
- **TypeScript strict.** `any` only at boundaries (`req.body`, untyped supabase rows). Prefer narrow casts.
- **Imports:** React/Next first → third-party → `@/` local. Use `import type` for type-only.
- **Styling:** Tailwind utilities. `cn()` for conditionals. Use semantic tokens (`text-foreground`, `bg-muted`) — no raw hex.
- **No Prettier.** Match surrounding file style. 2-space indent, semicolons.
- **Naming:** camelCase variables/functions, PascalCase components/types, kebab-case files.
- **shadcn/ui** components are CLI-generated; configure in `components.json`. Don't customize the generated source — wrap them.

## Conventions (mobile)
See `~/troyg/Projects/ADPT/AGENTS.md` for the full list. Key rules:
- No schema changes without a migration.
- Don't redefine `Database` types.
- ErrorBoundary required on top-level layouts and `(workout)/active`.
- PRs ≤ ~400 lines of diff.
- `useTheme()` always — never import color constants directly.

---

## 9. Design system (both apps)

- **Black-and-white minimal.** White bg, black text, no color accents except functional success-green and error-red. Ref: Cal AI, MacroFactor, Hevy.
- Generous padding, hairline borders, minimal motion.
- Mobile primary CTA = 56pt; secondary = 48pt; min = 44pt (HCI compliant).
- Typography: Inter + Playfair Display (mobile editorial moments).
- Dashboard tokens are CSS custom properties in `globals.css`; mobile tokens are JS in `src/theme.ts`.

---

## 10. Trainerize feature parity — implementation roadmap

**Status legend:** ✅ shipped · 🟡 partial · ⬜ not started · ⏸ deferred (out of v1 scope)

### Mobile (client app)
| Feature | Status | Notes |
|---|---|---|
| Sign-in / sign-up / forgot-password | ✅ | |
| 4-tab navigation (Home / Calendar / Workouts / Meals) | ✅ | |
| Coach-assigned program rendering on Home | ✅ | active phase, day workout, completion dot |
| Active workout logger (sets, reps, weight, RIR, rest timer) | ✅ | `ActiveWorkoutContext`, AsyncStorage checkpointing |
| Workout templates / re-run last workout | ✅ | |
| Exercise library + custom exercises | 🟡 | search works, custom-create UX needs polish |
| Streaks | ✅ | |
| Progress photos (capture + delete + timeline) | ✅ | recent PRs |
| Body stats logging (weight, measurements) | ✅ | `log-progress.tsx` |
| Coach-scheduled tasks on Home | ✅ | `coach_tasks` |
| Coach messaging (real, not AI) | ✅ | this PR |
| Unread messages badge | ✅ | this PR |
| Check-in submission flow | 🟡 | screens exist (`src/screens/checkin/`); wire to `check_in_templates` so questions are coach-defined |
| Macro targets display in Meals tab | 🟡 | `client_macros` reads work; needs presentation polish |
| Meal-plan PDF download | ⬜ | coach uploads PDF → mobile renders inline / download |
| Habit logging | ⬜ | `habit_assignments` + `habit_logs` exist; need daily checklist UI |
| Push notifications on new message | 🟡 | Edge Function `push-on-message` shipped — needs `supabase functions deploy` + DB Webhook config (see `supabase/functions/push-on-message/README.md`) |
| Push notifications for check-in due / task due | ⬜ | reuse the push-on-message pattern with cron triggers |
| Calendar tab | 🟡 | screen scaffolded; needs program-week view + log dots |
| Coach-uploaded video form-checks | ⬜ | per-exercise video link or upload |
| Voice notes (send/receive) | ⏸ | schema supports `message_type='voice'` |
| Wearable integration (Apple Health, Garmin) | ⏸ | post-v1 |
| In-app group chat / cohorts | ⏸ | post-v1 |

### Dashboard (coach app)
| Feature | Status | Notes |
|---|---|---|
| Auth (sign-in / sign-up / forgot-password) | ✅ | |
| Role guard + auto-create coach row | ✅ | `(dashboard)/layout.tsx` |
| Sidebar + topbar shell | ✅ | |
| Home — stat strip, needs-attention list, activity feed | ✅ | |
| Roster table + client detail page | ✅ | photos timeline, intake card, coach tasks |
| Invite client (email + token + accept flow) | ✅ | |
| Pending invites list | ✅ | |
| Program builder (programs → phases → day workouts) | ✅ | exercise picker, workout editor, duplicate day/phase |
| Check-ins queue + detail view (auto-flags, photo compare, weight trend, habit tracker, coach notes) | ✅ | |
| Coach notes panel (per client) | ✅ | |
| Messaging (conversation list + thread, realtime) | ✅ | this PR adds optimistic send + date separators |
| Coach-scheduled tasks UI | ✅ | |
| Progress photos timeline (coach-side viewer) | ✅ | |
| Analytics page | 🟡 | route exists; needs MRR / churn / cohort charts |
| Settings page | 🟡 | route exists; needs coach profile editor + branding + billing tabs |
| Sidebar unread-message badge | ⬜ | feed `get_coach_dashboard().unreadMessages` into `NAV_ITEMS` |
| Check-in template builder | ⬜ | drag-and-drop questionnaire editor → `check_in_templates` |
| Habit assignment UI | ⬜ | per-client habit picker writing to `habit_assignments` |
| Macro target editor | ⬜ | per-client macros writing to `client_macros` |
| Meal-plan upload (PDF or structured) | ⬜ | coach uploads → client mobile reads |
| Exercise library admin (custom exercise create + share) | ⬜ | dashboard-side editor for `exercises` |
| Bulk import / migrate from Trainerize | ⬜ | CSV importer for clients + programs |
| Cal-style session scheduling | ⬜ | `sessions` table + calendar view (1-on-1 video calls TBD) |
| Stripe Connect onboarding + per-client subscriptions | ⬜ | `client_subscriptions` rows are wired in schema; UI + webhook handler deferred |
| Email/SMS automation | ⏸ | post-v1 |
| Group cohorts / multi-coach | ⏸ | post-v1 |

### Backend / shared
| Feature | Status | Notes |
|---|---|---|
| Supabase RLS for coach↔client separation | ✅ | every table |
| Realtime publication on `messages` + `check_ins` | ✅ | |
| Helper RPCs (`get_coach_dashboard`, `get_client_compliance`, `find_or_create_conversation`) | ✅ | |
| Generated `types/database.ts` | 🟡 | exists but not wired into `createClient<Database>()` (Sprint 2 follow-up) |
| Edge Function: push-on-message | 🟡 | code in `supabase/functions/push-on-message/`; deploy + webhook wiring is a manual step |
| Edge Functions for check-in auto-flagging | ⬜ | weight stall, missed workouts, low energy → write `flag_reasons` |
| Stripe Connect webhook handler | ⬜ | populate `client_subscriptions` on subscription events |
| Background job for compliance recompute | ⬜ | nightly cron via Supabase scheduled function |

---

## 11. Sequencing recommendation (next 4 sprints)

Each sprint = 1–2 weeks of evening time, one logical PR per item, ≤400 lines.

**Sprint A — Plumbing**
1. Wire `Database` types into both `createClient<Database>()` calls (mobile + dashboard) so all `.from()` calls are typed. Fix the cascading errors that surface.
2. Sidebar unread-message badge on dashboard (feed `get_coach_dashboard()` count into `NAV_ITEMS`).
3. Edge Function: push notification on `messages` insert.

**Sprint B — Check-ins end-to-end**
4. Mobile: wire `CheckInScreen` to `check_in_templates` so coach-defined questions render dynamically.
5. Dashboard: check-in template builder UI.
6. Edge Function: auto-flag check-ins (weight stall, missed workouts, low energy).

**Sprint C — Habits & nutrition**
7. Dashboard: habit assignment UI.
8. Mobile: daily habit checklist on Home.
9. Dashboard: macro target editor.
10. Mobile: macro target display polish + meal-plan PDF download.

**Sprint D — Business operations**
11. Analytics page: MRR, active client count, retention, cohort churn.
12. Settings page: coach profile editor, branding, Stripe Connect onboarding.
13. CSV importer for migrating clients from Trainerize.

After D, the platform reaches feature parity with Trainerize core. Everything past that (sessions/scheduling, video calls, group cohorts, wearables, automation) is post-v1.

---

## 12. Operational notes for future agents

- **Always read this doc and the mobile `AGENTS.md` before planning a change.**
- When in doubt about schema, read `~/troyg/Projects/ADPT/supabase/migrations/` in date order — the latest migration touching a table is authoritative. Don't trust `types/database.ts` blindly; it goes stale between regenerations.
- The mobile typecheck has many pre-existing errors (untyped supabase calls). Don't try to "fix them all" — fix only what your PR touches. Sprint A is the proper place to wire `Database` types.
- The dashboard typecheck is currently clean — keep it that way.
- Auto-merge after lint+tsc pass per Troy's standing instruction (`feedback_pr_workflow`), unless the change is risky (schema migration, auth, anything that could brick prod).
- When opening a migration, pair it with a note in this CLAUDE.md if it changes the table map in § 3.
- When adding a coach-side feature, also note the mobile counterpart (or explicit non-counterpart) in the roadmap table.
- Design mandate is unchanged: light, black-and-white, minimal — no color accents, no decoration, no animations beyond functional transitions.

---

## Environment variables (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Commands
```bash
npm run dev       # Dev server (Turbopack, port 3000)
npm run build     # Production build
npm run lint      # ESLint
```
