# System Passport — canonicalFidelityLabels

> Canon anchor: ATH SYSTEMS CLARITY + WIRING CONSTITUTION (2026-08-28) §1
> **"Every durable internal system must have one compact canonical passport."**

This is the first worked passport. Future durable systems file one at
`docs/ops/passports/<system>.passport.md` following the 18-field
canon shape.

---

**PURPOSE** — Own the single trader-facing vocabulary for market-data
fidelity. Every subsystem that renders a fidelity chip (chart chrome,
ticker tape, watchlist rows, command-deck ribbon) selects from the
seven canon-approved strings so the trader sees uniform semantic
language across every surface.

**CANONICAL OWNER** — `src/lib/marketData/canonicalFidelityLabels.ts`.
There is exactly one exported `CANONICAL_FIDELITY_LABELS` record and
one exported `QUARANTINED_FIDELITY_PHRASES` list. Any other module
that ships a trader-facing fidelity string MUST import from here.

**AUTHORITATIVE INPUTS** — The 2026-08-27 WM Pro Living Market Visual
Systems Canon (Drive doc `1HEKhUy15GBgkI41two1WdhR12jvntDRWEho1u4Zwm9g`),
specifically the seven-label vocabulary in §"Generic yellow dots are
prohibited" and the four-phrase list in §Legacy Surface Quarantine.

**OUTPUTS** —
- `CANONICAL_FIDELITY_LABELS: Record<CanonicalFidelityLabelKey, CanonicalFidelityLabel>` — the seven UI copy strings verbatim.
- `ALL_CANONICAL_FIDELITY_LABELS: readonly CanonicalFidelityLabel[]` — frozen exhaustive tuple.
- `QUARANTINED_FIDELITY_PHRASES: readonly string[]` — the specific legacy strings the Sentinel scan blocks.
- `isCanonicalFidelityLabel(s): s is CanonicalFidelityLabel` — type-guard.
- `resolveCanonicalFidelityLabel(input): CanonicalFidelityLabel | undefined` — priority-ordered resolver taking session + entitlement + pipeline signals.

**STATE OWNERSHIP** — None. The module is stateless — pure constants
and pure functions. All state lives in the callers (chart component
local state, priceSource cached badge, etc.).

**CONSUMERS** —
- `src/lib/priceSource.ts` — every `priceSourceBadge` return path emits a canon label.
- `src/components/chart/MainChart.tsx` — chart chrome pills.
- `src/components/chart/ChartsDashboard.tsx` — dashboard price-source pill (SHIFT-Q atom 4 also reads the failure-grammar bridge).
- `src/components/layout/TickerTape.tsx` — quote pills (via `priceSourceBadge`).
- `src/components/chart/WatchlistPanel.tsx` — per-row pills (via `priceSourceBadge`).
- `src/lib/systemHealth/fidelityToHealth.ts` — bridge to the Failure + Recovery grammar (SHIFT-Q atom 3).
- `src/lib/marketData/canonicalFidelityLabels.enforcement.test.ts` — Sentinel scan proving no consumer re-emits a quarantined string.

**DEPENDENCIES** — None. The module has zero imports. This is
deliberate — it is a leaf in the dependency graph so every consumer
can safely depend on it.

**TRUTH CLASS** — `derived` from founder-authored canon text.
`interpreted` = false (no algorithm decides membership; each string
appears verbatim from canon). `user-authored` = false. `simulated` =
false.

**VERSION / SCHEMA** — Version tracked by git SHA of the module.
Adding, removing, or renaming a key requires:
1. A canon amendment in Drive.
2. A conscious update to `canonicalFidelityLabels.test.ts`
   `EXPECTED_LABEL_KEYS` + `EXPECTED_LABEL_STRINGS` (Sentinel gate).
3. A supersession receipt filed under `docs/ops/supersessions/` if
   any consumer relied on the removed key.

**FRESHNESS / FIDELITY** — Constants have no freshness. The RESOLVER
output freshness is entirely a function of the freshness of its
inputs (`liveQuoteFresh`, `pipelineStale`, etc.) — caller
responsibility.

**FAILURE / DEGRADATION** — `resolveCanonicalFidelityLabel({})` (all
inputs undefined) returns `undefined`. Canon: silence-is-a-feature.
Callers should render nothing (no chip) rather than a placeholder
when the resolver returns undefined.

**RECOVERY / ROLLBACK** — Module is pure and side-effect-free. No
recovery needed. A pathological caller that passes contradictory
inputs (e.g., `sessionOpen: false` + `liveQuoteFresh: true`) gets
`SESSION_CLOSED_LAST_VERIFIED` because canon: closed dominates
(deterministic priority order, tested).

**OBSERVABILITY / RECEIPTS** — The Sentinel enforcement test
(`canonicalFidelityLabels.enforcement.test.ts`) walks the src tree at
CI and fails if any quarantined phrase appears as a UI literal outside
this module or a test. That is the standing observability contract:
if the test passes, the invariant holds.

**TEST / SLO CONTRACT** — `canonicalFidelityLabels.test.ts` (14
tests) locks the key set + verbatim strings + priority ordering.
`canonicalFidelityLabels.enforcement.test.ts` (2 tests) blocks any
regression at CI. Both must pass on every commit affecting this
module.

**PRIVACY / SECURITY** — No user data. No secrets. Constants only.

**SURFACE ADMISSION** — YES — trader-visible. Every string exported
here appears in user chrome verbatim; the module is the surface's
truth boundary for fidelity vocabulary.

**LIFECYCLE** — `INTEGRATED`. Shipped in SHIFT-P (2026-08-28,
commits `296e8bf` + `be1b9aa` + `34b8cc4` + `3b666c2`). Cloudflare
Version `ce82fde2-fcb3-46b2-b179-c3c7f6f1fc08` live on
wealthymindsetspro.com. First worked passport authored SHIFT-Q
(2026-08-28) to establish the pattern for future durable systems.
