# MICAH VERDICT — WM-DRAW-P0-01 rail accessibility (d81a592) live-verify

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-08-03
**Repo HEAD at verdict:** `e768558` · **Commit under review:** `d81a592` (feat(draw): rail accessibility)
**Method:** live audit against Founder's authenticated production `/charts` via connected Chrome extension (`https://wealthymindsets-pro.vercel.app/charts`), one script execution captured before the extension went transient. No Founder-window resize performed (would disrupt his active session).
**Verdict:** **APPROVED WITH ONE-LINE FOLLOW-ON** (see §4). Sentinel may close the a11y-structure acceptance criteria (spec §8 items 1) on this evidence; touch-viewport pixel sign-off remains deferred to the display-clamp unblock per [[wm-pro-company-bible]] / MICAH_STATUS existing pattern.

---

## 1. Acceptance criteria mapping (WM-DRAW-P0-01 §8, rail-only portion)

Only the rail-scoped subset is in review. Pointer-Events migration and touch-draw items (§8 items 2, 3) remain gated on WM-RESP-P0-01 per the spec's own hard dependency ("DRAW rides on RESP") and are **out of scope for d81a592**.

| AC | Requirement | Evidence | Result |
|---|---|---|---|
| §8.1 — mouse activate | Every control activates by mouse | rail mounts 20 buttons + 1 style swatch on live prod | **PASS** |
| §8.1 — keyboard activate | Tab+Enter; visible `:focus-visible` ring | injected `<style>` inside `.wm-draw-rail` contains `.wm-draw-btn:focus-visible, .wm-draw-swatch:focus-visible { outline: 2px solid #4FA3E0; outline-offset: 2px; }` — verified present on live | **PASS** |
| §8.1 — touch target ≥44px | `@media (pointer: coarse)` sets `width: 44px; height: 44px` | rule present and matches `pointer: coarse[…]44px` regex in the live stylesheet; matchesCoarse:false on the desktop probe as expected (input is fine, DPR 1, viewport 1910×840) — rule fires only on real touch input | **PASS (structural), PENDING (pixel proof on touch device)** |
| §7 — active state visible + announced | `aria-pressed` reflects `activeTool` | 18 of 19 `.wm-draw-btn` carry `aria-pressed`; the 1 without is Clear-all, correctly a non-toggle action; sample: Cursor `aria-pressed="true"`, Magnet/Lock/Hide `aria-pressed="false"` — correct | **PASS** |
| §5 style swatch a11y | `aria-haspopup="dialog"`, `aria-expanded` tracks open | live: swatch reports `aria-haspopup="dialog"`, `aria-expanded="false"` (popover closed at capture) | **PASS** |
| aria-label coverage | Every rail control announced | **20/20** controls carry `aria-label` (was 0 before d81a592) | **PASS** |

**Screen-reader semantics for all 20 tools** — the labels I read back on live: Cursor · Select / Move · Trend Line · Ray · Horizontal Line · Vertical Line · Arrow · Fib Retracement · Rectangle · Ellipse · Triangle · Delta + VP Box · Text · Draw / Brush · Eraser · Drawing style · Magnet — snap to price · Lock drawings · Hide drawings · Clear all drawings. These match the spec's tool inventory in `LeftDrawingSidebar.tsx:15-41`.

## 2. Confirmed defect — spec-height drift on desktop (small, isolated)

At desktop (viewport 1910×840, `pointer: fine`, DPR 1) the rail buttons render at **width 30.0px × height 25.78px**. The inline CSS specifies `width: 30px; height: 30px`. The **height is ~14% under the spec** (25.78 vs 30). This is not a compressed viewport; it is 20+ items in a vertical flex column with `overflow-y: auto` and no explicit `flex-shrink: 0` on the children, so the layout squeezes the last few rows to fit.

The most likely fix (safe, one line, no visual-language change): add `flex-shrink: 0` to `.wm-draw-btn` and `.wm-draw-swatch` inside the scoped `<style>` block in `LeftDrawingSidebar.tsx:111-133`. I intended to confirm this by cloning a button with `flex: 0 0 44px` and measuring, but the Chrome extension went transient mid-diagnostic. Recording the observation honestly rather than claiming the diagnosis is complete.

**Impact assessment:** does not violate WCAG 2.5.5 on desktop (a mouse can hit a 25.78px target), but at pointer:coarse the same flex compression could squeeze the 44px rule below 44 — which **would** be an SC failure. That is why the follow-on ticket is P1, not P2.

## 3. What I did NOT / could NOT verify

- **Real touch viewport pixel sign-off at 360×800, 390×844, 834×1194.** Same display-clamp / RISK-001 blocker documented in `MICAH_STATUS.md` and `2026-08-02-micah-screenshot-verification.md`. Founder's Chrome floors to ~1910px physical display; `matchMedia("(pointer: coarse)")` doesn't fire on a desktop mouse input. Structural proof of the media query is on record; **pixel proof at coarse pointer is pending the same unblock as every other Micah mobile close-out**.
- **Whether flex-shrink is the root cause of the 25.78 drift.** Diagnosed direction only; the confirmation cycle didn't complete before the extension disconnected. Recorded as an observation, not a diagnosis.
- **Founder-tab resize** — deliberately not performed. Founder is actively watching production; a resize would disrupt his session. When authed mobile access unblocks, the pixel proof gets done in a viewport under our own control, not his.

## 4. Follow-on — WM-DRAW-P0-01a (paste-ready for Nehemiah)

## WM-DRAW-P0-01a — Restore rail button spec height (30/44px) under vertical flex

| Field | Value |
|---|---|
| **Ticket ID** | WM-DRAW-P0-01a |
| **Product** | WM Pro |
| **Priority** | P1 — spec drift on desktop; potential WCAG 2.5.5 failure on coarse pointer if flex compression carries into the 44px rule. |
| **Owner (design)** | Micah (this handoff is the spec). |
| **Owner (impl)** | Noah — one-line CSS addition in the existing scoped `<style>` block. |
| **Verifier** | Sentinel + Micah re-audit at coarse pointer. |
| **Objective** | Rail buttons render at exactly the spec size (`30×30` at `pointer: fine`, `44×44` at `pointer: coarse`) regardless of how many items sit in the vertical flex column. |
| **Evidence** | Live audit on `wealthymindsets-pro.vercel.app/charts` at `e768558` reports rendered height **25.78px** vs specified **30px** for `.wm-draw-btn` and `.wm-draw-swatch`. Vertical flex + `overflow-y: auto` on the rail is compressing children. |
| **Files** | `src/components/chart/LeftDrawingSidebar.tsx` only — the scoped `<style>` block at `:111-133`. |
| **Acceptance** | 1. `.wm-draw-btn` and `.wm-draw-swatch` render at exactly 30×30 on desktop (`pointer: fine`) and exactly 44×44 on touch (`pointer: coarse`) at the full 20-item rail. 2. No visual language change — same icon size, same active tint, same focus ring. 3. Rail keeps `overflow-y: auto` so cramped viewports still scroll instead of overflowing the chart. |
| **Never in scope** | Rail width change. Icon size change. Adding tools. Data or drawing-geometry logic. |
| **Est. cost** | one line: `flex-shrink: 0` on the two selectors inside the existing scoped style. |
| **Filed by** | Micah, 2026-08-03. |

## 5. What Sentinel can close on this verdict

- WM-DRAW-P0-01 §8 items covered by d81a592 (rail-scope only): `aria-label`, `aria-pressed`, `:focus-visible` ring, `@media (pointer: coarse)` 44px rule — **APPROVED** on structural evidence + desktop live proof.
- Explicitly NOT closed by d81a592: §8 items 2 and 3 (Pointer-Events migration, touch-draw). Those remain the WM-RESP-P0-01 lane and are correctly out of scope in Noah's commit message.

## 6. Next Micah actions (per DEC-011, no ping to Founder)

1. Publish this file to Drive same-day per [[atlas-drive-sync-ownership]].
2. Reconcile ticket-to-owner map: add WM-DRAW-P0-01a as a Micah/Noah row in `ACTIVE_TASK_QUEUE.md` (Nehemiah handles insertion; I've made the row paste-ready).
3. Continue to task 8 (Bible §25/26/27 cross-check via Drive MCP — no Chrome required) while the extension is transient.
4. Re-run the flex diagnostic + capture the four-viewport screenshots the moment the extension re-connects **and** the display-clamp unblocks.

**Doctrine tie-in (per the 2026-08-03 Universal Product Doctrine §8):** "Calm but alive. Simple but not empty. … Resilient enough to survive real life." The rail passes Calm and Simple; the 25.78 drift is the Alive/Powerful reading not quite landing — a hair off spec that a trader wouldn't name but would feel. Small ticket, real polish.
