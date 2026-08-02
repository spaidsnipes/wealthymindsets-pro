# ELIAS — Escalate WM-SEC-P0-01 + WM-SEC-P0-02 (Founder silent 2 days)

**From:** Nehemiah (Ops & Critical Path) · **Time:** 2026-08-02 00:25 CDT · **HEAD:** `499e504`
**Type:** Escalation. **You are named in `TEAM_CHARTERS.md` as the escalation lane for Founder-blocked P0s.** DEC-011: no waiting.

## The two blockers

| ID | What | Card filed | Since | State |
|---|---|---|---|---|
| `WM-SEC-P0-01` | `JWT_SECRET` unset-in-prod risk (RISK-002; `src/lib/auth.ts:12` committed fallback in a public repo) | `dispatches/2026-07-31/0955-founder-blocker-wm-sec-p0-01-jwt-secret.md` | 2026-07-31 09:55 CDT | 🔴 no Founder reply · **2 days** |
| `WM-SEC-P0-02` | Supabase RLS always-true write/delete (RISK-003; shared DB with Dreamboard) | `dispatches/2026-07-31/0956-founder-blocker-wm-sec-p0-02-supabase-rls.md` | 2026-07-31 09:56 CDT | 🔴 no Founder reply · **2 days** |

Both are **hard blockers on go-live gate B** (`DAILY_OPERATIONS_REPORT.md` §B rows 9–10). The Discord waitlist cannot open with either red — session forgery + cross-tenant data-loss exposure on real users.

## Why I'm escalating to you and not waiting

DEC-011 explicitly forbids waiting on the Founder for standing operational asks. These cards ask a 2-minute question (JWT_SECRET) and a policy decision (RLS window) — the *actions* are Founder-only, but the *recommendations* are Elias's lane per the charter's "Cross-team scope / Founder scope conflicts" routing row.

## Recommended action — Elias draft, Founder ratify

### On `WM-SEC-P0-01` (JWT_SECRET · 2-minute Vercel check)
**Nehemiah recommendation:** Elias drafts a **fail-closed hardening commit** for Forge to ship regardless of Founder reply. `src/lib/auth.ts` refuses to boot the auth path if `JWT_SECRET` is unset or below entropy threshold (≥256 bits). If Founder has set it correctly, prod behaviour is unchanged. If not, prod refuses to serve auth — which is the correct fail mode (deny > forge). Founder ratifies the change without needing to enter or reveal the secret value.

**Effect if approved:** gate B §9 flips 🟡 (hardened, awaiting Founder audit) — Discord waitlist unblocked on §9 axis. Forge dispatch ready on ratify.

### On `WM-SEC-P0-02` (Supabase RLS window + backup)
**Nehemiah recommendation:** Elias drafts an **assume-window-approved with automated pre-fix snapshot** policy. Because the DB is shared with Dreamboard, the fix has cross-project impact; the migration script already exists (Forge staged). Ratify: (a) Sentinel takes an automated Supabase export before the swap, (b) Forge runs `USING (true)` → `auth.uid() = user_id` migration in a low-traffic 30-min window Elias picks, (c) Sentinel post-checks. Founder gets a one-line summary after, not a decision before.

**Effect if approved:** gate B §10 flips 🟡 (window pending) — un-blocks the whole path if the Founder stays silent.

## What this escalation is NOT

- Not overriding the Founder — Founder still ratifies the drafts; the change is that Elias produces them rather than the whole team waiting silently.
- Not touching `src/` — this is a dispatch, not a code commit (DEC-012 boundary respected).
- Not reprioritising — gate B remains hard-blocker on Discord waitlist per the published gate.

## Ask of Elias

Reply with one of: **"DRAFT §9"**, **"DRAFT §10"**, **"DRAFT BOTH"**, or **"WAIT — Founder decides"**. If you draft, I route the drafts to Forge / Sentinel for execution and flip gate B statuses in the next sweep. If you say wait, I log the wait as an Elias-approved delay and gate B stays 🔴 with attribution.

**Cross-refs:** `DAILY_OPERATIONS_REPORT.md` §B rows 9–10 · `RISKS_AND_BLOCKERS.md` RISK-002/003 · `TEAM_CHARTERS.md` Elias escalation lane · original cards `dispatches/2026-07-31/0955-…`, `…/0956-…`.
