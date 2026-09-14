# BATON — WM PRO SHIFT 2026-09-13-Y — /charts permanent frame becomes room chrome

**Commit sealed:** `f976a7f` — "Dechrome the /charts permanent frame into room chrome"
**Parent:** `0f80905` (== `origin/main` at shift start)
**Pushed:** `0f80905..f976a7f  main -> main`

---

## 1. What the Founder audit named, and what was actually wrong

The directive renamed the enemy: the parent cutover has LANDED, and the
remaining defect is `SCENE_FRAGMENTATION` — "one coherent human job still
divided across separate screens, cards, permanent chrome, toolbars, drawers or
mental models." The frame-by-frame note was "large black margins and legacy
chrome persist / MARKET is not yet the full room."

That maps to one measurable code fact.

`WMExperienceShell` is the outer parent for every Founder route and it is what
publishes the sanctuary: vignette, grain, WATER-BREATH. Any child that paints
its own opaque background does not merely fail to participate — it **actively
occludes the atmosphere it is supposed to be living inside**. On /charts the
occlusion ran the whole way around MARKET:

| Side | Element | Was |
|---|---|---|
| above | 36px tool band (`ChartToolbar`) | `#0D0E14` + `#1E2030` |
| above | study row (`ChartsDashboard`, disclosed) | `#0D0E14` + `#1E2030` |
| left | 40px drawing rail (`LeftDrawingSidebar`) | `#0D0E14` + `#1E2030` |
| right | 14px collapse strip (`ChartsDashboard`) | `#0D0E14` + `#1E2030` |
| right | info panel (`StockInfoPanel`) | `#0D0E14` + `#1E2030` |
| below | order-flow strip (`OrderFlowCockpitStrip`) | `#0D0E14` + `#1E2030` |
| below | timeframe rail (`TimeframeSelector`) | `#0D0E14` + `#1E2030` |

So the sanctuary stopped dead at the edge of the candles, and MARKET re-read as
an app pane bolted into a frame — the five-second blur-test failure the audit
describes. ~10 earlier commits killed this defect class elsewhere; these were
the survivors, and they were the ones wrapped around the primary surface.

## 2. The repair

**One owner, not six rgba values.** `.wm-room-chrome` shares the existing
`.wm-sticky-glass` declaration — same block, two selectors — so the `@supports`
fallback and BOTH theme restatements extend together. A future theme cannot
drift one and forget the other.

`.wm-room-chrome` is placed FIRST in the selector list because
`founderRoomShell.test.ts` matches `/\.wm-sticky-glass\s*\{/`; appending rather
than prepending would have broken that sibling gate.

### Two traps this had to clear

**Trap 1 — inline-hex theme coupling.** `globals.css` implements neon and light
as attribute selectors keyed on the inline hex STRING itself:

```css
.wm-neon [style*="#0D0E14"] { background-color: #04111f !important; }
.wm-neon [style*="#1E2030"] { border-color: rgba(47,243,255,0.40) !important; }
```

Deleting an inline hex therefore **silently breaks two alternate visual
constitutions**. Every dechromed element was given an explicit replacement hook
that the theme rules target directly.

**Trap 2 — Tailwind-vs-class specificity coin flip.** These frame elements also
carry Tailwind border utilities (`border-wm-border`), which have the same
specificity (0-1-0) as a project class. The winner therefore depends on
stylesheet emission order, which moves when Tailwind's layer output moves. The
default hairline is declared **inline** (unambiguous), which is exactly why the
two theme restatements had to become `!important` — they now override an inline
declaration, the same way the pre-existing `[style*="#1E2030"]` rule had to.

### What deliberately did NOT change

Translucency is **not** universally correct. The phone drawing sheet and the
floating popovers (drawing-tool palettes, watchlist menus, dropdowns) sit ON TOP
of live candles and **keep their opaque fills**. Glass there would be an
accessibility regression dressed up as atmosphere. `.wm-room-chrome` is bounded
to permanent frame chrome, and `chartsRoomChrome.test.ts` asserts the sheet
staying opaque as a REQUIREMENT, not as a tolerated oversight.

## 3. Gate: `src/lib/experience/chartsRoomChrome.test.ts` — FAILURE-PROVEN

`tsc --noEmit` is **structurally blind** to every line of this. A CSS string's
content is type-correct at any value, and `background: "#0D0E14"` is a perfectly
well-typed `React.CSSProperties`. Mount-based tests are blind too: the defect is
a COLOR and it renders happily. Only a source-level assertion can hold it.

**REVIVE LAW satisfied.** The Sentinel was intentionally broken and failed by
name before being trusted:

```
× leaves no opaque slab on the four single-purpose frame files
AssertionError: TimeframeSelector.tsx repainted an opaque slab over the sanctuary
  expected … not to match /background(-color)?:\s*"#0D0E14"/
Tests  1 failed | 11 passed (12)
```

Restored via the Edit tool (byte-identical). `tsc` stayed green throughout.
Break/restore used Edit deliberately — `cp` and `git checkout` of working files
were previously denied by the auto-mode classifier and were NOT retried.

Negative assertions run on **comment-stripped source**, because the prose
documenting this fix names `#0D0E14` and would otherwise turn its own gate red —
a trap hit three times in earlier shifts.

## 4. A second brittle gate, unfrozen honestly

The full run surfaced a pre-existing failure in `responsiveShell.test.ts`:

```
expect(sidebar, "the sheet must not wear the class globals.css hides")
  .toContain('isSheet ? "wm-draw-sheet" : "wm-draw-rail"');
```

It pinned the whole ternary as ONE literal **including its closing quote**, so
no class could ever be added to the rail branch in any order. That is stricter
than its own stated intent. It now asserts the actual invariant — the sheet must
not wear `wm-draw-rail` (the class the breakpoint hides), and the rail must keep
it — by parsing the branches and checking class MEMBERSHIP.

The same brittleness had already bitten once this shift:
`chartPhoneControlReachability.test.ts` asserts the quote-prefixed substring
`className="wm-chart-toolbar-pinned`, so prepending a class silently broke it.
Fixed by ordering (class order carries no CSS meaning), and the ordering is now
itself pinned so the repair cannot silently regress.

My own new Sentinel initially reproduced this exact trap with a frozen ternary
literal; it was rewritten to be order-tolerant before commit rather than
shipping a trap I had just named.

## 5. Gate receipts — both run UNPIPED

A pipe masks the exit code, so both were redirected to a file with `echo $?`.

```
./node_modules/.bin/vitest run   → VITEST_EXIT=0
                                   Test Files  575 passed (575)
                                        Tests  6560 passed (6560)
./node_modules/.bin/tsc --noEmit → TSC_EXIT=0
```

**One honest correction inside this shift:** an earlier focused run reported
"4 passed" against a 5-path filter. `founderRoomShell.test.ts` lives in
`src/lib/`, not `src/lib/experience/`, and vitest **silently ignored the
non-matching path rather than erroring**. That green was accepted as suspicious
and re-run with the correct path (5 files / 32 tests) before proceeding. A
filter typo is a false-green channel worth remembering.

## 6. STATUS — live verification is NOT closed

**`HUMAN_PROOF_REQUIRED = YELLOW`. Not GREEN.**

`f976a7f` is pushed, but at the time of sealing it **has not deployed**.
Measured directly in the Founder's authenticated Chrome on
`https://wealthymindsetspro.com/charts`:

```
{"roomChromeInCss": false, "roomChromeEls": 0}
```

checked twice, with a hard reload between. Cloudflare's git-connected deploy
lags several minutes.

The screenshot taken this shift is therefore the **BEFORE** state and is
recorded as such. Per the NO-ESCAPE VISUAL VERIFICATION BREAKER, green tests,
a clean typecheck, a successful push and DOM inspection **cannot** substitute
for visual proof when the human scene is part of acceptance — and the final
acceptance law here is explicitly a blur-test:

> "IF THE NORMAL FOUNDER URL STILL BLUR/SQUINTS INTO THE OLD CARD DASHBOARD,
> TICKET T FAILS — EVEN IF THE BUILD IS GREEN, THE TESTS PASS, THE PROVIDERS
> IMPROVED, AND 40 COMMITS LANDED."

**NEXT (unfinished):** re-load /charts once the deploy lands, confirm
`roomChromeInCss: true`, and take the AFTER screenshot for the blur comparison.
Until that screenshot exists, this atom is SHIPPED but NOT PROVEN.

## 7. NEXT ATOM — surfaced, deliberately not rushed

Observed live on /charts in the same viewport, at the same moment:

- chart header: **`7,622.25 — (change unavailable)`** + **`HISTORICAL BARS VERIFIED`**
- adjacent MARKET tile: **`ES1! · 1h · PRICE UNKNOWN` / `UNAVAILABLE · asOf 04:38:36Z`**

One screen shows a verified number; the rail beside it says the price is
unknown. Both statements are individually defensible — the rail is truthful that
no LIVE price exists with the cash session closed — but together they force the
trader to reconcile two owners in their head, which is `SCENE_FRAGMENTATION` in
the truth dimension. Understating knowledge is a truth defect in the same family
as overclaiming it.

Root cause traced: `ChartsDashboard.tsx:907` passes
`last: chartCanvasState?.price.last ?? null`, and `produceCanonicalMarketState`
only carries a QUOTE-derived `price.last`. It has **no field at all** for a
verified last-bar close, which is what the chart header is rendering from a
different owner.

**Deliberately NOT rushed.** The honest repair is to publish the bar-derived
close into canonical state as a distinct, provenance-labeled field — which means
editing the canonical producer that **7 Sentinels guard for single-writer
canon**. Per §13, surfaced rather than rush-wired. It is the highest-value
unblocked atom for the next block.

## 8. Constraints honored

- No provider / Supabase / brokerage / DB / auth / permission / secret mutation.
  No orders, no deletion, no reset, no unrelated cleanup.
- No secret values sought, printed, or set. The six secrets named in the
  Cloudflare wrangler log remain **names only**.
- Untracked `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md` and
  `scratchpad/` preserved, as instructed.
- Surgical edits, scoped `git add` by path, no force-push.
- The Founder's running dev server was not touched.
- No elapsed time claimed anywhere in this baton.
