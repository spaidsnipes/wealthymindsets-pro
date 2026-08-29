# Supersession Receipt — canon fidelity vocabulary cutover

**Filed:** 2026-08-28 · **Owner:** WM Pro one-thread execution (Noah + Sentinel)
**Canon anchor:** WM Pro — Living Market Visual Systems Canon (2026-08-27) §Legacy Surface Quarantine + ATH SYSTEMS CLARITY §7 (2026-08-28)

---

## OLD OWNER / PATH

Four legacy trader-facing chip strings hand-rolled across five
consumer sites, none owned by a single module:

| String | Emit sites (pre-SHIFT-P) |
|---|---|
| `"NO FEED"` | `src/lib/priceSource.ts:63`, `src/components/chart/MainChart.tsx:1666`, `MainChart.tsx:2108`, `MainChart.tsx:6950` |
| `"OHLCV ONLY"` | `src/components/chart/MainChart.tsx:7012` |
| `"OHLC ONLY"` (typographic variant) | none in code — canon-quarantined pre-emptively |
| `"DELAYED 15 MIN"` | `src/lib/priceSource.ts:59` |

Pre-cutover HEAD: `b0f7ea0` (SHIFT-O ledger).

## NEW OWNER / PATH

`src/lib/marketData/canonicalFidelityLabels.ts` is the single writer for
every trader-facing fidelity string. Consumers import
`CANONICAL_FIDELITY_LABELS` and select from the seven canon-approved
values: `SESSION CLOSED — LAST VERIFIED / LIVE — CERTIFIED QUOTE /
HISTORICAL BARS VERIFIED / DELAYED BY ENTITLEMENT / STALE PIPELINE /
ACTIVE DEGRADED / BLOCKED BY ENTITLEMENT`.

Cutover HEAD range: `296e8bf` (canon module) → `3b666c2` (Sentinel
enforcement scan) → SHIFT-Q atom 3 `d1ec341` (failure-grammar bridge).

## WHY THE OLD PATH IS SUPERSEDED

New founder canon (2026-08-27 Living Market Visual Systems Canon)
prohibits "generic yellow dots" and blanket capability insults. The
four legacy strings each violated one or more binding LAWS:

- `"NO FEED"` violated LAW 2 ("CLOSED IS NOT DELAYED") and LAW 5
  ("generic yellow dots prohibited") — a red alarm shown when the
  session was closed presented normal inactivity as failure.
- `"OHLCV ONLY"` violated LAW 3 ("FIDELITY IS PER CAPABILITY, NOT A
  SYMBOL-WIDE INSULT") — stamped the whole symbol as data-poor when
  only one downstream capability was absent.
- `"DELAYED 15 MIN"` violated LAW 4 ("THE NEW OS MUST NOT REQUIRE
  THE USER TO THINK LIKE A DATA ENGINEER") — the trader had to
  know that 15 minutes was a free-tier entitlement gap, not a
  pipeline outage.

## CALL SITES / DEPENDENTS

Zero remaining call sites of the legacy strings as UI literals.
Proof:

```
git grep -n '"NO FEED"\|"OHLCV ONLY"\|"OHLC ONLY"\|"DELAYED 15 MIN"' -- src/
```

returns only the canonicalFidelityLabels module (where the strings
appear in the QUARANTINED_FIDELITY_PHRASES list, canon-annotated) and
the two test files that assert the guard fires.

The `canonicalFidelityLabels.enforcement.test.ts` Sentinel scan
enforces this at CI: any regression that reintroduces a legacy string
as a UI literal outside a canon-quoted comment fails the build.

## MIGRATION STATE

`RETIRED`.

## DUAL-RUN RULE IF TEMPORARY

N/A — cutover was atomic (SHIFT-P `296e8bf` → `3b666c2`). No dual-run
period needed because the legacy strings had never been contractual
outputs, only hand-rolled literals scattered across consumers.

## CUTOVER PROOF

- **Engineering:** `vitest run` — 1541/1541 PASS at the SHIFT-Q atom 4
  boundary. `canonicalFidelityLabels.enforcement.test.ts` proves zero
  quarantined literals remain in tree. `priceSource.test.ts` (17
  assertions) proves every provider mapping emits a canon string.
- **Runtime:** Cloudflare Version `ce82fde2-fcb3-46b2-b179-c3c7f6f1fc08`
  (SHIFT-P deploy 2026-08-28). Prod route sweep 8/8 HTTP/2 200
  after cutover. Chart chrome badge now reads `HISTORICAL BARS
  VERIFIED · LAST HH:MM` where it used to read `OHLCV ONLY · no real
  tape from this feed`, and `SESSION CLOSED — LAST VERIFIED` where a
  red `NO FEED` used to fire.
- **Downstream ripple:** TickerTape, ChartsDashboard, WatchlistPanel
  consume `priceSourceBadge().label` — no changes needed at those
  sites because the writer changed but the contract shape held.

## ROLLBACK

Two commits:

```
git revert 3b666c2  # Sentinel enforcement (test-only)
git revert 34b8cc4  # priceSource canon migration
git revert be1b9aa  # MainChart chip strings
git revert 296e8bf  # canon module
```

Then `npm run deploy:cf`. Total time under 5 minutes. All four commits
are additive to independent files so revert conflicts are
unlikely. Rolling back leaves the tree in its pre-canon state; the
Sentinel enforcement test would then need to be re-added when the
canon migration is re-applied.

## RETIREMENT CONDITION

Met at ship time. The Sentinel enforcement test blocks any future PR
that reintroduces a legacy string as a UI literal, so the retirement
is stable-by-construction rather than requiring an ongoing telemetry
watch.

## FINAL DISPOSITION

`RETIRED` — the four legacy strings are quarantined at the type layer
(`CanonicalFidelityLabel` union), the runtime layer (source-tree scan),
and the doctrine layer (canon module JSDoc + this receipt).
