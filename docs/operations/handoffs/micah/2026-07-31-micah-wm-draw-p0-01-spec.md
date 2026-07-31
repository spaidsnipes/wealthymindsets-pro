# MICAH DESIGN SPEC — WM-DRAW-P0-01: Drawing tools "fully clean and smooth"

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at spec time:** `50dc7cb` · **Lane:** design/spec only — Noah implements.
**Founder word:** the 20 left-rail drawing tools must be "fully clean and smooth." This spec turns that into criteria Noah can verify, not vibes.
**Hard dependency:** the touch-smoothness requirements here are the same root cause as **WM-RESP-P0-01** (touch parity). WM-DRAW-P0-01 is the *quality definition*; WM-RESP-P0-01 is the *handler migration* that makes it possible. They ship together or DRAW rides on RESP.

---

## 1. The 20 controls (verified inventory — `LeftDrawingSidebar.tsx:16–41, 122–143`)

**15 drawing tools:** Cursor · Select/Move · Trend Line · Ray · Horizontal Line · Vertical Line · Arrow · Fib Retracement · Rectangle · Ellipse · Triangle · Delta+VP Box · Text · Draw/Brush · Eraser.
**5 utility controls:** Style swatch · Magnet (snap) · Lock · Visibility (show/hide) · Clear-all.

They fall into **6 interaction classes**; specifying by class (not 20 near-identical tables) is deliberate — it keeps the contract consistent so no tool feels different from its neighbor, which is what "clean" means to the hand.

---

## 2. Verified current state at `50dc7cb` (what's already right, what's not)

**Already correct — keep:**
- **Esc-to-cancel exists** and is global: `MainChart.tsx:5905–5908` (`case "Escape"` clears in-progress, preview point, selection) + listener `5945–5946`. Text tool has its own Esc at `7030–7032`. Documented model "click to add points, double-click / Escape to finish" (`:603`).
- Rail button transition is `all 0.12s` (`LeftDrawingSidebar.tsx:88`) — **120ms, already within the <150ms target.** Don't slow it.
- Active-tool state is visually distinct (tinted bg + colored border, `:86–92`).

**Not clean/smooth yet — verified defects:**
1. **Touch is effectively dead on the canvas.** Drawing overlay uses `onMouseDown/Move/Up` (`MainChart.tsx:6716–6718, 6861–6863, 6897, 7025`). Component-wide `src/components/chart/`: **7 `onMouseDown`, 2 `onMouseMove`, 2 `onMouseUp`, 1 `onPointerDown`, 0 touch handlers.** A finger drag does not emit mouse-move, so two-point and freehand tools can't be drawn by touch — the primary-device failure. (= WM-RESP-P0-01.)
2. **Rail targets below 44px.** Tool buttons are **30×30px** (`btn()` `:86–87`); utility icons 14–15px; the style swatch is **22×22px** (`:127`). All under the 44×44 minimum on touch.
3. **No visible keyboard focus.** The rail communicates hover via JS `onMouseEnter/Leave` color swaps (`:113–114`) and active via border, but there is **no `:focus-visible` ring** — a keyboard user cannot see which tool is focused.
4. **Only 1 partial `onPointerDown`** — pointer adoption started but is incomplete and inconsistent across tools, which reads as "some tools feel different" — the opposite of clean.

---

## 3. Global interaction contract (applies to every tool)

Every tool must satisfy this identical contract — sameness is the feature:

| Phase | Pointer (mouse) | Touch | Keyboard |
|---|---|---|---|
| Activate tool | click rail button | tap rail button (≥44px) | Tab to button, Enter/Space |
| Begin | pointerdown | pointerdown (touch) | n/a (drawing is pointer; keyboard cancels/commits) |
| Draw/drag | pointermove | pointermove | live preview follows |
| Commit | pointerup / dbl-click (polyline) | pointerup / dbl-tap | Enter commits text |
| **Cancel** | **Esc** (exists) | **Esc via on-screen affordance** (no keyboard on phone) | **Esc** (exists) |

Requirements:
- **Migrate the overlay to Pointer Events** (`onPointerDown/Move/Up`) — one path for mouse, touch, and stylus. This is the WM-RESP-P0-01 migration; it is the precondition for "smooth" on touch.
- Set **`touch-action: none`** on the drawing canvas layer while a drawing tool (not Cursor) is active, so the browser doesn't hijack the drag as a pan. Restore `touch-action` when Cursor is active so chart pan/zoom still works.
- **Touch cancel:** since phones have no Esc, a drawing-in-progress must show a small on-screen "✕ / Cancel" affordance (≥44px) that maps to the existing Esc path (`MainChart.tsx:5908`). Don't add a second cancel code path — reuse it.

---

## 4. Per-class specs

**Class A — Instant place (Horizontal Line, Vertical Line, Text):** single pointerdown places the object at the snapped coordinate; no drag required. Must not require a second click. Text opens its editor immediately (existing behavior, `:6995+`).

**Class B — Two-point drag (Trend Line, Ray, Arrow, Rectangle, Ellipse, Triangle, Fib Retracement, Delta+VP Box):** pointerdown sets anchor, pointermove shows a **live preview** that tracks the pointer at 60fps, pointerup commits. Preview must render every move frame — no "only shows on release." Snap (Magnet) applies to both endpoints when active.

**Class C — Freehand (Draw/Brush):** continuous pointermove capture; must stay smooth at 60fps with no dropped segments on a fast stroke; commit on pointerup.

**Class D — Destructive (Eraser, Clear-all):** Eraser removes the drawing under the pointer on down/drag; Clear-all requires a confirm affordance (it wipes everything — irreversible in-session). Clear-all button already isolated with a red hover (`:140–143`); add a confirm step.

**Class E — Modifiers (Cursor, Select/Move, Magnet, Lock, Visibility):** toggles/selectors, not canvas draws. Selected/active state must be visible AND announced (`aria-pressed`). Select/Move must expose **drag handles** on the selected drawing (see §5).

**Class F — Style swatch:** opens the style popover; enlarge from 22×22 to a ≥44px tap area (keep the visual swatch small inside a larger hit area if desired).

---

## 5. Handles, hover, snap, responsiveness

- **Edit handles** on a selected/hovered drawing: visual handle ≥8px, **hit area ≥24px** (finger-grabbable; hit area may exceed the visual dot). Handles must have a hover/active state and a visible focus state if keyboard-selectable.
- **Snap (Magnet):** when active, endpoints snap to price/time gridlines with a subtle magnet cue; snapping must not lag the pointer.
- **Drag responsiveness:** preview and handle-drag track the pointer within one animation frame (≤16ms); no perceptible lag between finger/cursor and the line.

## 6. Animation & performance

- Rail button state transitions ≤150ms (already 120ms — keep).
- Canvas preview redraws at **60fps**; no layout shift (CLS 0) when a tool activates or a drawing commits.
- No full React re-render of the chart on every pointermove — preview should draw to the overlay layer, not re-render the tree (Noah implementation note; acceptance is "no jank on a fast trendline drag").

## 7. States (each must be designed, screenshotted, and honest)

| State | Definition | Requirement |
|---|---|---|
| Empty | no drawings yet | rail fully usable; no ghost handles; canvas clean |
| Active | one tool selected, none drawn | selected rail button distinct + `aria-pressed`; cursor/crosshair reflects tool |
| In-progress | mid-draw | live preview; on-screen cancel affordance visible (touch) |
| Selected | a drawing selected | handles visible + grabbable (§5); Delete/Backspace removes it |
| Locked | Lock active | drawings visible but not editable; pointerdown on a drawing does nothing; lock state visible |
| Hidden | Visibility off | drawings hidden, not deleted; toggling restores exactly |

## 8. Acceptance criteria (Noah verifies)

1. Every one of the 20 controls activates by mouse, touch (≥44px), and keyboard (Tab+Enter), with a **visible `:focus-visible` ring**.
2. Overlay migrated to Pointer Events; `touch-action:none` while a draw tool is active, restored under Cursor. Every Class B/C tool is drawable by finger on a real touch viewport.
3. Live preview tracks the pointer at 60fps for all Class B/C tools; no "appears only on release."
4. Esc (desktop) and the on-screen cancel affordance (touch) both route through the existing `MainChart.tsx:5908` cancel path.
5. Edit handles ≥24px hit area; drag has no perceptible lag.
6. All 6 states in §7 render correctly and honestly; Clear-all confirms before wiping.
7. No layout shift on tool activate/commit; rail transitions ≤150ms.
8. **Screenshots at 360×800, 390×844, 834×1194, desktop** for: empty, one tool active, a trendline mid-drag, a selected drawing with handles. *(Phone/tablet capture is display-clamp/RISK-001 constrained per `2026-07-30-micah-scanner-a11y-ticket.md §3.5`; desktop proof deliverable now, mobile on unblock. The touch-draw criteria (2,3) specifically require a real touch viewport to close — flagging that these cannot be signed off on desktop alone.)*

## 9. Never in scope
Chart data, indicator math, order-flow/Delta logic, price sourcing. Drawing geometry math is Noah's; this spec governs how the tools *feel* and how accessible they are. Presentation + interaction only.
