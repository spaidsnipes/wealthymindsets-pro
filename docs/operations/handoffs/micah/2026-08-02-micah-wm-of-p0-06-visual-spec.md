# MICAH DESIGN SPEC — WM-OF-P0-06: Order-flow master-toggle UX (visual polish)

**Author:** Micah · **Date:** 2026-08-02 · **Repo HEAD:** `499e504` · **Lane:** design/spec only — Noah implements.
**Status:** **PROVISIONAL — pre-drafted ahead of Forge's contract** (`handoffs/forge/2026-08-02-forge-wm-of-p0-06-*.md` not yet filed at HEAD `499e504`). Forge owns the behavior decision **(A)** auto-enable master vs **(B)** disable sub-tools while master OFF. This spec covers **both** so Noah isn't blocked the moment Forge picks — I finalize the relevant half when his contract lands.

## The defect (Founder verified live)
Master `ORDER FLOW: OFF` + tapping any OF sub-tool (`Bid×Ask`, `Delta`, `Vol Profile`, `Imbalance`, `Agg/Passive`, `Big Trades` — `FootprintControls.tsx:490–493`) does nothing visible. A dead click with no feedback = the user thinks the app is broken.

---

## Branch A — master auto-enables when a sub-tool is tapped (Forge picks A)

Interaction: tapping any sub-tool while master is OFF **turns master ON** and activates that tool in one action.

Visual requirements:
- **Master toggle animates OFF→ON** in the same beat (≤150ms) so the user sees the cause: the `ORDER FLOW` pill flips to its ON treatment as the tool activates.
- **Enable toast** (brief, non-blocking, auto-dismiss ~2.5s), copy:
  > **Order Flow on** — enabled so *{tool name}* can show live data.
  Toast is `aria-live="polite"`, dismissible, ≥44px close if it carries one, never covers the tool just enabled.
- No dead state to style — but the master pill must still read clearly as ON afterward (contrast ≥AA, text label not color-alone).

## Branch B — sub-tools visibly disabled while master OFF (Forge picks B)

Interaction: sub-tools are visibly non-actionable until the user turns master ON first.

Disabled-state styling for each OF sub-tool button:
- **Opacity** 0.4 on the button (icon + label), so it reads as inactive without disappearing.
- **Cursor** `not-allowed` on hover (desktop).
- **`aria-disabled="true"`** (keep it focusable so keyboard/SR users hear *why* — do not `display:none`).
- **Tooltip / helper on hover+focus+tap:** "Turn on Order Flow to use {tool}." (tap must surface it too — not hover-only.)
- The **master `ORDER FLOW` toggle gets an attention cue** when a disabled sub-tool is tapped: a one-shot pulse/highlight (≤150ms, non-looping) drawing the eye to the thing to turn on. This converts a dead click into a *pointing* click.

---

## Shared requirements (both branches)

- **Micro-transition when master flips** (either branch): sub-tools cross-fade between disabled↔enabled appearance in ≤150ms, 60fps, no layout shift. State change never jumps the toolbar.
- Master toggle state legible in **grayscale** (ON/OFF as text + shape, not green/grey alone) — same WCAG 1.4.1 discipline as the badge/broker specs.
- All buttons keep ≥44×44 hit area in both states.
- Nothing here changes *what* order-flow data is computed or whether a feed carries it — if a tool has no tape, its own honest empty state still applies (that's existing behavior, not this ticket).

## Acceptance criteria (Noah verifies, once Forge picks)
1. No OF sub-tool is ever a silent dead click while master is OFF — either it auto-enables master (A) or it's visibly disabled with a reason + points at the master (B).
2. Master flip animates ≤150ms, 60fps, no layout shift.
3. (A) toast is `aria-live`, auto-dismiss, non-covering; (B) disabled sub-tools are `aria-disabled`, focusable, with a tap-reachable reason.
4. States grayscale-legible; ≥44px targets; keyboard + `:focus-visible`.
5. **Screenshots at 360×800, 390×844, 834×1194, desktop** of master-OFF and master-ON states (+ toast for A / disabled sub-tool for B). *(Mobile pixel capture pending the unblock in `2026-08-02-micah-screenshot-verification.md`.)*

## Never in scope
The A-vs-B behavior decision (Forge), order-flow computation, feed/tape logic. Presentation + interaction only.
