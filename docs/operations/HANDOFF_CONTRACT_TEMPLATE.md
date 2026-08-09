# HANDOFF CONTRACT — TEMPLATE (M20)

**Adopted:** 2026-08-09 under Founder one-thread supersede.
**Source:** AI Team Sync & Launch Board v1.0 §Handoff Contract.
**Purpose:** Every non-trivial handoff between roles (or between sessions) fills every field. Missing fields → automatic RETURN by Sentinel.

Copy this template into `docs/operations/handoffs/<role>/<yyyy-mm-dd>-<slug>.md`.

---

## HANDOFF — `<Ticket ID>` — `<title>`

**From:** `<role, e.g. one-thread / Forge / Noah / Sentinel>`
**To:** `<recommended receiving role>`
**Date:** `<yyyy-mm-dd HH:MM CDT>`
**Repo HEAD at handoff:** `<sha>`

### 1. Why this work matters
One paragraph in the Founder's own framing (safety, truth, launch gate, revenue). No jargon. If the answer would surprise a new engineer joining the project today, write more.

### 2. What was requested
Verbatim ask (paste from queue / dispatch / Founder message). Do not paraphrase.

### 3. What is completed
Bullet list, each with a commit sha or file:line. Verified means Sentinel-signed, not "code compiles."

### 4. Files changed
Grouped by concern. Diffstat if >5 files.

### 5. Tests run
- Unit: `<command>` → result
- Integration: `<command>` → result
- Manual: viewport, provider state, user flow → result
- Bundle grep (for security work): what patterns, zero-hit or hits with paths

### 6. Unverified
Explicit list of what's NOT tested and WHY. Absence here is a lie — err toward listing.

### 7. Risks
Blast radius if this fails in prod. Recovery plan. Data-loss risk. User-visible fallback state.

### 8. Next task
One concrete instruction the receiving role can start on in <60 seconds. Include the exact command, file, or URL.

### 9. Decisions NOT to reopen
Things this handoff has locked. Prevents drift when the next role second-guesses.

### 10. Decisions awaiting Founder approval
Only include if genuinely gated on Founder. Format: `DEC-###` + one-sentence ask + link to context.

### 11. AI Action Receipt (Stewardship §13)
- **Author agent:** `<Opus 4.7 / Fable 5 / Sonnet / Haiku / …>`
- **Confidence:** HIGH / MODERATE / LOW / UNKNOWN (Stewardship §6)
- **Evidence class:** SOURCE / RUNTIME / TEST / DERIVED / ASSUMED
- **Rollback plan:** exact command to revert
- **Timestamp:** `<ISO 8601>`

---

## Enforcement

- Sentinel RETURNs any handoff missing sections 1-8 (11 is mandatory only for code-shipping handoffs; doc-only can omit rollback).
- One-thread mode: this template applies when handing OUT to Sentinel/Founder or when checkpointing across a session boundary.
- Directive Part LXXXIX (session checkpoint) fields are compatible — write the checkpoint using this template.
