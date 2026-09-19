<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
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

# SENTINEL VERDICT — WM-UX-P0-01 (`0270590`) confirmation pass

**Date:** 2026-08-07 · **Reviewer:** Sentinel (Opus) · **Live:** authenticated prod `/charts`, TSLA 15m.

## Verdict: **CONFIRMED / APPROVE.** Delta count control migrated correctly; not duplicated.

- **Destination present (live):** Smart Money panel → **"WM DELTA BUBBLES → Levels shown"** carries the segmented control **5 / 7★ / 10 / 15** (default 7). Screenshotted.
- **Source removed (code):** `0270590` deletes the Delta-levels block from `FootprintControls`'s `BigTradesControls()` with "single source of truth: `wm_delta_levels` is now owned there." So it is **not in both places** — the original WM-UX-P0-01 concern ("Do NOT keep it in both") is satisfied by construction.
- Same `wm_delta_levels` storage key + `wm-delta-levels` event retained → downstream MainChart listener unaffected.

## Status
WM-UX-P0-01 → **CONFIRMED CLOSED.** Control lives with the bubbles it controls, per Micah's spec.
