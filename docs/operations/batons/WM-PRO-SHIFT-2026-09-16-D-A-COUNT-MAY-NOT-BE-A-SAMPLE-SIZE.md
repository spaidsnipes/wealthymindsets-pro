# WM PRO SHIFT — 2026-09-16 D — A COUNT MAY NOT BE A SAMPLE SIZE

Continues `WM-PRO-SHIFT-2026-09-16-THE-ROOM-DISAGREEING-WITH-ITSELF.md` (sealed
at `803d8b5`). Four commits land here:

| SHA | What |
|---|---|
| `6539285` | the one OPEN item said that nothing was open |
| `dedac85` | two OPEN counts on one deck, neither naming its set |
| `c352119` | UNAVAILABLE does not mean the screen has no number |
| `c6b27a8` | "6 BLOCKERS" was the cap, not a measurement |

Gates at seal: **655 files / 7884 tests PASS**, `tsc --noEmit` **EXIT 0**.
Both run UNPIPED.

---

## DEPLOY STATE — READ THIS BEFORE BELIEVING ANY SCREENSHOT

All four commits are on `main` and **NOT LIVE**. Production deploy is
`npm run deploy:cf`, which is Founder-blocked. **Eighteen** commits now sit on
`main` unshipped. Anything observed at `wealthymindsetspro.com` reflects an
earlier deploy and says nothing about this work.

Every live observation below was taken on **local dev** (`localhost:3000`),
and is labelled as such. Nothing here is claimed PROVEN in production.

---

## THE FINDING: `c6b27a8`

Observed on the deck, one column apart:

```
WHY · DECISION EVIDENCE      6 BLOCKERS
03 EVIDENCE DEBT             0 of 9 paid
```

Two numbers rendered from the same compiled decision, disagreeing. Canon
Weakness #1, live.

### Root cause

`selectDecisionWhyNot` builds one evidence blocker per **label**, from
`debt.missingLabels` / `debt.warnLabels`. `computeEvidenceDebt` caps each of
those arrays at `EVIDENCE_LABEL_SAMPLE_LIMIT` (3) and **never caps the counts**.
So `blockers.length` saturates at 6 plus rules.

Nine unpaid nodes and ninety would both have printed **6**. The 6 was the CAP,
wearing the clothes of a measurement.

### This is the fourth head

The codebase already documents the hazard twice —
`selectRealityCells.ts:35` ("a CAPPED SAMPLE that must never be counted") and
`decisionPermissionCompiler.ts:93` — and `hiddenRemainder()` exists because the
**identical** defect was fixed in the evidence strip on 2026-09-03.

It came back because **the arithmetic was restated by hand at every site
instead of derived once.** That is the mechanism, and it is the thing the
repair had to remove — not the one wrong number.

### The repair

Derive it **once**: `DecisionWhyVM.blockerCount`, computed from the UNCAPPED
totals, mirroring term-for-term the branches that push each blocker kind:

```ts
const blockerCount =
  engaged.filter((ev) => ev.rule.kind === "HARD").length +
  (oneStory.contradiction ? 1 : 0) +
  (debt ? debt.missing + debt.warn : oneStory.missing ? 1 : 0) +
  engaged.filter((ev) => ev.rule.kind === "SOFT").length;
```

Forwarded verbatim through `MarketCanvasVM.blockerCount`. All four surfaces —
the deck WHY rail, `MarketCanvasPanel`, `DecisionWhyPanel`, `CanvasSummaryPill`
— now print that total. The two list surfaces render the sample **in full** (a
blocker you cannot read is one you cannot clear) and then **name the shortfall**
rather than absorbing it.

`CanvasSummaryPill.withRemainder` gained an explicit `total` parameter, because
computing the remainder against the cap reports "+0 more" while real items are
withheld — the same lie, arrived at by subtraction.

---

## WHAT THE POSITIVE CONTROL FOUND

Reverting the /command-deck WHY rail from `blockerCount` back to
`blockers.length` left the **entire 7877-test suite GREEN**.

That rail is the precise DOM that shipped the defect. Nothing guarded it. The
VM-level tests prove the compiler now derives the true total; they cannot prove
a surface chose to read it.

Worse: an **existing** Sentinel asserted

```ts
expect(pill).toContain("`Why not (${vm.blockers.length}):`");
```

under the name *"names the full count in the tooltip heading"*. It was not the
full count. **A Sentinel that pins the wrong expression does not merely fail to
catch the defect — it defends it.** Corrected, with the reason recorded in place.

New Sentinel (`canvasDisclosureTruth.test.ts`) bans the capped sample as a
**QUANTITY** at all four surfaces. Two uses stay allowed, deliberately:

1. the remainder arithmetic `blockerCount - blockers.length` — that is the whole
   mechanism by which the shortfall gets named;
2. presence tests (`blockers.length > 0`) gating whether to render a list at all
   — that question really is about the array.

Comments are stripped before scanning, because these files are heavily annotated
with the history of this exact defect and those annotations quote the banned
expression by name. A Sentinel that cannot tell a warning from a violation
punishes the documentation that prevents recurrence.

**Re-run of the positive control after the guard landed:** two named failures,
at the right site —

```
× /command-deck WHY rail does not count `marketCanvas.blockers.length` …
× the deck rail prints the authoritative total
```

Reverted with an `Edit`, never `git checkout`.

### Orkin guard

`blockerCount` is asserted equal to the true total across the full
`[0,1,3,4,9] × [0,1,3,4,9]` missing × warn grid, built through the **real**
`computeEvidenceDebt` so the cap under test is the shipped cap. Guarding the
grid and not the bucket is what stops a fifth head arriving through the
neighbour — which is exactly how the fourth one arrived.

---

## LIVE VERIFICATION — LOCAL DEV ONLY

`http://localhost:3000/command-deck`, NQ1! 15M, after `c6b27a8`:

```
WHY · DECISION EVIDENCE     11 BLOCKERS · INSPECT
WHY NOT (11)
  Trustworthy market data required
  Regime
  Direction
  Location
  Permission
  CLC setup evidence required
  +5 more blocking, not named here
```

6 named + 5 disclosed = 11. The arithmetic closes on the pixel. Before the fix
the same frame read **6**, and looked complete.

---

## `c352119` — a comment I wrote earlier the same day was wrong

Atom 3's own annotation said `UNAVAILABLE` means "measured, and there is no
coverage and **no price**". Tracing `chartMarketStatePublisher.ts:126`:

```ts
const hasCanonicalPrice = matchingPriceTick(...) != null;
```

So it means no price the engine can tie to a real tick at `capturedAt` — **not**
"no number on the screen". The deck truthfully shows `29443 · LAST 15M BAR CLOSE`
in the same frame as `STATE QUALITY UNAVAILABLE`.

The co-existence was **already pinned** one layer down by
`chartMarketStatePublisher.test.ts` *"omits an unmatched displayed price instead
of inventing its event time"*. So the comment was corrected to match the test,
rather than the test bent to match the comment — and the annotation says so.

`produceCanonicalMarketState.test.ts:70` was deliberately **left alone**: at the
producer level, "no coverage and no price" accurately describes its own
null-price input.

A reader who took the old wording literally would have seen that bar close,
called one of the two a bug, and repaired the wrong one — most likely by hiding
an honest number.

---

## EXAMINED AND DELIBERATELY NOT CHANGED

- **`session SESSION ?` in the workspace footer.** Reads as a stutter, but
  `SESSION_TOKEN_UNKNOWN` is canonical and heavily defended
  (`canonicalIdentity.ts:297`). On a Wednesday, for NQ1!, this codebase holds no
  intraday exchange calendar, so the unknown token is the honest answer. Not a
  defect.
- **Cell 03's sentence**, `9 evidence nodes unpaid: regime + direction +6;
  1 warned: permission`. Scans like an off-by-one; it is not. 8 missing + 1 warn
  = 9, and `selectOneStory.ts:148` states the choice explicitly: an unknown and a
  contested answer are different debts, *"counted together and named apart."*
  That reasoning was written today and is sound. Left as is rather than churned.

---

## STILL OPEN — unchanged from the prior baton

- `MainLayout.tsx` is two shells in one file, branching on
  `isFounderOperatingRoom`.
- MARKET dominance + NOW fusion on the normal Founder route — resolve
  `PARENT_SCENE_OWNER` first.
- G6 `DECISION_ID` continuity as a **projection**, not sealing. Do not open a new
  store or engine.
- Re-home secondary chrome (Command Deck, Smart Money, Tools, Connect Brokers,
  Appearance, provider diagnostics, settings, receipts, Academy) into contextual
  drawers.
- POSITION DOCK / MANAGEMENT RAIL — canon's #1 buildable.
  `CapitalPostureLine` is arguably its seed.

Blocked, honestly: Gate 4 responsive device proof (programmatic window resize
does not take effect, `outerWidth` pinned); `/journal` detail canvas (0 journal
entries); Decision Memory sealing (zero production callers — architectural,
surface it, do not rush-wire).

Do **not** sweep the nine card-museum files
(`grep -rln 'rgba(19,19,23,0.5)' src`). Honest order is
registry → measure → repair → re-measure.
