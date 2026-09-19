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
