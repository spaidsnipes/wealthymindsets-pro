# MICAH DESIGN VERDICTS — DEC-012 backfill on 3 Mission-Control-shipped surfaces

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at verdict:** `50dc7cb` · **Lane:** design verdicts only. Code not reverted (per DEC-012 — no wasted cycle); I own the design going forward.
**Closes dispatch:** `docs/operations/dispatches/2026-07-30/2131-micah-inherit-3-surfaces-going-forward.md`
**Evidence basis:** source read at `50dc7cb` + desktop live on authenticated `/charts` (Dave's Chrome). **Honest caveat:** 360/390/834 confirmation is display-clamp/RISK-001 constrained (see `2026-07-30-micah-scanner-a11y-ticket.md §3.5`); verdicts below are concept-level, which source + desktop fully support. Pixel confirmation at phone/tablet width is the only deferred item.

Verdict scale: **KEEP AS-IS** (design accepted) · **ITERATE** (concept right, file a spec) · **RETURN** (concept wrong, propose replacement).

---

## Surface 1 — P0-05 source/provenance badge (`fd12f1e`) → **ITERATE**

**Where:** `ChartsDashboard.tsx`, `MainChart.tsx`, `TickerTape.tsx`, `WatchlistPanel.tsx`; helper `src/lib/priceSource.ts`.

**What's right (keep):** The *concept* is correct and on-brand for the truth rules — every quote carries honest provenance (`ALPACA` / `YAHOO` / `FINNHUB` / `POLYGON` / `NO FEED`) with accurate live-vs-delayed semantics (`priceSource.ts:27–41`; Yahoo/Finnhub honestly marked "delayed, not the live consolidated tape"). This is exactly the anti-fabrication posture we want. Do **not** remove it.

**Why ITERATE, not KEEP — verified defects:**
1. **Ticker-tape provenance is a 7×7px dot with the label hidden in a hover `title`** (`TickerTape.tsx:146–153`). The provider name is never visibly rendered on the tape — it only appears on mouse hover. **On touch there is no hover**, so mobile traders get an unlabeled colored dot and no way to learn the source. This is the same "failed visibility" class Sentinel flagged in V-008.
2. **Live vs delayed is encoded by color alone** — green `#00E88A` vs amber `#F5A623` (`TickerTape.tsx:150`). Fails WCAG 1.4.1 (Use of Color): a colorblind or glare-washed user cannot tell live from delayed.
3. A 7px dot is below comfortable perception density given how much else is on the tape.

**ITERATE spec → WM-A11Y-BADGE-01 (design ticket for Noah):**
- Provenance must be legible **without hover**: render a short visible text label (or icon+text) on the tape, not only in `title`. Desktop may keep the compact form but the label cannot be hover-only.
- Live/delayed must not rely on color alone: pair the color with a shape or a one-word label (e.g. `LIVE` / `DELAYED`) so it survives grayscale.
- Minimum legible sizing at 360/390: dot ≥ the surrounding text cap-height; label ≥ the tape's data font.
- Keep the honest `priceSource.ts` label set unchanged — this is presentation only.
- Acceptance: grayscale screenshot still distinguishes live vs delayed; touch user sees the provider without hovering; screenshots at 4 viewports.

---

## Surface 2 — P0-05b Custom Big Trades quantity input (`9f76b15`) → **KEEP AS-IS** (concept), one bounded sizing follow-up

**Where:** `FootprintControls.tsx:89–160` (`CustomBubbleQtyInput`).

**What's right (accept the design):** This is a model of the truth rules done well:
- **Honest reject, never silent clamp** — `commit()` returns without applying on invalid input (`FootprintControls.tsx:106–108`); out-of-range turns the border red rather than coercing. This is the correct anti-"silent timeframe downgrade" behavior.
- Error is announced: `role="alert"` on the message (`:158`).
- `inputMode="numeric"` for the right mobile keyboard (`:123`); visible range hint `(BUBBLE_MIN–BUBBLE_MAX)` (`:115`); `ACTIVE · {maxN}` state readout (`:117`).

The concept and interaction model are accepted. No RETURN, no concept-level ITERATE.

**Bounded follow-up (not blocking, fold into the general a11y sweep, NOT a re-design):** the field label/hint at `text-[10px]`/`text-[9px]` and the `SET` button padding are below the 44px / comfort floor. Track as sizing polish under the scanner/charts a11y sizing pass, not as a rework of this control.

---

## Surface 3 — WM-BRAND-W-TRIGGER-01 branded W trigger (`bda48c9`) → **KEEP AS-IS**

**Where:** `ChartsDashboard.tsx:926–942`.

**What's right (accept):** This is what my WM-BRAND-W-TRIGGER-01 spec would have required, and it was built to it:
- `<WMLogo size={18} showGlow={smartMoneyOpen} />` — the trigger now uses the same identity mark as the panel interior, and the glow **syncs to open state** (`:942`), so button and panel read as one product. Resolves Founder audit C3.
- `aria-label="Open Smart Money panel"` + `aria-pressed={smartMoneyOpen}` (`:939–940`) — keyboard + screen-reader correct, toggle state announced.
- Per commit `bda48c9`: 32px min height + padding to ~44px effective touch; contrast raised `#8B8FA8` (~3.6:1) → `#E2E8F0` (~13:1), passing WCAG AA/AAA.

Accepted as designed. **Verification note:** desktop live confirms the mark + glow-on-open; I will confirm the ~44px effective touch at 360/390 when the display-clamp unblock lands. If that measurement comes back under 44, it downgrades to a one-line sizing ITERATE — but the concept stays KEEP.

---

## Summary

| Surface | Commit | Verdict | Follow-up |
|---|---|---|---|
| Source/provenance badge | `fd12f1e` | **ITERATE** | WM-A11Y-BADGE-01 — visible (non-hover) label + non-color live/delayed cue |
| Custom Big Trades qty input | `9f76b15` | **KEEP AS-IS** | minor target/font sizing folded into a11y sweep |
| Branded W trigger | `bda48c9` | **KEEP AS-IS** | confirm ≥44px touch at phone width post-unblock |

**Net:** 2 KEEP, 1 ITERATE. Only one new design ticket (WM-A11Y-BADGE-01) for Noah. No reverts. Mobile-width pixel confirmation deferred to the RISK-001/display-clamp unblock; concept verdicts stand on source + desktop evidence.
