# WM PRO SHIFT — /paper UNBRICK + Drive migration completion
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)

## HEADLINE
The `/paper` route was **completely unusable in production** for any user whose
browser clock ran even milliseconds behind the Cloudflare edge clock. Root cause
found, fixed, shipped, and verified live in the Founder's own browser.

## P0 — /paper route bricked by cross-clock-domain comparison
**Symptom (prod, Founder's browser):**
- All 16 UNIVERSE symbols in right-rail Market Prices: `— UNKNOWN`
- Order Ticket: `WAIT FOR VERIFIED QUOTE` (aria-disabled)
- AI Trading Bot: `IDLE` / `UNKNOWN · NOT ACTIONABLE`
- Options chain: never armed
- Visible reason: `Canonical quote chronology was malformed.`

**Measured root cause:** replaying the exact validation in the Founder's browser
showed precisely two failing checks:
```
receivedAt_lte_captured    FAIL
availableAt_lte_captured   FAIL
skew_ms: +8
```
`receivedAt` / `availableAt` are stamped by the EDGE SERVER; `capturedAt` is
`Date.now()` in the BROWSER. Two different clock domains. An 8ms server lead
bricked the whole route. `observedAt <= capturedAt` — the check that actually
matters — passed.

**Fix (3bd2ec5):** split the gate into three honest stages:
1. shape / internal consistency — unchanged, still reports "malformed"
2. observation chronology — STRICT (`observedAt <= capturedAt`)
3. transport chronology — bounded by `TRANSPORT_CLOCK_SKEW_TOLERANCE_MS` (5 min)

Monday Test 2 honored: a transport-bound trip now names the real failure class
("client/server clock-skew tolerance") instead of blaming the provider payload.
Freshness NOT loosened — `ageMs` still derives from `observedAt`.

One pre-existing assertion (`receivedAt === NOW+1` must reject) encoded this very
bug. It was rewritten with an explanatory comment; the `observedAt` half was
preserved as its own strict test.

**Live verification (Founder's browser, post-deploy):**
| metric | before | after |
|---|---|---|
| symbols showing UNKNOWN | 16 | 0 |
| "WAIT FOR VERIFIED QUOTE" | present | 0 |
| "chronology was malformed" | yes | no |
| Place Buy Order | blocked | ENABLED |
| Start Bot | blocked | ENABLED |
| Options chain | dead | TSLA spot $360.74, strikes 330-385, calls/puts/deltas |

## P1 — one-sided aggressor flow painted as measured "300:100"
`selectAggressorFlow` returns a hardcoded `300` sentinel when the weaker
aggressor side has zero volume; the chart strip rendered it as `IMB 300:100`,
a 3:1 reading the tape never produced (LIVING-PIXEL LAW).

**Fix (efc5337):** added an honest `oneSided` boolean. `imbRatio` keeps the 300
sentinel so the four existing numeric consumers behave unchanged; the display
layer now renders `one-sided`. Minimal blast radius.

## Drive migration — COMPLETE
| stream | result |
|---|---|
| Desktop screen recordings | 38/38 files verified in Drive |
| ATH Developments packages | 259.6 MiB / 259.6 MiB (100%) |
| Documents/Codex recordings | 7.247 GiB / 7.247 GiB (100%) |

Destination: `ATH Computer Migration + Space Recovery — 2026-08-31/02_MEDIA_ASSETS_EXPORTS/`
Tool: rclone v1.75.0 (standalone binary, `~/bin/rclone`), OAuth authorized by Founder.
Disk: 912 MB free → **~25 GiB free**.

**NOTHING WAS DELETED.** Music, Logic projects, and `~/Music` were excluded at the
rclone filter level. Per the ATH Video Intelligence retention rule, no recording
is removed from the Mac until retention is satisfied by the ATH pipeline.

## Test posture
Full suite: **322 files / 3023 tests passing.**

## Open / carried forward
- 20 further candidate defects from the 6-route scan remain UNVERIFIED — the
  workflow's 22 verifier agents all died on a session limit. They are candidates,
  NOT confirmed findings. Highest-value untriaged: /command-deck missing-count
  disagreement (pill "1" vs Passport 0/8 vs chain "9 unknown"); /nectar ribbon
  "no gaps recorded" while sibling strip proves 6/6 STALE; /journal "Reset
  filters" skipping the Misread filter; /journal Setup dropdown storing `""`
  while displaying "CLC Long".
- Provider truth unchanged: Webull BLOCKED_AUTH (401), Longbridge NOT CONFIGURED,
  moomoo bridge absent, Tastytrade refresh token absent.
- Drive `07_TRANSFER_LOGS_CHECKSUMS` remains empty — no durable checksum receipt
  was fabricated.

## Timing truth
No shift duration is claimed. Only observed events are recorded above.
