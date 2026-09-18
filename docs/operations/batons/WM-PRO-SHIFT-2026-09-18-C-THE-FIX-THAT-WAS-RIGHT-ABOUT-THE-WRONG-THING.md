# THE FIX THAT WAS RIGHT ABOUT THE WRONG THING

**Shift** 2026-09-18 · **Commits** `09732ba5`, `f495d19b` · **Branch** main, pushed
**Gates** tsc EXIT=0 · vitest EXIT=0 (762 files, 9422 passed, 2 skipped)
**Live** OBSERVED on https://wealthymindsetspro.com/command-deck — before/after below.

---

## THE READING THAT STARTED IT

`/command-deck`, TSLA, 2026-09-18. Two panels, one screen, one instant:

```
Connections strip   alpaca   Not receiving          (tone OFFLINE)
hero truth          source alpaca · coverage 1 channel · 365.65 · 120 bars
```

Canon Weakness #1 — multi-fidelity disagreement on ONE page. The panel claiming
NOTHING ARRIVED sat inches above the panel rendering what arrived.

## THE FIRST FIX — `09732ba5`

Diagnosis: `matrixProviderWireView` only ever asks *"does this provider hold an
ACCEPTED capability row?"* and on exhausting that ladder falls through to a
claim about DELIVERY it never measured. §14.1 — **an absence must be a finding,
not a default.**

Repair: hand the owner the page's own witness (`SourcedObservation`) so it can
see the evidence already on its own surface. Tone goes LIMITED, never LIVE. Ten
tests, three over-correction guards (BLOCKED survives, LIVE survives, a witness
speaks only for the provider it witnessed). Mutation receipt taken. CI green.

**It shipped. It was wrong in its decisive detail.**

## WHAT GOING BACK TO LOOK FOUND

The loop directive says *verify live*. The anti-fabrication clause says *never
claim PROVEN without live observation*. So production was re-opened rather than
trusted — and the alpaca row still read `Not receiving`.

Its `title` attribute carried the reason nobody had read:

> Alpaca returned a valid TSLA IEX trade, but its provider timestamp was
> **43549376 ms** old; stale evidence was not exposed as current.

**43,549,376 ms is 12.1 HOURS.** That is not a default reached by exhausting a
ladder. That is a MEASUREMENT, and a careful one.

`Not receiving` is produced at exactly one site, and only when
`rejected.length > 0` — i.e. **it always rests on something the system measured.**
The premise of the first fix was false.

## TWO DEFECTS WERE CHAINED UNDER ONE LABEL

| # | defect | mechanism |
|---|---|---|
| 1 | a 12-hour staleness refusal rendered as the generic `Not receiving` | the staleness classifier matched **PHRASING** — `stale prints`, `stale data`, `print … old` — not **MEANING**. The synonym `stale evidence` and the unit-carrying `43549376 ms old` both fell through. |
| 2 | the new witness would have promoted that flattened refusal to `Observed · not certified` | the witness gated on a **SET OF LABEL STRINGS** that included `Not receiving`. Its guards covered BLOCKED and LIVE. **They did not cover an OFFLINE verdict that had been EARNED.** |

Defect 2 never fired in production only because the page's quote was itself
being suppressed. **A latent lie is still a lie; it was one live tape away.**

## THE REPAIR — `f495d19b`

1. **Classify by meaning.** `/\bstale\b|\b\d+\s*(?:ms|s|m|h)\s+old\b|prints? .* old\b/i`
   — any wording of staleness, any unit-carrying age.
2. **The witness gate is no longer a label set.** `ProviderWireView.evidenceless`
   is set only by the branches that *know nothing came back at all*
   (`rejected.length === 0`, `"the probe did not return"`, `"no capability
   evidence returned"`). The witness reads that field.

> Labels are display strings. Using one as control flow is the exact defect this
> same file already records at `receiptAffirmsTicks` — renaming a chip would
> silently change which claims a witness may overrule.

Mutation receipt: restoring the label-set gate goes red **by name** on
`THE CORRECTION: a MEASURED absence survives the witness`. Restored, green.
31 tests in the file (19 → 29 → 31).

## LIVE, AFTER — OBSERVED, NOT INFERRED

Deployed bundle confirmed to carry the new gate (`evidenceless` present in
`/_next/static/chunks`), then the rendered DOM read:

| provider | tone | label | reason carried |
|---|---|---|---|
| **alpaca** | **LIMITED** | **Stale data** | `provider timestamp was 44107753 ms old` (12.25 h) |
| webull | BLOCKED | AUTH BLOCKED | HTTP 401 · INVALID_TOKEN |
| tastytrade | OFFLINE | Not configured | `Missing required variables: TASTYTRADE_REFRESH_TOKEN.` |
| moomoo | OFFLINE | Not configured | bridge base URL or shared secret not set |
| longbridge | OFFLINE | Not configured | bridge URL or shared token not set |

Every row now states **what was measured and why**. No row is generic. No row
is promoted. The witness correctly stayed silent, because there was nothing
assumed for it to contradict.

## THE LAW THIS BLOCK ADDS

> **A WITNESS MAY CONTRADICT AN ABSENCE THAT WAS ASSUMED. NEVER ONE THAT WAS
> FOUND.** The distinction cannot be recovered from the label — it has to be
> recorded by the branch that knows whether it measured anything.

And the one the sequence itself pays for:

> **A FIX THAT PASSES ITS OWN TESTS HAS ONLY PROVEN THAT IT AGREES WITH ITS
> AUTHOR.** `09732ba5` had a green suite, a mutation receipt, a green CI, and a
> false premise. Nothing in the repo could have caught it. It died on contact
> with the live surface, and only because someone went back to look.

The wrong reasoning is kept verbatim in the `witnessedProviderWireView`
docstring and annotated rather than quietly corrected — **the record of how a
plausible diagnosis was wrong is worth more than a clean file.**

## WHAT THIS STILL CANNOT SEE

- whether `evidenceless` is set *honestly* at every producing branch; the field
  is only as good as the branch that sets it, and nothing here audits that;
- ~~the second `ProviderWireStrip` consumer, `BrokerConnectPanel.tsx:1233`, still
  renders with **no witness** — not a defect (it renders no tape) but not proven
  either;~~ **FALSE. CORRECTED THE SAME DAY — see baton 2026-09-18-D.** The panel
  renders `receipt.newestPrice.toFixed(2)` at line 648. A rendered price is tape.
  The parenthetical was written from a case-SENSITIVE grep that returned 0, and
  it is the exact failure this same baton records for `09732ba5`: a plausible
  premise confirmed instead of tested. Repaired in `e4a53e29`.
- `/charts` also renders tape beside a wire claim and was not re-examined under
  the corrected rule.
