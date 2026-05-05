# DESIGN.md — ADPT Coach Dashboard

> The design source of truth. Read before opening Figma, before adding a component, before deciding what goes on a screen.
> Companion to `CLAUDE.md` (architecture/roadmap) and `AGENTS.md` (conventions).
> Last updated: 2026-05-05.

---

## 1. North star

**Dense but quiet. Minimal but obvious.**

Every pixel earns its place. Information density is high; visual noise is low. The dashboard reads as calm because typography, chips, and small charts do the work that whitespace and oversized cards do in lesser designs.

Reference points: Linear (issue list density), Cal.com (calm motion), Apple (type hierarchy), Vercel (mono-accent restraint), MacroFactor (data-as-hero). Anti-references: Trainerize (cluttered, page loads slow); the current ADPT dashboard *circa 2026-05-05* (so sparse it's hard to see what to do).

---

## 2. Ten principles

1. **Density follows attention.** Pages where the coach *scans* (Today, Clients, Check-ins) are dense. Pages where the coach *focuses* (Mirror, Builder) are calm. Don't apply one density rule globally.
2. **Status before specifics.** Show state (active / needs review / at-risk) before raw numbers. Coaches scan for state, drill for data.
3. **Visualizations beat text for trends.** Compliance donuts, weight sparklines, mini-charts. One donut conveys what three lines of text can't.
4. **Tags are first-class.** Auto-tags surface concerns at a glance. Use color *only* for state, never for decoration.
5. **Progressive disclosure.** Default to one-line summaries; expand on click. Never show all forms expanded on first render.
6. **Recoverable actions.** Every entity has a `…` menu with Edit / Duplicate / Archive / Delete. Archive is undoable; Delete is final-with-confirmation.
7. **Names describe goals, not structure.** "Phase 1: Hypertrophy · 4 weeks", not "Block 1". Internal column names are not user-facing.
8. **One canonical place per action.** Tasks scheduled in *one* place (global Calendar with client filter). Programs built in *one* place. No alternate flows.
9. **Repeating elements, not parallel pages.** Same client card on Home / Clients / Messages / Mirror. Same chip palette everywhere. Same compliance donut anywhere weight or workout count appears.
10. **Type hierarchy does the heavy lifting.** Three sizes, three weights, two colors. Stop relying on borders and cards to create separation — typography first.

---

## 3. Typography scale

Font: **Geist** (sans) for everything. Geist Mono for numeric tabular columns where digit alignment matters (compliance %, weights, set/rep counts).

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 600 | Page title only ("Today", "Clients", "Test User") |
| `heading` | 18 / 24 | 600 | Section headers ("Needs attention", "Recent activity", "Current program") |
| `subheading` | 15 / 22 | 500 | Card titles, tab labels, list-item primary text |
| `body` | 14 / 20 | 400 | Default paragraph and table cell |
| `small` | 13 / 18 | 400 | Secondary metadata ("2 hours ago", "8 exercises · 16 sets") |
| `micro` | 11 / 14 | 500, uppercase, tracked +0.04em | Eyebrow labels ("ACTIVE CLIENTS", "DAY 1", "CALORIES") |

**Color discipline:** only two text colors used at a time on any screen — `foreground` (#000) for primary, `muted-foreground` (#6B7280 / #9CA3AF) for secondary. Never gradient-blue brand text.

Numerals in stats and compliance use `tabular-nums` and Geist Mono so columns of numbers align.

---

## 4. Color tokens

All tokens already exist in `src/app/globals.css`. **Do not introduce new color tokens** — extend semantically using these.

| Token | Hex | Allowed uses |
|---|---|---|
| `background` | #FFFFFF | Page bg only |
| `foreground` | #000000 | Primary text, primary buttons, active sidebar |
| `muted` | #F5F5F5 | Card hover, neutral chip bg, sidebar bg |
| `muted-foreground` | #9CA3AF / #6B7280 | Secondary text, eyebrow labels, inactive icons |
| `border` | #E5E7EB | All borders, dividers, separators |
| `success` | #22C55E | "PB last week", "On track", positive deltas |
| `warning` | *(unused — pure B&W mandate)* | Reserved token; chips and emphasis use darker B&W neutrals. Do NOT use the amber hue — confirmed 2026-05-05 the amber chip felt like an accent, which violates the mandate. |
| `destructive` | #EF4444 | Delete confirmations, critical flags only |
| `info` | #6B7280 | Reserved — use `muted-foreground` instead in 99% of cases |

**Rule:** color is *always functional*. If you find yourself reaching for color to add visual interest, use type weight or spacing instead. Outside of chips/badges, color appears in ≤2% of pixels on any screen.

### Chip palette

Five chip variants, that's it:

| Variant | Bg / text / border | When |
|---|---|---|
| `neutral` | muted bg, foreground text, no border | Default for tags, types ("Hypertrophy", "Custom") |
| `active` | foreground bg, white text | Status = Active. Status only, never decoration. |
| `warning` | foreground/5% bg, foreground text, foreground/15% border | "Inactive 7d", "No program", "Phase ending soon" — subtler than `neutral` but pure B&W (no hue) |
| `success` | success/10% bg, success text, success/30% border | "PB last week", "On track" |
| `destructive` | destructive/10% bg, destructive text, destructive/30% border | "Flagged", "Cancelled" |

Chips use `radius-sm` (8px), `text-small`, padding `px-2 py-0.5`. Stack horizontally with `gap-1.5`.

---

## 5. Spacing & density

Tailwind spacing already gives us 4px base. Density rules:

| Surface | Vertical rhythm | Card padding | Inner gap |
|---|---|---|---|
| Today, Clients, Check-ins (scan) | `space-y-3` (12px) between rows | `p-4` (16px) | `gap-2` (8px) |
| Mirror, Builder (focus) | `space-y-6` (24px) between sections | `p-6` (24px) | `gap-4` (16px) |
| Settings, Forms (input) | `space-y-4` (16px) | `p-6` | `gap-3` (12px) |

**Card use:** card borders only when content represents a discrete entity (a client row, a program row, a workout day). Don't wrap section headings in cards. Don't use cards as visual separation when typography and `border-t` will do.

**Empty states:** centered icon + heading + one-sentence description + primary CTA. No marketing copy. The current Check-ins empty state (Image #5) is the right pattern; replicate.

---

## 6. Component inventory

### Existing primitives (`src/components/ui/`, shadcn-generated, do not hand-edit)

`avatar`, `badge`, `button`, `card`, `command`, `dialog`, `dropdown-menu`, `input`, `popover`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `table`, `tabs`, `textarea`, `tooltip`

### Patterns to build (custom, in `src/components/patterns/`)

| Pattern | Purpose | Used on |
|---|---|---|
| `<StatLine>` | Inline summary text, replaces giant stat cards | Today header |
| `<NeedsAttentionBucket>` | One of the four auto-tag buckets with avatar stack + "View all" | Today |
| `<ActivityRow>` | Rich activity item: avatar + name + verb + linked object + thumbnails + timestamp | Today right-rail, Mirror right-rail |
| `<ClientCard>` | Reusable row: avatar, name, status chip, tag chips, last-active, monthly rate | Clients, Today buckets, Messages list |
| `<ComplianceDonut>` | 4-week donut row (2W ago / 1W / This / Next) | Mirror Dashboard |
| `<Sparkline>` | 30-day line for weight, body fat, anything time-series | Mirror Progress |
| `<RowActions>` | The `…` dropdown — Edit / Duplicate / Archive / Delete | Every list row |
| `<TagChipList>` | Horizontal chip stack with overflow `+N more` | Client header, Today buckets |
| `<EmptyState>` | Icon + heading + description + CTA | Every list with zero items |
| `<MirrorFrame>` | Phone-shaped frame wrapping a client-app screen | Mirror sub-pages |
| `<PhaseTab>` | Pill tab with phase name + week count + `…` actions | Builder |
| `<WorkoutDayCard>` | Day header + exercise count + RIR strip + `…` + `>` | Builder |
| `<DateChip>` | Smart date label: "Today", "Yesterday", "Sat", "Apr 12" | Activity rows, message thread |

These are the only custom patterns we expect for v1. Anything beyond this list should require justification.

---

## 7. Pages — one-sentence goals

| Page | Goal |
|---|---|
| **Today** *(rename Home)* | "Who needs me right now, and what just happened?" |
| **Clients** | "Show me my book of business and find one client fast." |
| **Client Mirror** | "What does this client see in their app, and what do I want to change?" |
| **Programs** | "Show me every program I've assigned, let me build/edit/delete one." |
| **Program Builder** | "Lay out the phases, weeks, and workouts for this program." |
| **Check-ins** | "Review and respond to client submissions." |
| **Calendar** *(new)* | "What do I owe whom this week?" |
| **Messages** | "Talk to clients." |
| **Analytics** | *(deferred — 'How is my business doing?')* |
| **Settings** | *(deferred — profile, branding, billing)* |

If a page can't answer its sentence in 2 seconds of looking, the page is broken.

---

## 8. Schema — entities, states, where they live

| Entity | States | Lives in |
|---|---|---|
| **Client** | active / pending / paused / archived | Clients page, Mirror |
| **Program** | draft / active / paused / completed / archived | Programs page |
| **Phase** *(rename from "Block")* | belongs to Program; has duration + goal | Builder |
| **Workout** | belongs to Phase; one training day | Phase view |
| **Exercise** | belongs to Workout; sets/reps/RIR | Workout view |
| **Habit** | active / paused / archived | Mirror Goals & Habits |
| **Task** | scheduled / done / missed | Calendar (global), Mirror Calendar |
| **Check-in** | pending / submitted / reviewed / flagged | Check-ins queue, Mirror history |
| **Note** | private to coach | Mirror right rail |
| **Tag** | auto or manual | Today buckets, Clients list, Mirror header |

### Schema fixes required

1. **Phase delete.** Phases must be deletable (non-recoverable, with confirm). User pain point.
2. **Last-phase guard.** Programs cannot enter a `0 phases` state — auto-seed Phase 1, prevent deletion of last phase without deleting program.
3. **Phase naming.** New phases prompt for goal (Hypertrophy / Strength / Cut / Deload / Test Week / Custom). Goal becomes label: "Phase 1: Hypertrophy".
4. **Workout day labels.** Use weekday labels (Mon/Tue/…) or explicit "Day 1 / Day 2" with no skipped numbers. If Day 3 is rest, render a "Rest" placeholder card — never a gap.
5. **Program ownership in title.** Builder header reads `[Program Name] · for [Client Name]` so context is unambiguous on entry.

---

## 9. Patterns

### Mirror — full sidebar swap

When the coach enters a client, the entire sidebar swaps to client-context (Trainerize pattern, validated 2026-05-05):

- Sidebar becomes: avatar + name → Message · View Profile, then **Dashboard · Calendar · Goals & Habits · Training Program · Meal Plan · Progress · Notes**
- Bottom: "← Return to overview" exits to coach context
- Each sub-page renders the client's mobile-app screen in `<MirrorFrame>`, with edit affordances overlaid as a top-right tooltip pill: *"Your client sees this. Edit →"*
- Recent Activity right-rail follows the coach in, filtered to that client only

### Four needs-attention buckets

Today's center column is exactly four buckets, in this order:

1. **Need new training phases** — programs ending ≤7d
2. **New PBs** — clients who set a personal best in last 7d (positive bucket — coach reaches out to celebrate)
3. **Phases ending soon** — same as #1 but ≤14d window for proactive prep
4. **Not messaged 7d+** — relationship maintenance

Each bucket: heading + count chip, up to 5 client avatars (more → "View all"), click avatar → Mirror.

### Recoverable actions

Every list row, every card, every entity gets a `…` (DropdownMenu) with at minimum:

- **Edit** (default action, also accessible by clicking row body)
- **Duplicate** (where applicable: programs, phases, workouts, check-in templates)
- **Archive** (soft-delete, recoverable from Archived filter)
- **Delete** (hard, with confirmation dialog spelling out consequences)

Solves the user's "can't delete old phases" frustration as a category.

### Progressive disclosure on Mirror Dashboard

Replace the current long-scroll client detail with collapsed cards:

- **Header** (always visible): avatar + name + status chip + tag chips + Message CTA
- **Compliance donuts** (always visible): 4-week strip
- **Cards (collapsed by default)**: Intake · Scheduled tasks · Daily habits · Current program · Nutrition targets · Coach notes · Recent activity
- Tapping a card expands inline. State persists per-client in localStorage.

---

## 10. Anti-patterns (lessons from 2026-05-05 audit)

| Don't | Do | Why |
|---|---|---|
| Three giant stat cards holding one digit each (Image #4) | Single `<StatLine>` inline at top | Stat cards waste 200px of vertical real estate |
| Text-only activity feed | `<ActivityRow>` with thumbnails + linked objects + RPE | Coaches scan visual cues 5x faster than text |
| Generic "Needs attention" mixed list | Four named buckets per §9 | Buckets match the coach's mental triage |
| "Block 1" naming | "Phase 1: [goal]" | Names describe purpose |
| Day numbers skipping (2 → 4) (Image #11) | Render rest-day placeholder, or use weekday labels | Gaps read as bugs |
| Long vertical card scroll on client detail | Mirror with sub-pages + collapsed sections | Each concern gets its own viewport |
| Plain-table client list (Image #6) | `<ClientCard>` rows with chips, last-active, quick actions | Tables are scan-poor; cards with chips are scan-rich |
| Color used decoratively | Color used only for state | Decoration leaks meaning out of warning/success |
| Borderless empty space as "minimal" | Type hierarchy + chips as separation | Empty space without hierarchy reads as broken |

---

## 11. Roadmap (in ship order)

Each item ≤ ~400 lines of diff per PR, per `AGENTS.md`.

### Sprint 1 — make Today a real daily driver
1. Replace stat-card grid with `<StatLine>` inline summary
2. Build `<ActivityRow>` and replace text-only feed (photos, linked workouts, RPE inline)
3. Restructure Needs Attention into the four named buckets (§9)
4. Add `<TagChipList>` to needs-attention rows so the chips tell you *why* the client surfaced

### Sprint 2 — fix Programs frustration
5. Add `<RowActions>` (`…` menu) to every program row + every phase tab + every workout day. Edit / Duplicate / Archive / Delete with confirmation.
6. Rename "Block N" → "Phase N: [goal]". Add goal prompt on phase create.
7. Render rest-day placeholders so day numbering is contiguous.
8. Add "for [Client Name]" to Builder header for unambiguous ownership.

### Sprint 3 — Mirror v1
9. Sidebar swap on entering a client (full-screen takeover, "Return to overview" exit).
10. Mirror Dashboard sub-page only — phone-frame render of the client's Home, with edit-pill tooltip.
11. Progressive disclosure: collapse client-detail cards, persist state per-client.
12. Compliance donut row at top of Mirror Dashboard.

### Sprint 4 — Calendar + Mirror v2
13. Global Calendar page (month view) for `coach_tasks`, with client-filter.
14. Mirror sub-pages: Calendar, Workouts, Meals, Progress, Notes (one PR each).

### Sprint 5+ — deferred
- AI Workout Builder
- Auto-messaging
- Auto-progressing programs
- Analytics
- Settings (profile, branding, billing)

After Sprint 4, ADPT achieves the Trainerize-replacement bar the user articulated. Everything past Sprint 4 is upside.

---

## 12. Working agreement for designers + agents

- **Read this doc before designing or implementing any dashboard surface.**
- **Re-read after every Sprint** — patterns evolve, this doc must track reality.
- When you find yourself reaching for a new color, type size, or component pattern, stop and check §3–§6 first. If the answer isn't here, propose adding it before using it.
- When the user asks for "a redesign," check §7 (page goals) and §10 (anti-patterns) before touching pixels. Most "redesigns" are an anti-pattern audit.
- Don't introduce gradients, drop shadows above `shadow-sm`, animations beyond functional 150ms transitions, or colors not listed in §4. The minimal mandate is non-negotiable.
- Decisions that change this doc go in PRs that update both code and `DESIGN.md` together.

---

## 13. Motion

Functional only. The dashboard reads as calm; motion never decorates.

| Use case | Duration | Easing |
|---|---|---|
| Hover/focus state changes | 150ms | `ease-out` |
| Layout shifts (collapse/expand, sheet open) | 200ms | `ease-out` |
| Modal/dialog open | 150ms (fade + 4px translate) | `ease-out` |
| Toast enter/exit | 200ms | `ease-out` |

**Forbidden:** spring physics, bouncy motion, scroll-triggered reveals, parallax, micro-interactions on idle elements, anything > 250ms.
**Required:** `@media (prefers-reduced-motion: reduce)` disables all transitions. Wrap in `motion-safe:` Tailwind variants where animations live.
**Loading:** skeletons (matching final layout) for data fetches. Spinners only for explicit user-triggered async actions (button submit) and only after 200ms — instant operations show no spinner.

---

## 14. Accessibility

Non-negotiable. Build it in, don't bolt it on.

- **Contrast.** WCAG AA: 4.5:1 body, 3:1 large text/UI. The token palette already passes; verify any custom color use against this.
- **Focus styles.** Every interactive element shows a visible focus ring (2px, `ring-foreground` or `ring-foreground/40` on dark surfaces). Never `outline: none` without a replacement.
- **Keyboard.** Every action reachable by Tab; ESC closes overlays; Enter submits primary form; arrow keys navigate menus and tab lists. shadcn primitives bring this; custom patterns must mirror.
- **Touch targets.** ≥40px on mobile, ≥32px on desktop with adequate hit area padding.
- **ARIA & semantics.** Use semantic HTML first (`<button>`, `<nav>`, `<main>`). Add `aria-label` for icon-only buttons; `aria-live="polite"` for toast region; `aria-busy` during inline loads.
- **Color-blind safety.** Never use color as the only signal. Warning chip pairs with text; success chip pairs with text; never just a green/red dot.
- **Screen reader.** Every interactive element has a perceivable name. Decorative icons get `aria-hidden`. Custom dropdowns inherit Radix's roles via shadcn — don't strip them.

---

## 15. Loading, error, empty states

Three distinct states for every data view. If you only handle the happy path, the screen is broken.

### Loading
- **Skeleton matching final layout** — same shape, muted bg, no animation beyond a subtle pulse. Don't use a centered spinner for page-level loads.
- **In-flight button:** disable + label change ("Save" → "Saving…"), no spinner under 200ms.

### Error
- **Inline at the failure surface** — never silent, never just a console log.
- **Retry CTA always visible.** "Couldn't load activity. Retry."
- **Toast** for transient failures (save failed, network blip). Inline message for sticky failures (permission denied, missing record).
- **Never apologize.** "Couldn't save" beats "Oops! Something went wrong :(". State the failure, offer recovery.

### Empty
- **Icon (32px, muted) + heading + 1-line description + primary CTA.** The current Check-ins empty state (Image #5) is the model — replicate.
- **Two flavors:**
  - *True empty* (no data ever): "Add your first client to get started" with the create CTA
  - *Filter empty* (filter excludes everything): "No check-ins match your filters" with a "Clear filters" CTA
- **No marketing copy.** No "Welcome to the future of coaching!"

---

## 16. Forms

- **Validate on blur + on submit, never on keystroke.** Don't yell at the user mid-typing.
- **Errors inline below field**, `text-destructive`, no shake animation.
- **Required fields:** `*` after the label, with `aria-required`.
- **Save button:** disabled until form is *valid AND dirty*. Disabled buttons need a tooltip explaining why if the reason isn't obvious.
- **Unsaved changes guard:** `beforeunload` + in-app navigation block when dirty.
- **Inline edits autosave** with toast confirmation (200ms debounce). Use for: coach notes, macro targets, single-field inline edits.
- **Multi-field forms have an explicit Save button.** No autosave on long forms — too easy to lose track of partial state.

---

## 17. Modals, dialogs, sheets

| Pattern | Use for |
|---|---|
| `<Dialog>` (centered) | Destructive confirmations · short forms (≤3 fields) · blocking decisions |
| `<Sheet>` (right slide-in) | Non-blocking edits · longer forms · secondary navigation · contextual detail (e.g. check-in detail before we promote it to full page) |
| `<Popover>` | Lightweight ephemeral content — date picker, color picker, preview |
| `<DropdownMenu>` | Row actions (`…` menu), navigation menus, sort/filter pickers |
| `<Tooltip>` | Brief explanations on hover/focus only — never primary content |

**Rules:**
- Don't nest modals. If a modal triggers another modal, redesign the flow.
- ESC always closes; backdrop click closes (unless form is dirty — then prompt).
- Modals lock scroll; sheets don't (sheets allow background interaction with the page below).
- On mobile (< sm), `<Dialog>` becomes full-screen sheet automatically.

---

## 18. Toasts (Sonner)

| Variant | Duration | Use |
|---|---|---|
| `success` | 4s auto-dismiss | "Saved", "Sent", "Created", "Archived" |
| `error` | manual dismiss | "Couldn't save — check your connection" + Retry action |
| `info` | 4s | Cross-page deferred actions ("Email sent to client") — rare |

**Rules:**
- Position: bottom-right desktop, bottom-center mobile (Sonner defaults).
- Never stack > 3.
- Microcopy: imperative past tense, no exclamation marks, no "successfully".
- Errors carry an action when retry is meaningful.

---

## 19. Iconography (Lucide React)

Lucide only. No icon mixing.

| Size | Use |
|---|---|
| `12` | Inline in chips / micro labels |
| `14` | Small button, dense list |
| `16` (default) | Buttons, list rows, sidebar |
| `20` | Heading-adjacent, primary CTA |

- Stroke `1.5` for 12–14px; stroke `2` for 16–20px.
- Color inherits from `currentColor` — never hardcode.
- Decorative: `aria-hidden="true"`. Standalone (icon-only button): `aria-label`.
- Don't use icons as decoration in headings — only when they aid scanning.

---

## 20. Microcopy / voice & tone

- **Concise, declarative, second person.** "Your client sees this." not "The client will be able to view this."
- **Past tense for confirmations.** "Saved", "Sent", "Deleted", "Archived".
- **No exclamation marks anywhere in product copy.**
- **No apologies on errors.** State the failure: "Couldn't save", "No internet", "Permission denied".
- **No filler.** "Get started" not "Let's get started"; "Add client" not "Click here to add a new client".
- **Numbers in narrative:** spell out 0 as "no" ("no programs ending soon"). In stats/tables, use numerals.
- **Empty states avoid marketing voice.** "No clients yet" beats "Welcome to your coaching journey".

---

## 21. Dates and times

Use `date-fns`. Reuse `formatRelativeDate()` from `src/lib/utils.ts`; extend if needed, don't reinvent.

| Age of timestamp | Format |
|---|---|
| < 1 min | "just now" |
| < 1 hour | "12m ago" |
| < 24 hours | "5h ago" |
| < 7 days | "3d ago" |
| < 30 days | "2w ago" |
| < 1 year | "Apr 12" |
| ≥ 1 year | "Apr 12, 2025" |

**Activity feed:** relative for first 24h, "Yesterday" / weekday for next 6 days, then absolute.
**Message threads:** day-grouped headers ("Today", "Yesterday", "Saturday", "Apr 12").
**Tasks/scheduled:** absolute date always ("Mon, May 5") — relative dates ambiguous when scheduling.

Timestamps render in `text-small` and `muted-foreground`.

---

## 22. Numbers

- Always `tabular-nums` for any displayed number.
- Geist Mono for column-aligned tables (compliance %, weights, set/rep grids).
- **Weights:** "161.0 lbs" — units in `text-small muted-foreground`, half-step from main number.
- **Percentages:** integer, no decimal. "100%" not "100.0%".
- **Currency:** `formatCurrency()` from utils. "$1,000/mo" — comma thousands, slash month.
- **Counts:** in narrative, spell out 0 ("no clients"). In stat cells / tables, "0".
- **Deltas:** prefix with sign for positive ("+2.4 lbs"), color foreground (no green-up/red-down — color is for state, not direction).

---

## 23. Responsive

Tailwind breakpoints. Mobile-first.

| Breakpoint | Min width | Behavior change |
|---|---|---|
| (default) | 0 | Single column, sidebar collapsed to drawer, full-width cards |
| `sm` | 640 | Two-column inline forms, padded |
| `md` | 768 | Tables stay tabular, sidebar still drawer |
| `lg` | 1024 | Sidebar expands, two-col grids enabled, Mirror two-pane |
| `xl` | 1280 | Three-col grids for Today, max content width |

- Sidebar: collapsible (already implemented at 240/68px); auto-collapses below `lg` to drawer (existing pattern in `src/components/layout/mobile-nav.tsx`).
- Tables become card stacks below `md` (use `<ClientCard>` everywhere; tables only on `md+`).
- `<Dialog>` becomes full-screen `<Sheet>` below `sm` automatically.
- Touch targets bump to 40px below `sm`.

---

## 24. Dark mode

**Deferred for v1.** The mobile app and dashboard are both light-mode mandate (per `CLAUDE.md` § 9). `next-themes` is installed but not used.

When (if) dark mode arrives: invert tokens behind `[data-theme="dark"]` selectors via existing `globals.css`, do not add new tokens. Component code stays unchanged.

---

## 25. Keyboard shortcuts

Use `cmdk` (already installed) for the command palette.

| Shortcut | Action | Scope |
|---|---|---|
| `⌘K` | Open command palette | Global |
| `⌘/` | Show shortcut help | Global |
| `/` | Focus search | Within Clients, Check-ins, Messages |
| `⌘N` | New (context-aware: client / program / phase) | Within respective lists |
| `⌘Enter` | Submit primary action | Within forms |
| `ESC` | Close modal/sheet/popover | Global |
| `1`–`6` | Jump to Mirror sub-pages | Within Mirror |
| `J` / `K` | Next / previous in list | Within Check-ins, Messages |

**Don't add shortcuts that conflict with browser defaults** (⌘W, ⌘T, ⌘R, ⌘L, ⌘F until command palette is mature).

---

## 26. Component composition

| Layer | Lives in | Rules |
|---|---|---|
| **Primitives** | `src/components/ui/` | shadcn-generated. Do not edit. Wrap in patterns if customization needed. |
| **Patterns** | `src/components/patterns/` | Reusable, prop-driven, no business logic, no data fetching. Tested in isolation. |
| **Feature components** | `src/components/{feature}/` | Page-specific composition. May fetch data via Server Components. Composes primitives + patterns. |
| **Pages** | `src/app/**` | Server Components by default. `"use client"` only when hooks/events/browser APIs are needed. |

**Composition over configuration.** Prefer compound components (`<Card>` + `<CardHeader>` + `<CardContent>`) over megaprops (`<Card title="x" subtitle="y" body="z" />`).
**Props discipline.** Accept `className` (cn-able). Accept `children` where composition fits. Avoid `style` prop except for one-off computed positions.
**Server-first.** Data fetching in Server Components; pass plain serializable props to Client Components. No `useEffect` for fetching unless you genuinely need client-side reactivity.

---

## 27. Working with `DESIGN.md`

When writing new code:
1. Check §7 (page goal) — is this on the right page?
2. Check §6 (component inventory) — does the pattern exist? If yes, reuse. If no, justify the new pattern in §6 before building.
3. Check §10 (anti-patterns) — am I about to commit one of these?
4. Check §3, §4, §5 (type, color, spacing) — am I using existing tokens?
5. Build.
6. If you bent a rule, update DESIGN.md in the same PR explaining why.

**The doc is a living constraint.** When it stops matching reality, update it — don't ignore it. When in doubt, ship a worse design that follows the rules over a better-looking one that breaks them; consistency compounds over individual brilliance.

