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

# B-701 — the band owner, and the rule that measured itself out of existence

## What was found

The Drive Visual Canon holds a **B-series of browser blueprints** in folder
`1fznC3Jc-Fy0vpPVi0KuVkN1nLVVl7uny` that had never been opened. **B-701 Resize
Breakpoints & Two Zooms** (`1s1LLJBaPD2KNtk0d3gH-QyX8E4niG2YR`) is the first
sheet in it that states a mechanically actionable browser law:

| Band | Width | The sheet's words |
|---|---|---|
| LARGE | >= 1200px | "Full floor plan + both enlarged zooms." |
| MEDIUM | 768 - 1199px | "One enlarged zoom displayed. Toggle or scroll to view alternate zoom." |
| SMALL | < 768px | "Base plan only. Zooms collapsed." |

On `/charts`: the base plan is the **camera**, and the zooms are the auxiliary
rails.

The codebase had **no owner for this law**. It had a two-state model pinned at
`NARROW_VIEWPORT_MAX_PX = 1023` (`src/lib/responsive/narrowViewport.ts`) and a
`globals.css` rule at line 167 hiding **seven surfaces on that one pixel**.

## What shipped

`src/lib/responsive/resizeBreakpoints.ts` — `B701_MEDIUM_MIN_PX = 768`,
`B701_LARGE_MIN_PX = 1200`, a pure total `bandForWidth`, `zoomsForBand`, and an
SSR-safe `useCanvasBand()` following the pattern `narrowViewport.ts` established.
Boundary tests at 767/768/1199/1200 plus a monotonicity sweep across 320-1920.

**1023 was deliberately NOT moved to 1200.** They answer different questions —
1023 is "is this too narrow for the desktop RAILS", 1200 is "how many ZOOMS may
be enlarged" — and merging them would strip the primary sidebar and DOM ladder
off an 1100px laptop with ample room for both.

Wired into `ChartsDashboard.tsx` as a live receipt so the band is measurable on
the running app rather than inferred from whatever happens to be visible.

## The correction — read this part

The first commit (`16f81b91`) also shipped a MEDIUM collapse rule:

```css
@media (min-width: 1024px) and (max-width: 1199px) {
  .wm-chart-watchlist { display: none !important; }
}
```

**Measuring the live room proved it collapses nothing.** MEASURED on the serving
build at `innerWidth` 1920:

```
[data-wm-market-room]   1884px, exactly TWO children:
  [data-wm-market-column]            1596px   <- the CAMERA
  section.wm-decision-spine--rail     288px   <- ONE zoom
```

`.wm-chart-watchlist` was **not mounted**. The watchlist relocated to the shared
drawer at every width (`responsiveShell.test.ts` already states this), so the
class `/charts` renders is `.wm-chart-watchlist-sheet`. The rule was **inert** —
it read like B-701 compliance and did nothing. It was removed in the next commit
and replaced by a test asserting it **stays absent** until a real second zoom is
mounted, so it cannot be re-added on blueprint reasoning alone.

The re-added test first failed by matching the rule quoted **inside its own
explanatory comment** — the exact hazard `roomViewportFloor.ts` documents in its
`stripComments` note. It now strips comments before scanning.

## The finding that outlives this baton

**The real defect is the opposite of the one first claimed.** `/charts` does not
over-populate LARGE. It renders the **MEDIUM arrangement — base plan plus ONE
zoom — at every width above the 1023px rail cliff**, and never reaches LARGE's
two zooms at all. B-701's LARGE band is **unbuilt**, not violated.

And 288px of fixed spine keeps the camera above C-101's 70% floor down to
~996px, so the spine needs no *width* collapse. **The camera's real pressure on
`/charts` is VERTICAL** — 192px of fixed chrome (masthead 69 + room header 45 +
toolbar 36 + bias strip 28) — which is C-101's problem, not B-701's. Because
that chrome is fixed, camera share is a function of window HEIGHT, so C-101
cannot be satisfied by a one-time trim; the chrome must collapse under pressure.

## Honest blockers, unresolved

- **`resize_window` does not take effect.** It reports success while
  `innerWidth` stays pinned at 1920. There is therefore **no live proof of any
  breakpoint's behaviour** — only proof that the band owner runs and publishes,
  and that the served CSSOM does or does not carry a given rule. Both were
  confirmed that way. The band receipt read `LARGE` at 1920, which is correct
  but is a single point on a three-point law.
- **A second deployer is active on this Worker.** Deployments by the same author
  landed at 03:34:46, 03:36:33 and 03:37:42 UTC; the version serving after this
  work was `013cca2f`, which is neither of the two this shift pushed. `BUILD_ID`
  comparison is therefore not a valid staleness check right now. Verification
  here was done **behaviourally** against the live CSSOM instead.
- **B-series sheets still unread:** B201, B301, B501, B601, B801. (B401 is the
  390px phone layout — outside the Founder's CURRENT desktop-only lane.)

## Gates

`./node_modules/.bin/vitest run` — 828 files, 10571 passed, 2 skipped. EXIT=0.
`./node_modules/.bin/tsc --noEmit` — EXIT=0. Both unpiped.
