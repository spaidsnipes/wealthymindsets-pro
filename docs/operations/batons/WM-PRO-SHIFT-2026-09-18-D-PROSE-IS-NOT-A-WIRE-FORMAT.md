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

# PROSE IS NOT A WIRE FORMAT

**Shift** 2026-09-18 · **Commits** `c9c1368d`, `6f810f0f`, `e4a53e29` · **Branch** main, pushed
**Gates** tsc EXIT=0 · vitest EXIT=0 (762 files, 9445 passed, 2 skipped)
**Live** OBSERVED on https://wealthymindsetspro.com/command-deck?symbol=TSLA — table below.

Direct continuation of **2026-09-18-C**, which closed one staleness classifier
and then named three things it could not see. This block closes all three, and
one of them turned out to be a false claim that baton had made about itself.

---

## THE STRUCTURAL ROOT CAUSE, FINALLY NAMED

`zeroState(...)` in `src/lib/marketData/adapters/*` **AUTHORS AN ENGLISH
SENTENCE**. `matrixProviderWireView` in `ProviderWireStrip.tsx` **PARSES IT BACK
WITH REGEX** to decide the verdict.

> **PROSE IS THE WIRE FORMAT BETWEEN THESE TWO MODULES, AND NOTHING TYPE-CHECKS
> IT.** Rewording a note silently downgrades a verdict. Neither file imports
> the other. No compiler, no reviewer, and no unit test on either side can see
> the coupling.

2026-09-18-C fixed **one sentence**. That was the bug. The species is: any
sentence, present or future.

## `c9c1368d` — A SENTINEL THAT READS THE OTHER END OF THE WIRE

The test now walks `src/lib/marketData/adapters/`, extracts **every string
literal handed to `zeroState(...)`**, and runs each one through the real
classifier. Any note that lands on the generic `Not receiving` /
`Status unavailable` arm fails **by name, quoting the offending sentence.**

It immediately found a fall-through **no manual trace had caught**:

> Webull data bridge configured (…) but its response envelope is not yet
> verified in this adapter — refusing to claim capabilities from an unproven
> transport.

`Not receiving` would have been false **twice over**: the bridge IS configured,
and something DID come back. New arm: **`Transport unproven`**. During the
mutation receipt the Sentinel named a *second* webull sentence as well.

Five notes moved off the generic arm. New arms: provider error, timeout, rate
limited, no events, unreachable, transport unproven, and a last-resort
`HTTP <code>` arm so 404/409/451 name themselves instead of claiming silence.

**The guard caught its own author.** The new generic `HTTP \d{3}` arm demoted a
text-level 401 that `Authentication blocked` reaches through a STATUS
(`BLOCKED_AUTH`), not through the note. `AssertionError: expected 'HTTP 401' to
be 'Authentication blocked'`. **Fixed in the arm, not in the test.**

## `6f810f0f` — THE THIRD TIME ONE FILE LEARNED THE SAME LESSON

2026-09-18-C left this open: *"whether `evidenceless` is set honestly at every
producing branch — nothing here audits that."* Auditing it turned up the
readiness-override gate:

```ts
if (override && (wire.label === "Status unavailable" || wire.label === "Not runtime-wired"))
```

`"Not runtime-wired"` is produced by **TWO branches that mean opposite things**
— one where the capability row carried a note (a FINDING), one where it carried
nothing (a DEFAULT). And the clause was already dead: `matrixProviderWireView`
never emits that label at all.

Every reachable path was **verified behaviour-identical** before the change, so
the atom pivoted from repair to **pinning the rule**:

> **A DISPLAY STRING MUST NEVER BE CONTROL FLOW.** Third instance in one file
> (`receiptAffirmsTicks`, the witness gate, this). A Sentinel now reads the
> `.tsx` source with comments stripped and fails on any `wire|view|resolved|
> override.label ===`. Receipt/protocol tokens (`"RECEIVING"`, `"AUTH BLOCKED"`)
> arrive from an API and are deliberately out of scope — the rule is about text
> THIS FILE chose for display.

## `e4a53e29` — THE BATON WAS WRONG ABOUT ITSELF

2026-09-18-C: *"`BrokerConnectPanel.tsx:1233` renders with no witness — **not a
defect (it renders no tape)**."*

First check, `grep -cn "price\|quote\|lastTrade\|bars"` → **0**. Case-SENSITIVE.
Re-run with `-i`:

```
648:  {receipt.newestPrice !== null ? ` · $${receipt.newestPrice.toFixed(2)}` : ""}
```

**The panel renders `N prints · $PRICE · size N · time`.** A rendered price is
tape. The panel carries Canon Weakness #1 in full, and has never fired only
because webull answers HTTP 401 — a FINDING, which a witness may not overrule.
**One working token away.**

Landed: `webullCanaryObservation`, a pure reducer gated on the **SAME predicate
the panel renders with**, with `barsPresent` false and staying false because
this surface draws no candles. Lifted to the panel, prop-drilled back down
three levels, and **retracted at the start of each re-run** so the strip never
speaks for a print that has left the screen. A Sentinel now requires every
named consumer to hand the strip a witness.

Two pre-existing tests pinned **EXACT JSX TAGS** — `<ProviderWireStrip compact />`
and `<ManagedConnectionStatus broker={broker} />` — which froze both components'
whole prop lists into unrelated assertions and made *"renders no witness"* a
**REQUIREMENT**. Both narrowed to what they are actually for.

## LIVE, AFTER — OBSERVED, NOT INFERRED

Deployed bundle confirmed to carry the new classifier (`Transport unproven`
present in `/_next/static/chunks/0vr_0_wg7v76k.js`), then the rendered DOM:

| provider | rendered label | reason carried |
|---|---|---|
| **alpaca** | **Stale data** | `provider timestamp was 45065083 ms old` (≈12.5 h) |
| webull | AUTH BLOCKED | HTTP 401 · INVALID_TOKEN |
| tastytrade | Not configured | `Missing required variables: TASTYTRADE_REFRESH_TOKEN.` |
| moomoo | Not configured | bridge base URL or shared secret is not set |
| longbridge | Not configured | bridge URL or shared token is not set |

**No row is generic.** Every row states what was measured and why.

The first probe returned `tone: null` and `text: ""` for all five rows and was
**not** reported as a result — it had read the wrong element level. Re-probed
via `textContent` on the `[data-provider]` anchors. *A probe that returns empty
is a broken probe, not a finding about the page.*

## THE LAWS THIS BLOCK ADDS

> **PROSE IS NOT A WIRE FORMAT.** When one module authors a sentence and another
> parses it, the coupling is invisible to every tool. The only defence is a test
> that reads BOTH ENDS and runs the real classifier over the real corpus.

> **A DISPLAY STRING MUST NEVER BE CONTROL FLOW.** Renaming a chip must never be
> able to change which claims a witness may overrule.

> **A TEST THAT PINS AN EXACT JSX TAG PINS EVERY PROP THE COMPONENT WILL EVER
> HAVE.** Two such tests had quietly made a missing witness a requirement.

> **A GREP THAT RETURNS ZERO IS NOT EVIDENCE OF ABSENCE UNTIL YOU HAVE CHECKED
> THE GREP.** §14.1 applies to your own instruments.

## WHAT THIS STILL CANNOT SEE

- moomoo and longbridge author refusal notes **inline on capability rows**, not
  through `zeroState(...)`. The prose-round-trip Sentinel does not cover them;
- the witness wiring in `BrokerConnectPanel` is proven **present and retracted
  correctly by test**, but has **never been observed firing live** — webull
  answers 401, so no receipt reaches OBSERVED. It is correct-by-construction and
  unobserved, and those are different words;
- `/charts` renders tape beside a wire claim and has still not been re-examined
  under the corrected `evidenceless` rule.
