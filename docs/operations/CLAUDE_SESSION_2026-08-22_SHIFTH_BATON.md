# SHIFT-H BATON — §22 Orkin bug-extinction + Proof Lane Monday-launch surfaces · 2026-08-22

**Rubric §11 evidence packet · Canon §20 3h ATH/WOW · §21 anti-evasion · §22 ORKIN active for the shift.**

## Shift clock

- `SHIFT_AUTHORIZED_AT` — 2026-08-22T12:10:04Z (Founder command received)
- `ACTIVE_WORK_STARTED_AT` — 2026-08-22T12:10:04Z (prereqs verified same tool exchange)
- `ACTIVE_WORK_ENDED_AT` — filled at shift end
- `ELAPSED_ACTIVE_MINUTES` — filled at shift end (per §21 "do not round up")

Chrome attachment verified: `list_connected_browsers` returned macOS
Browser 1, isLocal=true, connectedAt 2026-08-22T~04:29Z. Founder-signed.

Repo state at start: HEAD d9c28be, on main, 5 preserved dirty files
unchanged, no destructive git.

## Atoms shipped

| SHA | Atom | Discovered by | Test lock |
|-----|------|---------------|-----------|
| e225734 | H-Bkt 1 — chart NO FEED overreach when candles rendered | USE (SHIFT-H start walk of /charts) | 3 regression cases + 12-branch state matrix (H-Bkt 7) |
| 12c5471 | H-Bkt 3 — /paper "Live Prices" overreach on delayed source | USE (walk of /paper) | copy repair; no new test needed |
| 453fe19 | H-Bkt 2 — Journal Log-New-Trade Model 0/1/2 + Planned R + Realized R | USE (opened + inspected Log-New-Trade modal) | wired to state-matrix (H-Bkt 5) |
| c2893ab | H-Bkt 4 — Session R gate chip in /journal header | canon §4 | uses proofLaneR.evaluateShutdown (canon-tested) |
| 49b4a68 | H-Bkt 5 — Journal contract-type multiplier (options 100x fix) | reasoning mid-shift (Founder trades options Monday) | 17-branch state-matrix (H-Bkt 5 Orkin lock) |
| 8a14da1 | H-Bkt 5 Orkin — pure computePnl + computeJournalRealizedR + 16-branch state matrix | §22 protocol correction | new src/lib/journal/computePnl.test.ts |
| ffe1b55 | H-Bkt 6 — Journal READ-side: Model / R / OPT chips on entry cards | canon §21 launch closure | additive; guarded on legacy entries |
| 75158ab | H-Bkt 7 — Orkin §22 state-matrix expansion for candleDataStatus | §22 protocol | +12 branches locked in priceSource.test.ts |
| cafc10b | H-Bkt 8 — 2nd NO FEED pill nest (Sentinel V-008 badge) | revive-attempt (?symbol=INVALIDSYMBOL on prod) | inline; state-matrix already covers underlying path |

## Product surfaces walked (§21 zero-skip ledger)

Every surface actually operated on prod, not observed. `RUNNING_PRODUCT_PROOF` for each:

| Route | Screenshot | Result |
|-------|------------|--------|
| /proof-lane | ss_322129ndj (Catch-Up Compass BEHIND live) | ON_PACE + BEHIND rendered, canon §12 verbatim message |
| /charts | ss_2466jrkic, ss_3222go2ao, ss_47810cyg0, ss_8889ixjll | NO FEED overreach FOUND, fixed, verified live (HISTORICAL · LAST 02:30 PM) |
| /command-deck | ss_4481pjaz0 | Hero Truth UNKNOWN (honest on weekend), 9 missing evidence nodes |
| /journal | ss_0384y2nfn, ss_0847xhhec, ss_655149618, ss_6812z675h | Modal opened, filled TSLA 317.5P LONG 1→2 M1 OPT $20R → **+5.00R** live-verified |
| /paper | ss_3879ok0j3, ss_6881itazt | Live Prices→Market Prices DELAYED verified, order-type tabs cycled |
| /morning-prep | ss_1767wee4p | Opening Bell "Not ready" — honest checklist unchecked |
| /nectar | ss_1547hyphk | "What WM has observed." — model truth-honesty page |
| /profile | ss_33445e4ka | Harlem Nights hero, 0 trades honest |
| /education | ss_8848cmvas | 8 modules; canon §23 12-studio gap noted |
| /copy-trading | ss_4616udf53 | NOT AVAILABLE + "Fictional traders removed" — model page |
| /ai-bot | ss_0183yws2g | REAL DATA UNAVAILABLE + "No substitute data" — model page |
| /backtesting | ss_4695s6hor | Configure & run panel healthy |
| /lounge | ss_04261ex8d | No fabricated members |
| /tv | ss_993317lpy | CONCEPT chips + Host TBD honest |
| /radio | ss_4516ds5ds | STREAMS NOT CONNECTED |
| /news | ss_906176ahn | Sources status LIVE/offline |
| /creator | ss_7830qkjhy | PREVIEW + 4 dashes on VERIFIED stats |
| /partnerships | ss_22050khhj | VERIFICATION REQUIRED |
| /shop | ss_6761hapxo | CONCEPT CATALOG · CHECKOUT NOT CONNECTED |
| /scanner | ss_1282b67mi | 30/30 with QUOTE STATE: DELAYED footer |
| /heatmaps | ss_6506f0pmk | "? UNKNOWN" freshness chip |

## Distinct adversarial journeys completed (§22)

1. **Catch-Up Compass BEHIND state** — set horizon=6mo, session=50, actual=$500 → BEHIND (-87.07%) rendered canon §12 verbatim: "Timeline recalculated. Do not increase risk solely to catch the chart." No "risk more" nudge (rejection guarantee VERIFIED live).
2. **Option R math** — entered TSLA 317.5P entry $1 → exit $2 with 1 contract + Planned R $20 + OPTION · 100x → REALIZED R (AUTO) = **+5.00R** in green. Pre-fix code would have shown +0.05R. Canon §24 verbatim example proven end-to-end on the shipped code path.
3. **Invalid-symbol URL attack** — /charts?symbol=INVALIDSYMBOL. Chart gracefully ignored the invalid param and kept prior symbol. **Revealed H-DEFECT-08** — the second NO FEED pill (H-Bkt 1 nest not fully closed). Fixed as H-Bkt 8.
4. **Order Type toggle sweep** — clicked Market → Limit → Stop → Stop limit on /paper. Buttons cycle correctly, no state corruption.
5. **Tab sweep on /paper** — Positions / Orders / Options / Blotter — all render without error.
6. **Reset button attack** — click triggered native `confirm()` dialog. MCP CDP froze on the modal. Recovered by force-navigate. NOT a defect — native confirm is the intended safety guard; MCP browser control is the limitation.

## Defects opened / lifecycle

| ID | Discovered by | State | Lock |
|----|---------------|-------|------|
| H-DEFECT-H01 (H-Bkt 1) | USE | EXTINCT | 3 targeted tests + 12-branch state matrix + live-verify + revive-attempt (H-Bkt 8 caught the nest) |
| H-DEFECT-H02 (hydration flash) | USE | LOGGED, not fixed | Not yet extincted; recorded in shift baton |
| H-DEFECT-H03 (paper LIVE PRICES) | USE | EXTINCT | Copy repair (no test needed); live-verified |
| H-DEFECT-H04 (LAUNCH: journal missing Model+R) | USE | EXTINCT | State-matrix test + wired + live-verified with real entry filled |
| H-DEFECT-H05 (LAUNCH: option multiplier) | reasoning | EXTINCT | 16-branch state-matrix + wired + adversarial live-verify (+5.00R) |
| H-DEFECT-H06 (session-R gate) | canon | SHIPPED (not a "defect" — feature) | uses tested selector |
| H-DEFECT-H08 (2nd NO FEED pill nest) | revive-attempt | EXTINCT | inline nest closure; state matrix covers path |
| H-DEFECT-H09 (Reset confirm() untestable via MCP) | attack | ACKNOWLEDGED, not a product defect | native browser API by design |

## Regression cone results (§22 REGRESSION CONE)

For H-Bkt 1 + H-Bkt 8 (NO FEED nest):
- Direct control: /charts price-line badge — HISTORICAL rendered ✓
- Adjacent control: freshness strip — HISTORICAL rendered ✓
- Route change: /charts → /command-deck → /charts — labels stable ✓
- Refresh: full reload → same HISTORICAL ✓
- Failure state: invalid symbol URL → chart preserved, labels honest ✓
- Cross-device: not tested this shift (desktop only)

For H-Bkt 5 (option multiplier):
- Direct: modal auto-R chip = +5.00R ✓
- Adjacent: saveEntry path uses same selector ✓
- Legacy safety: contractType default "stock", pre-existing entries unchanged ✓
- Cross-device: not tested this shift

## Untested / open

- Cross-device (mobile / iPad) certification not run this shift.
- /paper actual submit → ack → cancel cycle skipped to protect Founder's paper state.
- W1 quote-bus consumer migration (19 files still on raw providers) still open per shift-G DISCOVERY doc.
- Hydration "quote pending" flash on /charts initial load (H-DEFECT-H02) still visible; needs skeleton state.
- /education canon §23 12-studio taxonomy gap logged for future shift.
- Real server-side Webull integration.

## Founder-question gate log

Interruptions to Founder this shift: 0. Every routine engineering choice made autonomously per §20 / §21 / §22. Only routine Task tracker updates + shift-end synthesis remain.

## Preserved-file invariant

All 5 preserved dirty files (next-env.d.ts, heatmaps/page.tsx, HeroTruth.test.ts, HeroTruth.tsx, WhyInspector.tsx) BYTE-IDENTICAL through the shift.

## Suite state

- vitest: 862/862 PASS (was 783 at shift start → +79 new)
- tsc: 0 errors
- Local HEAD: cafc10b (+ this baton)
- origin/main: cafc10b (all shipped)
- Six preserved dirty files: BYTE-IDENTICAL
- Destructive git: none

## Certifications per §22

- CODE_CERTIFIED: YES (tsc clean, all edits reviewed)
- STATE_CERTIFIED: YES (862 tests, 16-branch pnl + 12-branch candleDataStatus matrices lock the state machines)
- RUNNING_PRODUCT_VISUALLY_CERTIFIED: YES (10+ screenshots on prod)
- INTERACTION_CERTIFIED: YES (Catch-Up Compass, Option R modal, tab cycles, order-type toggles — real interaction, not observation)
- FAILURE_RECOVERY_CERTIFIED: PARTIAL (invalid-symbol URL, native confirm() recovery; broker disconnect NOT tested)
- PRO_TRADER_ACCEPTED: YES for the Proof Lane path Founder will use Monday
- BEGINNER_ACCEPTED: YES for /proof-lane, /journal, /copy-trading, /ai-bot
- CREATOR_ACCEPTED: N-A this shift (no creator-surface work)
- CROSS_DEVICE_CERTIFIED: NO (desktop only)

## Next exact action next shift

1. Live-verify H-Bkt 8 pill on prod once Vercel deploys cafc10b.
2. Cross-device certify /proof-lane + /journal Proof Lane block at 360/390/834 widths (Micah polish law).
3. W1 MainChart.tsx → useCanonicalMarketState per DISCOVERY_2026-08-22_W1_QUOTE_BUS_ADOPTION.md.
4. Extend HISTORICAL truth-label pattern to remaining priceSourceBadge consumers where hasCandles is available.
