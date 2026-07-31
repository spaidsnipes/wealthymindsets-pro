# MICAH DESIGN SPEC — WM-UX-P0-01: Move the Delta bubble-count control into the Smart Money panel

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at spec time:** `50dc7cb` · **Lane:** design/spec only — Noah implements. No src changes in this file.
**Founder ruling (verbatim):** *"on the big trades drop down, i can choose how many delta bubbles i want also, thats wrong i should be able to choose how many delta bubles i want in the smart money tools panel when i open the wealthyminds smart money tools."*

---

## 1. Verified current state (read at `50dc7cb`)

- **Control lives in the wrong place.** The Delta level-count selector (`5 / 7 / 10 / 15`, default `7 ★`) is rendered inside the **Big Trades gear dropdown**: `src/components/chart/FootprintControls.tsx:305–327`, a `grid grid-cols-4` of buttons that call `setDeltaLevels(n)`.
- **Storage already exists and is correct.** `wm_delta_levels` (default `"7"`) is read at `FootprintControls.tsx:181–186`, written at `187–190`, and change is broadcast via `window.dispatchEvent(new CustomEvent("wm-delta-levels"))`. **Do not move or rename the key.**
- **The Smart Money panel already displays the result of this control** but offers no way to set it. `src/components/smart-money/SmartMoneyPanel.tsx:778–823` is a section titled **"WM DELTA BUBBLES"** that already:
  - shows a live count badge — `${deltaLevels.length} LEVEL(S)` / `NO TAPE` (781–783),
  - renders the water-style bubbles at **12–30px** diameter scaled by |delta| (788–812, `dia = 12 + round(mag*18)`),
  - carries an honest empty state when the feed has no aggressor tape (817–822).

**Conclusion:** this is not a "find a home" problem. The control's natural home is the section that already renders its output. Migrating it there closes a real "control is far from its effect" usability gap, not just a location nit.

---

## 2. Placement (recommended)

Put the count control **inside the existing "WM DELTA BUBBLES" section header row** (`SmartMoneyPanel.tsx:778–784`), directly under the title, above the live bubble list. Rationale: the user reads "WM DELTA BUBBLES · N LEVELS", and the selector to change N sits immediately below the badge that reports N — control and readout in one glance. No new section, no scroll hunt, top-third of the panel as the dispatch asked.

Layout inside the section, in order:
1. Title row (existing): `💧 WM DELTA BUBBLES … [N LEVELS badge]`.
2. **NEW — count control row** (see §3).
3. Live bubble list (existing 786–816).
4. Honest empty state (existing 817–822).

---

## 3. Interaction — keep the 4-preset grid, not a slider (decision + justification)

**Decision: keep `5 / 7 / 10 / 15` as a segmented control, not a slider.**

Justification:
- The domain is **4 discrete, meaningful values**, not a continuous range. A slider implies 1-unit precision that doesn't exist and is far harder to hit accurately on touch.
- It preserves the Founder's existing mental model (same four numbers, same `7 ★` default marker) — migration should move the control, not retrain the user.
- A segmented control gives an unambiguous selected state for a11y (`aria-pressed`), which a slider's thumb does not.

Spec for the control:
| Property | Value |
|---|---|
| Form | Horizontal segmented control, 4 equal segments `5 / 7 / 10 / 15`; retain the `★` default marker on `7`. |
| Label | Visible label "Levels shown" + helper "max ranked price levels per bar" (carry the honest wording already at `FootprintControls.tsx:310`). |
| **Touch target** | Each segment **≥44×44px** hit area (padding may exceed visual box). The current gear version is `px-1.5 py-1 text-[11px]` ≈ 22px tall — **below minimum; do not copy those dimensions into the panel.** |
| Selected state | Filled `wm-green/20` + `text-wm-green` + `border-wm-green/50` (matches existing selected style at `FootprintControls.tsx:320`) AND `aria-pressed="true"`. |
| Keyboard | Tab focuses the group; Arrow Left/Right moves selection; Enter/Space commits. Visible focus ring on the focused segment. |
| Font | ≥12px for the number (current `text-[11px]` is below the panel's comfort floor). |

---

## 4. Chart feedback loop (Founder explicitly wants to see the effect)

On change, the control must:
1. Write `wm_delta_levels` and dispatch `wm-delta-levels` — **reuse the exact existing mechanism** (`FootprintControls.tsx:187–190`); MainChart and the panel already listen.
2. The "WM DELTA BUBBLES" badge (`N LEVELS`) and the live bubble list update in place — they already derive from the same source, so no extra wiring.
3. On-chart Delta bubbles re-render to the new cap within one tick. If MainChart's re-render on `wm-delta-levels` is not immediate, that's a Noah implementation note, not a spec change.
4. **No layout shift** in the panel when the count changes (reserve list height or animate height ≤150ms). Section must not jump the CLC card below it (`824+`).

---

## 5. Removal from Big Trades gear (no dual source of truth)

- **Delete** the Delta-levels block at `FootprintControls.tsx:305–327` (the `grid grid-cols-4` + its header at 307–312). The Big Trades gear keeps its actual Big-Trades concerns (bubble max qty, sound, pause, simultaneous mode, reset) — Delta level count is a Smart Money concern, not a Big Trades concern; that conceptual mismatch is exactly the Founder's complaint.
- The `deltaLevels` state + `wm_delta_levels` persistence currently defined in `FootprintControls` must move to (or be lifted so it's shared by) the Smart Money panel. **Same key, same event name** — any other surface reading `wm_delta_levels` keeps working untouched.
- After removal, grep for stray references: `grep -rn "wm_delta_levels\|wm-delta-levels\|setDeltaLevels\|Delta levels" src/` must show the control only in the SM panel + listeners.

---

## 6. Acceptance criteria (Noah verifies against these)

1. Delta count control appears in the SM panel "WM DELTA BUBBLES" section; **gone** from the Big Trades gear.
2. `wm_delta_levels` key + `wm-delta-levels` event unchanged; value persists across reload; default `7`.
3. Changing the count updates the badge, the panel bubble list, and on-chart bubbles within one tick, with no panel layout shift.
4. Each segment ≥44×44 hit area; selected segment has `aria-pressed="true"`; group is keyboard-operable (arrows + Enter, visible focus).
5. Number font ≥12px.
6. No second place in the app can set Delta levels (single source of truth).
7. **Screenshots at 360×800, 390×844, 834×1194, desktop** showing the control in the panel and the Big Trades gear without it. *(Mobile-width capture is currently RISK-001/display-clamp constrained — see the baseline note in `2026-07-30-micah-scanner-a11y-ticket.md §3.5`; desktop proof attached below, mobile pending the same unblock.)*

## 7. Never in scope
Delta computation, level-ranking math, tape/aggressor logic, bubble color semantics, or the `wm_delta_levels` value set (these are Noah/Forge data logic). This ticket moves a control and sizes it for touch/keyboard. Presentation only.
