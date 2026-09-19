<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# 2364 — The Steward reads your rules, not the tape

**Commit:** `121b27a` · **Room:** `/command-deck`, Steward · Rules Verdict + the Deep read drawer
**Law:** H1 — *absence is not zero* · shape 2, **structural** · third occurrence
**Live status:** pending observation at time of writing — see the last section

---

## How it was found

Not by grep. By the audit rule written into `2363` one commit earlier:

> The audit is not "remove the coupling"; it is *does this panel's content
> depend on the market, or only on the person?* — asked once per panel, with
> the answer read out of the selector rather than guessed from the name.

Five `chainVm &&` gates remained on the page. Asked individually, they split
three/two:

| Line | Panel | Verdict |
|---|---|---|
| 1667 | `DLARStrip` | `dlar={chainVm.dlar}` — **direct dereference. Gate correct.** |
| 1679 | `DecisionChainPanel` | `vm={chainVm}` — **direct dereference. Gate correct.** |
| 1707 | `StructureContextNote` | `vm={chainVm}` — **direct dereference. Gate correct.** |
| 1846 | `ATHOSInterventionPanel` | interventions are compiled *with* `chainVm`. **Correct, and a Sentinel requires it to stay.** |
| 1713 | Steward · Rules Verdict | **SPURIOUS** |
| 1617 | the whole "Deep read" drawer | **SPURIOUS** |

Three of the five were right. Stripping them wholesale would have been the
opposite error, and would have crashed the page. Asking panel by panel is what
separated them.

---

## Defect A — the Steward verdict (1713)

```tsx
{chainVm && (
  <div>
    <SectionBanner number={4} label="Steward · Rules Verdict" tagline="informs, never gates" />
    …{permission.verdict}…{permission.headline}…{permission.reason}…
```

The block dereferences `permission` and `phase` and **nothing else.** A grep
for `chainVm` inside it returns zero. So the gate was never protecting a
dereference — it could not have been. It was deleting a verdict.

**And `permission` cannot be undefined.** `composeMarketCanvasVM` compiles it
through an explicit null-chain path:

```ts
const chain: DecisionChainVM | null = input.chain !== undefined
  ? input.chain
  : input.state ? selectDecisionChain({...}) : null;

const permission: PermissionVM = selectPermission({
  …,
  marketState: input.state ?? undefined,
  clc: chain?.clc ?? null,
  availableR: chain?.availableR ?? undefined,
});
```

No branch. `permission` is always there.

### The inversion, and it is the sharpest one in the block

Read `selectPermission` with no market:

- `DATA_QUALITY_FLOOR` is a **HARD** rule in `defaultFounderRules()`.
- `const quality = input.marketState?.qualityState ?? "UNAVAILABLE"`.
- `["STALE","UNAVAILABLE"].includes(quality)` → **engaged**.
- One hard rule engaged → `verdict = "RESTRICTED"`, headline names the rule
  by its own label — *Trustworthy market data required* — and the per-rule
  row reads *"Market data quality is UNAVAILABLE — below your declared floor."*

So on exactly the session where the deck reads `MARKET STATE UNKNOWN`, the
Steward has the single most decision-relevant sentence WM can say to this
trader: **you are restricted, because the tape cannot be trusted.**

The deck deleted that sentence *for precisely the reason that made it worth
saying.* Same inversion as the Opening Bell (`42b4106`) and the Mirror
(`9bc3844`): the panel vanished when it was most useful.

### The selector had already got absence right

Every other evaluator degrades honestly with no market, without being asked:

| Rule | With no market |
|---|---|
| `MIN_RR` | `engaged: false` — *"Cannot evaluate — conservative R unresolved (no evidence)."* |
| `CLC_MUST_BE_SATISFIED` | `engaged: false` — *"No CLC evaluation available."* |
| `DATA_QUALITY_FLOOR` | engages, and **names the state**: `UNAVAILABLE`, not a defaulted "acceptable" |

Not one of them fabricates. The selector was correct end to end. **The render
layer erased it wholesale.** That is the neighbour rule inverted — usually the
correct neighbour is one cell over; here it was one layer down, in the owner.

---

## Defect B — the container (1617)

```tsx
{chainVm && (
<details open={deckEmphasis.deepSectionsOpen}>
  <summary>Deep read · story · auction lens · decision chain · steward · fidelity</summary>
```

**A container gated on one child's input erases every sibling with it.**

Inside that drawer:

| Child | Needs `chainVm`? |
|---|---|
| Story Ribbon | no — takes `state`, and renders *"Market state cannot be resolved yet."* on its own |
| `SceneAdmits` withheld-note | no |
| DLAR strip (2) | **yes — gated at 1667** |
| Decision Chain (3) | **yes — gated at 1679** |
| `StructureContextNote` | **yes — gated at 1707** |
| Steward (4) | no |
| Data Fidelity (5) | no — gated on `state &&` |
| ATHOS | **yes — gated at 1846** |

Every child that needs the market already declares it. The container was
declaring it on their behalf, for everyone.

### The comment that guarded one level too low

Inside the drawer, above sections 2–3, is this — written when the numbered
sections shipped:

> The note is required rather than optional here: these are NUMBERED sections
> inside a collapsed drawer. A trader who opens "Deep read" and finds 1 then 4
> has no way to tell a refusal from a bug.

That reasoning is exactly right. And with the container gated, the trader
found **no drawer at all** — a refusal with no note attached, which is the
precise failure the note was written to prevent, one level up from where the
note could reach.

Third instance in this block:

> **A comment guards the cell it sits on and nothing else.**

First the WIN% column on `/paper`. Then the Opening Bell comment on this page,
which did not protect the sibling panel four lines below it. Now a note that
did not protect the container it was sitting inside.

---

## The cure

Two conjuncts removed. Nothing else. **No selector was modified** — true of
every defect in this block, nine for nine.

What the drawer now renders when the market is unresolved:

- Story Ribbon → *"Market state cannot be resolved yet."*
- Sections 2–3 → withheld, **with the note saying so**
- Section 4 Steward → `RESTRICTED`, *Trustworthy market data required*,
  *Market data quality is UNAVAILABLE — below your declared floor*
- Section 5 Data Fidelity → absent (`state &&`)
- ATHOS → absent (`chainVm &&`)

Every element either honest or disclosed. That is the shape this block has
been arguing for from the first commit.

---

## Sentinels

`src/lib/design/theStewardIsNotAMarketPanel.enforcement.test.ts` — **+8**

| # | Guards |
|---|---|
| 1 | **THE DEFECT** — the Steward verdict is not gated behind market-state resolution |
| 2 | **THE DEFECT** — the Deep read drawer is not gated behind market-state resolution |
| 3 | the Steward block reads `permission` and `phase` and contains no `chainVm` |
| 4 | the null-chain claim is **checked in the compiler**, not asserted here |
| 5 | the selector degrades honestly rather than fabricating a verdict |
| 6 | **OVER-CORRECTION** — the four genuine `chainVm` gates stay |
| 7 | **OVER-CORRECTION** — the market-dependent sections inside the drawer stay withheld |
| 8 | **OVER-CORRECTION** — a refusal inside the drawer still carries its note |

Three of eight guard the over-corrections. That is now the assumed shape of a
Sentinel set, not an extra.

Sentinel #4 is the important one. The whole fix rests on `permission` surviving
a null chain, so that claim is verified against `composeMarketCanvasVM` rather
than restated in prose. If the compiler ever moves `permission` inside an
`if (chain)`, the ungating stops being obviously correct and must be re-argued.

---

## Gates

```
Test Files  597 passed (597)
Tests       6972 passed (6972)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven BY NAME — and in the strongest available form.**

Both gates were reinstated via the Edit tool *complete with their closing
parens*, so the revived file was a **fully compilable defect**, not a syntax
error masquerading as one. `tsc --noEmit` returned **TSC_EXIT=0** on the
revived state: the type checker had nothing to say. Only the Sentinels caught
it, and they failed by name:

```
× THE DEFECT: the Steward rules verdict is not gated behind market-state resolution
× THE DEFECT: the Deep read drawer is not gated behind market-state resolution
```

Then all four edits were reversed and the file restored byte-identical.

A revive that does not compile proves the Sentinel matches a string. A revive
that compiles cleanly proves the Sentinel is the **only** thing standing
between this codebase and the defect returning. Worth the extra two edits.

---

## Live status

Deploy arrived: chunkset `a6741e17…` → `3a940611…` on poll 7. Observed live on
`/command-deck` in the Founder's browser, with a screenshot taken.

| Check | Observed |
|---|---|
| Market banner | `MARKET STATE UNKNOWN` · `(0/8 dimensions resolved)` |
| Deep read drawer present | **yes** |
| Section 4 banner | **`4 STEWARD · RULES VERDICT`** · *informs, never gates* |
| Steward verdict | **`STEWARD RULES · RESTRICTED`** |
| Steward headline | **"Your rule says Trustworthy market data required."** |
| Per-rule row | **`HARD` Trustworthy market data required — *Market data quality is UNAVAILABLE — below your declared floor.*** |
| Engaged count | `2/8 engaged · phase: preparation` |
| Second rule | `SOFT` CLC setup evidence required — *CLC verdict is UNKNOWN — not a satisfied LONG/SHORT setup* |
| Story Ribbon | *"Market state cannot be resolved yet."* |
| Page error | none |

Every sentence this commit was written to restore is on the Founder's screen,
in the words the selector produces. The Steward renders `RESTRICTED` for the
stated reason, and the reason is the tape.

### What this observation does NOT prove — stated plainly

**It does not discriminate the fix.** `chainVm` is non-null in this session:
the Decision Chain rows (`AVAILABLE R · NOT_EVALUATED`, `PERMISSION ·
NOT_EVALUATED`, `CLC · UNKNOWN`) are rendering, and those are gated at 1679 on
`chainVm`. So the two gates removed here were not suppressing anything *on this
particular load*, and the same screen would have appeared before the fix.

The error was mine, in the paragraph this section replaces: I wrote that
"the condition under test (`MARKET STATE UNKNOWN`, 0/8 dimensions) is the deck's
current resting state." **That conflated two different things.**

- `MARKET STATE UNKNOWN · 0/8 dimensions resolved` — a **non-null** `state`
  object none of whose dimensions resolved.
- `state === null` ⟺ `chainVm === null` — the condition the removed gates
  actually keyed on.

The banner reads UNKNOWN in *both*. Only the second erases the drawer. The
live deck is in the first.

So the honest split is:

| Claim | Status |
|---|---|
| The Steward's restricted verdict renders, and names the tape | **PROVEN — observed, screenshot** |
| The drawer and section 4 survive `chainVm === null` | **Sentinel-proven, not live-observed** |

The second claim rests on the eight Sentinels and on the REVIVE above — where
the defect was reinstated in fully compilable form, `TSC_EXIT=0`, and only the
Sentinels caught it, by name. That is a strong proof. It is not a screenshot,
and this file will not call it one.

Reaching the live condition requires a load where `state` is null outright.
Not manufactured here: the Founder's browser is not a fixture, and fabricating
the condition to photograph it would be the same sin this whole block is about.

---

## The pattern to carry

**Gate the dereference, never the container.** Every child that needs an input
should say so itself. A parent that declares a dependency on its children's
behalf will erase the siblings that never had it — and it will do so silently,
because a missing container leaves nothing behind to explain itself.

And the audit that produced this: **five gates, asked one at a time, split
three correct / two spurious.** Any sweep that treated them as a class would
have been wrong either way round.
