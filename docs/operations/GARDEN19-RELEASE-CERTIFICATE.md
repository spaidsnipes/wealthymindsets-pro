# Garden 19 — Release Certificate (Founder order §15)

**Status: NOT READY — OPEN BLOCKERS.**

The product is live and was worked and read on serving through the evening of 2026-10-10. It cannot be called GUEST READY — PROVED: several §11 gates depend on things only the Founder can do (a live or paper order acknowledged by a broker, Stripe keys, legal pages in effect), on a physical phone and tablet, or on decisions that are his.

This file is the §15 hand-off. It points at the evidence; it does not repeat it. This repository is PUBLIC, so account, order-path and security details stay outside it: `~/wm-held/proof/`, on the Founder's machine.

## 1. What is serving

| Item | Value |
|---|---|
| Serving URL | https://wealthymindsetspro.com |
| Build identity | `/api/build-identity` → the commit that adds this file (read `/api/build-identity` for the exact SHA) |
| Shift baseline | `1e90db0` (live 14:54 CDT, 2026-10-10) |
| Shift final | the commit that adds this file (last code ship before it: `196b696`) |
| Gate on every ship | `tsc --noEmit` + the full vitest suite (18,398 tests at 20:04), then commit the named files only, push main, wait for the build identity |

## 2. Traceability (canon → code → test → glass)

- **Requirements register:** `docs/operations/GARDEN19-REQUIREMENTS-REGISTER.md`. It holds the Founder Oct 10 rows FO-01…FO-13, the eleven profiles, order flow, the R14 / SM / FL rows and the 774 Drive canon rows.
- **Invention certificates:** `docs/operations/GARDEN19-INVENTION-CERTIFICATES.md`.
- **Performance budgets and measurements:** `docs/operations/GARDEN19-PERFORMANCE-BUDGETS.md`.

## 3. Proved on serving this shift (18:00 → 23:00 CDT, 2026-10-10; no work 20:30 → 22:51 — usage limit)

| Founder item | Evidence | Status |
|---|---|---|
| **P0: chart objects never block placement** | NQ1! 5m ticket fixture with zones, FVG, Living Profile, Brick Walls, Call Wall and Gamma heat. **Desktop:** a real click on a zone pin set the stop at 31093.75 (−$685); the target in the wall band was 31208.75 (+$1,615); a drag through the layers moved the stop to 31035.50 (−$1,850), with the ticket in sync. **Phone 390:** FAILED on `1e90db0`; root cause, fix `e726d7a`; re-read PASS. **Tablet 834:** PASS. Proof file: `g19-p0-placement-2026-10-10-evening.md` | PARTIALLY PROVED (emulated widths; no broker acknowledgment by rule) |
| Order-line drag latency | p50 4.2 / p95 11.8 / max 21.1 ms; the ticket and the handle update in the same turn | PARTIALLY PROVED (desktop; hidden window) |
| Per-invention opacity (25 dials) | Call / Put dial at 40%: `callWall` went 0.6 → 0.24; gamma and FVG unchanged; nothing stored | PROVED (desktop) |
| Per-invention colour (FVG, Call / Put, Brick face) | Pixel counts after the swatch: FVG magenta 0 → 78,610; Put Wall blue 0 → 616; Brick face blue 0 → 761 | PROVED (desktop) |
| Founder TradeDay arithmetic | Sample desk at 390: required $3,333.34 = max($3,000, $1,000 ÷ 0.30); remaining $2,333.34; 3 days. Owner-only gate (server audience) | PARTIALLY PROVED (sample account; the Founder's dashboard is not read back) |
| Whole-house type floor | 13 rooms at 390: 0 visible text under 9 px, 0 sideways scroll | PROVED (emulated) |
| House identity colour | Lounge, Academy, Morning Prep, Scanner grades, Journal, Creator, Pine library, Fabio, Settings drawer, Chart Settings, chart chrome and every range dial moved off third-party teal / blue / purple onto brass / ivory. Pinned by `roomIdentityInk.sentinel.test.ts` | PROVED (probe + sentinels) |
| Text on dense glass (all eleven inventions on) | **Desktop:** 45 words, 0 held. **Phone:** 19–21 words; the held ones are listed, never dropped; 0 truth lines in the note list. Fixed: depth trail off the pane, words under DOM chips, arrow words under the axis, words cut under order-line pills | PARTIALLY PROVED (open: scaffolding plaque under Living labels at 390 when everything is on) |
| Weather performance root cause | The sprite cache was keyed on absolute pixels, so it re-blurred 11 of 12 cells every frame. Keyed on shape in `b4d214b`; the serving layer now reads REUSED | PROVED (mechanism); the foreground frame cost is still owed |

## 4. Root-cause defects found and closed tonight

1. **Phone: the entry handle swallowed an armed stop pick.** Its 44 px thumb slop covered nearby prices. Fixed `e726d7a`; sentinel `placementOutranksAnalysis`.
2. **The Data Window followed the cursor over the price being placed.** Fixed `e726d7a`.
3. **Weather re-blurred every cell every frame on live charts.** Fixed `b4d214b`; sentinel `heatLayerCache`.
4. **Canvas words were cut under order-line pills, the D toggle and the market strip.** Fixed `11d1df0` and `da2ae24`.
5. **The scaffolding depth trail and arrow words ran off the pane or under the axis.** Fixed `da2ae24` and `879dbb2`.
6. **The desk 4-up fidelity chip ran out of narrow panes.** Fixed in `3db6903`.
7. **The previous team's unfinished tree was left uncommitted.** Derivatives Pressure region names and off-camera pointers, and the phone book alert: finished and shipped in `8415649`.

## 5. Open blockers and owners

| # | Blocker | Owner |
|---|---|---|
| 1 | No order has been acknowledged by a broker through WM (live or paper). The ticket is proved on the fixture only | Founder: permission rule for a test order |
| 2 | Stripe has never run; billing is fail-closed until the 6 environment variables are set | Founder: keys / products |
| 3 | Terms and Privacy read "not in effect" | Founder / legal |
| 4 | No physical phone or tablet read. Every device proof is Chrome emulation | Founder's device |
| 5 | Foreground performance: hidden-window readings overstate animated layers | Founder's screen in front, or a device |
| 6 | Economic calendar: no licensed data owner. BLOCKED, nothing invented | Founder: data source |
| 7 | /shop light skin | Founder decision |
| 8 | The scaffolding plaque paints under the Living VAH / POC labels at 390 with every invention on | P2: chart lane (paint order) |
| 9 | Dense desktop scene (all eleven on) is over the 33 ms overlay budget: 43 ms mean in a hidden window | P1: chart lane. Weather storm and walls are the largest |
| 10 | Founder decisions in the register §7 (K-03 absorption bodies, K-04 loupe vs clear zone, masthead 1440, tablet type floor) | Founder |

## 6. Rollback

Every ship is one commit on `main`. To roll back:

1. Run `git revert <sha>`, then push. Workers Builds redeploys in about 3 minutes.
2. Confirm the new SHA at `/api/build-identity`.

The Cloudflare dashboard can also re-promote an earlier deployment without a commit. Deploys finish in order, so wait for each SHA before pushing the next.

## 7. Founder acceptance

Not yet given. The acceptance station is serving now:

- the proof scenes (`scene=clean | ticket-fixture | journal-fixture | lens-fixture`);
- the `/canon/glass` canon beside the glass.

The Founder can open any route and instrument there without preparation.

## 8. Last change in this certificate's commit

The Weather loupe's brass handle and its DRAG LENS chip no longer lie across a silence / truth line. Found on serving at 834 with every invention on: they covered "… MODEL, ASSUMED DEALER SIDE" and the options-flow scope. Pinned by `lensKeepsTruthRows.sentinel.test.ts`. It is **not yet read on serving**; the next shift owes that read.

Also open (desk 4-up at 1180, closed session): the bar clock "OPENED …" runs about 100 px past the legend band, into the axis (P2).
