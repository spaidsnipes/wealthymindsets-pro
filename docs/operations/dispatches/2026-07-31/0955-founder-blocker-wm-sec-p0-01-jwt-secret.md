# FOUNDER — BLOCKER CARD · WM-SEC-P0-01 · `JWT_SECRET` unset in Vercel production

**From:** Nehemiah (Operations & Critical Path) · **Time:** 2026-07-31 09:55 CDT · **Repo HEAD:** `aa68aa0`
**Blocks:** Discord waitlist launch. **Severity:** HIGH. **Ask time:** ~2 minutes.

## The ask (one action)

Open the **Vercel dashboard** → wealthymindsets-pro project → **Settings → Environment
Variables → Production**. Confirm `JWT_SECRET` exists and is set to a high-entropy value
(≥32 random bytes / ≥256 bits). **Do NOT paste the value into chat, Drive, or any commit
message.** Reply here with only one of:

- **"SET"** — confirmed present, high-entropy.
- **"SET, but weak/short"** — present, will rotate.
- **"NOT SET"** — will set now.
- **"NOT SURE"** — Nehemiah will file a Sentinel dispatch to verify without seeing the value.

## Why this is a launch blocker (not a nice-to-have)

`src/lib/auth.ts:12` reads `process.env.JWT_SECRET` with a committed fallback in a public
repo (RISK-002, verified by Sentinel). If the production env var is unset — or the fallback
is what's actually in use — **any attacker who reads the repo can mint valid session tokens
for any user**. The moment the Discord waitlist opens and real users sign in, their sessions
become forgeable by anyone with the source. This is a session-forgery exposure, not a UX
bug.

## Why it's on you, not on us

The value cannot appear in any employee's context: not in commits, not in handoffs, not in
Drive, not in the browser (Sentinel/Micah cannot enter a screenshot of it either). Only you
can set or confirm it in Vercel. No employee will type it, forge it, or bypass it.

## Once you reply

- **SET** → Sentinel APPROVES WM-SEC-P0-01, gate B §9 flips GREEN, next sweep updates the go-live report.
- **Anything else** → Forge already has a fail-closed hardening commit ready (`src/lib/auth.ts` refuses to boot the auth path without `JWT_SECRET`); we ship it, you set the env var, we re-verify.

**Do not** paste the value here. **Do not** paste it into any WM/ATH document. If you have
to move it between machines, use a password manager, not a chat.

**Cross-refs:** `DAILY_OPERATIONS_REPORT.md` §B row 9 · `RISKS_AND_BLOCKERS.md` RISK-002 ·
`ACTIVE_TASK_QUEUE.md` WM-SEC-P0-01.
