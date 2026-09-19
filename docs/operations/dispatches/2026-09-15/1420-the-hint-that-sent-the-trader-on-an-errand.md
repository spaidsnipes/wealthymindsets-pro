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

# The hint that sent the trader on an errand

**Commit:** `a7bd635` · **Files:** `src/lib/deltaVPGeometry.ts`, `src/components/chart/MainChart.tsx`
**Gates:** `vitest run` 585 files / 6772 tests PASS (+11) · `tsc --noEmit` EXIT=0

---

## Found by USE, not by reading

The §13 gate "Live VP render geometry proof" says a canvas has no DOM, so no
`renderToStaticMarkup` test and no `measure-experience-geometry.mjs` run can
witness it. That is true. It is not a reason to stop looking.

So instead of asserting about the canvas, the Delta+VP drawing tool was
*driven*: a `delta-vp` drawing was injected into the Founder's own chart via the
`wm_draw:v1:…:TSLA` persistence key — the same load-and-draw path the tool uses —
the page was reloaded, and the result was photographed.

**The box rendered.** That alone advances the gate: the draw arm reaches the
canvas and paints. But it painted this:

> Delta+VP — draw a wider box over bars

on a box measuring roughly **548 × 142 CSS px**.

`DVP_MIN_BOX_W` is **56**. `DVP_MIN_BOX_H` is **26**. The box was an order of
magnitude past both. **It was not too narrow.**

## Root cause

`dvpBoxAdmitsProfile` refuses for **three unrelated reasons**:

```ts
return rowCount > 0 && boxWidth > DVP_MIN_BOX_W && boxHeight > DVP_MIN_BOX_H;
```

…and the draw loop answered all three with **one hard-coded sentence**, naming
only the narrowness:

```ts
} else {
  chip("Delta+VP — draw a wider box over bars", rx + 2, ry - 3, col);
}
```

The actual cause on that chart was `dvp.rows.length === 0` — `getBarFootprint`
yields no per-level trade data for those bars. **No box size will ever produce a
profile without per-level data.** The trader is told to take an action that
cannot help, and drags a bigger and bigger box forever.

That is worse than silence. Silence is an unexplained absence; this is a wrong
explanation wearing the confidence of a real one.

## The cure is a function, not a string

The decision now lives in the geometry owner, where a test can reach it:

```ts
export type DVPRefusal = "none" | "no-levels" | "too-narrow" | "too-short";

export function dvpProfileRefusal(boxWidth, boxHeight, rowCount): DVPRefusal {
  if (rowCount <= 0) return "no-levels";
  if (boxWidth <= DVP_MIN_BOX_W) return "too-narrow";
  if (boxHeight <= DVP_MIN_BOX_H) return "too-short";
  return "none";
}
```

| Refusal | Sentence | Asks for a resize? |
|---|---|---|
| `no-levels` | Delta+VP — no per-level trade data for these bars | **No** |
| `too-narrow` | Delta+VP — box too narrow for two columns | Yes |
| `too-short` | Delta+VP — box too short to bin a profile | Yes |

**Only the two causes a resize can fix ask for a resize.** A test asserts the
`no-levels` sentence contains none of `wider|narrow|short|bigger|larger|resize|box`,
because that is the whole point of the atom and it must not quietly regress into
a hint again.

### Why `no-levels` outranks the size reasons

It is checked **first, even when the box is also too small.** A size complaint
implies "resize and you will get your profile" — a promise this build cannot keep
when there is nothing to bin. Naming the unfixable cause first is the difference
between a hint and a wild goose chase.

Absence is not a small number and it is not a narrow box (canon **H1**).

### One predicate, not two

`dvpBoxAdmitsProfile` is now **derived**:

```ts
return dvpProfileRefusal(boxWidth, boxHeight, rowCount) === "none";
```

If the predicate and the explanation were computed separately they could drift
into contradiction — the loop refusing to draw while the message says nothing is
wrong. A property test walks the width × height × rowCount grid asserting the two
agree on every cell.

## REVIVE ledger (§22, Edit-only)

| Revive | Method | Result |
|---|---|---|
| The one-size-fits-all hint returns | Restored `chip("Delta+VP — draw a wider box over bars", …)` in `MainChart.tsx` | **FAILED BY NAME** — `does not hard-code a refusal sentence back into the draw loop`, quoting the literal back; and `actually USES every imported geometry value inside the delta-vp block` |

Restored byte-identical; `git status` clean of that file before commit.

Note that **two** Sentinels caught it, from different angles — the new literal
guard and the pre-existing adoption guard that noticed `dvpRefusalMessage` had
become an unused import. The halfway house (import present, call gone) is covered.

## What this atom does and does not claim

- **CLAIMED:** the Delta+VP box renders on a live production chart. Observed.
- **CLAIMED:** the refusal message was wrong for the observed case, and the
  arithmetic that now decides it is gated by 11 new tests.
- **NOT CLAIMED:** that the *corrected* sentence has been seen live. The deploy
  was pushed at `a7bd635` and live confirmation is a separate step. Deploy
  identity is not observation.
- **NOT CLAIMED:** that the profile's bar geometry is pixel-correct. That half of
  the gate stays OPEN and `deltaVPGeometry.ts` still says so.

The Founder's `wm_draw:v1:…:TSLA` key was backed up before the probe and restored
to its exact prior value (`"[]"`), verified by readback.

## Gate status after this atom

| §13 gate | Status |
|---|---|
| Delta Bubbles level ownership | CLOSED (measured 2026-09-15) |
| Paper execution state-machine realism | SUBSTANTIALLY ADVANCED |
| Decision Memory sealing | SURFACED, intentionally unwired — do not rush-wire |
| executionConnectivity orphaned | NOT A LIVE DEFECT — `/readiness` discloses honestly |
| **Live VP render geometry proof** | **ADVANCED — box confirmed rendering live; a real refusal-message defect found by USE and fixed. Bar-pixel correctness still OPEN** |
| Gate 4 responsive device proof | BLOCKED |
| `/journal` detail canvas | BLOCKED — 0 journal entries |
| Vacuous-scanner class | RATCHETED — frozen at 26, can only shrink |
