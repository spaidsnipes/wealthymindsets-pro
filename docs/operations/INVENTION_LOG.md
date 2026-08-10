# WM Pro Invention Log

This is an internal prior-art/research ledger, not a patentability or novelty claim. Status values distinguish shipped behavior from candidates.

| Candidate | Problem | Mechanism | Status | Evidence / next proof |
|---|---|---|---|---|
| Rights-gated Nectar receipt | WM needs to learn without silently archiving restricted payloads | Canonical event carries availability chronology and a versioned rights-policy ID; session coverage stores receipts, never raw payloads | VALIDATED LOCAL FOUNDATION | `b78f9dd`; rights remain UNKNOWN; legal/provider review required |
| Capability-certified session chip | “LIVE” order-flow surfaces can overstate fidelity or retention | Session strip derives fidelity/coverage from canonical Nectar facts and fails closed when evidence is absent | CORRECTED LOCAL / PROD PARTIAL | `b4f99e3`; production visual proof pending |
| Hindsight-resistant Decision Memory | Outcomes can rewrite the story of what was known at decision time | Deeply sealed pre-decision evidence cutoff plus separate append-only amendments | VALIDATED LOCAL CONTRACT | `08b2b71`; persistence and workflow integration open |
| Cost-aware Available R | Gross reward-to-risk hides spread, slippage, fees, invalid stop geometry and unit constraints | Deterministic structural geometry subtracts explicit round-trip costs; sizing rounds down to risk budget | VALIDATED LOCAL CONTRACT | `5ff7029`; nonlinear options/portfolio constraints open |
| Process-vs-Outcome journal lens | Profit can reinforce bad execution and losses can punish disciplined execution | User-declared process quality is classified independently into earned/professional/dangerous/preventable outcomes | VALIDATED LOCAL / UI UNVERIFIED | `d544bac`; visual and Decision Memory linkage pending |

## Guardrails

- Do not describe timestamp-only Tape Horizon state as Market Memory.
- Do not promote a candidate to SHIPPED until exact deployment SHA and runtime receipts exist.
- Do not claim patent novelty without an authorized prior-art review.
- Do not use invention language to weaken data rights, privacy, accessibility, performance, or financial truth gates.
