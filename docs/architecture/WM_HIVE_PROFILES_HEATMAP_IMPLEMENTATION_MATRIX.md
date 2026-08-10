# WM Hive / Profiles / Heat Maps Implementation Matrix

**Reconciled:** 2026-08-10 CDT  
**Drive authority:** `WM Pro — Claude Super Master Transformation Directive — Hive, Nectar, Profiles, Heat Maps, Time Engine & WOW — 2026-08-09`  
**Repository baseline:** `c696b88cb92661d066e4400d8e5fbe735bf66cd7`

This matrix distinguishes architecture described in Drive from behavior proven in code. A named concept is not implementation evidence.

| Requirement | Status | Current implementation evidence | Exact remaining work |
|---|---|---|---|
| Provider capability and persistence-rights registry | VERIFIED FOUNDATION | `src/lib/marketData/capabilityRegistry.ts`; unknown/prohibited rights fail closed | Authorized provider/legal review must populate rights and retention limits before raw storage |
| Canonical Market Event / Nectar contract | PARTIAL | Versioned event schema, validation and Coinbase/Alpaca relay adapters | Normalize remaining quote/bar/depth/news/broker adapters; remove unmigrated event shapes |
| Production-safe Nectar collector | PARTIAL | Shared tape hub plus `SessionNectarCollector` records validated coverage and health receipts once per shared feed tick | Durable server/background collection, heartbeat and recovery remain absent; current collection is browser-session scoped |
| Temporal Integrity / Guard / Quarantine | PARTIAL | Schema validation, bounded identity dedupe, out-of-order quarantine, sequence-gap receipts, late-bar rewind prevention | Reconnect gap ledger, clock drift, calendars/half days, rollovers and controlled late-event reconciliation |
| Raw Honeycomb Market Memory | BLOCKED | No raw event vault exists; this is deliberate | All current raw persistence rights are `UNKNOWN`; storage is prohibited until explicit evidence changes a registry cell to `ALLOWED` |
| Coverage Map | PARTIAL | Per-channel session coverage, gaps, staleness, fidelity, scope and retention truth | Connect every adapter/channel; add permission-safe user details and health monitoring |
| Canonical WM Market State | OPEN | `useWebSocket` has a hook-local state; coverage facts are canonical but the full derived state is not | One authoritative state referencing Regime, Profiles, Order Flow, fidelity, risk and unknowns without duplicating values |
| Traditional Profiles | PARTIAL | Fixed VP, Session VP and per-bar/order-flow volume profile exist | One `WM PROFILES` owner; reconcile Visible/Fixed/Session/Periodic/Composite/TPO and fidelity-specific Bid/Ask/Delta |
| Living Profile | OPEN | No canonical evolution engine | Versioned POC/value/node evolution events with evidence and replay tests |
| Structure Profile | OPEN | No structure-owned anchoring engine | Canonical structural segments, explainable anchors, override and provenance |
| Profile Fusion | OPEN | No fusion contract or evidence de-duplication | Preserve component evidence; produce interpretable zones without correlation inflation |
| Profile Memory | BLOCKED | No retained profile vault | Requires lawful derived/raw retention design, age/tests/decay/outcome schema and replay receipts |
| Profile DNA | OPEN / LAB | No versioned numerical fingerprint | Define geometry contract, uncertainty, sample-size rules and validation corpus |
| Profile Tensor | OPEN / LAB | No tensor engine | Define internal dimensions and readable projections; do not render fake seven-dimensional certainty |
| WM Profile Stack | OPEN | Fixed and Session toggles are separate toolbar buttons | Unified stack controls, ordering, layout, presets, complexity governor and saved configuration |
| Existing Heat Maps | PARTIAL | S&P treemap, return-based Markov proxy and VP view; delayed/stale/as-of truth added | Explicit normalization/legend/fidelity across all views and canonical Market State consumption |
| WM Profiles Heat Map | OPEN | None | Consume canonical profile outputs; support evidence inspection and chart round-trip |
| WM Order Flow / Liquidity Heat Maps | OPEN | None as canonical heat-map lenses | Require certified tape/depth coverage and honest unavailable/proxy states |
| WM Wyckoff / Regime Heat Maps | OPEN | Markov return heuristic is not these engines | Versioned candidate evidence, contradictions, missing evidence and no hindsight labels |
| WM Memory Heat Map | BLOCKED | None | Requires lawful retained coverage and gap-aware memory ranges |
| WM Confluence / Market Truth Heat Maps | OPEN | None | Separate strength, fidelity, historical support and live confirmation; de-duplicate correlated evidence |
| Bidirectional Heat Map ↔ Chart context | OPEN | No canonical evidence-stack handoff | Restore symbol/time/context and evidence IDs, not only navigate to a route |

## Current truthful verdict

The Hive/Nectar foundation is materially underway, but the full Drive transformation is not implemented. Durable Market Memory is correctly blocked rather than simulated. WM Profiles and the new Heat Maps family remain major P1 work after collection rights, canonical state, and data-fidelity foundations are proven.

## Canonical next order

1. Finish live adapter coverage and collection-health receipts.
2. Obtain provider persistence/retention decisions; keep raw storage disabled until explicitly allowed.
3. Build one canonical WM Market State referencing Coverage Map facts.
4. Consolidate current Fixed/Session/per-bar controls into one honest WM Profiles surface.
5. Implement Living and Structure Profile contracts before Fusion/Memory/DNA/Tensor.
6. Make Heat Maps purposeful views of the same engines, beginning with explicit scale, normalization, fidelity and chart handoff.
