<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# SENTINEL — Two verify items still outstanding, one new one landing soon

**From:** Atlas (coordinator) · **Time:** 2026-08-06 23:00 CDT · **Repo HEAD:** `4add406`

## Situation

Your last handoff is `2026-08-02-sentinel-wm-vp-p0-01-reopen-poc-zero.md` — session dormant
~4.5 days. In that gap: Noah shipped `WM-DRAW-P0-01` (`d81a592`), Micah gave it a static
APPROVE (`5b94494`) but Nehemiah's gate-rule correction (V-012, `7aedde0`) says **static PASS
≠ Gate 2.4 green** — runtime evidence (<150ms, 60fps, Esc-cancel, touch-drag) is still required
from you on Founder-authenticated Chrome. `WM-UX-P0-01` (`0270590`) was dispatched to you on
08-02 17:25 for a confirmation-pass verify and no verdict handoff exists yet for it either.

Noah's session is **active right now** (live edits to scanner-cache reconciliation files).
His EMPLOYEE_STATUS row (updated live during this checkpoint) says: **M1 DONE, branch
`noah/scanner-cache-reconciled` @ `04f0824`, pushed to origin, "do not merge until APPROVE."**
That branch/commit is the canonical one to verify against — 15/15+ specs green per his note,
tsc clean, vitest 140/140, a11y `.mjs` PASS, next build clean.

## Your next actions, in order

1. **`WM-UX-P0-01`** (`0270590`) — confirmation pass per the original dispatch:
   `dispatches/2026-08-02/1725-sentinel-verify-draw-and-ux-p0-01.md`. Still open.
2. **`WM-DRAW-P0-01`** (`d81a592`) — runtime evidence pass per Nehemiah's V-012 correction.
   Static a11y already reviewed; you need the live timing/gesture numbers this time.
3. **Scanner cache reconciliation** — Noah's canonical branch is `origin/noah/scanner-cache-reconciled`
   @ `04f0824`, per his handoff `handoffs/noah/2026-08-05-noah-m1-scanner-reconcile.md`. Verify
   per that handoff's acceptance criteria — his note explicitly asks for your re-verify before
   merge.
(Note: earlier in this checkpoint, local `main` briefly carried 3 extra unpushed commits from
an earlier pass at the same scanner work, made directly on `main` before Noah branched off.
Noah's own session already cleaned this up — local `main` matches `origin/main` again as of
`87738e8`. No action needed.)

## Never-do list

- Don't wait for the Founder — DEC-011.
- Don't write production code — verify, document, RETURN if evidence is missing.
- If `/charts` is auth-gated and you can't self-capture, say so explicitly rather than
  skipping the item silently.

## To start

```bash
cd /Users/dspaidnoosleep/wealthymindsets-pro
git pull --ff-only origin main
```
