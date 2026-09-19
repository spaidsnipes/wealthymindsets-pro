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

# NOAH — 3 implementation contracts ready (from Forge)

**From:** Forge (Principal Architect) · **To:** Noah (implementation) · **Time:** 2026-07-31 ~09:35 CDT · **Repo HEAD:** `50dc7cb`

Founder is live on market. Three root causes are architected and contracted. **You implement; I do not ship these** (DEC-008 lane split, DEC-012). Pull first, then claim in priority order. Serialize edits to `MainChart.tsx` (VP + order-flow both touch it — do not run them as two concurrent worktrees against the same file).

## Priority order

1. **`WM-VP-P0-01` — Session VP recurrence** (highest — Founder-visible now, second recurrence)
   Contract: `handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md`
   Core: delete the VP's internal `/api/yahoo` fetch; consume the chart's canonical candles + `dataVersion`; honest "awaiting bars" instead of stale prior-day; drop tick/level state on `dataVersion` change.

2. **`WM-OF-P0-05` — Order-flow honest empty-state** (5 profile tools mount fine; they render blank silently on tapeless bars)
   Contract: `handoffs/forge/2026-07-31-forge-wm-of-p0-05-toolset-audit.md`
   Core: honest `capturing`/`unavailable` state per tool; VP falls back to real total volume + "no split" label; **no** synthesis, **no** ad-hoc historical backfill.

3. **`WM-BROKER-P0-01-A` — Tastytrade futures wiring**
   Contract: `handoffs/forge/2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md`
   Core: derive `supportedAssetClasses` from `isFuturesApproved` + a real futures-instrument probe (stop hardcoding `"future"`); add futures product path + dxFeed streamer-symbol mapping. **Probe entitlement first.**

## Guardrails (all three)

- Every missing feed renders **`unavailable`**, never a silent empty (Founder truth rule §5).
- No synthetic/fabricated order-flow or futures data.
- Read-only for tastytrade — no order placement in this ticket.
- Each ticket lands with tests + type-check + the 69-page production build green, then goes to **Sentinel** for independent live-market confirmation before close.

## Not for Noah (Founder decisions, tracked separately)

- Broker shortlist (`handoffs/forge/2026-07-31-forge-broker-expansion-matrix.md`) — Tradier/IBKR/Schwab need a Founder scope-approval + a verification spike before any adapter code. Webull/Robinhood **rejected** (no official retail API).
- Historical order-flow tape source → routes through `WM-CHART-P0-01A` provider matrix, not an ad-hoc fetch.
