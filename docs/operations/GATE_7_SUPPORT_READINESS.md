# Bible §46 Gate 7 — Support Readiness Gap List (M26)

**Bible §46 Gate 7.** **Adopted:** 2026-08-09. **Assessed against HEAD:** `a9ed05f`.

Gate 7 asks: can a paying user get help when something goes wrong, and can WM survive the fallout? Assessed against the 6 required capabilities.

| # | Capability | State today | Evidence | Owner | Priority |
|---|---|---|---|---|---|
| 7.1 | **Bug reporting path** | ⚠ PARTIAL | No in-app report button; `github.com/spaidsnipes/wealthymindsets-pro/issues` is empty (audit finding — RISK-005). Users have no channel. | one-thread (add in-app link + a `/support` page) | **P1** |
| 7.2 | **Status page** | ✖ MISSING | No public `status.wealthymindsets.info` or in-app status banner. Vercel deploy failures are invisible to users. | Founder (buy statuspage.io / atlassian instance) OR one-thread ship a minimal `/status` route reading Vercel API | **P1** |
| 7.3 | **Account recovery** | ⚠ PARTIAL | `/forgot-password` route exists (`src/app/forgot-password/page.tsx`), Supabase reset mail flow works per DEC-006 evidence. NOT tested end-to-end on prod post JWT rotation. | one-thread (test flow post-rotation) | **P0** |
| 7.4 | **Refund handling** | ✖ MISSING | Subscription/billing not wired (`src/lib/subscription.ts` absent). No Stripe integration yet. | Founder decision on billing provider; one-thread implements after decision. Blocks paid launch. | **P0** |
| 7.5 | **Incident response ready** | ✖ MISSING | No runbook, no incident channel, no rollback protocol beyond `git revert`. `docs/operations/CURRENT_WM_PRO_BRIEF.md` §Last Stable Point is the closest artefact today. | one-thread (write `INCIDENT_RUNBOOK.md`) | **P1** |
| 7.6 | **Contact page + policies** | ⚠ PARTIAL | No `/legal/terms`, `/legal/privacy`, or `/contact` routes. Company Bible §35 has Terms draft; not published. | Founder review + one-thread ship | **P1** |

## Immediate closable items (no Founder decision needed)

- **7.3 test:** run the /forgot-password flow now post JWT_SECRET rotation — the rotation invalidated all sessions but should NOT affect password-reset (Supabase-side). Confirm.
- **7.5 runbook:** write `docs/operations/INCIDENT_RUNBOOK.md` with the rollback command already in `CURRENT_WM_PRO_BRIEF.md` + a paging protocol (until formal on-call: Founder direct message).
- **7.1 in-app link:** wire an "Report a problem" link in the footer that opens a pre-filled GitHub Issues URL. Under one-thread mode, can be shipped this session.

## Founder decisions needed

- **DEC-016:** billing provider (Stripe / Paddle / Lemon Squeezy). Blocks 7.4.
- **DEC-017:** status page — buy or build. Recommend build (thin `/status` route reads Vercel Deployments API + Supabase health) — cheaper, WM-branded, no external dependency during incident.
- **DEC-018:** support email address to publish on `/contact`.

## First-cut runbook outline (M26 deliverable)

Follow-up commit will produce `INCIDENT_RUNBOOK.md` covering:

- Deploy-failure recovery (rollback command already in Current Brief).
- Auth outage (JWT_SECRET / Supabase down / cookies rejected).
- Provider outage (Alpaca / Finnhub / Yahoo down — degrade order, banner text).
- Data poisoning (bad tick, wrong price shown — recall procedure).
- Broker order-state inconsistency (reconcile procedure per Bible §32).
- Communication template (what to post on status page + in-app banner + email).

## Doctrine alignment

- **Bible §46 Gate 7:** every capability rated, gap list with owners.
- **Truth (directive Part XXVI):** honest assessment, none inflated to GREEN.
- **Compassion for the trader (Bible §26):** the trader should never wonder "is this me or is it broken?" — status + bug report + reset + refund are the trust-preservation surface.
