<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one block of
> work. Its filename names its own day. It was true on that day and is preserved
> as evidence of what was observed and decided then. Do not take a current
> action, diagnosis, release decision or task claim from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> For the CURRENT state of the view build, read
> `docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` and its gated
> VIEW-STATUS table. The table is the claim; this baton is only the story
> behind three of its rows.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference is a `GHOST_HOST` signal: the Vercel
> host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-20 at the moment of writing, by
> `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which failed this file on
> its first run and was obeyed rather than amended.
<!-- END:ath-historical-lineage -->

# BATON — THE WORKSHEET SAID OUT LOUD

**Sealed 2026-09-20.** Covers commits `28c36473`, `e2a954f0`, `2ce5c58f`.
Serving Cloudflare Worker at seal time: `3bef0321-cbeb-4b91-b980-5bc2ff60e1a0`.

Read `docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` first. That file is
the authority; the gated VIEW-STATUS table is the claim and this baton is the
narrative. If the two ever disagree, the table wins.

---

## THE STANDING ORDER THIS BLOCK WAS WORKED UNDER

> "its been a whole hoour and i dont see anything else visually from the mockups
> within the os, stop working on things ither than making sure those mockups are
> in the os as the real thing"

The criticism was correct and it retired a whole lane. Three previously-shipped
atoms — `data-b501-*` receipts, a URL writeback, a `data-paint-*` ledger — were
all invisible: DOM attributes and address-bar text. Work that only a `querySelector`
can see is not a transformation of an operating system, whatever the tests say.

**Every atom in this block renders pixels a human can point at.** That is the
only acceptance test that was applied.

---

## WHAT SHIPPED

### 1. A stale navigation sentence corrected (`28c36473`)

The canon told an operator to find the views at `ChartsDashboard.tsx:1847`, via
`aria-label="Symbol view category"`. Both halves were false on the served page:
no element carries that label, and the line number had long since moved. An
operator following it looks for a dropdown that is not there and concludes the
view never shipped.

**A line number and an `aria-label` are both conventions re-typed from memory;
neither is an owner.** The corrected text navigates by the drawer
(`Tools → Chart tools → Views`, `id="chart-views-sheet"`) or by reading
`ALL_CATEGORY_TABS` — both of which are owned and both of which move when the
code moves.

### 2. Asset 11 — TEACHING EMPHASIS (`e2a954f0`)

`WM_Transformation_UI_11_Long_Division_Worksheet_App_View` is mostly page
furniture: a top nav, a left icon rail, a masthead quote, wrapped around the
same seven-step worksheet Assets 01 and 18 already render.

**Chrome is not an invention.** This OS already has a shell. Cloning the
mockup's navigation would have added a second way to reach surfaces that already
have doorways — more pixels, no more product. So the chrome was refused.

ONE block in that mockup is neither chrome nor already present: the TEACHING
EMPHASIS paragraph. It is the worksheet said out loud. A trader who can read
seven rungs of arithmetic does not need it; a trader learning to read them does,
and moving a person from the second group to the first is what this product
claims to be for. **The paragraph is the asset.**

`src/lib/marketData/viewModels/selectTeachingEmphasis.ts` — a pure function over
`DivisionWorksheetVM`. Writing prose from data is one short step from inventing a
verdict, so the rules are narrow and mechanical:

1. **Only READ rungs may speak**, and the sentence QUOTES each rung's own `value`
   string. There is literally one string, so the paragraph and the rung above it
   cannot drift apart.
2. **Unread rungs are NAMED, not dropped.** A summary that silently omits what it
   could not read is how a partial reading becomes a confident one.
3. **Two rungs minimum.** One reading is a number, and the number is already
   printed directly above — a paragraph around it adds confidence without adding
   evidence.
4. **The mockup's last sentence is REFUSED.** "Look for confirmation before
   committing capital" is not a teaching note, it is RIGHT OF WAY, and right of
   way belongs to `decisionPermissionCompiler` — an owner this room has never
   had. The block ends by NAMING the instruction it declines to issue.
5. **No adjective grades anything.** The module supplies only conjunctions.

The refusal sits between the paragraph and the right-of-way footer deliberately:
that is the only arrangement where a reader meets the summary and its limit in
the same glance, and a reader is most likely to accept an appended instruction
exactly when a full paragraph has just persuaded them.

The emphasis is computed from the SOURCE vm, never the scaffolded view, so
FOUNDATION and ADVANCED cannot summarise different markets.

It reaches the DOM through the SHARED renderer, so it lands on Asset 01 and
Asset 18 at once. A render test on the Asset 18 view fails if someone later
duplicates the block into one view only.

17 tests. Live: two blocks, both `data-has-paragraph="true"`,
`data-spoke-for="5" data-silent-on="2"`.

### 3. The defect the new surface found on its own first frame (`2ce5c58f`)

The live BTC level worksheet read, in two adjacent rungs computed from the SAME
two numbers:

```
step 1  RAW EVIDENCE   bid 0 × ask 0
step 2  PARTICIPATION  bid larger · 1,422.21×
```

Step 1 said nothing traded. Step 2 measured a thousand-fold imbalance in the
nothing. Step 2 was right; step 1 was a formatter capped at two decimal places —
written for share counts, applied to fractional crypto sizes, rendering a level
holding 0.0007 as `0`.

**Asset 11 found it.** The rungs had been sitting in separate boxes where the
contradiction was easy to scroll past. The teaching paragraph put them in one
sentence, and one sentence cannot hold both. That is the argument for the block,
made by the block, unprompted, on its first live frame — a better case for the
asset than anything written in its docblock.

**THE RULE: a quantity that is not zero must never PRINT as zero.** Rounding is a
display convenience. Turning evidence into its own absence is not a convenience;
it is a false reading, and every rung below it inherits the falsehood.

`fmt` became the exported `formatQuantity`. Below one unit the precision follows
the magnitude (four significant digits) rather than a fixed cap. The view's own
private copy of the same formatter was deleted and now reads the compiler's
owner: **a local copy of a formatter is a second opinion about the same evidence,
and two opinions is one too many.**

11 regression tests, pinned at two levels. The formatter tests would still pass
if the compiler stopped calling it, so a compiler test drives a genuinely
fractional tape through `selectFootprintWorksheet` and asserts step 1 cannot
claim both sides are empty while step 2 measures an imbalance.

---

## LIVE PROOF

Measured on `wealthymindsetspro.com/charts?symbol=BTC&tf=1h`, Worker version
`3bef0321-cbeb-4b91-b980-5bc2ff60e1a0`, via
`Tools → Chart tools → Views → Worksheet`:

```
1 RAW EVIDENCE   bid 0.001408 × ask 0.01646
                 at 80,481.40 — 0.01787 traded here out of 50 signed
                 prints across 4 levels
```

Before this deploy both sides printed `0`.

Four levels, not six: honest binning of a thin real tape rather than a grid
padded out to look full. The ceiling is not this view's to raise —
`useWebSocket.ts:1164` retains 50 prints, and a test fails loudly if the ladder
widens without the retention widening first.

---

## GATES

- `./node_modules/.bin/tsc --noEmit` — clean, unpiped.
- `./node_modules/.bin/vitest run` — **834 files, 10,720 passed, 2 skipped**,
  exit code 0 confirmed unpiped.
- `viewBuildOrder.sentinel` — 6 passed after the canon edit.

---

## WHAT THE NEXT HAND SHOULD KNOW

**Assets with no repo presence yet: 02, 09, 13, 19, 20.** Assets 19 and 20 are
Alternate compositions of the already-shipped 06 and 05 and are NOT depth-gated.
**Asset 08 is the only genuinely depth-gated asset** — it needs licensed Level 2
and cannot be faked.

**Two standing blockers, recorded honestly rather than worked around:**

- Gate 4 responsive device proof — programmatic window resize does not take
  effect; `outerWidth` stays pinned. No phone/tablet geometry can be PROVEN from
  this seat.
- `/journal` detail canvas — the account holds 0 journal entries, so the surface
  has nothing real to render. Writing one to demo the code path would be
  fabricating the Founder's own trading history into his production scope. It
  was refused, and it stays refused.

**A method worth keeping.** Both defects closed in this block were found by
READING A SURFACE, not by reading a backlog. The canon claimed Asset 04's
`ActiveQuestionBar` was unwired; a grep proved it already live at
`ContinuationHealthView.tsx:100` and `AbsorptionAnatomyView.tsx:291`. Verify the
canon before working from it — including this baton.
