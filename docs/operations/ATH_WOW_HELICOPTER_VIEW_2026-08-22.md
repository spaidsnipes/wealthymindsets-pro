# ATH/WOW HELICOPTER VIEW — 2026-08-22

**Founder Phase 2 directive: full system review after SHIFT-H. Not a status report; a durable synthesis of what ATH/WOW is, how it operates, where it's fragile at scale, and what protections must be in place before it grows 1,000×.**

---

## 1. What ATH/WOW actually is (in one paragraph)

Above The Hill Developments (ATH) is the invention lab. Wealthy Mindsets Pro (WM Pro) is the professional-trading operating system it ships to disciplined traders. WOW is the consumer-facing ecosystem for education, community, creator livelihood, and cultural marketplace. The three are one canon: the ATH inventions become WM Pro deterministic engines and WOW consumer surfaces. The mission is human growth over dependency, truth over appearance, stewardship over consumption. The product exists to make disciplined trading, disciplined study, and disciplined ownership accessible without pretending any of it is easy or guaranteed.

## 2. The seven Founder-canon documents

| Doc (fileId) | Role |
|--------------|------|
| Founding Execution Contract & Living Implementation Ledger (`1KBFVpIkT0dDF1uXowddm0XpOoRCVyWwCzXvylHp6efs`) | Original contract for how work is done and evaluated |
| Breakthrough Night Full Helicopter Audit / Weakness Exploitation contract (`1Us8O2iYlYl7fDuRe42DjZGh7dfsLXLh6ZjGA-pTZ4-0`) | Master execution synthesis — §20 3h shift law, §21 anti-evasion, §22 Orkin |
| 3·6·9·12 Challenge Engine — Invention Canon v0.2 (`1D98TgwfwvyEWSfbI-ALW4VcbYfGC7ZOo1JGXZC_1JfU`) | $100→$1M educational lane, §21 Founder live launch 2026-08-24 |
| ATH/WM Trading Academy — F to A+ Full Course Canon v1.0 (`1PPLziv55iQW9HR8wfFNM3zVbpnGiOA7qHd3ESwEkn1o`) | 12-studio academy taxonomy (companion to Challenge Engine) |
| Causal Market Model & Market Senses Architecture (`1DhC4mykuiBNkjFgWw0Qp3_DEn104aJYz80lTnilPm3o`) | How the app reasons about markets |
| Market Reality / ATH Data Feed / Clarity Glyphs / UI Transformation (`1QIQwhLfKr7FcLEpbBF1xVfLlnwUXhWrDhkPcqSusFps`) | Truth-label taxonomy and UI rendering canon |
| 2029 Integration Glue, Surface Governance & Unanswered Questions (`10a0h8xJVnQTzwW004f2rE-NiGHNfPQLBpcjt94P1tiw`) | Cross-surface integration + open founder decisions |

Every commit that touches domain semantics must cite one or more of these. The Super Builder Contract §2 makes that requirement binding.

## 3. The architecture in one line

`External data/brokers → SignalPort adapters → Canonical Identity + State → Deterministic engines (Causal Market Model / Materiality / Evidence Debt / Right of Way / One Story Compiler) → Surface Compiler → SurfaceLink → Desktop / iPad / iPhone → Human.`

The **Breakthrough Law** stated verbatim in the master canon: `MORE SENSES. FEWER WIRES. ONE NERVOUS SYSTEM. ONE MARKET TRUTH. ONE EXECUTION TRUTH. ONE DISPLAY CONTRACT.`

The **historical root cause** the same canon named: new power was frequently added as a new PATH instead of as a new ADAPTER or ORGAN on the existing path. This produced capability growth without proportional coherence.

## 4. The Weakness → Moat map (§Weakness Exploitation)

| Weakness (root pattern) | Moat (the exploit) |
|-------------------------|---------------------|
| W1 Multiple prices on one page | Canonical quote bus every consumer subscribes to |
| W2 Provider spaghetti | SignalPort + adapter registry |
| W3 Broker keys without complete product loop | Broker Certification Harness (auth/read/write/reconcile) |
| W4 Tastytrade futures hard-coded | Account-aware capability entitlement |
| W5 Mobile touch/tool parity gaps | Mobile-first control ledger (Micah polish law) |
| W6 Chart blank/reload states | Truthful loading/empty/error/degraded taxonomy |
| W7 Nectar summary vs raw history | Per-symbol observation ledger with retention truth |
| W8 Profile/OF/chart mental integration | ContextRibbon / OneStoryStrip / SurfaceLink |
| W9 Data/state wiring parallel to visual polish | Product Truth Law: fix state first, polish last |

## 5. What has shipped this shift-generation (E → F → G → H)

- **Shift-E**: Evidence Debt tile, Decision Permission Compiler, selectOneStory / OneStoryStrip on /command-deck, Truth Resolution Matrix
- **Shift-F**: selectMateriality gate, honest broker/status endpoint, canonical BrokerAdapter interface, adapter registry, alpaca + tastytrade adapter wrappers
- **Shift-G**: Webull MCP identity + capabilities honest, offline fixtures, proofLane pace + R selectors, /proof-lane visible surface, W1 quote-bus DISCOVERY doc
- **Shift-H** (this shift): Journal Proof Lane block (Model/PlannedR/Realized R), /paper "MARKET PRICES · DELAYED", journal Session R gate, contract-type multiplier for options, H-Bkt 8 NO FEED nest closure, resolveChartSurfaceBadge helper, Super Builder Contract v1, Team Prompt v1

Cumulative test suite: 862+ tests locked. Two big P0-for-Monday gates closed (Model/R capture and option multiplier). Two truth-label overreaches killed (NO FEED, LIVE PRICES).

## 6. Where ATH/WOW is fragile at 1,000× scale

The below are the observed weaknesses that at current scale are inconveniences but at scale become P0 catastrophes:

1. **Client-side truth resolution**. If a race between two data paths flashes a wrong label for 500ms at 100 users, it looks awkward. At 1M users, it becomes a lawsuit-shaped screenshot.
2. **Provider adapter drift**. Adding a new provider today requires touching multiple UI files. The W1/W2 registries fix this by-construction, but until every consumer migrates, drift remains.
3. **Broker credentials in Vercel env vars**. Works for one Founder account. Not a multi-tenant secret model.
4. **Localstorage-only observability memory**. Nectar is browser-local. A user's cross-device consistency currently depends on discipline, not sync. At scale, Nectar needs an authoritative store.
5. **AuthGuard is client-side redirect**. Every route renders once before redirecting. Fast enough for a Founder; leaks brief content flashes at scale.
6. **No cross-device certification pipeline**. Chrome MCP viewport is locked; real device certification is manual. At scale, this needs to be automated at every merge.
7. **No systematic accessibility audit**. Micah polish law is applied piecemeal. Should be a lint pass.

## 7. Where AI-assisted or team-scaled builders could game the contract without §22

Loopholes that would allow appearing productive without improving the product:

1. **Testing one branch and claiming state-machine certified** — §22 STATE-MATRIX LAW closes this.
2. **Marking defect FIXED and moving on** — §22 EXTINCT lifecycle closes this.
3. **Screenshot without interaction** — §22 attack journey requirement closes this.
4. **Report time counted as build time** — §21 report cap closes this.
5. **Sidepanel work substituted for product operation** — §21 MAIN-WINDOW LAW closes this.
6. **Rounding wall-clock to shift-active minutes** — §21 explicit ban closes this.
7. **Rebranding a polish PR as a bug fix to avoid the truth-defect queue** — §21 P0/P1 priority stack closes this.
8. **Passing a shift by writing a big doc late** — §21 REPORT-TIME CAP closes this; documented in Super Builder Contract §4.
9. **Wrong-build visual proof** — §5 build-identity chain requirement in Super Builder Contract closes this.

## 8. Rules that protect the soul of ATH/WOW while it scales

1. **Truth-label rejection guarantees are enforced by-construction**, not by hope. A new provider cannot say LIVE without a live-tier switch case. A new price surface cannot claim NO FEED while candles render because the pure helper prevents it.
2. **Every canon Doc has one authoritative anchor.** New Drive doc + new implementation atom = new commit citation.
3. **Every P0/P1 defect has one Orkin owner who walks it to EXTINCT.** Not "the team." One person / one AI role.
4. **The Founder never has to act as the QA system.** The contract exposes what's untested before the Founder asks.
5. **Six preserved dirty files remain byte-identical.** Any shift that breaks this invariant has failed regardless of what else it shipped.
6. **The persistent control ledger is cumulative.** New shifts resume where prior shifts stopped; they don't reset coverage.
7. **The mission is the alignment test.** Every atom answers the six Team Prompt questions before it ships.

## 9. What the Founder needs to see before Monday 2026-08-24

- /journal Log New Trade modal has Model M0/M1/M2 + Planned R $ + Realized R (auto) + STOCK/OPTION toggle. **Verified in Founder-signed Chrome this shift** (screenshot ss_6812z675h: TSLA 317.5P entry $1 → exit $2 × 1 contract OPTION 100x + $20 R → +5.00R displayed).
- /proof-lane pace mountain + Catch-Up Compass with canon §12 verbatim BEHIND text. **Verified this shift** (screenshot ss_4811tmyrx: BEHIND -87.07%, canon §12 message rendered).
- /journal today's Session R chip when he saves his first entry. **Ships silent until first R lands** (H-Bkt 4).
- /paper right rail no longer over-claims LIVE. **Verified this shift**.
- /charts chrome never says NO FEED while candles render. **Verified prior shift**.

## 10. Standing blockers surfaced this shift (Founder authority)

1. **Vercel prod paused** intermittently from the shift environment (`sfo1` edge, screenshot ss_263783e2k). Founder reports it up on his end. Suggests plan / edge-cache / regional pause condition worth investigating on the Vercel dashboard. All my prod visual-verification this shift was blocked by this.
2. **Chrome MCP viewport locked at 1912px** regardless of `resize_window`. Cross-device certification is blocked in this session type. Needs a real device or a different MCP surface for §22 CROSS_DEVICE_PASS.
3. **W1 quote-bus consumer migration** — 19 UI files still on raw provider paths per shift-G DISCOVERY doc. This is the biggest single truth-hardening opportunity for the next shift.

## 11. The founding principle (verbatim, no dilution)

> Build slowly enough to protect truth.
> Build quickly enough to capture opportunity.
> Build beautifully enough that people feel the difference.
> Build faithfully enough that the mission survives the scale.

---

*This document is Phase 2 output of the SHIFT-H Super Builder Contract Upgrade. It pairs with `ATH_WOW_SUPER_BUILDER_CONTRACT_v1.md` (Phase 3) and `ATH_WOW_TEAM_PROMPT_v1.md` (Phase 4). Together they form the operating-system spec that lets ATH/WOW build at world-class level without founder memory or constant correction.*
