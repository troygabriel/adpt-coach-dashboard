# ADPT — Product & Business Strategy

> Founder's strategic teardown. Companion to `CLAUDE.md` (which is the technical/architecture
> source of truth). This doc is the *why* and the *sequence*; CLAUDE.md is the *what* and *how*.
> Last updated: 2026-05-29.

---

## 0. Thesis

> **Trainerize and its clones punish coaches for growing, lose their data, and feel like 2014.
> ADPT wins by being the calm, fast, reliable, AI-native coaching OS with flat pricing — built
> by a coach who's still paying the $200/mo incumbent ransom.**

---

## 1. Market & competitor pain points (researched 2026-05)

| Competitor | Strength | Pain (= our wedge) |
|---|---|---|
| **Trainerize** | Polished client app, video, install base | Clunky / too many clicks; build & schedule in different places; **no undo**; **loses workouts logged mid-session**; chat semi-broken; **per-client pricing punishes growth** (~$165/mo all-in @ 50 clients); nutrition not built-in (leans on MFP); **check-in system requested 5yrs ago, never built** |
| **TrueCoach** | Clean, simple delivery | "Feels like a **PDF**"; limited automation; few engagement features |
| **Everfit** | Generous free tier | **Add-on hell** ($50–150/mo real cost); per-client tiers ($88→$138 @ 25→50) |
| **My PT Hub** | Cheap, does everything | **Cluttered** kitchen-sink UI |
| **MyFitnessPal** | Biggest food DB | **Paywalled the barcode scanner users built**; "shell of its former self" |
| **Cal AI** | Magical photo→calories | Accuracy drops on complex meals; **"Fix this" doesn't recompute macros**; privacy concerns; no coach in loop |

**Synthesis:** Incumbents are *clunky, unreliable, growth-punishing, nutrition-broken*. New AI apps are
*consumer toys with no coach and shaky accuracy*. **Nobody owns "calm, reliable, AI-native, coach-first,
flat-priced."** That's the hole.

## 2. Positioning — four pillars

1. **"Never lose a set."** Reliability as a brand promise (already true via `ActiveWorkoutContext` checkpointing).
2. **"Flat pricing. Grow without the penalty."** No per-client tax.
3. **"Calm software."** Dense-but-quiet B&W aesthetic = the anti-Trainerize.
4. **"AI that does the busywork, not the coaching."** Co-pilot for the coach, not a chatbot for the client.

## 3. Business model

Per-client pricing is the incumbents' original sin and is beatable because our marginal cost per client
is near-zero (Supabase). Flat pricing is profitable for us, painful for them to copy.

| Tier | Price | For |
|---|---|---|
| **Solo** | ~$39/mo | New/side coaches, ≤~15 clients |
| **Pro** | ~$89/mo **flat, unlimited** | Headline — undercuts Trainerize-@-50 by ~50% |
| **Studio** (later) | ~$199/mo | Multi-coach teams, branding, seats |

Add **Stripe Connect** so coaches collect client payments through ADPT (platform fee + makes ADPT
load-bearing → churn collapses). **No billing UI exists today — biggest revenue/retention gap.**

## 4. Product audit

### Strengths
- Modern correct stack (Next 16 / React 19 / Supabase SSR; Expo SDK 54). Server Components default.
- **RLS on every table** — coach↔client separation done right.
- **Workout engine**: reducer state, wallclock rest timer surviving backgrounding, AsyncStorage
  checkpointing, optimistic messaging w/ rollback. Better than Trainerize's real-world behavior.
- **Client-mirror** architecture (`(client-mirror)/clients/[clientId]/…`) — differentiated, well-factored.
- ~20.6k LOC dashboard + large mobile app — a real product, not a prototype.

### Risks / tech debt (ranked)
1. **🔴 Schema drift = silent prod data loss.** `coach_notes` writes 400 silently; `body_stats`
   measurements render `—`; `habit_assignments` field mismatch. Fix before any new feature.
2. **🟠 `Database` types not wired into mobile** → untyped calls, `never` types, latent bugs.
3. **🟠 N+1 in `messages/page.tsx`** — collapse into one RPC.
4. **🟠 Manual two-repo type sync** — drift risk; script or share a package.
5. **🟡 Analytics = 8-line "Coming soon" stub; settings thin.** B2B needs "show me my business."
6. **🟡 Test coverage unclear** — Playwright installed; guard auth/RLS/payments with e2e.

### UX / design
- Aesthetic is a **moat** (calm vs. cluttered field). Protect it; **no orange/amber** (dark neutral warnings).
- Risk: "quiet" tipping into "empty/unfinished" — need empty states, skeletons, settings/analytics depth.
- Continuous papercut-elimination *is* the anti-Trainerize strategy.
- Coach's first 10 minutes (empty roster → first client → first program) = activation; polish it.

## 5. The "amazing" bets (10×, not 1.1×)

1. **🚀 AI Co-pilot for coaches** (zero AI today): draft periodized programs, summarize check-ins +
   suggested replies, auto-flag at-risk clients, draft messages in coach voice. Lets 1 coach handle 2× roster.
2. **🥗 Built-in nutrition + AI photo logging done right** — kill MFP dependency; **"Fix this" actually
   recomputes**; coach in the loop via `client_macros`.
3. **✅ Check-ins as crown jewel** — the feature Trainerize ignored 5 years. Lead the demo with it.
4. **🛟 Reliability as a felt feature** — surface "auto-saved" affirmations.
5. **📥 One-click Trainerize migration** (CSV importer) — removes #1 switching barrier; growth disguised as utility.

## 6. Sequencing

- **Phase 0 — Trust & foundation:** fix schema drift, wire mobile `Database` types, ship pending bug fixes.
- **Phase 1 — Load-bearing:** Stripe Connect + Analytics v1 (MRR, active, retention, churn).
- **Phase 2 — Wow:** AI co-pilot v1 + built-in nutrition w/ AI photo logging.
- **Phase 3 — Parity/polish:** habit UI, meal-plan PDF, exercise video library, push notifs, scheduling.
- **Phase 4 — Growth:** Trainerize CSV importer, "flat pricing alternative" SEO, design-partner program, referrals, branded apps.

## 7. Risks & moats

**Risks:** solo-founder bandwidth across two apps; AI accuracy/cost (prompt caching, cheaper models for
summaries, human-in-loop for programs); RLS/auth/payments are the brick-prod zone — change slowly, with
tests, never auto-merge.

**Moats:** data+AI flywheel; switching cost once programs+payments live in ADPT; founder-coach authenticity
(dogfooding) VC-owned incumbents can't match; flat-pricing positioning they can't copy without cannibalizing.

## 8. Sources (research)

- Trainerize complaints: Gymkee, Trustpilot, HubFit, G2, FitBudd (2025–26)
- Alternatives/TrueCoach: ClientSnap, Gymkee, TrueCoach blog, GetApp
- MyFitnessPal paywall backlash: XDA, Pocket-lint, Slashdot, MFP community (2022→)
- Cal AI accuracy: eesel AI, Gaya, JustUseApp, CNBC (2025–26)
- Pricing: AssistantCoach, Everfit, Capterra, PTPioneer
