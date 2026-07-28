# Wyckoff Phase Model — P0 Bug + Implementation Spec

**Date:** 2026-07-28
**Author:** Claude (Product Director role — spec only, no production code this session)
**Status:** P0 bug open; spec BLOCKED awaiting Dave's classification inputs
**Supersedes:** the "descope Wyckoff" recommendation in `WM_CHART_ARCHITECTURE_2026-07-28.md`. Dave chose *build it properly*.

---

## 1. P0 — Fabricated schematic live in production

**Location:** `src/components/smart-money/SmartMoneyPanel.tsx:962-996`

The "Wyckoff Accumulation Schematic" block renders from a hardcoded literal:

```
PS      Preliminary Support     done: true
SC      Selling Climax          done: true
AR      Automatic Rally         done: true
ST      Secondary Test          done: true
Spring  Spring / Shakeout       done: true, active: true   ← "CURRENT", pulsing
LPS     Last Point of Support   done: false
SOS     Sign of Strength        done: false
```

**No input feeds this.** Not the symbol, not price, not volume, not tape. Every
ticker under every condition displays an identical claim that the instrument is
presently in a Spring with four accumulation phases already confirmed complete.

**Severity rationale.** This is not a cosmetic placeholder. A Spring is a
specific, actionable Wyckoff event — traders size entries off it. Presenting a
constant as a live per-symbol read is the highest-harm class of fabrication in
the product.

**Self-contradiction.** `SmartMoneyPanel.tsx:131` in the same component already
states the truth:

```
{ name: "Wyckoff Phase", value: "N/A — phase model not implemented", ... }
```

Lines 131-134 were corrected by the truthfulness pass. The schematic block at
962 was missed. One component now both admits the model does not exist and
renders seven stages of its output.

**Required fix (Noah, ahead of any Wyckoff feature work):** replace the
hardcoded schematic with the same honest unavailable state used at 131-134.
Do not delete the section — render it disabled with an explicit
"phase model not implemented" note, matching the established pattern. This
ships independently of, and before, the model below.

---

## 2. What actually exists today

| Surface | File | Reality |
|---|---|---|
| `WyckoffPhase` type | `src/types/index.ts:32` | `"A" \| "B" \| "C" \| "D" \| "E"` — a bare union. No producer, no consumer logic. |
| Scanner alert kinds | `src/app/scanner/page.tsx:23,51-52` | `wyckoff-accum` / `wyckoff-dist` — label + color + icon only. |
| Panel rows | `SmartMoneyPanel.tsx:131-132` | Honest N/A. Correct. Leave alone. |
| Panel schematic | `SmartMoneyPanel.tsx:962-996` | **Fabricated. P0 above.** |
| Section header | `SmartMoneyPanel.tsx:161` | `"Markov / Wyckoff Regime"` — names Wyckoff over rows that are Markov-only. |
| Education / radio / journal / backtesting | various | Copy and curriculum text. Not computation. Out of scope. |

**Zero computation functions.** No file computes a phase, a schematic stage, or
an accumulation/distribution classification. The handoff's claim is confirmed.

Note the type union (`A`–`E`, the classical Wyckoff phase lettering) and the
schematic block (`PS`/`SC`/`AR`/`ST`/`Spring`/`LPS`/`SOS`, the *event* sequence)
are two different taxonomies. They are not interchangeable, and the codebase
currently gestures at both without implementing either. **The spec must pick
one as canonical** — see open question Q1.

---

## 3. Why this cannot be specced without Dave

Wyckoff phase classification is not a formula with settled constants. Every
boundary is a judgement call that legitimate practitioners draw differently:

- How many bars of range contraction before Phase B qualifies as Phase C?
- What volume ratio distinguishes a Selling Climax from ordinary high-volume down?
- Does a Spring require a *close* back inside the range, or only a wick?
- How far below support, in ATR or %, is a shakeout versus a genuine breakdown?

Inventing these numbers would produce a model that looks rigorous, computes
consistently, and is authoritative about nothing. That is the same failure as
the hardcoded schematic, one abstraction layer up. **Founding Principle 3
forbids it, so this spec stops at the boundary of what source can establish.**

---

## 4. What the spec CAN fix now — structural decisions

These follow from the audit and need no trading judgement.

**Location.** The model must live in `src/lib/` as a pure module — NOT inside a
page component. The Markov failure is the cautionary case:
`computeMarkovState()` lives in `heatmaps/page.tsx`, which is precisely why
chart and heatmap cannot share it and why state cannot track timeframe. Wyckoff
must not repeat this. Proposed: `src/lib/wyckoff/`.

**Input contract.** A phase model requires a **candle series** — OHLCV over a
window, not a scalar. This is the same lesson as the Markov defect
(`computeMarkovState(sym, periodReturn)` takes one number and therefore cannot
express any structure). Wyckoff additionally requires *swing pivots*, which the
codebase does not currently track anywhere — see `SmartMoneyPanel.tsx:133`
("needs swing structure"). **A pivot/swing-detection utility is a prerequisite
dependency and does not exist.** It is a separate ticket.

**Timeframe coupling.** Phase is meaningless without a stated timeframe. The
model must consume the canonical timeframe system from **WM-CHART-P0-01** and
must not ship before it. Wyckoff is therefore *downstream* of the P0-01 ticket,
not parallel to it.

**Abstention is mandatory.** The model must return an explicit
"insufficient structure" result and the UI must render it, exactly as
`SmartMoneyPanel.tsx:131-134` already does. It must never fall back to a
default phase. Most symbols, most of the time, are not in a classifiable phase.

**Dependency order:**

```
WM-CHART-P0-01  Canonical Timeframe System
      ↓
WM-WYCK-P0-00   Remove fabricated schematic  (independent, ship immediately)
      ↓
WM-WYCK-P1-01   Swing/pivot detection utility        ← prerequisite, does not exist
      ↓
WM-WYCK-P1-02   Phase classification model           ← BLOCKED on Q1-Q4
      ↓
WM-WYCK-P2-01   Panel + chart wiring
```

---

## 5. OPEN — required from Dave before WM-WYCK-P1-02 can be written

**Q1. Canonical taxonomy.** Phases `A`–`E` (matching `types/index.ts:32`), or
the event sequence `PS/SC/AR/ST/Spring/LPS/SOS` (matching the schematic UI), or
both with a defined mapping? The two currently coexist unreconciled.

**Q2. Phase boundary rules.** For whichever taxonomy: what observable conditions
begin and end each phase? Volume, range, pivot relationships — your definitions,
in your terms. I will translate them to code; I will not originate them.

**Q3. Confirmation thresholds.** Concrete numbers for the judgement calls in §3:
climax volume multiple, spring penetration depth, range-contraction bar count,
close-inside requirement.

**Q4. Abstention bar.** Minimum history and minimum pivot count before the model
is permitted to assert any phase at all.

Answer these and WM-WYCK-P1-02 becomes writable the same session. Until then it
stays blocked, by design.

---

## 6. Friday impact

- **WM-WYCK-P0-00 ships Friday.** Removing the fabrication is a correctness fix
  and is not blocked by anything.
- **The phase model does not ship Friday.** Building it properly requires Q1-Q4,
  a swing-detection utility that does not exist, and WM-CHART-P0-01 landing
  first. Friday's Wyckoff surface will honestly read unavailable.

This is the same outcome as the descope recommendation for Friday specifically —
the difference is that the model is now a specced, ordered workstream rather
than a dropped feature.
