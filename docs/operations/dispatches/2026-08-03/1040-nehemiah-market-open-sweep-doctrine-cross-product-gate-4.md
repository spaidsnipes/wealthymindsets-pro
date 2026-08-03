# NEHEMIAH — Market-open sweep: Doctrine ingestion + Gate 4 cross-product ruling + assembly-line staleness

**From:** Nehemiah (Ops & Critical Path) · **To:** Atlas / Mission Control → Founder read-me · **Time:** 2026-08-03 10:40 CDT · **Repo HEAD:** `e768558`
**Charter:** DEC-011 §Default-when-idle §1 · **Anchor:** my `adf13ac` 7-gate map (2026-08-02 12:45 CDT). **Supersedes:** unpublished 00:15 CDT draft (never on bus — market-open context shift).

---

## 1 · Since `adf13ac` (6 commits, HEAD one ahead of Atlas's cited `7aedde0`)

| Commit | Landing | Effect on my 7-gate map |
|---|---|---|
| `efe4bec` | Forge `WM-DATA-P0-01` quote-pipeline audit — day-change fallthrough RC | Gate 1 row 1.0: 🔴 emergency → 🟡 RC identified, Noah impl next |
| `f1ca9cd` | Atlas filed `WM-BROKER-QUOTE-P0-01` + 4 dormant-employee dispatches | Gate 3 gains row 3.5 (was footnote in prior map) |
| `d6f74e1` | Forge assembly-line dispatches — crypto VP POC + tastytrade dxFeed | Feeds Noah-serial queue on Gate 2/3 |
| `818bfee` | **Sentinel V-010 + V-011** — Gate 2.4 STATIC pass only, Gate 4 is CROSS-PRODUCT | **Two gate-rule corrections** — see §2 |
| `7aedde0` | Sentinel V-010/V-011 renumber to V-012/V-013 (concurrent session used V-010) | Verification-ID hygiene |
| `e768558` | Forge Doctrine §7 addenda for 2 in-flight Noah contracts (VP-P0-01 + BROKER-QUOTE-P0-01) | **First Doctrine-compliant contracts** — see §3 |

## 2 · Gate-rule corrections from Sentinel V-012/V-013 (formerly V-010/V-011)

### Gate 2.4 (WM-DRAW-P0-01) — cannot go GREEN on static evidence

Sentinel V-012 verdict: LeftDrawingSidebar.tsx static PASS (aria-pressed ×4, aria-label ×6, ≥44px ×4, focus-visible ×4). **Ticket acceptance is runtime** (<150ms, 60fps, Esc-cancel, touch-drag) — source cannot establish those. **Gate 2.4 stays 🟡 until Sentinel captures runtime evidence on Founder-authenticated Chrome.** My prior "SHIPPED; Sentinel visual verify pending" phrasing was optimistic — corrected here to "SHIPPED (code); RUNTIME EVIDENCE PENDING (blocker: RISK-001 / Gate 5)."

### Gate 4 (`WM-SEC-P0-02`) — CROSS-PRODUCT, not WM-Pro-only

Sentinel V-013 verdict: `WM-SEC-P0-02` target Supabase project `zrzaifaxecwgpfrqctkp` is **shared with Dreamboard** (Passport, vault, graph, audiobook tables). Policy change lands in that project's whole surface. **Binding preconditions (DB-DEC-002 exception, both registers):**
  1. **Backup exists** before any policy is applied.
  2. **DB-SEC-P1-01** enumerates Dreamboard-owned tables and their LIVE policies. Migrations show intent, not state — UNKNOWN, not "probably fine."
  3. **A named Dreamboard-side reviewer signs off.**

Condition #3 has **nobody to satisfy it** — no employee is currently assigned to Dreamboard; its `origin/main` hasn't moved since 2026-07-28 (filed as `DB-RISK-007` in the Dreamboard register, `f5f78ac`). This does **not** add a new WM Pro blocker — it changes **how** the existing SEC-P0-02 blocker must be cleared, not **whether**. My 7-gate map row 4.2 phrasing updated: **owner chain becomes Founder + Dreamboard reviewer (identity TBD) → Elias draft → apply.**

## 3 · Doctrine ingestion — WM-OPS-P1-01 filing

**ATH Universal Product Doctrine (Drive `1kgOhR4702FT-…`) LOCKED company-wide, 2026-08-03.** §12 Inheritance Rule applies to WM Pro. §7 requires 10 fields on every contract: core problem · resilience+recovery · studio pipeline+DoD · KISS primary path + progressive-disclosure map · JKD source synthesis (studied/absorbed/rejected/ATH-added/legal-IP boundaries) · WOW moment · truth+evidence labels · a11y/privacy/safety/agency · failure modes+rollback+continuity · metrics.

**Forge already ingested for the 2 in-flight Noah contracts** at `e768558` (Doctrine addenda supplementing `d6f74e1` dispatches — WM-VP-P0-01 crypto + WM-BROKER-QUOTE-P0-01). Additive, not revising — Noah's baton on both stands.

**Filing `WM-OPS-P1-01` — Doctrine ingestion sweep** as a queue row so every OPEN ticket gets a doctrine-alignment field on its next update (not a rewrite of shipped work). Ownership: Nehemiah tracks; Forge/Micah author the §7 fields per-ticket at their next contract update; Sentinel gates future verdicts against §7 conformance. See §5 queue row-add.

**Markov Pro DLA — 100% Completion Blueprint (Drive `1ovSJX99dT…`) — 16 modules + §16 Validation Gates.** All 10 Gate 6 DLA tickets (`WM-DLA-P1-01..10`) must map to a specific module. Filing this cross-check as `WM-DLA-P1-11` (module-mapping index) so no DLA ticket ships without its module id + validation-gate reference. See §5.

## 4 · Assembly-line handoff staleness — market open, Founder watching

Recomputed at 10:40 CDT. **Every ready handoff still exceeds 2h — up to 57h.** DEC-013 assembly-line-per-surface applies; Noah remains the shared-surface bottleneck for 4/6 items.

| # | Ticket | Ready handoff | Age (10:40 CDT) | Next actor | Assembly-line status |
|---|---|---|---|---|---|
| 1 | `WM-VP-P0-01` crypto POC=0.00 | Forge crypto-volume RC `9e56585` + Doctrine addendum `e768558` | ~40h since RC · ~30m since Doctrine addendum | **Noah** — impl per RC+§7 addendum | Shares `sessionVP.ts` family; run AFTER #2 (same file domain) |
| 2 | `WM-DATA-P0-01` day-change fallthrough | Forge fix contract `efe4bec` + dispatch `1725-noah-wm-data-p0-01-fix-contract.md` | ~17h | **Noah** — impl `isMarketOpen(assetClass,ts)` + single provenance resolver | **HEAD OF SERIAL — Founder-visible +0.00% rail** |
| 3 | `WM-BROKER-QUOTE-P0-01` tastytrade dxFeed | Atlas filed `f1ca9cd` + Forge Doctrine addendum `e768558` | ~17h | **Noah** (contract now Doctrine-complete) — parallel with #1/#2 (different file: `tastytrade.ts`) | Parallel — no shared surface with #1/#2 |
| 4 | `WM-DRAW-P0-01` runtime evidence | Sentinel V-012 static PASS `818bfee` + dispatch `1725-sentinel-verify-…` | ~17h since dispatch · ~10h since V-012 | **Sentinel** — runtime capture on Founder-authenticated Chrome | Blocked by RISK-001 (Gate 5) — Founder self-drive |
| 5 | `WM-BROKER-P0-01 Part C` UI pattern | Micah spec `926c783` (2026-07-31) | **~57h** — critical stale | **Noah** — impl per pattern; independent file → parallel with #1/#2/#3 | Parallel — bandwidth issue only |
| 6 | `WM-OF-P0-06` master-toggle | Forge `9e56585` + Micah visual `f208cdb` | ~40h | **Noah** — impl (design+visual both delivered) | Parallel — independent file |

**Noah reorder recommendation (unchanged from 00:15 draft):** #2 → #1 (serial on same file family). #3, #5, #6 run parallel between #2/#1 compile/test waits. Forge/Sentinel/Micah bandwidth: Forge picks up any new RC; Sentinel batches #4 with `UX-P0-01` when Founder-Chrome is available; Micah free for Gate 6 (Bible §46 Mobile) or Gate 7 (Bible-backlog spec authoring).

**No employee escalation to Founder** — routing here per DEC-011.

## 5 · Bible §46 mapping — stands from my 00:15 draft, republished for the record

My `adf13ac` 7-gate map is ops-focused (blocking axis). Bible §46 is release-readiness-focused. Two-column mapping:

| Bible §46 Release Gate | Ops-gate coverage | Status | Delta |
|---|---|---|---|
| 1. Data truth | Ops Gate 1 | 🟡 RC done, Noah impl next | Aligned. |
| 2. Chart stability | Ops Gate 2 | 🔴 5 in flight | Aligned. Gate 2.4 rule-corrected (static-only ≠ green). |
| 3. Trading safety | Ops Gate 3 + partial Gate 7 (5 Risk tickets) | 🔴 5 tickets + paper-lifecycle gap | **GAP → `WM-PAPER-P0-01`** filing (§5 queue). |
| 4. Security | Ops Gate 4 + Passport tickets | 🔴 3 days silent + **cross-product** per V-013 | Elias escalation `0025-elias-…` + Dreamboard reviewer needed. |
| 5. Legal / compliance | *(none)* | ⚪ BLANK | **GAP → `WM-LEGAL-P0-01`** (Founder-only kickoff). |
| 6. Mobile quality | Scattered (WM-RESP-*) — no single mobile gate | 🟡 partial | **GAP → `WM-MOBILE-P0-01`** (Micah lead → Sentinel iPhone/iPad verify). |
| 7. Support | *(none)* | ⚪ BLANK | **GAP → `WM-SUPPORT-P0-01`** (Founder-only scope decision). |

## 6 · §45 Founder-only decisions — 8-item delta (unchanged from 00:15 draft)

Atlas surfaced 8 in `2026-08-02-atlas-bible-vision-vs-current-state.md:129-138`. Bible §45 has 15. Delta filing (compact — one row each, sized 1 line, Founder scopes on ruling per §48):

| ID | Item | Bible ref |
|---|---|---|
| WM-COPY-JURIS-01 | Copy trading timing + jurisdiction | §38 |
| WM-LEGAL-P0-01 | Legal review kickoff (also §46 Gate 5) | §46 |
| WM-PERF-DEFAULTS-01 | Public performance defaults | §37 |
| WM-TIER-STRUCTURE-01 | Subscription tier structure + pricing | §39 |
| WM-TOKEN-SUPPLY-01 | WM$ / token supply + allocations | §45 |
| WM-FUTURES-SCOPE-01 | Futures/options launch scope (distinct from `WM-BROKER-QUOTE-P0-01` wiring) | §45 |
| WM-LOUNGE-ALGO-01 | Lounge algorithm | §Lounge |
| WM-NODE-RULES-01 | Gold/Platinum/Diamond node rules | §45 |
| WM-BRAND-NAMING-01 | Entity/brand naming | §45 |
| WM-VPW-METRIC-01 | VP Worlds default metric (blocked-on `WM-VP-WORLDS-DEF-01`) | §45 |
| WM-SUPPORT-P0-01 | Support scope (also §46 Gate 7) | §46 |

## 7 · Queue row-adds this sweep (single `## NEHEMIAH 2026-08-03 10:40 CDT` section appended to `ACTIVE_TASK_QUEUE.md`)

- `WM-OPS-P1-01` — Doctrine §7 field ingestion sweep across all open tickets (Nehemiah tracks; Forge/Micah author per-ticket at next update).
- `WM-DLA-P1-11` — Markov Pro DLA module-mapping index (every DLA ticket must cite §16 module id + validation gate).
- `WM-PAPER-P0-01` — Paper-trading lifecycle E2E (Bible §46 Gate 3 gap).
- `WM-LEGAL-P0-01` — Legal review kickoff (Bible §46 Gate 5 gap + §45 Founder-only).
- `WM-MOBILE-P0-01` — Mobile-parity re-sweep at HEAD (Bible §46 Gate 6 gap).
- `WM-SUPPORT-P0-01` — Support-surface bootstrap (Bible §46 Gate 7 gap + §45 Founder-only scope).
- 10 §45 Founder-only decision placeholders (compact — 1 line each, no scoping).

## 8 · Critical path (per Founder "almost done, so close")

Matches Atlas: **`WM-DATA-P0-01` → `WM-VP-P0-01` crypto → `WM-BROKER-QUOTE-P0-01` → `WM-DRAW-P0-01` runtime verify → `WM-SEC-P0-01/02` (Founder-blocked, `-P0-02` now cross-product)**. Nehemiah is not adding scope to the critical path this sweep — only correcting Gate 2.4 rule + Gate 4 scope.

Next Nehemiah sweep on next handoff move or at Sentinel APPROVE of any Gate 2 ticket.
