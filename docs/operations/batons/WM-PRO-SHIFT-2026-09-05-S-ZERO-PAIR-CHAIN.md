# SHIFT S — the zero-pair chain, and the Sentinel that was green while it shipped

**Date:** 2026-09-05 (Saturday, US session CLOSED — the condition that exposed all of this)
**Commits:** `ee1de2a` · `f32c5ff` · `d8d9e4a` · `fcc69f6`
**Gates:** vitest 407 files / 4093 tests, `tsc --noEmit` 0 lines. Both unpiped every time.
**Live proof:** wealthymindsetspro.com/charts, tab 773532044, after each deploy.

No elapsed time is claimed anywhere in this document. Four commits, seven revive
attempts, three live observations. That is the whole receipt.

---

## The one sentence

`useWebSocket.flush()` leaves `change` and `changePct` at their **initial 0**
until `prevCloseRef` holds a real prior close — so in this ticker shape **the
absence sentinel is a literal zero**, and every guard written as
`Number.isFinite(...)` or `!== undefined` is blind to it, because 0 is finite and
0 is defined.

`selectTickerChangeDisplay` has owned that question all along. Its header already
said so: *"Five sites each re-implemented that check and four got it wrong."*
This shift found sites six and seven, and one of them was mine.

---

## What was observed live, in order

| # | Surface | What it said | Verdict |
|---|---|---|---|
| 1 | /charts REGIME chip | `REGIME SIDE -0.34% today` on a proven-closed Saturday | two untruths: a fabricated market state, and a date word |
| 2 | /charts, after `375075c` shipped | `REGIME SIDE +0.00% last session` — one row above `4,476.60 — (change unavailable)` | date word fixed; **fabrication survived**. Two owners on one screen disagreeing about whether a change existed |
| 3 | /charts, after `f32c5ff` + `d8d9e4a` shipped | chip **absent**; `data-ctx` = `{"symbol":"GC1!","price":0}`; `SESSION CLOSED` and `change unavailable` still rendered | both PROVEN |

Observation 2 is the important one. **The first fix passed its own test and was
still wrong.** I had written `Number.isFinite` by hand in the new owner, in a
file whose whole purpose was to stop hand-rolling that check.

---

## The four commits

### `ee1de2a` — a Sentinel of mine that could not fail

`morningPrepTruth.test.ts` banned the word "proven" inside the Fabio placeholder
banner by slicing between two string literals:

```ts
fabio.slice(fabio.indexOf("Framework placeholder"), fabio.indexOf("Educational…"))
```

On a revive that first string is gone, `indexOf` returns `-1`, and
`slice(-1, n)` degenerates to a window containing no "proven". **The assertion
passed against the exact source it exists to reject.** A Sentinel keyed to the
presence of the fix cannot detect the fix's absence.

Fixed by anchoring on structure (`function PlaceholderBanner` →
`export interface FabioInsightsProps`) with block comments stripped, and
asserting both boundaries were actually found.

### `f32c5ff` — the REGIME chip stops re-deriving the evidence test

`selectRegimeBadge` now delegates to `selectTickerChangeDisplay` and **requires**
`change` alongside `changePct`, because the zero-pair is invisible to a caller
that forwards only the percentage. Making that argument optional would let a call
site silently reopen the bug by omitting it.

Deliberate consequence, recorded in the file: an exactly-zero change is withheld
**even if genuinely flat**, because the current ticker shape cannot tell the two
apart. Omitting a regime until price moves is honest. Naming a market state on
unknown data is not.

### `d8d9e4a` — the fabrication had already escaped the screen

Sweeping the defect class found the chain fully wired and entirely real:

```
ChartsDashboard  data-ctx={JSON.stringify({ … changePct: ticker.changePct })}   ← raw
SpaidBotButton   document.getElementById("wm-chart-context") → JSON.parse → POST
/api/spaidbot    if (context.changePct !== undefined)
                 → "[Current chart: GC1! @ $4,476.60 (+0.00%)]"
```

On a closed Saturday the assistant was told the market was flat, **as fact, in
its own prompt** — while `SYSTEM_PROMPT` in that same file instructs it *"Never
invent current prices"* and *"When live evidence is missing, say exactly what is
missing."* The model cannot disclose a gap it was never shown.

**This is worse than the chip, not better.** A chip sits beside a fidelity badge
and a `SESSION CLOSED` label a trader can weigh. Assistant prose carries
conversational authority and arrives with no badge at all.

`formatChartContextNote` is a new pure owner. It **discloses** the gap —
`", day change unavailable — do not state or imply a daily move"` — rather than
silently omitting it, because silence leaves the model free to read the chart as
unremarkable. The route re-derives server-side because any authenticated client
can POST a hand-crafted body; the publisher stops emitting the number anyway.

### `fcc69f6` — the coverage Sentinel was green while the bug was on screen

`tickerChangeGuardCoverage.test.ts` claimed *"every day-change surface routes
through the shared guard."* That claim was **false while green**. Two independent
reasons it could not have seen the REGIME chip:

1. **Detection.** Its filter keys on the printed expression still being *spelled*
   `ticker.changePct`. The chip printed `{p.toFixed(2)}%` after
   `const p = Number.isFinite(ticker.changePct) ? ticker.changePct : 0`. One
   local alias hides the surface — and that aliasing line **is** the fabrication.
2. **Scope.** Its guard check is `src.includes(...)`, file-scoped. One guard
   anywhere vouches for the whole file. ChartsDashboard's header guard on line
   ~1010 was vouching for a chip 600 lines below it.

Added alias-taint analysis: a binding that reads `ticker.change`/`changePct` is
tainted unless it calls a guard owner, spells the zero-pair test, or is **gated**
by an already-safe binding — gating meaning the safe name is used as a condition
(`safe ? …`, `safe && …`), so `safe ? 0 : raw` cannot launder itself. The
guard-owner allowlist re-proves each entry against its own source, so an owner
that stops delegating cannot become a rubber stamp.

The test that overclaimed was renamed to what it actually proves. The lexical
limit of the new analysis is stated in the file rather than papered over.

---

## Orkin ledger (§22) — seven revives, seven fired

| # | Revive | Exit | Fired |
|---|---|---|---|
| A | Fabio banner restored to live pre-fix wording | 1 | **both** new assertions, by name (previously 1 of 2) |
| B | Regime call site forwards `changePct` only | 1 | 1, by name |
| C | Regime owner back to hand-rolled `Number.isFinite` | 1 | **4**, by name |
| D | Route back to the inline `!== undefined` builder | 1 | 3, by name |
| E | `data-ctx` back to raw `ticker.change`/`changePct` | 1 | 3, by name |
| F | `data-ctx` emits the selector's **zeroed** output unconditionally | 1 | exactly the 1 assertion written for it |
| G | The real `const p = … : 0` alias reinstated in ChartsDashboard | 1 | names `ChartsDashboard.tsx: p` |

All seven restored byte-identical, verified by `shasum`.

**Two of these are the receipt that matters.** In revive D the assertion
`toContain("formatChartContextNote")` **survived** — the import was still there
while the arithmetic beside it was the old defect. In revive G the pre-existing
file-scoped test **also passed**. Both are recorded in the source: a whole-file
symbol check is not a Sentinel, and the bans are what hold.

Revive F is the subtlest and the reason it exists: emitting the guard's zeroed
output satisfies every ban about *routing through the owner* while reopening the
defect. The keys must be **absent**, not zeroed.

---

## Standing lesson, for whoever picks this up

Four separate mistakes this shift shared one shape:

> **A check written against the shape the data has when it is present, rather
> than the shape it has when it is missing.**

`Number.isFinite` · `!== undefined` · `slice(indexOf(fixString), …)` ·
`src.includes(guardString)` — every one of them tests for the presence of
something and is blind to its absence. Two were in production code and two were
in the Sentinels meant to catch production code.

Before writing a guard, ask what the value literally *is* when there is no value.
Here it is `0`, and it is `0` because a deliberate upstream decision refused to
publish a seed-derived fake. The sentinel was correct; every consumer that
assumed absence looks like `undefined` was not.

---

## Not claimed

- No elapsed time, no shift-hour count.
- `journalEntryToEdgeEntry.ts:51` and `journalEntryToSnapshot.ts:63` zero-fill
  unknown pnl/R. `pnl` is a required `number`, so this is legacy-data hardening,
  **not a proven live defect.** Recorded, not reported as one.
- The alias-taint analysis is lexical. It closes the hole that shipped. It is not
  a proof of absence, and the file says so.

## Still blocked (Founder-only)

- **Supabase privileged key on the Cloudflare Worker** (`wealthymindsets-pro`,
  env `production`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`). Until
  it is set, every authenticated route answers 503. Likely added to the Pages
  project instead of the Worker, or to Preview instead of Production.
- **Rotate the `sb_secret_` key** that was pasted in plaintext chat. It has not
  been written to any file here and will not be.
- Env-name drift: `FINNHUB_KEY_` → `FINNHUB_KEY`; `ATH_LIVEKIT_KEY_` /
  `ATH_LIVEKIT_KEY_SECRET_` → `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`.
- `wrangler` observability needs `./node_modules/.bin/wrangler login` by the
  Founder. No `CLOUDFLARE_API_TOKEN` will be set from this seat.
