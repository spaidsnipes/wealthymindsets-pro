# WM PRO — CURRENT STATE FOR NEXT TEAMS · 2026-08-23

**Read this first if you're picking up work on WM Pro. This is the point-in-time state a fresh team needs to resume without re-deriving everything from git history.**

Authoritative canon is in Google Drive (Founder Dave / dhill5711@gmail.com). This doc is the point-in-time repo/product overview + open lanes. Both must be honored.

---

## 1. Repo + prod state (2026-08-23T10:19Z)

| Signal | Value |
|--------|-------|
| Main HEAD | `8eddd01` (shift-I baton close + a docs checkpoint from parallel team) |
| Test suite | **916 / 916 PASS** across 116 test files |
| tsc | **0 errors** |
| Preserved dirty files | 5 M + 6 ?? — must remain byte-identical every shift |
| Prod deployment | **HTTP 402 `DEPLOYMENT_DISABLED`** since ~2026-08-22 evening — Vercel billing pause; Founder committed to resolving "next week" |
| Local dev | `npm run dev` → localhost:3000 serves SSR HTML in ~100ms |

## 2. Governing canon (Google Drive, Founder-authored)

Cite the fileId + section in every commit that touches domain semantics.

| Doc | fileId | Purpose |
|-----|--------|---------|
| Founding Execution Contract | `1KBFVpIkT0dDF1uXowddm0XpOoRCVyWwCzXvylHp6efs` | How work is done + evaluated |
| Breakthrough Night Full Helicopter Audit | `1Us8O2iYlYl7fDuRe42DjZGh7dfsLXLh6ZjGA-pTZ4-0` | §20 3h shift, §21 anti-evasion, §22 ORKIN |
| 3·6·9·12 Challenge Engine v0.2 | `1D98TgwfwvyEWSfbI-ALW4VcbYfGC7ZOo1JGXZC_1JfU` | Proof Lane math, §21 Founder launches 2026-08-24 |
| F→A+ Student Course v1.0 | `1PPLziv55iQW9HR8wfFNM3zVbpnGiOA7qHd3ESwEkn1o` | 12-studio academy taxonomy |
| Causal Market Model | `1DhC4mykuiBNkjFgWw0Qp3_DEn104aJYz80lTnilPm3o` | Market reasoning canon |
| Market Reality / ATH Data Feed | `1QIQwhLfKr7FcLEpbBF1xVfLlnwUXhWrDhkPcqSusFps` | Truth-label taxonomy + UI rendering |
| 2029 Integration Glue | `10a0h8xJVnQTzwW004f2rE-NiGHNfPQLBpcjt94P1tiw` | Cross-surface integration + open decisions |

Meta-contracts written this week (in this repo):
- `docs/operations/ATH_WOW_SUPER_BUILDER_CONTRACT_v1.md` — how builders (human/AI) must execute
- `docs/operations/ATH_WOW_TEAM_PROMPT_v1.md` — permanent onboarding prompt
- `docs/operations/ATH_WOW_HELICOPTER_VIEW_2026-08-22.md` — invention → mission → contract linkage

## 3. Founder's Monday 2026-08-24 live launch — what he's counting on

Founder will begin the live **\$100 Proof Lane** the week of Monday 2026-08-24 (canon 3·6·9·12 v0.2 §21). Every surface below is on `main`, tests-locked, and ready — needs only Vercel billing resume to reach prod.

| Surface | Behavior locked on main |
|---------|-------------------------|
| `/journal` Log New Trade modal | Model M0/M1/M2 + STOCK/OPTION·100x + Planned R \$ + Realized R (auto). M0 hides entry/exit for clean no-trade day. |
| `/journal` header | Session R chip (canon §4 -2R / +3R gate) + Week Edge chip (canon §11 expectancy) |
| `/journal` filters | All / Win / Loss / BE + All / M0 / M1 / M2 + All / STK / OPT |
| `/journal` export | CSV (20 cols, RFC 4180) + JSON (versioned) — both include every Proof Lane field |
| `/journal` entry detail | Proof Lane block: Model / Planned R / Realized R / Contract |
| `/proof-lane` | Pace mountain THEORETICAL + MEASURED LIVE overlay reading real journal entries |
| `/charts` truth labels | HISTORICAL (never NO FEED) when candles are present + realtime unresolved |
| `/paper` right rail | MARKET PRICES · DELAYED (was misleading "Live Prices") |
| `/command-deck` SESSION | "market closed" on weekends (was misleading "disconnected") |
| `/api/broker/status` | per-broker certLevel + certPassedStages (canon §W3) |
| `/api/broker/certification` | dedicated cert endpoint |

## 4. Rejection guarantees enforced by-construction

Every one has a state-matrix test locking it. Adding a new consumer that bypasses these is a truth-defect.

1. `resolveChartSurfaceBadge(source, connected, hasCandles)` — chart with candles is never NO FEED
2. `computeJournalRealizedR({..., plannedRDollars})` — R undefined when Planned R absent; NEVER fabricated from bare pnl (canon §4)
3. `computeJournalPnl({..., contractType})` — options × 100 multiplier by construction (canon §6)
4. `sessionDetailText(session, connected, dow)` — weekend → "market closed"; weekday disconnected → "no data connection"
5. `computeCertificationLevel(id, reports)` — 11/12 stages is NEVER WRITE_LIVE (rejection: never round up)
6. `journalToCsv` / `journalToJson` — undefined fields dropped, never fabricated as 0
7. `selectSessionEdge` — expectancy undefined when no R-tagged entries; averages undefined when sample empty (canon §11)
8. `paceStatus` BEHIND → canon §12 verbatim "Timeline recalculated. Do not increase risk solely to catch the chart." Never "risk more" nudge.
9. `evaluateShutdown` — -2R hard stop + +3R baseline objective (never "quota")
10. Six preserved dirty files remain byte-identical every shift

## 5. Open lanes (biggest first)

Ranked by canon-priority + founder-visibility:

| Lane | Anchor | Notes |
|------|--------|-------|
| W1 canonical quote bus consumer migration | canon §Weakness W1 | 19 UI files still on raw provider paths per `docs/operations/DISCOVERY_2026-08-22_W1_QUOTE_BUS_ADOPTION.md`. Start with `MainChart.tsx → useCanonicalMarketState`. |
| Broker Certification Harness RUNNER | canon §W3 | Selector + endpoints landed (I-Bkt 9/10/12). Need runner that exercises submit → ack → fill → cancel → reconcile on paper accounts and files real reports. |
| Option Contract Lens fields | canon §6 | Modal currently uses free-text symbol ("TSLA 317.5P"). Add structural strike / expiry / entry premium / exit premium fields. |
| AI Adapter interface (ATHOS Gateway) | canon §12 | Gemini currently ad-hoc `/api/spaidbot`. Wrap in canonical AIAdapter. |
| `/education` 12-studio alignment | canon §23 (F→A+ Course) | Current 8 modules don't map to the canon 12 studios. |
| Cross-device certification pipeline | canon §22 CROSS_DEVICE_PASS | Chrome MCP viewport locked at 1912px in current session type. |
| Nectar authoritative store | canon §W7 | Currently browser-local. Cross-device consistency requires a sync path. |

## 6. Standing blockers (Founder authority)

1. **Vercel prod HTTP 402** — Founder must resume billing. Everything H+I shipped stays on main, tests-locked, awaiting prod.
2. **Chrome MCP viewport locked** — cross-device certification blocked in this session type.

## 7. How to resume a shift

Every shift ends by naming its next exact action; if you're a new agent picking up, that's the first sentence of the previous shift's baton.

Prior batons in this repo (newest first):
- `CLAUDE_SESSION_2026-08-23_SHIFTI_BATON.md`
- `CLAUDE_SESSION_2026-08-22_SHIFTH_BATON.md`
- `CLAUDE_SESSION_2026-08-21_SHIFTG_BATON.md`
- ... (search `docs/operations/CLAUDE_SESSION_*_BATON.md` for the chain)

Read the latest baton's "Next exact action" line and start there. Confirm you're on the exact SHA it names in the shift-clock section.

## 8. Working discipline

- Every shift = ≈180 active minutes. Do not round wall-clock into active minutes.
- Fix + Test = one atom. RED test must fail against pre-fix behavior.
- One breakthrough does not end a shift.
- Never destructive git. Never commit secrets. Never modify the 5 preserved dirty files. Never touch Founder's active BTC/TSLA trading tab. Never place unsafe real-money orders.
- Never claim LIVE when the data is DELAYED.
- Report PARTIAL SHIFT — X active minutes when you fall short. Truthful < rounded.

## 9. Update discipline for this doc

Rewrite CURRENT_STATE_YYYY-MM-DD.md at every shift-generation start. Never delete the previous version — it becomes an implicit changelog. Cite the new one from the latest baton so the next team lands here first.

---

*This doc is the plain-language handoff. The canon is the authority. The tests are the by-construction enforcement.*
