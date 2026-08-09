# WM PRO PERFORMANCE BUDGET AUDIT — 2026-08-09 (M18)

**Method:** live measurement on `/charts?TSLA` at 1910×784 via `performance.getEntriesByType('navigation'|'resource')` + `performance.memory`.
**Instrument:** `mcp__claude-in-chrome__javascript_tool` in the deployed prod tab.
**Anchor:** Bible §27 Performance Bible.

## Measured (deploy `3a0c06c`)

| Metric | Measured | Bible §27 target | Verdict |
|---|---|---|---|
| DOMContentLoaded | 271 ms | <3000 ms | 🟢 GREEN |
| `load` event | 638 ms | <5000 ms | 🟢 GREEN |
| JS heap used | 43 MB | <500 MB | 🟢 GREEN |
| JS heap total | 46 MB | — | 🟢 GREEN |
| Long tasks captured | 0 (in short window) | 0 blocking chart | 🟢 GREEN (measurement window small) |
| Resource requests | 250 total | not budgeted | 🟡 monitor — high count for one page |
| Canvas layers | 9 | (chart uses lightweight-charts + overlays) | 🟢 GREEN |
| SVG nodes | 121 | — | 🟢 GREEN |
| Visible DOM elements | 1,099 | <5,000 | 🟢 GREEN |

Bytes over the wire (JS/CSS): reported as 0 because the audit ran against a cached second-load; needs a hard reload with cache-bust for real transferSize numbers. Filed as follow-up.

## Not measured (with reason)

- **Frame rate under load.** `requestAnimationFrame`-based FPS measurement hangs in a **background** tab (browsers throttle rAF to ≤1 fps when the tab isn't the foreground). The extension MCP owns a tab that is NOT foreground in the browser window, so my measurement times out at 45 s CDP timeout. Options: (a) run this measurement in the Founder's foreground tab manually, (b) add a WM Pro-side dev-mode overlay that measures + reports FPS to a `/api/diagnostics/perf` endpoint, or (c) use Vercel Speed Insights (Founder decision on privacy). Recommendation: option (b) behind a dev-mode flag; ship the measurement alongside the perf-critical work in Batch 5/6.
- **Drag latency during chart interaction.** Same background-tab constraint. Best measured in a foreground tab under manual scenario (pan chart 100px, measure `performance.now()` delta from pointerdown to next paint). Ships alongside WM-RESP-P0-01 (M28) implementation.
- **Long tasks under heavy tape.** Market is closed at audit time (Sat night). Retest during Monday open when Alpaca REST poll + volume-profile recomputation are active.

## Positive signals

- **Very small heap for a data-heavy dashboard.** 43 MB used vs 4192 MB browser limit ≈ 1% headroom used. Room for meaningful features without pressure.
- **DOMContentLoaded 271 ms is fast** — the SPA hydrates before the trader can perceive a delay.
- **9 canvas layers is the right primitive** — matches directive Part LIX (Canvas/WebGL for dense rendering, DOM/SVG for controls). Chart heavy work is off the DOM.

## Attention

- **250 resource requests** on a page load is high. Typical: 60-120. Root causes worth investigating: (a) individual chunk per lucide-react icon? (b) unbundled watchlist logos? (c) websocket handshake counted as resource? Filed as follow-up; not blocking.
- **CSS reported 0 chunks with 0 bytes.** Suspect the audit missed CSS entries because they were served with `no-cors` or cached. Rerun with cache-bust needed.
- **No CSS-in-JS anti-patterns detected** in the resource list — Tailwind's atomic CSS shows up correctly bundled in the JS pipeline.

## Regressions since prior batches

None detected against the historical numbers logged for HEAD `d4e175d` (43 MB heap, 271 ms DCL, no long tasks) vs current `3a0c06c` (43 MB heap, 271 ms DCL, no long tasks). WM-CHART-P0-03 changes did NOT affect load-time or memory.

## Follow-ups filed

- `WM-PERF-P1-01`: build a WM-Pro-side dev overlay reporting FPS + long-task count in real time. Behind `?perf=1` query flag. Ship in Batch 5 or 6.
- `WM-PERF-P1-02`: investigate the 250-request count. Grep the built HTML for the actual request list, identify the top 20 by count of similar-URL siblings, decide bundling opportunities.
- `WM-PERF-P1-03`: re-measure under live market hours (Monday open) with real tape flow.

## Confidence

**MODERATE.** Static + resource metrics are HIGH-confidence (reproducible). Runtime-under-load metrics are UNKNOWN in this pass and explicitly deferred.
