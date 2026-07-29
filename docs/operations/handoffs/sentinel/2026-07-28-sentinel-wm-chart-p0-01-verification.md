# SENTINEL VERIFICATION — WM-CHART-P0-01 Canonical Timeframe System

**Date:** 2026-07-28 · **Employee:** Sentinel · **Ticket:** WM-CHART-P0-01
**Repo:** `wealthymindsets-pro` · **Branch:** `main` · **Commit verified:** `d2ea511`
**Verdict:** **VERIFIED — APPROVED for closure**
**Next owner:** Forge → `WM-CHART-P0-02` · Noah → **`WM-CHART-P0-03` (new P0, filed below)**

---

## 1. Verification method

Re-run independently against the working tree, **not** copied from Forge's handoff.
Forge committed and pushed `d2ea511` while this verification was in progress; the tree
tested is byte-identical to the tree committed (the five files were clean in
`git status` immediately after the commit landed).

| Check | Command | Result |
|---|---|---|
| Typecheck | `./node_modules/.bin/tsc --noEmit` | **0 errors** |
| Tests | `./node_modules/.bin/vitest run` | **43/43 passing, 3 files** |
| Build | `npm run build` | **✓ Compiled; 69/69 static pages** |
| AC#2 grep | `grep -rn "TIMEFRAMES" src` | **Only the module + 3 importers.** Zero literals. |

Forge's reported numbers match mine exactly. No discrepancy.

---

## 2. Acceptance criteria — Sentinel ruling

| # | Criterion | Forge | **Sentinel** |
|---|---|---|---|
| 1 | Exactly one `TFId` definition | MET | **MET** — confirmed, single `export type TFId` |
| 2 | Zero local literals | MET | **MET** — grep re-run |
| 3 | `D/W/M` unified with `1D/1W/1M` | PARTIAL | **MET — see ruling** |
| 4 | Labelled from measured probes | MET | **MET** — `PROVIDER_EVIDENCE` carries probe date, symbol, and OK/ERROR boundaries |
| 5 | Aggregation only from exact integer divisors | MET | **MET** — `aggregateCandles` throws on non-integer; unit-tested |
| 6 | Unsupported never silently substituted | MET in principle | **MET, with a correction — §3** |
| 7 | No state-model change, no UI restyle | MET | **MET** — emitted strings unchanged; only button *labels* change `D`→`1D` |

### Ruling on AC#3 — accepted as MET, not partial

Forge honestly self-reported AC#3 as partial because the toolbar still *emits* `"D"`.
**Sentinel overrules that self-assessment upward.** AC#3's purpose is that no two
incompatible dialects can be *authored*. That is satisfied: exactly one module authors the
mapping and `toChartEmitId()` is the single, typed boundary where the legacy string is
produced. What remains is an encapsulated adapter, not a second vocabulary.

Forcing full consumer migration into this ticket would have violated AC#7 (no chart
data-path change) and could not be verified without an authenticated session — the exact
condition that is blocked. Filing it separately was the correct call.

**Forge's engineering judgement here was right and its honesty was right.** Self-reporting
partial credit when the work qualified for full is the failure mode this operation wants.

---

## 3. Correction to AC#6 — the guard is CORRECT but INERT

Forge recorded AC#6 as "MET in principle." Sentinel confirms the design is sound and adds
a material fact Forge's handoff does not state plainly:

```
grep -rn "resolveFetchPlan\|assertGranularity\|aggregateCandles\|hasEnoughBarsForState" src
  → zero matches outside src/lib/timeframes.ts
```

**`assertGranularity()` is not wired into any fetch path.** The silent-downgrade protection
exists, is unit-tested, and is currently unreachable at runtime. Likewise `isSupported()`
can never return `false` — no entry in `TF_LIST` carries `source: "unsupported"`, so that
branch is dead by construction.

This is **not a defect in `d2ea511`** — the ticket scope explicitly excluded the data path.
It is recorded so that no one reads "AC#6 MET" as "production is protected." It is not yet.
That is what P0-03 below is for.

---

## 4. BREAKTHROUGH FINDING — WM-CHART-P0-03, live truthfulness defect

Investigating Forge's flagged adjacent finding (`MainChart.tsx` mapping `2h`/`4h` → `60`)
confirmed it, and found it is **broader and live in production**.

Four independent provider maps disagree with each other, and three substitute silently:

| TF | `/api/alpaca:50` | `/api/yahoo:70` | `/api/finnhub:39` | `MainChart.tsx:216` |
|---|---|---|---|---|
| **`2m`** | `2Min` ✅ | `2m` ✅ | **`"1"` → 1-min bars** ❌ | **`"5"` → 5-min bars** ❌ |
| `3m` | — | — | `"5"` ❌ | `"5"` ❌ |
| `10m` | — | — | `"15"` ❌ | `"15"` ❌ |
| `2h` | — | — | `"60"` ❌ | `"60"` ❌ |
| `4h` | — | — | `"60"` ❌ | `"60"` ❌ |

**`2m` is shipped today.** It is one of the nine ids in `CHART_TF_SHIPPED`, reachable from
the live toolbar. The fallback chain at `MainChart.tsx:1568-1572` is:

```
exchangeData → alpaca → finnhubDirect → yahoo → finnhubClient → polygon
```

Alpaca and Yahoo map `2m` correctly. But `/api/finnhub` runs **second, ahead of Yahoo** —
so whenever Alpaca returns `null` (key unset, 503/404, or unsupported symbol), a user
clicking **`2m` is served 1-minute bars labelled `2m`**. If that path also fails, the
client Finnhub fallback serves **5-minute bars labelled `2m`**.

The same click can therefore yield 1-, 2-, or 5-minute candles depending on which provider
answers — **non-deterministic mislabelling, with no indication to the user.**

Additionally `getIntervalSec()` (`MainChart.tsx:110`) ends `return m[tf] ?? 60` — an
unrecognised timeframe silently becomes 1 minute. **Fail-open, in a module that decides
what bar size the user is looking at.**

**Severity: P0.** This is the same class as the Wyckoff fabrication closed in `e1a8c94` —
the UI asserts something the data does not support. It is arguably worse, because Wyckoff
was static and obvious once seen, whereas this is plausible, dynamic, and invisible.

`3m`/`10m`/`2h`/`4h` are **not currently user-reachable** from the toolbar
(`CHART_TF_SHIPPED` withholds them), so the live blast radius is `2m`. The rest are latent
and would go live the moment P0-01b widens the toolbar — which is precisely why this must
land **before** P0-01b.

### Naming collision — resolved

The directive refers to a corrected ticket "`WM-CHART-P0-01B`". Two different pieces of
work were both carrying that name:

- **`WM-CHART-P0-01b`** (lowercase, Forge's, referenced in shipped code comments at
  `timeframes.ts:73` and `:305`) = migrate the six legacy consumers to `TFId`.
- **Fail-closed provider mappings** = the directive's meaning.

They are not the same ticket and must not share an identifier. The provider-mapping work is
filed as **`WM-CHART-P0-03`**. `WM-CHART-P0-01b` retains its original meaning.

---

## 5. Deployment status

`d2ea511` is on `origin/main`. Vercel deployment state **not verified** — no post-deploy
runtime check has been performed by Sentinel.

**Runtime/visual proof remains unavailable** (RISK-001): `/charts` is behind auth. Sentinel
will not enter the Founder's password and will not mint or forge a session token. Forge's
emitted-string equivalence proof is accepted as the strongest evidence obtainable under
that constraint, and is sufficient for a ticket whose whole regression argument is that the
emitted strings are unchanged.

---

## 6. Known limitations of this verification

- No runtime or pixel evidence. Static + type + test + build evidence only.
- `PROVIDER_EVIDENCE` was **not** re-probed by Sentinel against a fresh Yahoo call; Forge's
  probe method is documented and self-corrected, and is accepted on that basis. A fresh
  probe is recommended before any ticket depends on the depth caps quantitatively.
- Caps measured on AAPL only. Thinly-traded and non-US symbols unverified.
- `2Y` is defined in `TF_LIST` but absent from both `HEATMAP_TF_ORDER` and
  `CHART_TF_SHIPPED` — currently unreachable. Harmless, noted.
- `1D` and `1Y` are byte-identical entries (`1d` interval, 365-day range). Not a defect;
  worth collapsing later.

---

## 7. Routing

| Ticket | Owner | Status |
|---|---|---|
| `WM-CHART-P0-01` | Forge | **VERIFIED — CLOSED** at `d2ea511` |
| **`WM-CHART-P0-03`** | **Noah — UNBLOCKED, claim now** | **READY FOR NOAH** |
| `WM-CHART-P0-02` | Forge | READY — dependency satisfied |
| `WM-CHART-P0-01b` | — | BACKLOG — sequence **after** P0-03 |
