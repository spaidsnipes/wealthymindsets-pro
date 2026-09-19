<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its
> filename names its own day. It was true on that day and is preserved as
> evidence of what was observed and decided then. Do not take a current action,
> diagnosis, release decision or task claim from it.
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

# VIDEO INTELLIGENCE — VP Worlds / VP Wars evidence crawl

**From:** Video Intelligence · **Date:** 2026-07-31 · **Base commit:** `2e7c60d`
**Answers:** Founder call-out (2026-07-31) "VP Worlds" by name + dispatch item 3 (deep-crawl VP Worlds).
**Ticket:** feeds `WM-VP-WORLDS-DEF-01`.
**Evidence class:** DOCUMENTED — public help center + vendor/feature pages + general VP literature, **no account, nothing observed running**.
**Founder rule §5:** this handoff reports what the evidence does and does **not** contain. It does not define VP Worlds, because no source I can reach defines it. No mechanic is invented.

---

## 1. Finding (headline)

**"VP Worlds" and "VP Wars" are not DeepCharts feature names.** After a targeted crawl of DeepCharts'
own help center and features pages, dxFeed's DeepCharts page, and the general volume-profile literature,
**neither term appears anywhere.** They are also absent from the WM Pro codebase.

This is a **truthfulness stop**, not a dead end: I will not architect or scope a feature whose behavior I
have not seen defined. The next step is a **source pointer from the Founder** (a video timestamp, a
screenshot, or the platform he saw it on), after which Forge can spec it.

### What I searched (and did not find the terms in)

| Source crawled | "VP Worlds" / "VP Wars" present? |
|---|---|
| DeepCharts help center — Deep Profile article (full VP feature list) | ❌ No |
| DeepCharts features/deepchart page (full proprietary-model list) | ❌ No |
| dxFeed DeepCharts platform page | ❌ No |
| General volume-profile literature (VPVR/VPFR/VPSV guides, TradingView) | ❌ No |
| Cross-platform check (Bookmap / Sierra / Quantower / Exocharts naming) | ❌ No |
| WM Pro codebase `src/` (`grep -rniE "vp world|vp war"`) | ❌ No |

## 2. What DeepCharts VP *actually* ships (the real analogs)

Recorded so Forge has a concrete reference for whatever the Founder means. Claims-only, no UI/code adopted.

**Deep Profile — profile types:** Volume Profile · Ask/Bid Volume Profile · Delta Profile · Delta + Total Volume.
**VBP period modes:** Latest · Multiple · **Composite** · Visible · Custom.
**Profile mechanics:** Point of Control (with a **Developing** POC line mode = multiple POC lines over time) ·
Value Area · **Peak & Valley** detection (HVN/LVN) · **Merge / Split** (combine or separate profiles).
**Related proprietary models (features page):** Deep Swing Profile · Market Profile (TPO) · Orderflow Profile ·
Deep-M Effort · Deep-M IVB · Deep V-Tracker · Deep Pattern Builder.

### The two closest candidates for what "VP Worlds / VP Wars" might mean

Offered as **hypotheses for the Founder to confirm or reject — not as a definition:**

1. **Composite / Multiple profiles + Merge/Split** → several volume profiles shown or combined across
   sessions/ranges. If "VP Worlds" means *multiple profile regions living on one chart*, this is the nearest
   real mechanic. WM Pro today has single Session VP + a manual Delta+VP box — **not** multi-region composites.
2. **Two profiles compared side-by-side (e.g. buy-side vs sell-side, or session-vs-session)** → could be what
   "VP **Wars**" evokes (two profiles "battling"). DeepCharts' Ask/Bid split + Merge/Split is the closest analog.
   No DeepCharts feature is *named* this way.

**I am explicitly flagging these as guesses.** Per rule §5 they must not be built until the Founder confirms
which, if either, matches what he saw — or names the real source.

## 3. WM Pro's current VP surface (for the gap)

CODE-VERIFIED at `2e7c60d` (carried from the gap matrix `79a9aaf`):

- **Session VP** — [`WMSessionVP.tsx`](../../../src/components/chart/WMSessionVP.tsx): RTH/ETH/24H/2D/1W/1M windows, POC/VAH/VAL, live bid/ask per level.
- **Manual fixed-range VP** — "Delta + VP Box" drawing tool, [`deltaVP.ts`](../../../src/lib/deltaVP.ts).
- **Value-area VP candles** — gold POC/value-area borders, [`MainChart.tsx:1260-1828`](../../../src/components/chart/MainChart.tsx).

**Not present:** multi-region / composite profiles, profile-vs-profile comparison, developing-POC line history,
merge/split of profiles — i.e. every mechanic that any plausible reading of "VP Worlds / VP Wars" would need.

## 4. Recommended next action

- Keep **`WM-VP-WORLDS-DEF-01`** open as **BLOCKED — awaiting Founder source pointer** (see §5 request below).
- If the Founder confirms hypothesis (1) or (2), Forge scopes a *composite / multi-profile* or *paired-profile*
  feature on WM's existing Session VP engine — buildable from our current tape (no MBO needed for volume-only profiles).
- Do **not** ship anything named "VP Worlds/VP Wars" with invented behavior.

### §5 — the one question for the Founder

> "VP Worlds / VP Wars" isn't a DeepCharts feature name in any source we can reach. Can you point to where you
> saw it — a video (with a timestamp), a screenshot, or the platform — so we build the right thing instead of guessing?

## 5. Sources

- https://www.deepcharts.com/helpcenter/article/deep-profile
- https://www.deepcharts.com/features/deepchart
- https://dxfeed.com/platforms/dxfeed-deepcharts/
- https://www.deepcharts.com/helpcenter/deepdom/article/volume-profile
- General VP literature (VPVR/VPFR/VPSV): goodcrypto.app, tradingview.com/scripts/volumeprofile
- WM code at `2e7c60d`: `WMSessionVP.tsx`, `deltaVP.ts`, `MainChart.tsx`
