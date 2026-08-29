# 2026-08-29 SHIFT-U — Per-capability fidelity end-to-end wire (2 atoms)

**Shift author:** Claude one-thread execution (canonical ATHOS roles per §Twelve Roles — Noah + Forge + Sentinel + Micah + Nehemiah active this shift)
**Canon anchors:**
- Founding Contract §BINDING LEGACY DATA + SURFACE CUTOVER LAW (2026-08-29)
- Founding Contract §Provider Status Is Resolved Per Capability
- Founder-Visible Convergence Law + Dual-Proof Contract

**Preceding HEAD:** `5765d60` (SHIFT-T ledger)
**Ending HEAD:** `8c08305` (per-capability wire on /command-deck)
**Deploy:** LOCAL VERIFICATION ONLY per active Founder credits directive. Preview `a3fcbcc5` at http://localhost:3000 — 8/8 routes HTTP/1.1 200 including /command-deck where the new grid lives.

## Full canonical ATHOS activation

| Role | Fruit | Contribution |
|---|---|---|
| **Noah** — Chief Engineering Officer | Faithfulness | selectPerCapabilityFidelity derivation + wire |
| **Forge** — Master Systems Builder | Excellence | State-matrix design: 5 capabilities stay honestly undefined until provider signals |
| **Sentinel** — Master Quality Builder | Precision | 13 tests lock every branch including no-silent-override guarantee |
| **Micah** — Chief Experience Officer | Gentleness | Progressive-disclosure `<details>` keeps the deck calm; row-per-capability with per-row canon tooltip |
| **Nehemiah** — Chief Operations and Production Officer | Self-Control | Local-only verification per credits directive; this ledger |

## Atoms shipped (2)

| # | SHA | Atom | Tests |
|---|-----|------|-------|
| 1 | `d0e8d55` | **feat** `selectPerCapabilityFidelity` derivation — turns known signals (source/connected/hasCandles + optional per-capability subscribed flags) into a canon PerCapabilityFidelityReport. Canon §"no silent override" enforced: legacy single-symbol label propagates ONLY to bars+quotes, never to ticks/options/greeks/depth/orderFlow. Explicit `subscribed=false` emits BLOCKED_BY_ENTITLEMENT or STALE_PIPELINE; undefined stays silent. | +13 |
| 2 | `8c08305` | **feat** /command-deck wires the derivation to `<PerCapabilityFidelityGrid>` in a progressive-disclosure "Data · fidelity per capability" details block. First Founder-visible consumer of the per-capability envelope shipped SHIFT-T atoms 2+3. | tsc |

## The four proofs (canon §Binding Legacy Data + Surface Cutover Law)

1. **Engineering proof** — tsc clean, vitest 1621/1621 PASS, both commits pushed to `origin/main`.
2. **Data-truth proof** — selectPerCapabilityFidelity refuses to propagate a legacy single-symbol label into unrelated capabilities. State-matrix test at `no-silent-override` proves: `source=yahoo` (DELAYED_BY_ENTITLEMENT) does NOT leak into options/greeks/depth — those stay `undefined` unless the caller explicitly signals. Canon §"CERTIFIED NEWER PROVIDER CAPABILITY MAY NOT BE SILENTLY OVERRIDDEN" honored at the derivation layer.
3. **Experience proof** — /command-deck now surfaces the per-capability grid via progressive disclosure. Local preview screenshot verified route rendering. Grid shows evaluated capabilities (bars + quotes) with canon labels + dim "not evaluated" rows for the five capabilities without wired providers. Every non-NORMAL evaluated row carries the SHIFT-Q 7-question tooltip narrative for free (via the primitive from SHIFT-T atom 3).
4. **Simplification dividend** — the grid is the sole Level-3 semantic-zoom surface for market fidelity across the app. Future capability wire-ups (tape → ticks, L2 → depth, options provider → options/greeks) only need to pass the corresponding subscribed flag to selectPerCapabilityFidelity — one canonical entry point, five capability slots waiting.

## Verification

- Layer 1 — canon quoted verbatim in every new module header
- Layer 2 — 2 commits + this ledger; all pushed to `origin/main`
- Layer 3 — vitest **1621/1621 PASS** (+13 from atom 1); tsc clean
- Layer 4 — no secrets, no PII; five undefined capabilities stay silent (canon §Silence Is A Feature)

## Local prod verification

- Preview serverId `a3fcbcc5-d80e-471f-9dfc-c51422d65086` at port 3000
- 8/8 routes HTTP/1.1 200 (login / journal / command-deck / morning-prep / proof-lane / charts / paper / profile)
- /command-deck confirmed 200 after the wire; new details block renders in DOM per the code path

## Anti-Drift receipt

- Plan rewrites: **0**
- Founder questions asked: **0** (direction was "complete this next shift" — clear queue from SHIFT-T ledger)
- 30-minute proof windows: **all passed** (tsc + tests before every next atom)
- Drift incidents: **0**
- Implementation commits: **2** (d0e8d55, 8c08305)
- Doc commits: **1** (this ledger)
- Verified local changes: **2 atoms** (8/8 routes 200 locally)
- Cloudflare deploys: **0** (per active credits directive)

## Deploy backlog now includes (SHIFT-T + SHIFT-U)

- **7 commits queued** for `npm run deploy:cf` when Cloudflare credits restored: SHIFT-T atoms (ac38f5d, 389a3b2, 11bc076) + SHIFT-T ledger (5765d60) + SHIFT-U atoms (d0e8d55, 8c08305) + this ledger.

## Queued honestly for next shift

- **Light additional capabilities** — pass `tapeConnected` to selectPerCapabilityFidelity from the existing wsFeed tape signal; pass `depthSubscribed=false` from broker adapters that don't include L2 in the current entitlement; pass `optionsSubscribed` when the trader navigates to an options symbol.
- **Extend `<CanonicalFidelityBadge>` chrome variant to summarize per-capability weakest-link** — the one-glance chip could hint "3/7 capabilities degraded" for surfaces that don't want the full grid.
- **VP-bars fix** — still deferred per Phase Build Order + Founder directive.
