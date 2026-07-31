# MICAH HANDOFF — WM-A11Y-SCANNER-01 authored (clears the phantom follow-on)

**Author:** Micah (Experience / Accessibility / WOW Polish)
**Date:** 2026-07-30
**HEAD at time of audit:** `cddaf74` (`docs(ath): appendix D — transcript CLOSED`), branch `main`, 0/0 vs `origin/main`.
**Clears:** the follow-on Atlas left open in `ACTIVE_TASK_QUEUE.md` §"RETRACTED: WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01" — *"Micah authors a real `WM-A11Y-SCANNER-01` ticket if scanner a11y is actually needed."* It is needed. Evidence below.
**Method:** static source audit only. Read-only. No code touched, no calc/data logic touched (Noah/Forge lane). No commit, no push, no DB, no deploy — consistent with the NO-GO hold (Truth Rule #5). This file is written to the working tree exactly as Sentinel's verdict is.

---

## 1. Gate reconciliation (honest, up front)

The phantom ID `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` was correctly RETURNED by Sentinel (V-008) and RETRACTED by Atlas. My audit confirms the two structural conclusions already on record and adds one:

1. Scanner a11y is **real, uncovered work** — `/scanner` (`src/app/scanner/page.tsx`) appears in **no** existing ticket's file scope. It is not WM-RESP-P0-01 (scope: `src/components/chart/`), not WM-RESP-P0-02 (scope: `/login` + root viewport meta), not WM-RESP-P1-01 (scope: charts + heatmaps). So this is a new ticket, not a duplicate.
2. It should **not** hard-gate Noah's WM-CHART-P0-03, Forge's Option A V5, or the Video Intelligence contracts. Those depend on chart **data truth**, not scanner **presentation**. Coupling a presentation ticket to a data-truth gate was the original coordination error. *(Wiring this correctly in the queue is Nehemiah's reconciliation lane; I'm flagging it, not editing the queue.)*
3. New: the keyboard-parity subset below is **release-blocking** per the Founder directive's Micah charter item 4 ("Mouse-only controls are release-blocking"). That raises part of this ticket to P0 severity on its own merits — independent of any phantom gate.

---

## 2. Evidence — confirmed defects on `/scanner` (`src/app/scanner/page.tsx` @ `cddaf74`)

All line numbers are at HEAD `cddaf74`. Each is verifiable by re-reading the cited lines.

### A. Keyboard-dead interactions (release-blocking)
| # | Element | Lines | Defect |
|---|---|---|---|
| A1 | **Result-row select** (the primary scanner action — opens the detail panel) | 524–529 | `onClick` on a `motion.div` with `cursor-pointer`, **no `tabIndex`, no `role`, no `onKeyDown`, no `aria-selected`**. The core interaction of the surface is unreachable by keyboard and unannounced to screen readers. |
| A2 | **Column-sort headers** (Chg%, Vol×, RSI, Str) | 504–508 | `onClick` on a `<div>` with `cursor-pointer`, **no `role`, no `tabIndex`, no keyboard handler, no `aria-sort`**. Sorting is mouse/touch-tap only. |

### B. Tap targets below the 44×44 minimum (WCAG 2.5.5 / Apple HIG)
| # | Element | Lines | Measured intent |
|---|---|---|---|
| B1 | Row height | 529 | fixed `height:40` — the primary per-row touch target is 40px, under 44. |
| B2 | Star toggle | 531–533 | icon `size={11}`, no padding on the button — ~11–16px hit area. |
| B3 | Alert bell | 575–577 | `p-1` (4px) + 11px icon ≈ 19px. |
| B4 | Open-chart | 579–582 | `p-1` + 11px icon ≈ 19px. |

### C. Zero screen-reader semantics
- **0 `aria-*`, 0 `role=`** across the entire 663-line file.
- Icon-only buttons (star / bell / chart / the `✕` close at 597) have **no `aria-label`** — announced as unlabeled buttons.
- The results grid is a CSS-grid div stack (497–509, 524–584) with **no table semantics** (`role="table"/row/columnheader/cell"` or a real `<table>`), so the tabular data reads as flat div soup.
- The "LIVE" auto-refresh toggle (420) updates results with **no `aria-live` region** — screen-reader users get silent content swaps.

### D. Zero responsive adaptation → phone/tablet overflow
- **0 `sm:`/`md:`/`lg:` breakpoints** in the file.
- The results grid uses a **fixed** `gridTemplateColumns:"36px 80px 1fr 90px 90px 80px 80px 60px 80px 100px 60px"` (498, 529) ≈ 836px of fixed columns + the `1fr`. At 360/390 CSS px this overflows with no adaptation; header (497) and rows (524) will clip or force horizontal scroll on the primary trading device.
- Preset/filter chip bar (401) is `overflow-x-auto` with `scrollbarWidth:"none"` → **overflowing presets are invisible and undiscoverable** (same defect class already logged in WM-RESP-P1-01's toolbar).

### E. Truncation (charter item 1 — zero-truncation)
| # | Element | Lines |
|---|---|---|
| E1 | Ticker `name` `truncate` in an 80px column | 537 |
| E2 | `sector` `truncate` in an 80px column | 572 |
| E3 | Metric filter `label` `truncate` | 455 |

### F. Long-session eye comfort / legibility (charter — long-session comfort)
- **22 occurrences** of `text-[9px]` / `text-[10px]` (11 each) carrying core data: ticker name, sector, vol×, RSI, strength badge. 9–10px is below comfortable reading and a fatigue driver over a trading session. Not a hard WCAG SC failure (zoom/reflow is the WCAG lever, see D), but squarely a WOW-polish + comfort defect.

### G. Honest note on what I did NOT find
- No mouse-only drag handlers (`onMouseDown/Move/Up`) on this surface — 12 of 14 `onClick`s are on native `<button>`s (403, 415, 420, 425, 451, 481, 531, 575, 579, 597, 635, 640), which are keyboard-operable for free. The keyboard gap is confined to A1/A2 (the two non-button `onClick`s). This surface is **less** broken for keyboard than `MainChart` (WM-RESP-P0-01), and I'm not going to inflate it.

---

## 3. THE TICKET — paste-ready for the queue (Nehemiah to route/insert)

## WM-A11Y-SCANNER-01 — Scanner interaction & accessibility parity

| Field | Value |
|---|---|
| **Ticket ID** | WM-A11Y-SCANNER-01 |
| **Product** | WM Pro |
| **Priority** | **P0 for §A (keyboard parity — release-blocking per Founder charter item 4); P1 for §B–F.** |
| **Owner (design/spec + a11y verdict)** | **Micah.** |
| **Owner (implementation)** | **Noah**, held with the rest of Noah's queue; not gated on any phantom, gated only by his normal queue order + the Option-A hold. |
| **Verifier** | Sentinel (release gate) + Micah (a11y/experience verdict with screenshots). |
| **Objective** | Every `/scanner` interaction is operable by keyboard **and** touch, announced to screen readers, sized ≥44px, legible, and free of undiscoverable overflow at phone/tablet widths. Presentation-only — no scanner data/logic changes. |
| **Evidence source** | This handoff, §2, static audit at HEAD `cddaf74`, `src/app/scanner/page.tsx`. |
| **Files / subsystems** | `src/app/scanner/page.tsx` only. Shared primitives (e.g. a focusable-row pattern) may be extracted if Noah judges it cleaner, but no other surface's behavior may change. |
| **Acceptance criteria** | **§A (P0):** 1. Row select (524–529) reachable by keyboard: `role="row"` within a `role="table"`, `tabIndex`, Enter/Space activates, `aria-selected` reflects state, visible focus ring. 2. Sort headers (504–508) become real controls: `role="columnheader"` + focusable button semantics, Enter/Space sorts, `aria-sort="ascending\|descending\|none"`. **§B (P1):** 3. Row hit area ≥44px; star/bell/chart buttons ≥44×44 (padding may exceed the 11px icon — no visual restyle required). **§C (P1):** 4. Every icon-only button has an `aria-label`; grid exposes table semantics; the LIVE auto-refresh wraps results in an `aria-live="polite"` region. **§D (P1):** 5. No horizontal page overflow at 360/390/834; the filter chip bar (401) gains a visible overflow affordance (fade/arrow). **§E (P1):** 6. `name`/`sector`/metric-label render without loss at all four viewports (tooltip/wrap/responsive column — not silent clipping). **§F (P1):** 7. Core row data legible without zoom on phone (raise the `text-[9px]/[10px]` data cells to a comfortable floor — Micah supplies the exact scale in the impl spec). |
| **Verification requirements** | Re-run the WOW `smallTargets` audit snippet at 360×800, 390×844, 834×1194 — must be empty for scanner controls. Keyboard-only pass: Tab to a row, Enter to open detail, arrow/Tab to sort, all without a mouse. Screenshots at **360×800, 390×844, 834×1194, desktop** for both the results grid and the detail panel. VoiceOver spot-check that rows and sort state announce. |
| **Blockers** | **RISK-001** for live runtime proof (auth wall) — implementation is **not** blocked; only the closing screenshots are. Baseline capture is queued as my immediate next step via Dave's connected Chrome (no credentials entered). |
| **Explicitly NOT in scope** | Any change to scanner signal computation, data sourcing, RSI/vol/strength values, or the `SIGNAL_META` set (Noah/Forge lane). Renaming columns. Redesigning the detail panel's content. |
| **Filed by** | Micah, 2026-07-30. |

---

## 3.5 Baseline capture — results & a RISK-001 wrinkle (2026-07-30)

Attempted the four-viewport baseline. Honest outcome: **desktop captured; 360/390/834 authed-scanner blocked.** Reason is a hard tooling constraint, not skipped effort:

| Tool | Auth state | Viewport reality | Can capture authed `/scanner`? |
|---|---|---|---|
| Dave's connected Chrome | ✅ authenticated | **Display-clamped** — `window.resize(360,800)` reported success but `innerWidth` stayed **1910** (1920px physical display floors it). Desktop only. | ✅ **desktop** only |
| In-app Browser pane | ❌ unauthenticated | ✅ true device emulation — verified `innerWidth:360`, no horizontal overflow on the page it landed on | ❌ `/scanner` → **302 `/login`** (RISK-001 wall) |

So the two tools have **opposite** limits: authenticated-but-desktop-locked vs mobile-capable-but-logged-out. Neither alone yields an authenticated scanner at phone/tablet width.

**Captured:**
- **Desktop, authenticated `/scanner`** (Dave's Chrome, `innerWidth 1910`): surface renders real signals (NQ1!, ES1!, NVDA, TSLA…), LIVE 30s refresh, 30/30 results. **No truncation or horizontal overflow visible at desktop width** — which is expected and important: the §D/§E defects are *width-gated*, so the desktop shot cannot show them. The mobile baseline is exactly the evidence that matters, and it's the one blocked.
- **Login wall at true 360×800** (in-app browser): proof `/scanner` is auth-gated; also a clean shot of the WM-RESP-P0-02 surface (login tap targets now look correctly sized — consistent with that ticket being COMPLETE; not re-verifying, not my ticket).

**Recommended unblock (pick one; I never enter credentials):**
1. **Local dev with a Dave-created session** — run `localhost:3000`, Dave signs in once himself, then the in-app browser (true 360/390/834) or DevTools device-mode captures the authed scanner. Cleanest.
2. **Dave toggles DevTools device toolbar** on his own Chrome for the three widths while I screenshot — the connected-Chrome MCP can't toggle it, a human can.
3. Defer the mobile baseline to whenever RISK-001 is resolved for the team generally.

This wrinkle (authed Chrome is display-clamped) is worth logging against **RISK-001** itself — it means "drive Dave's connected Chrome" does **not** cover mobile-width verification for any authed surface, for any employee. Flagging to Nehemiah/Sentinel.

## 4. Next actions

- **Nehemiah:** insert WM-A11Y-SCANNER-01 into `ACTIVE_TASK_QUEUE.md`, mark the RETRACTED phantom's follow-on as satisfied, and record that scanner a11y does **not** gate the chart-data-truth chain.
- **Micah (me):** (a) capture the live baseline screenshots at all four viewports via Dave's connected Chrome for the before/after; (b) proceed to the next parallel charter item with no gate — the water-style Big Trade marker design spec (feeds WM-CHART-P0-05b/c) or the zero-truncation sweep across `/charts` `/watchlists` `/heatmaps` `/education`.
- **Noah:** no action until his queue order reaches this; not blocked by any phantom.
- **Nothing here ships, commits, or deploys while the NO-GO hold stands.**
