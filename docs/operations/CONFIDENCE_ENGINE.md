# CONFIDENCE ENGINE (M23)

**Source:** ATH AI Stewardship & Human Growth Canon v0.1 §6. **Adopted:** 2026-08-09.
**Scope:** every Sentinel verdict, every AI-authored analysis, every commit body that makes a truthfulness claim.

## The four levels

| Level | When to use | Required backing |
|---|---|---|
| **HIGH** | Multiple independent evidence classes agree; test coverage adequate; reproducible. | ≥2 of {SOURCE, RUNTIME, TEST}; result reproduced at least once by a different method than the one that discovered it. |
| **MODERATE** | Single evidence class supports the claim; test coverage partial; reproduced but with acknowledged conditions. | 1 of {SOURCE, RUNTIME, TEST} with explicit conditions written down. |
| **LOW** | Plausible but unverified; source-only or inference-only; blast radius bounded. | Explicit note of what would move this to MODERATE. Never ship code-modifying decisions on LOW alone. |
| **UNKNOWN** | Cannot be reached from available evidence. | Explicit list of what evidence is missing and how to obtain it. Never round up to LOW; state honestly. |

## Evidence classes (Stewardship §7)

- **SOURCE** — grep / read of current HEAD source.
- **RUNTIME** — observed behaviour of a live deploy or local dev server.
- **TEST** — passing unit / integration / e2e / property test.
- **DERIVED** — inference from two or more of the above.
- **ASSUMED** — no direct evidence; explicit assumption.

**Rule:** a claim's confidence is capped by the weakest evidence class it rests on. A HIGH claim built on an ASSUMED sub-claim is downgraded to whatever level the ASSUMED supports.

## Application

Every verdict entry in `docs/operations/handoffs/sentinel/` must include:

```
Confidence:     <HIGH | MODERATE | LOW | UNKNOWN>
Evidence:       <SOURCE, RUNTIME, TEST, DERIVED, ASSUMED — pick applicable>
Reproducibility: <how a second engineer verifies this in one command>
What would break this verdict: <one sentence — what fact, if true, would invalidate the finding>
```

## Retroactive audit — open Sentinel verdicts

Verdicts filed before 2026-08-09 that lack the Confidence field:

- V-005 (WM-WYCK-P0-01) — implied HIGH (grep + regression test + Sentinel re-verify). Formalise on next touch.
- V-006 (WM-CHART-P0-01) — Pass A/B disagreement recorded; effectively MODERATE (test + build clean; no runtime evidence — RISK-001).
- V-008 through V-013 — inconsistent; carry as UNKNOWN until touched.

**Enforcement:** any verdict landing after 2026-08-10 without the Confidence field is RETURNed by the next Sentinel touch. No exceptions for "obvious" cases — the field IS the discipline.
