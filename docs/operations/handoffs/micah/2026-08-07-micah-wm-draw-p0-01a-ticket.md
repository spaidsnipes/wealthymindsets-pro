# MICAH TICKET — WM-DRAW-P0-01a: Restore rail button spec height under vertical flex

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-08-07
**Repo HEAD at file time:** `fd9e1f0` · **Lane:** design/spec — Noah implements one-line CSS.
**Extracted from:** `2026-08-03-micah-wm-draw-p0-01-live-verdict.md §4` — filed as its own file so it doesn't get lost inside the verdict handoff.

| Field | Value |
|---|---|
| **Ticket ID** | WM-DRAW-P0-01a |
| **Product** | WM Pro |
| **Priority** | P1 — spec drift on desktop; potential WCAG 2.5.5 failure on coarse pointer if flex compression carries into the 44px rule. |
| **Owner (design)** | Micah (this file is the spec). |
| **Owner (implementation)** | Noah — one-line CSS addition in the existing scoped `<style>` block. |
| **Verifier** | Sentinel + Micah re-audit at coarse pointer (once display-clamp/RISK-001 unblock lands). |
| **Objective** | Rail buttons render at exactly the spec size (`30×30` at `pointer: fine`, `44×44` at `pointer: coarse`) regardless of how many items sit in the vertical flex column. |
| **Evidence** | Live audit on `wealthymindsets-pro.vercel.app/charts` at `e768558` (captured in the WM-DRAW-P0-01 verdict handoff) reports rendered height **25.78px** vs specified **30px** for `.wm-draw-btn` and `.wm-draw-swatch`. Vertical flex + `overflow-y: auto` on the rail is compressing children. |
| **Files** | `src/components/chart/LeftDrawingSidebar.tsx` only — the scoped `<style>` block at `:111-133`. |
| **Acceptance** | 1. `.wm-draw-btn` and `.wm-draw-swatch` render at exactly 30×30 on desktop (`pointer: fine`) and exactly 44×44 on touch (`pointer: coarse`) at the full 20-item rail. 2. No visual language change — same icon size, same active tint, same focus ring. 3. Rail keeps `overflow-y: auto` so cramped viewports still scroll instead of overflowing the chart. |
| **Never in scope** | Rail width change. Icon size change. Adding tools. Data or drawing-geometry logic. |
| **Est. cost** | one line: `flex-shrink: 0` on the two selectors inside the existing scoped style. |
| **Filed by** | Micah, 2026-08-07. |
