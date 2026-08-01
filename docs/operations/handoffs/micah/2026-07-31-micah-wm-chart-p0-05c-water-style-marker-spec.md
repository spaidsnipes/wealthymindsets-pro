# MICAH DESIGN SPEC — WM-CHART-P0-05c: Water-style Big Trades marker language + current-price collision fix

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at spec time:** `7e13292` · **Lane:** design/spec only — Noah implements the render. No `src/` touched here.
**Fixes:** the Founder's still-open defect — **Big Trades bubbles collide/stack on the current-price line and obscure the live price.** Referenced in queue (`ACTIVE_TASK_QUEUE.md:539` "bubble collision … tracked separately") and directive item 2 (`:595`).
**Rule:** presentation only. One bubble = one **real** trade. Never invent, merge-away, or fabricate a print. Size must keep encoding the true order size.

---

## 1. Verified current model (read at `7e13292`, `MainChart.tsx:812–871`)

- One `Bubble` per real big trade; **`baseR` ∝ true order size, fixed at spawn** (`:823`) — this truthful size encoding must be preserved.
- Bubbles float (physics `vx/vy`, wobble `phase`), **never merge/fade/pop** (`:814–816`), persist at their level until the bar scrolls off or the newest-N cap drops the oldest.
- Within one candle, `levelIdx` + `siblingN` (`:832–833`) already apply a horizontal stagger — this is the seed of collision handling, but it only de-stacks *within a candle*, not across the many recent trades that land on the **live-price line**.
- There is already a water motif: a "water-bubble absorb sound" (`:872`). The visual language should match that metaphor, not fight it.

**Root cause of the defect:** every bubble anchors to its trade price (`anchorPrice`, `:831`). The most recent trades cluster around the current price, so bubbles pile onto the exact horizontal line where the live price + label render — the single most important number on the chart gets buried.

---

## 2. The water vocabulary (magnitude tiers by σ of recent trade size)

Six named tiers, scaled by standard deviation of the trailing big-trade size distribution (the directive's "std-dev size scaling"). The name is internal vocabulary + tooltip flavor; the *encoding* is size + motion + finish.

| Tier | Trigger (σ vs trailing mean) | Diameter | Finish / motion | Meaning |
|---|---|---|---|---|
| **Still** | below qualifying threshold | — | not drawn | not a big trade; excluded |
| **Ripple** | ≥ threshold, < 1σ | 12–16px | faint, slow bob | smallest qualifying print |
| **Current** | 1–2σ | 16–22px | steady drift | normal big trade |
| **Surge** | 2–3σ | 22–30px | brighter core, quicker rise | notable |
| **Swell** | 3–4σ | 30–40px | strong glow, pronounced buoyancy | large block |
| **Tide** | > 4σ (outlier / block) | 40–52px (cap) | max glow + gentle ring pulse (one pulse, ≤150ms, non-looping) | exceptional print |

Rules:
- Diameter is a **continuous** function of size within the tier band — tiers label ranges, they don't quantize the true size (keeps the honest "bigger order → bigger bubble").
- Cap at 52px so a single Tide print can't swallow the pane; if the true size would exceed the cap, hold at cap and let the **tooltip** carry the exact number (never distort truth to fit pixels).
- Motion amplitude scales *down* as size scales up (big bubbles are calm/heavy, small ones jitter) — reinforces weight without extra chrome.

---

## 3. Side encoding — NOT color alone (WCAG 1.4.1)

Same lesson as the badge verdict (WM-A11Y-BADGE-01): do not encode buy/sell by color only.
- **Buy:** bubble with a **top-left light highlight** (light rising through water) + upward buoyancy bias.
- **Sell:** **droplet** form (rounded top, tapered bottom) + downward drift bias.
- Color stays as a secondary cue (teal buy / red sell, matching existing `#00D4AA` / `#FF4D6A`), but shape + motion must make side legible in grayscale.

---

## 4. Collision system — the actual fix

Three layered rules, cheapest first:

1. **Current-price keep-out band.** Reserve a horizontal band of ±`(labelHeight/2 + 6px)` around the live-price line + label. Bubbles may pass *through* on their way to anchor but **may not come to rest inside it**; a bubble whose anchor falls in the band drifts to the nearest side gutter and rests there with a thin leader tether to its true price. **The price line + label always render on top (highest z-order) — never occluded.**
2. **Force-directed declustering.** Bubbles exert a soft mutual repulsion (radius + 2px) so they settle side-by-side instead of stacking. Existing `levelIdx`/`siblingN` stagger becomes the initial seed for this; extend it across the live-price neighborhood, not just per-candle.
3. **Tide-pooling (overflow).** When more than `K` bubbles would occupy one small region (e.g. a burst of prints at one price), they arrange into a **pool** — a tight cluster whose count is shown as a small "+N" chip — rather than an unreadable pile. Clicking the pool expands the individual bubbles (each still one real trade). Default `K` = the point at which repulsion can't fit them within ~1.5× their footprint; tune live.

No bubble is ever deleted to solve collision — they relocate or pool. Truth preserved.

---

## 5. Current-price readability (explicit acceptance)

- Live-price line + label legible at all times, contrast ≥4.5:1 against whatever bubbles sit behind the gutter.
- Inside the keep-out band, any bubble tether/gutter marks are ≤40% opacity so they never compete with the price label.
- On phone widths, the keep-out band and gutters must not push bubbles off-canvas — if the gutter would overflow, pool instead (§4.3).

## 6. Tooltip — honest provenance (hover + tap)

On hover (desktop) and tap (touch — bubbles must be tappable, ≥24px hit area even for a 12px Ripple):
- Side + true size (exact notional, not the tier), price, timestamp, and **source** (Alpaca / Coinbase / etc. — reuse `priceSource` labels). Never show a size that disagrees with `value` (`MainChart.tsx:828`).
- Tap-dismiss; tooltip must not be hover-only (touch parity).

## 7. Acceptance criteria (Noah verifies)

1. Bubble diameter is a continuous function of true size, tiered per §2, capped at 52px; tooltip always carries the exact size.
2. Buy/sell distinguishable in **grayscale** (shape + motion, not color alone).
3. Live-price line + label **never occluded** by any bubble; keep-out band enforced (§4.1).
4. Bubbles de-stack via repulsion; bursts pool with a "+N" chip that expands on click; **no bubble deleted** to resolve collision.
5. Every bubble tappable with an honest provenance tooltip (size/side/price/time/source), not hover-only.
6. 60fps with a realistic burst of prints; no jank; motion amplitude inverse to size.
7. **Screenshots at 360×800, 390×844, 834×1194, desktop** showing: a calm state, a burst at the live price with the price still readable, and a Tide print. *(Live burst capture needs an authed session at real market with tape; phone-width pixel confirmation is display-clamp/RISK-001 constrained per `2026-07-30-micah-scanner-a11y-ticket.md §3.5`. Desktop-at-market is capturable now; flag mobile as pending.)*

## 8. Never in scope
Which trades qualify as "big," the size/σ computation, side determination, feed/source resolution — all Noah/Forge data logic. This spec governs how a real trade *looks and behaves* on the pane and how the price stays readable. Presentation + interaction only.
