# WM Pro — three things the room was not saying

**Date:** 2026-09-16
**Commits:** `8125f71`, `99a87fd`, `efd0afb` (all on `main`)
**Gates at seal:** `vitest run` 655 files / 7852 tests PASS · `tsc --noEmit` EXIT 0
**Receipts:** local `npm run dev` rendered pixels, per atom. **NOT production.**

---

## THE HONESTY LINE, FIRST

Every receipt in this block was taken against **local dev at the exact working
SHA**. `npm run deploy:cf` is Founder-blocked, so these three commits are on
`main` and **are not live**. Anything currently observable at
wealthymindsetspro.com reflects an earlier deploy and says nothing about this
work. No atom below is marked PROVEN in production, because none was observed
there.

---

## What linked these three atoms

Not a subsystem. All three were found by **looking at the deck**, and all three
were the same category of failure: *the room had the fact and was not saying
it, or was saying it in a voice that misrepresented it.*

A correct fact rendered at the wrong size is still a failed cutover. These were
the wrong-size cases: one **missing**, one **self-contradicting**, one **too
loud**.

---

## Atom 1 — `8125f71` · the risk column never said what you are already holding

**Found by:** reading the `scene-risk` region and noticing it answered only
half the risk question.

AVAILABLE R answers *how much may I still risk*. Nothing on the deck answered
*what am I already exposed to*. A risk column that reports only headroom
invites a trader to add to a position the screen never mentioned.

New pure selector `selectCapitalPosture` + `CapitalPostureLine`. The load-bearing
decision: `provenance === "UNOBSERVED"` is checked **first and independently of
the label**, so an unread account renders `POSITION UNREAD`, never `FLAT`.
Unread and flat are opposite facts and the old shape could not tell them apart.
`FLAT` is only printed when it was actually CONFIRMED — §14.1, FLAT is a
finding, never a default.

Receipt: `AVAILABLE R / UNKNOWN` above `CAPITAL / POSITION UNREAD`, inside
`scene-risk` at 325×99.

## Atom 2 — `99a87fd` · the same card lied twice, through two different buckets

**Found by USE, not by reading code.** A full screenshot showed cell 03
contradicting itself two lines apart:

```
EVIDENCE DEBT   0 of 9 paid
8 evidence nodes unpaid: regime + direction +6
```

This is the **same visible lie** as a defect already documented as fixed on
2026-09-03. The first repair removed WATCH nodes from the denominator and
cured the mechanism it found. The lie returned through the neighbouring
bucket: a WARN node counted in `payable` but excluded from the sentence that
explains it. Because `payable = resolved + missing + warn` is definitional,
`warn === 1` was *derived*, not guessed.

**The finding that matters most in this whole block:** the full suite was green
— 7846 tests — while the defect was on screen. Nothing guarded it, because
every existing test happened to use chains with no WARN node.

So the new guard is written against the **arithmetic**, not against a bucket by
name: across the full 4×4×4 indicator cross-product, the number the sentence
leads with must equal `payable - resolved`. A third bucket, or a fourth, cannot
revive this without failing in `evidenceLedgerReconciles.enforcement.test.ts`.

A latent second head closed at the same time: a warn-only ledger returned a
null phrase, which `selectRealityCells` renders as "Ledger paid in full." — so
a contested ledger would have printed that caption directly under "0 of 1 paid".

A WARN node is **not** folded into the missing list. An unknown and a contested
answer are different debts. They are counted together and named apart.

Receipt: `0 of 9 paid` / `9 evidence nodes unpaid: regime + direction +6;
1 warned: permission`. 8 + 1 = 9 reconciles with the headline, and the ninth
node is named on screen for the first time.

## Atom 3 — `efd0afb` · the install card was shouting over an UNKNOWN market

**Found by USE.** The last pre-sanctuary component in the primary viewport: a
PWA install card at `z-[200]` over the market room, in a teal/blue accent
family no owner in the current visual canon claims, with a full rounded box, a
coloured halo, and a spring at stiffness 350.

That is not merely off-palette. A shortcut offer animating harder than the
market read is a claim about what matters on the screen, and it is the wrong
one. ATMOSPHERE MUST NEVER OUTRUN TRUTH.

Now one brass hairline on the left edge, a quiet opaque ground, no halo, a
short flat tween. The ground stays **opaque** because the card covers live
price and a transparent panel there is unreadable — that is legibility, not
decoration.

The guard is asserted against the off-canon **hex values**, not class names: a
class can be renamed, but reviving the colour requires writing the colour.

Receipt (measured, then photographed): `filter: none`, `border-radius: 0px`,
`border-left: 2px rgba(201,165,92,0.55)`, background `rgb(11,11,13)`, install
button `rgba(201,165,92,0.92)`, card within viewport at 1920w. Every truth
string and ARIA hook pinned by `installPromptTruthAccessibility.test.ts`
untouched.

---

## Positive controls run

| Atom | Break applied | Failure observed | Reverted by |
|---|---|---|---|
| 1 | removed the UNOBSERVED-first check | the named absence test | Edit |
| 2 | (guard authored against the live defect shape; it reproduces it) | lead count 8 vs payable 9 | — |
| 3 | restored the teal gradient on the install button | `not.toMatch(/#00D4AA/i)` by name | Edit |

Never `git checkout` — a checkout can silently take more than intended.

---

## Open, and honest about it

- **Deploy is owner-blocked.** These commits sit on `main` unshipped.
- `CapitalPostureLine` carries correct hairline grammar but is **not yet pinned**
  by `deckSceneFragmentation.test.ts`. A future full-box regression there would
  not be caught. Unclosed, named here so it is not lost.
- `MainLayout.tsx` is still two shells in one file branching on
  `isFounderOperatingRoom`. The one-OS law says this should converge. Untouched
  this block.
- Still blocked, unchanged: Gate 4 responsive device proof (programmatic window
  resize does not take effect, `outerWidth` pinned); `/journal` detail canvas
  (0 journal entries to render).

---

## The through-line for whoever picks this up

All three defects were visible on a screenshot and invisible to 7846 passing
tests. Read the room before reading the code. When a fix is written, ask what
*else* could produce the same pixel — the Orkin question — and guard the
invariant rather than the mechanism you happened to find.
