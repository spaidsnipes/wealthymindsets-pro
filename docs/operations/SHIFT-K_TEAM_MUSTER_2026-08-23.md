# SHIFT-K TEAM_MUSTER — honest roster + role assignment · 2026-08-23

**Canon: §24 Full ATHOS/ATH/WOW Team Mobilization Law (Master Contract, added 2026-08-23). §24.1 requires TEAM_MUSTER before substantive execution; §24.12 forbids silent role omission; §24.6 forbids invisible teammate credit.**

## Roster reality — declared honestly

**This session is a single-agent Claude thread.** I cannot literally be multiple named human teammates (Atlas, Sentinel, Orkin, Noah, etc.). The canon anticipates this exact honesty in §24.6 ("A teammate receives shift credit only when evidence shows contribution"). Rather than invent role receipts, I:

1. **Tag each atom by which canonical role's duty it fulfills**, so a future team can see specialization even when the executor was one thread.
2. **Explicitly mark roles I cannot fulfill as `STANDBY_NOT_APPLICABLE` with a real reason.** No silent drops.
3. **Route P0 independent-check requests back to the Founder** for real assignment to another agent/session when the canon requires it.
4. **Declare this shift's status as `SINGLE_WORKER_COLLAPSE_ACKNOWLEDGED`** per §24.12 — meaning I did honest work but cannot claim `FULL_TEAM_EXECUTION_VALID`. Only `PARTIAL_TEAM_ROLE_TAGGED` is defensible.

## Role matrix (§24.1 format) — SHIFT-K

| ROLE | MEMBER / CODENAME | CANONICAL RESPONSIBILITY | SHIFT-K ASSIGNMENT | STATUS | RECEIPT LOCATION |
|------|---|---|---|---|---|
| ATHOS / SHIFT LEAD | this thread | canon alignment, priority, orchestration, receipts, migration-state integrity | Read latest canon incl. §24, muster, orchestrate | ACTIVE (single-thread) | This doc + shift-K commits |
| ATLAS | this thread (role-tagged) | architecture / helicopter / host portability / hidden coupling audit | .env.example code↔registry reconciliation; CLOUDFLARE_DEPLOY_GUIDE Path A/B; portability §PERMANENT integration | ACTIVE (role-hat) | 95898ab commit + this doc |
| SENTINEL | Founder-owned | secrets, client exposure, OAuth/callback authority, tenant boundaries, credential rotation triggers | Flag P0 Drive-doc secret leak; recommend full rotation post-cutover; enforce `NEXT_PUBLIC_*` vs server-only segregation in .env.example | ACTIVE (adversarial hat) — but P0 rotation must be re-verified by an independent role/agent | 95898ab .env.example server/public block + guide §Rotation |
| ORKIN | Founder-owned + this thread | reproduce build failures, name recurrence nests, drive defects to EXTINCT | Waiting on Cloudflare build-log RED lines from Founder to reproduce | BLOCKED_WITH_EVIDENCE — need Founder to paste error lines | Guide §"What YOU still own" |
| Implementation specialists | this thread (role-hat) | smallest canonical code/config repairs | Repo audit for adapter config; grep-derived env manifest | ACTIVE | 95898ab |
| NOAH | (canonical role not resolvable this session) | current Drive-defined role — cannot invent | ROLE_DEFINITION_GAP flagged; no receipt produced | STANDBY_NOT_APPLICABLE — no Drive canon loadable in this session that defines Noah's current active responsibility (my memory has a stale ATH Video Intelligence role, superseded); will not fake a receipt | Per §24.2 |
| Micah | mobile / a11y / WOW polish standard | 360/390/834/desktop screenshots per canon | STANDBY_NOT_APPLICABLE — Vercel prod down (HTTP 402) blocks visual QA; Chrome MCP viewport locked at 1912px | BLOCKED_WITH_EVIDENCE | Prior shift baton `H-Bkt 9` |
| Nehemiah | WM Pro OPS / critical-path thread | ops routing | STANDBY_NOT_APPLICABLE — no active ops routing decision this shift | Marked | — |
| Founder (Dave) | authority; secret owner; rotation approver; billing | Fix Vercel billing; approve Path A vs B; type secrets into Cloudflare; approve rotation | ACTIVE (external) | Founder-owned |

## Role-tagged atoms this shift-K so far

| Atom | Role | Evidence |
|------|------|----------|
| K-Bkt 1 (`.env.example` + CLOUDFLARE_DEPLOY_GUIDE.md @ 95898ab) | ATLAS (architecture + portability) + SENTINEL (secret classification) + Implementation (code manifest) | 95898ab, +272 lines |
| K-Bkt 2 (this TEAM_MUSTER + portability §PERMANENT integration into guide) | ATHOS (orchestration + canon integration) | this doc + guide diff |

## Independent-check requests (per §24.3)

Per canon, PRIMARY OWNER → IMPLEMENT/FIX, INDEPENDENT ROLE → VERIFY/ATTACK/CHALLENGE. Single-thread execution cannot self-satisfy independent review. The following P0 items require a separate agent/session to independently verify:

1. **`.env.example` completeness** — challenge whether grep-derived NAMES are exhaustive. A separate Atlas-role pass should verify against `next.config.*`, middleware, and any runtime-only imports.
2. **Secret rotation plan** — Sentinel independent verification: are there any credentials the code doesn't reference but Cloudflare / provider dashboards still trust (e.g. old OAuth apps)? My grep can't see those.
3. **Cloudflare Path A vs Path B recommendation** — Atlas independent challenge: does the current WM Pro code have any middleware / Server Actions / streaming API / websocket use that Pages CAN'T host? If yes, Path B (Workers/OpenNext) is mandatory, not optional.
4. **Portability audit** — search codebase for `VERCEL_*`, host-specific URL assumptions, filesystem assumptions per §PERMANENT HOST-PORTABILITY REQUIREMENT. I performed initial grep but full challenge belongs to a separate Atlas session.

**These are not blockers to K-Bkt 1's shipped work — but the shipped work cannot be certified `CLOUDFLARE_ATH_WOW_CERTIFIED` without them.**

## Session-end team self-audit (§24.13) — preview

Answering §24.13 truthfully:

- Loaded current team roster from Drive? **PARTIAL** — read §24 fully; roster names come from memory + prior batons, no dedicated Drive roster doc loaded (may be a `ROLE_DEFINITION_GAP` per §24.2).
- Every applicable permanent role had a lane or explicit non-applicable reason? **YES** — table above.
- Atlas performed architecture / helicopter / portability review? **YES** for the env-manifest and Cloudflare adapter surface; **PARTIAL** for full VERCEL_* hunt (next-shift atom).
- Sentinel challenged security / authority / secret exposure? **YES** — flagged Drive-doc secret leak (P0), enforced NEXT_PUBLIC / server-only segregation.
- Orkin actively attacked defects? **BLOCKED** — cannot reproduce build failure without Founder's build-log lines.
- Every other named teammate performed canonical role? **NO** — Noah role definition gap; marked STANDBY_NOT_APPLICABLE honestly.
- Implementation ownership vs independent verification distinguishable? **PARTIAL** — same thread means implementation + verification collapsed; independent-check requests listed above.
- Parallelized safe work? **N/A** — single thread, no parallelism.
- Any teammate credit without evidence? **NO** — everything cited to a commit / this doc.
- Every material handoff has an exact next action + acceptance? **YES** — see K-Bkt 1 guide "What YOU still own" + Independent-check list.
- Next session can resume without asking Founder to reconstruct? **YES** — CURRENT_STATE + all batons + this MUSTER.

**Downgrade:** per §24.12, shift-K status is **`PARTIAL_TEAM_ROLE_TAGGED / SINGLE_WORKER_COLLAPSE_ACKNOWLEDGED`**. Not eligible for `FULL_TEAM_EXECUTION_VALID` until an independent-role session executes the requests above.

## What the Founder should decide next

Per §24.14, "THE FOUNDER DOES NOT POLICE TEAM PARTICIPATION. THE SHIFT MUST PROVE THE FULL TEAM WAS ACTUALLY THERE." I've proven honest role-hat work by one thread. To satisfy `FULL_TEAM_EXECUTION_VALID`, you need:

1. **Load the canonical roster from Drive.** If there's a specific "WM Pro Team Roster" doc I should be reading, name it — I'll integrate.
2. **Route the four Independent-check requests above to another agent/session** (a separate Sentinel thread, a separate Atlas thread) so the checks are actually independent. Or explicitly accept the risk of self-review for P1 items.
3. **Decide Path A vs Path B** for Cloudflare.
4. **Paste the failing build's RED lines** so Orkin can reproduce.

Then the next shift can execute in parallel with proper role separation instead of collapsing back into one thread.
