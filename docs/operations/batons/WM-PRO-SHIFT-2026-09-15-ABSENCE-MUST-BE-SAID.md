<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# WM PRO — AN ABSENCE MUST BE SAID, AND SAID ONCE

Shift baton. Four commits, one chain, all found from USE on production rather
than from a failing test.

    d20cd22  the grade and its disclosure leave the classifier together
    40da1e2  an absent change must be SAID, on every site that shows one
    2e1d8bf  the Sentinel was only as complete as the grep that wrote it
    9fded17  CSS can silence a disclosure, and every test here reads .tsx

---

## THE ENTRY POINT — A MEASUREMENT, NOT A HUNCH

One DOM read of `div.wm-chart-market-summary` on
`https://wealthymindsetspro.com/charts`, TSLA:

    TSLA | — | HISTORICAL BARS VERIFIED

The `—` carried no `title` and no `aria-label`. Two different absences —
no price, and no day change — had collapsed into one unexplained glyph plus
one silent omission, in the outer chrome, which is the header a trader reads
before they read anything else.

The markup behind it:

    {ticker.price > 0 ? …toFixed(2) : "—"}     bare dash, no attributes
    {hasReal && <span …>}                      on absence, NO ELEMENT AT ALL

**A silent omission is the worst shape an absence can take.** A fabricated
zero at least makes a claim the trader can catch being wrong. A missing
element cannot be seen, questioned, or screenshotted. It reads exactly like
a page that has nothing to say on the subject.

---

## FINDING 1 — A SENTINEL CAN ENFORCE THE DECISION AND IGNORE THE DISCLOSURE

`chartHeaderChangeTruth.test.ts` already knew there were two change-display
sites. It locked them to one guard:

    it("both change-display sites share the same guard shape", …)

That enforces agreement about **WHEN** to suppress and says nothing about
**WHAT THE SUPPRESSION LOOKS LIKE**. So the two sites agreed perfectly on the
decision and disagreed completely on the disclosure: MainChart's price row had
always rendered `— (change unavailable)` with a reason in its title; the chrome
header a few elements away rendered nothing.

Fix: the sentence moved into `src/lib/marketData/changeAbsence.ts` and both
sites read it. Copying the literal would have produced a third owner agreeing
with the other two in the default case — the VACUOUS AGREEMENT shape, where
copies agree right up until one is edited.

### A Sentinel that would have REQUIRED the duplication it exists to prevent

`keeps the honest fallback branch it already had` used to assert the literal
strings lived in MainChart. After extraction, that assertion would force the
sentence to be spelled in MainChart. It was rewritten to assert the *wiring*,
with the sentence's content asserted once against its owner. Rewritten, not
relaxed.

---

## FINDING 2 — THE PREDICTED DRIFT HAD ALREADY HAPPENED

A grep for the sentence, run immediately after that commit shipped, found not
two sites but **four**:

| site | rendered | title literal |
|---|---|---|
| `MainChart.tsx` | `— (change unavailable)` | migrated |
| `ChartsDashboard.tsx` | *(nothing at all)* | migrated |
| `StockInfoPanel:224` | `— change unavailable` | **spelled its own** |
| `SymbolInfoHeader:142` | `—` | **spelled its own** |

Four copies of one sentence. Three renderings of one absence. **The drift is
visible in the punctuation.** The VACUOUS AGREEMENT the module was written to
prevent had already occurred, unobserved, before the module existed.

Nothing failed, because nothing was watching the sentence. The Sentinel was
watching two files it had been told were the whole set.

> **A Sentinel that names its subjects is only as complete as the grep that
> wrote it, and it passes forever while the population grows behind it.**

The tests now take no file list. They walk `src/` and count, and they report
offending **paths** rather than a bare number, so a future failure names the
file instead of a quantity.

`CHANGE_UNAVAILABLE_GLYPH` was added for the one case the sentence cannot
serve — an 11px percent-only cell — and is legitimate there *only* because
both `title` and `aria-label` carry the reason. Naming the glyph is what lets
a test tell a considered compact rendering apart from someone typing a dash,
which is invisible in a diff.

---

## FINDING 3 — AND THE SELF-CORRECTION THAT MATTERS MORE THAN IT

Commit `2e1d8bf` recorded, honestly, that the live DOM read had also shown the
change span at computed `display:none`, from:

    @media (max-width: 639px)
    .wm-chart-market-summary .wm-chart-header-change { display:none !important }

and called it "a separate live defect and the next atom."

**Measuring it falsified that claim.** In the `<=639px` branch, MainChart's
price row rendered the same sentence at `display:block`, 87×32px, carrying the
same title. The absence is *deduplicated* on a phone, not silenced. The CSS
rule is correct semantic zoom.

I was one edit away from "fixing" something that was already right. Recording
a suspicion as a suspicion, and then actually measuring it, is what stopped
that — and it is the reason the anti-fabrication rule earns its cost.

**What was genuinely wrong** is subtler. That rule was written when the class
only ever carried a real day change. The changeAbsence work then routed the
absence *disclosure* through the same class, so a rule about a number silently
became a rule about a disclosure, on the primary device. It remains honest
only because a *different file* renders the sentence unconditionally — a
dependency recorded nowhere but an English comment written before there was
any absence to carry.

And no test in this file could have seen it either way: **every one of them
reads `.tsx`.** Markup and stylesheet each looked correct in isolation. The
defect existed only in the relationship between them.

The fix changes nothing a trader sees. It couples the two.

---

## §22 REVIVE LEDGER — FIVE REVIVALS, ALL VIA `Edit`, ALL RESTORED BYTE-IDENTICAL

| # | revived defect | tsc | failed BY NAME |
|---|---|---|---|
| A | `{hasReal && <span` + bare `: "—"` | **0** | `the chrome header no longer drops the element on absence`, `the chrome header names the absence of the PRICE too` |
| B | literal re-inlined in MainChart, import removed | **0** | `keeps the honest fallback branch it already had`, `both sites read the sentence from one owner` |
| C | StockInfoPanel's drifted `— change unavailable` | **0** | `no file but the owner spells the sentence`, `the two drifted variants are gone from the tree` |
| D | breadcrumb stripped from globals.css | **0** | `the phone hide-rule still exists and is still explained` |
| E | `: showFidelityChrome && CHANGE_UNAVAILABLE_TEXT}` | **0** | `the site the hide-rule depends on renders unconditionally` |

**Every one compiled.** That is the finding the ledger exists to record. The
compiler never sees a duplicated sentence, a dropped element, a drifted
punctuation mark, or a disclosure gated behind an unrelated flag.

Revival **C** would have passed every named-subject test in the file.
Revival **E** is a plausible one-token edit that, on a phone, would leave no
visible statement of the absence anywhere on the page — the exact defect this
chain started from, restored through a file that does not contain the CSS rule
that makes it fatal.

---

## GATES

    d20cd22   TSC 0 · VITEST 0 · 605 files · 7076 tests
    40da1e2   TSC 0 · VITEST 0 · 605 files · 7082 tests
    2e1d8bf   TSC 0 · VITEST 0 · 605 files · 7086 tests
    9fded17   TSC 0 · VITEST 0 · 605 files · 7089 tests

Run unpiped throughout; a pipe masks the exit code.

## LIVE OBSERVED

`/charts`, TSLA, after `40da1e2` reached prod (chunkset `45f2a451…` →
`5c56ef4b…` at 19:49:09Z), one DOM read:

    price dash   title + aria-label = "Price unavailable — no live quote…"
    change span  title + aria-label = "Change unavailable — no verified…"
                 textContent        = "— (change unavailable)"

Both attributes present where the measured defect had none.

Also live-observed earlier in the chain, after `d20cd22`: `/scanner` at 30/30
rows carrying the strength disclosure, `exactZeroPct: 0`, `unratedTooltips: 0`.

## HONEST LIMITS — NOT PROVEN

- **Screenshots were unavailable for this entire chain.** The Founder's Chrome
  window reports 0 width; `computer` returns *"Cannot take screenshot with 0
  width."* Every live claim above is a DOM read, not a picture. The Mobile +
  Visual-Confirmation standard is therefore **not** satisfied for these atoms.
- The `<=639px` measurements are real but were taken at a 0-width window that
  falls inside that media query, **not** at a genuine 390px phone. Programmatic
  resize remains blocked (Gate 4).
- `/scanner` had zero unrated rows in the day's data, so the UNRATED refusal
  render path is covered by unit tests and has **not** been seen on the pixel.
- `deriveLastBarClose` can often name a verified bar close for the chrome
  header. It is deliberately **not** wired; `PRICE_UNAVAILABLE_TITLE` is worded
  narrowly so it does not overclaim the absence. That is its own atom.

## THE LAW THIS CHAIN ADDS

> **An absence must be SAID, on every site that shows one — and said once.**
>
> A Sentinel that names its subjects cannot see the population grow.
> A Sentinel that reads one language cannot see the other silence its subject.
> An invariant asserted across a boundary compiles no matter what it says.

## OPEN, NAMED

- `StockInfoPanel`'s price fallback still spells its own two-branch refusal
  sentence (`quoteRefusal ? … : …`). Not migrated — it is a *different*
  absence with a real reason string, and deserves its own owner, not this one.
- Wire `deriveLastBarClose` into the chrome header.
- `ChartsDashboard.tsx:~2031` carries a comment whose referent is ambiguous
  between MainChart's price row and the chrome header.
