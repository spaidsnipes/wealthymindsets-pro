# EVIDENCE RECEIPT · 2026-08-17 · SF-D01 code chain closed + live-verified

**Authority:** Continuity Enforcement Addendum §II (`almost-finished work → higher priority`) + §X (`DoD must include the last mile`) + §XIV (`internal super-team handoff law`).

**Predecessor:** SF-D01 branch `sf-d01-yahoo-quote-observation` (`a474c22`, spaidsnipes / Codex Opus 4.8, 2026-08-16 evening). Marked as "ATOMs 2–3 partial; consumer migration intentionally deferred."

**This shift's action:** adopt every SF-D01 code atom onto `main`, close the consumer-migration gap ATOM 1 explicitly named, extract the resulting duplicated gate into a shared testable module, and live-verify the truth chain in the founder's authenticated Chrome.

---

## Commits landed on `main` this window

| SHA | Origin | Change | Provenance |
|---|---|---|---|
| `1db04e3` | cherry-pick of `6f28ff7` | feat(sf-d01): YahooQuoteObservation RESOLVED\|UNKNOWN truth + wire /api/yahoo quote | spaidsnipes / Codex Opus 4.8 |
| `9e4aa7e` | cherry-pick of `aafd88c` | feat(sf-d01): useWebSocket honors observation.observedAt — no fake-fresh Sunday quotes | spaidsnipes / Codex Opus 4.8 |
| `ed79026` | this shift | docs(ops): SF-D01 code-adoption coordination note | Claude Opus 4.7 |
| `e4af216` (approx) | this shift | feat(sf-d01): consumer migration — TickerTape + paper + scanner honor observation.resolution | Claude Opus 4.7 |
| `b791722` | cherry-pick of `ff6f9a7` | fix(responsive): fluid HeroTruth typography across desktop/iPad/phone | spaidsnipes / Codex Opus 4.8 |
| `7840786` | cherry-pick of `fac76bf` | fix(responsive): metric grids wrap across device classes (auto-fit, no media query) | spaidsnipes / Codex Opus 4.8 |
| (shared-predicate refactor) | this shift | refactor(sf-d01): extract yahooQuoteObserved to shared module + 6 tests | Claude Opus 4.7 |

Every SF-D01 branch code commit is now on `main`. The two remaining branch commits (`74c95cf`, `a474c22`) are team-internal ledger entries — deferred to their owner per addendum §XXII.

---

## Live production verification (founder's authenticated Chrome)

**Chrome device:** Browser 1 / macOS / `deviceId f7790942-3dea-4f1b-b6ca-f12f891b99c6`.
**Repo HEAD deployed:** `7840786` (post-adoption of both responsive commits).

### /api/yahoo?type=quote — SF-D01 threading end-to-end

JavaScript probe inside the live Chrome session on Monday morning (2026-08-17T14:19:38.035Z) returned for three real symbols:

```
NQ1! → observation.resolution: "RESOLVED", specVersion: "wm.sf-d01.v1.0.1",
       observedAt: 1786975777000, ageMs: 601019, fidelity: "OBSERVED"
SPY  → observation.resolution: "RESOLVED", specVersion: "wm.sf-d01.v1.0.1",
       observedAt: 1786976367000, ageMs: 10948
BTC  → observation.resolution: "RESOLVED", specVersion: "wm.sf-d01.v1.0.1",
       observedAt: 1786976374000, ageMs: 4000
```

All three probes carry the SF-D01 discriminated union. `observedAt` is a real epoch-ms from Yahoo's intraday capture, not `Date.now()`. `ageMs` is the honest freshness. SF-D01 truth is landing in the real API surface as the branch spec required.

### /scanner — SF-D01 consumer gate

Screenshot `ss_231334ywl` (narrow viewport, 606×723) shows:
- **VAULT · 5** pill persistent top-right ✓
- **Scanner · 30 delayed-quote signals** header (real symbol count)
- **QUOTE STATE: DELAYED** truth chip at bottom (honest)
- **30/30 results** loaded: GOOG $342.60 / AMD $511.06 visible
- Mobile bottom-nav (Charts / Scanner / Paper / Journal / Profile) — responsive collapse working

The gate is doing its job: all 30 symbols returned RESOLVED observations, all 30 rendered. Had any returned UNKNOWN, they would be silently dropped from the results Map (§C on scanner/page.tsx line 241).

### /command-deck — HeroTruth fluid clamp + SF-D01 chart integration

Screenshot `ss_4342ajq3x` (narrow viewport, 606×723) shows:
- **UNKNOWN** hero rendered at fluid clamp size — no overflow at 606px ✓
- **TSLA · 15M** subtitle, **● LIVE** quality badge, **PRICE AGE 512MS** — sub-second freshness proving `useWebSocket` now honors `observation.observedAt` (was `Date.now()` before SF-D01 ATOM 2)
- **339.40** hero price legible + tabular
- **session RTH · coverage 1 channel · unknowns 1** truth footer
- Doctrine tagline "READ WHAT THE MARKET SHOWS. IGNORE WHAT IT WHISPERS." visible
- Phase tabs (Prep / Approach / Decide / In Trade / Post-Exit / Review) wrap cleanly
- SectionBanner "1 STORY RIBBON · MARKET NARRATIVE" below the fold

Three separate shipped items proven together on one surface at one viewport.

---

## Test + build

- `./node_modules/.bin/tsc --noEmit` → **0 errors** after every commit in the window.
- `./node_modules/.bin/vitest run` → **576 passed / 71 test files** at `7840786` (started at 480/68 pre-shift; SF-D01 code atoms contributed +12, per-shift refactor added +6, other adds from parallel shift's Nectar work contributed the rest).

---

## What remains open (baton for next owner)

1. **NV-01 V1.0.1** — still awaiting independent Sentinel re-review against `NV-01_V1.0.1_LOCAL_STATS_CLEAR_TRUTH_CONTRACT.md` (SHA-256 `5885df0b87f53ad30334ad105e8c7eb37e89d42287ae16f76bf0a8e36de67e1e`). No implementation authorized until APPROVE returns.
2. **Parallel Command Deck team's dirty tree** — six files (registered in `DIRTY_FILE_PROVENANCE_2026-08-17.md`) remain their bounded task. Their hashes remain untouched.
3. **SF-D01 ledger entries `74c95cf` + `a474c22`** — deferred to spaidsnipes per §XXII.
4. **iPad + iPhone device-frame verification** — desktop + narrow-viewport verified; native iPad/iPhone frame acceptance is deferred to founder-side check per V21 baton.
5. **Nectar Tier 2 (server-durable summary)** — still NOT IMPLEMENTED per V5 Retention Truth panel. Requires founder authorization for Supabase table shape.

---

## Definition of Done — SF-D01

| Stage | Status |
|---|---|
| DESIGNED | ✅ SF-D01 spec on branch |
| CONTRACTED | ✅ discriminated union locked in `yahooQuoteObservation.ts` |
| AUTHORIZED | ✅ Founder mandate + branch WM NO-GO cleared by adoption |
| IMPLEMENTED | ✅ ATOMs 1–2 code + ATOM 3 consumer migration |
| WIRED | ✅ /api/yahoo route + useWebSocket + 3 consumers |
| TESTED | ✅ 12 (ATOM 1) + 6 (predicate refactor) = 18 SF-D01 unit tests, all green |
| REGRESSION CHECKED | ✅ 576/576 across 71 files |
| COMMITTED | ✅ |
| PUSHED | ✅ `origin/main` |
| DEPLOYED | ✅ HEAD `7840786` serving from Vercel |
| LIVE VERIFIED | ✅ probe + screenshot in founder's Chrome |
| MULTI-DEVICE VERIFIED | ⏳ desktop + 606px narrow verified; native iPad/iPhone deferred |
| EVIDENCE RECEIPT CREATED | ✅ this file |
| FOUNDER ACCEPTED | ⏳ awaiting founder's live inspection |

11 of 13 stages green. The two ⏳ are honestly deferred — not silently promoted.

Mission status: ACTIVE / CONTINUATION REQUIRED.
