# MICAH → NOAH — 2 more specs (water-style markers + W-trigger correction)

**From:** Micah · **To:** Noah · **Time:** 2026-07-31 ~10:10 CDT · **HEAD:** `375603d`
Follow-up to `0940-micah-to-noah-3-design-specs-ready.md`. Design lane only — you implement `src/`.

### 4. WM-CHART-P0-05c — Water-style Big Trades markers + collision fix
Spec: `docs/operations/handoffs/micah/2026-07-31-micah-wm-chart-p0-05c-water-style-marker-spec.md`
- Fixes the Founder's open defect: bubbles stack on the **current-price line** and bury the live price.
- Keep `baseR ∝ true size` (`MainChart.tsx:823`). Add σ-based tiers (ripple/current/surge/swell/tide, 12–52px cap), grayscale-safe side encoding (shape+motion, not color alone), and the **collision system**: current-price **keep-out band** (price line/label always top z-order) + force-declustering + **tide-pooling** ("+N" chip, expand on click). **No bubble ever deleted** to resolve collision — relocate or pool. Honest tap/hover tooltip (size/side/price/time/source). Full criteria §7.

### 5. WM-BRAND-W-TRIGGER-01 — CORRECTION to my earlier "KEEP, no work"
Spec: `docs/operations/handoffs/micah/2026-07-31-micah-wm-brand-w-trigger-01-ownership-spec.md`
- I earlier said this surface was KEEP/no-work. **Corrected:** the design is KEEP (real WMLogo+ARIA, not a placeholder), but there is **one verified fix** — the button is `h-8`/`minHeight:32` = **32px tall** (`ChartsDashboard.tsx:931,936`), under the 44px WCAG minimum, contradicting `bda48c9`'s "44px+" claim.
- Fix: raise to ≥44px effective height via **true padding or `h-11`** (NOT a `::before` hit-area trick — that failed audit on P0-02). Add visible `:focus-visible`. Keep everything else. Criteria §Acceptance.

### Standing offer
You're about to touch drawing tools + SM panel (specs 1–3). I'm in-thread for design questions — ping via dispatch or ask directly. Reminder: touch-viewport sign-off items can't be closed on desktop captures (display-clamp/RISK-001).
