# PR25 Provider Fan-out Backlog Seed — 2026-08-12

Seeded from Sentinel note S-02 of `NECTAR_V2_MANIFEST_CLOSURE_PREFLIGHT_2026-08-12.md`. Backlog artifact ONLY — no expansion of the frozen V2 61-entry manifest, no source edit, no test, no deploy.

## Why
Founder UI-transformation priority #18 requires a canonical shared ingestion / request-governor / cache path so many UI surfaces stop independently hammering providers. The V2 Nectar contract lays the foundation with two ADD files:
- `src/lib/marketData/providerRequestGovernor.ts`
- `src/lib/marketData/clientRequestCoalescer.ts`

These are the intended chokepoints. Files below currently bypass them by holding their own `setInterval`/`fetch`/hook wiring, and each must eventually be migrated behind the shared governor. PR25 is the follow-on ticket that owns those migrations.

## The 12 fan-out consumers (base `61b20a2d…`, NOT in V2 manifest)

### Page routes (7)
- `src/app/backtesting/page.tsx`
- `src/app/heatmaps/page.tsx`
- `src/app/journal/page.tsx`
- `src/app/news/page.tsx`
- `src/app/paper/page.tsx`
- `src/app/scanner/page.tsx`
- `src/app/tv/page.tsx`

### Chart widgets (4)
- `src/components/chart/FearGreedWidget.tsx`
- `src/components/chart/LeftSidebar.tsx`
- `src/components/chart/PnLStatsPanel.tsx`
- `src/components/chart/WatchlistGrid.tsx`

### Layout (1)
- `src/components/layout/MainLayout.tsx`

## Boundary conditions for PR25 (draft, NOT approved)
1. PR25 scope MUST NOT modify any V2 61-entry manifest FROZEN path. If migration requires editing a FROZEN path, that path is re-declared as EDIT in a superseding manifest, with fresh Sentinel APPROVE/RETURN.
2. Each migration is one file, one commit, one focused test: consumer swap from direct provider call → governor/coalescer subscribe. Coverage/gap contracts stay owned by the V2 owners.
3. `MainLayout.tsx` is the load-bearing composition surface — likely first, so downstream page routes inherit the governed transport rather than each migrating in isolation.
4. Founder BTC tab, Nectar durability, WM Pro NO-GO gate all still apply — PR25 does NOT release until V2 is proven and adopted.

## Explicit non-goals
- No new provider (Alpaca/Yahoo) endpoints added under PR25.
- No raw-payload persistence — rights remain UNKNOWN/fail-closed.
- No UI redesign; only transport swap. Design-system / Command Deck work is separate.

## Exact next owner / action
- **Nehemiah** — hold this seed until V2 preflight moves from PASS → Sentinel APPROVE → founder capacity authority → implementation gate.
- **Sentinel** — resolve S-01 canonical-SHA drift before any PR25 manifest is drafted (same serialization bug would recur otherwise).
- **All boundary preservations from V2 preflight remain in force.**

MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.
