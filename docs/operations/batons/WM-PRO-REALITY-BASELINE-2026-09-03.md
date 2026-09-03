# WM PRO — REALITY BASELINE
Per BUILD ORDER §6 ("Spend at most fifteen minutes. Print a Reality Baseline
from the real repository and the real production URL. Do not invent answers.")

Authority read this shift: **WM Pro — Operating System BUILD ORDER — Natural
Language — BINDING — September 3, 2026** (1_GTybVD83kWtJpZpUxO2tSUNN8k8OfyP4alsjvQSom8).
13 new Founder canon documents were created 2026-09-03, after my previous Drive
read. Per Founding Contract §2 this BUILD ORDER is now the governing document and
supersedes my earlier §13 gate list as the build target.

## NAMED FACTS (measured, not assumed)

| Item | Value |
|---|---|
| Production URL | https://wealthymindsetspro.com (Cloudflare Workers) |
| Commit | e5b9c7f1b6927994dc3460161015c5c5e4572d63 |
| Branch | main |
| Suite / types | 347 files, 3234 tests passing; tsc clean |
| Founder device path today | Browser verified. iPad/phone **NOT** verified — see blocker |
| Broker | **NONE reaches a real order path** — see order arrow |
| Data provider (equity/futures) | Yahoo via `/api/yahoo` |
| Data provider (crypto) | Coinbase/Binance via `/api/exchange` |
| TSLA price source | `/api/yahoo?sym=TSLA&type=quote` → canonical SF-D01 observation |
| Option quote source | **NONE.** Black-Scholes model in `src/app/paper/page.tsx` |
| Greeks source | **MODELED.** `underlyingIV()` flat IV assumption + BS |
| Live / paper / fixture | **PAPER only**, browser-local |
| Decision/position type paths | `src/lib/decisionMemory.ts`, `src/lib/traderMemory/decisionMemory.ts`, `src/lib/paperTrade.ts`, `src/lib/riskKernel.ts` |
| Store shared across devices? | **NO.** `PAPER_KEY = "wm_paper_state"` in localStorage — per-device |
| Fixtures on founder-visible path? | Options chain is model-derived, labelled "BS model" + "IV n%" |
| Clock authority | Client `Date.now()` in paperTrade; server stamps `receivedAt` on quotes |
| Session state | `/charts` shows SESSION CLOSED / HISTORICAL BARS VERIFIED honestly |

## THE ORDER ARROW — CANNOT BE PROVEN
Every BrokerAdapter `submitOrder()` returns `status: "rejected"` with a truthful
reason and `brokerOrderId: null`:

- alpacaAdapter — "not yet wrapped behind BrokerAdapter"
- webullAdapter — "adapter is not implemented — order not submitted"
- moomooAdapter — "v1 bridge is read-only (quotes)"
- tastytradeAdapter — same shape

**This is honest, not broken** — the adapters correctly refuse to fabricate an
ACK. But it means BUILD ORDER Steps 5, 6, 7, 9 and 10 cannot reach PROVEN,
because there is no ACK, fill, reject, cancel or replace from a real venue.
Per §17, those steps can currently reach at most IMPLEMENTED/TESTED.

## THE PROTECTION ARROW — NOT PRESENT
No working-order, stop-order or bracket concept exists outside `paperTrade.ts`.
There is no protection state machine, so Step 7 (PROTECTION IS A STATE) has no
owner yet. `BROKER-WORKING` cannot be claimed because no ACK exists to claim it
from — which is the correct failure, not a false green.

## WHAT THIS SHIFT CAN LEGITIMATELY MOVE
BUILD ORDER §14 lists invariants explicitly ranked above component tests. They
are testable **today**, without a broker, against the paper implementation:

1. UI never says FLAT while broker quantity > 0
2. UI never says BROKER-WORKING without an ACK
3. Protected quantity never exceeds filled quantity
4. A stale client cannot overwrite newer recon
5. Journal close cannot change execution
6. Nectar down cannot block flatten
7. Missing Greeks cannot dirty a verified last price
8. A failed estimate returns UNKNOWN, not last week's dollar
9. Paper cannot mutate live
10. Counterfactual cannot enter live statistics
11. **Double flatten is one order intent** — ALREADY SHIPPED (6c03b27)
12. Closed is not delayed
13. Halted is not closed

## ALIGNMENT OF PRIOR WORK
Already-shipped work that the BUILD ORDER independently requires:
- §14.11 double flatten is one intent → `selectCloseOrderPlan` (6c03b27)
- §21 buying-power still governs → `selectOrderRejection` (cdb1483, 91c240e)
- §8 "never print a single dollar as destiny" → change-display guard (cc15a31)
- §7 "QUOTE STALE / UNKNOWN" vocabulary → `selectPaperQuoteReadiness` (3bd2ec5)

## EXACT NEXT ATOM
Per §17: "EXACT NEXT ATOM is the next unproven step or the named blocker."

**Encode the §14 invariants as executable tests against the current paper
implementation, and fix whichever fail.** These are the tests the BUILD ORDER
ranks above component tests, they need no broker, and each failure is a real
capital-truth defect.

Named blocker for Steps 5–10: no broker order path exists. Founder-side —
requires a broker adapter with real credentials before ACK truth can be proven.
