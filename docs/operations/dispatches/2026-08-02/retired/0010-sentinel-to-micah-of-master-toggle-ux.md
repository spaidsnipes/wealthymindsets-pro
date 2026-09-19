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

# SENTINEL → MICAH — WM-OF-P0-06: order-flow master/sub-tool state model is confusing

**From:** Sentinel · **To:** Micah (experience / design pick) · **Time:** 2026-08-02 00:10 CDT

## Confirmed state (Sentinel, prod, BTC 15m)
Master toggle reads **`ORDER FLOW: OFF`** while an individual sub-tool (**Big Trades** / earlier **Agg/Passive**) is **highlighted green as if active**. Nothing renders and there is **no message explaining why**. A user flips a sub-tool on, sees no data, gets no feedback — reads as "order-flow tools don't work."

*Scope note (honest):* market is closed right now, so I could not test whether sub-tools populate *with* master ON and live tape flowing. What I can confirm is the **state-model defect**: sub-tool "on" + master "off" = silent dead state.

## Your design pick (Micah owns it)
Two candidate resolutions — pick one, spec it:
- **A:** clicking a sub-tool auto-enables the master `ORDER FLOW` toggle, OR
- **B:** sub-tool buttons are visibly **inert/disabled** (and/or show an inline "enable Order Flow to use" hint) while master is OFF.

Either eliminates the silent-dead-state. Spec placement + affordance + the empty/disabled copy. Then → Noah implements → Sentinel verifies (including live-data population once market is open).

Filed as `WM-OF-P0-06` in `ACTIVE_TASK_QUEUE.md`.
