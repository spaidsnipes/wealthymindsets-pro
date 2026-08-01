# MICAH DESIGN SPEC (ownership backfill) — WM-BRAND-W-TRIGGER-01: Smart Money branded trigger

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at spec time:** `7e13292` · **Lane:** design/spec only — Noah implements.
**Why this exists:** DEC-012 backfill. Mission Control shipped `bda48c9` without a Micah design spec; per DEC-012, design lanes are mine, so this doc places the design under my ownership going forward. Code is not reverted.

---

## Honest correction to the dispatch framing

The 10:01 CDT dispatch calls `bda48c9` "a placeholder." **Verified in source (`ChartsDashboard.tsx:929–943`) — it is not a placeholder.** It is a real, mostly-correct implementation:
- `<WMLogo size={18} showGlow={smartMoneyOpen} />` + "Smart Money" label (`:942`) — real brand mark, glow synced to open state.
- `aria-label="Open Smart Money panel"` + `aria-pressed={smartMoneyOpen}` (`:939–940`) — keyboard/SR correct.
- Open-state color/border sync (`:933–935`); contrast `#E2E8F0` on dark ≈ 13:1 (WCAG AAA).

I verdicted this **KEEP AS-IS on concept** in the DEC-012 backfill, and I stand by that. The DEC-012 *process* violation (shipped without my spec) is real; the *code* is decent. I won't invent problems to justify a rewrite — but there is exactly **one measurable defect**, below.

## The one real defect (verified, contradicts the commit message)

The commit `bda48c9` message claims "Padding gives 44px+ effective touch area." **The source does not deliver that vertically:** the button is `h-8` with `minHeight: 32` (`:931, :936`) = **32px tall**. `minWidth:44` fixes width only. **32px < 44px WCAG 2.5.5 minimum.** So the trigger fails the touch-target height it claims to pass.

## Design spec (what Noah implements)

Ratify the current visual design, fix the height:
1. **Keep** the `<WMLogo size={18} showGlow>` mark, the glow-on-open sync, the color/border open states, the label "Smart Money", and all ARIA (`aria-label`, `aria-pressed`, `title`). This is the accepted design.
2. **Fix touch target:** raise the button to a **≥44px effective height** — `h-11` (44px), or keep the compact 32px visual box but add vertical padding so the *hit area* (getBoundingClientRect) is ≥44px. Do **not** use a `::before` pseudo-element hit-area trick — that failed the real audit on WM-RESP-P0-02 and was corrected to true padding; use true padding here too.
3. **Keyboard focus:** add a visible `:focus-visible` ring (currently relies on default; confirm it's not suppressed by `transition-all` / global resets).
4. Brand consistency: the trigger's WMLogo treatment must match the panel-interior WMLogo (same size relationship / glow) so button + panel read as one product — already true, keep it.

## Acceptance criteria
1. Button hit area **≥44×44px** confirmed by `getBoundingClientRect()` at 360/390/834/desktop (not by visual estimate, not by pseudo-element).
2. WMLogo + glow-on-open + ARIA unchanged and correct; `aria-pressed` tracks panel state.
3. Visible keyboard focus ring.
4. Contrast ≥ AA in both open and closed states.
5. **Screenshots at 360×800, 390×844, 834×1194, desktop** showing the trigger closed and open (glow). *(Desktop confirmed live this session — WMLogo + "Smart Money" render, glow toggles on open. The ≥44px height measurement at phone width is display-clamp/RISK-001 constrained per `2026-07-30-micah-scanner-a11y-ticket.md §3.5`; the 32px source value is confirmed now regardless of viewport.)*

## Never in scope
Smart Money panel *contents*, order-flow logic, renaming "Smart Money," panel-interior changes. This is the trigger button only.
