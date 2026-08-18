# CLAUDE SHIFT BATON — 2026-08-18 (early hours)

**Team:** Claude Opus 4.7 (single-thread).
**Repo HEAD at shift open:** `fb6699b` (end of prior PM baton).
**Repo HEAD at shift close:** `ada9e64` (bumps one further after this baton lands).
**Suite growth this window:** 581 → **585 / 72 files** (+4 logout-isolation tests).
**tsc --noEmit:** clean throughout.
**Chrome verification:** live in founder's authenticated Chrome (Browser 1 · macOS · `deviceId f7790942-3dea-4f1b-b6ca-f12f891b99c6`).

---

## Two lanes closed this window

### 1. MainChart SAVED overclaim P0 — closed

- Sentinel Nectar Persistence Authority §"P0 TRUTH DEFECT — SAVED OVERCLAIM" — MainChart's Live Session chip labelled every non-zero coverageEvents as `Saved N` regardless of actual acknowledgement.
- Fix (bounded, single call-site): coverage label now consults `nectar.retentionState`:
  - `SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS` → **Saved**
  - `BROWSER_LOCAL_SUMMARY_NO_RAW_PAYLOADS` → **Browser**
  - `SESSION_ONLY_NO_RAW_PAYLOADS` → **Observed**
- aria-label + title expanded to match verbatim for each tier. When the acknowledged-write lane lands and retentionState upgrades, "Saved" returns automatically without another edit.
- Sweep verified no other overclaim sites in `src/components` / `src/app`.

### 2. Logout-isolation P0 — 13 owner-scoped keys now purged on sign-out

Founder Nectar Persistence Authority: *"logout/account transition clears owner-local symbol, Nectar and canonical runtime state without deleting server history."*

Pre-fix state: shared browsers leaked cross-user data. User A signs in, observes/paper-trades/earns points → signs out → User B signs in → sees User A's state.

Four commits closed the class:

1. `114d2a1` — sessionSymbolStore (`wm:session-symbol-store:v1`)
2. `d588065` — paperTrade (`wm_paper_state`) — new export `clearPaperState`
3. `1a59f5e` — WMSContext (`wm_token_state`) — new export `clearWMSState`
4. `a562c45` — `src/lib/logoutIsolation.ts` sweeps 10 more owner-scoped keys + 4 deterministic tests via fake-localStorage
5. `ada9e64` — extension: adds `wm_edu_progress` (caught by live-Chrome localStorage audit)

Total keys purged on sign-out (13):

| Key | Owner |
|---|---|
| `wm:session-symbol-store:v1` | sessionSymbolStore |
| `wm_paper_state` | paperTrade |
| `wm_token_state` | WMSContext |
| `wm-profile` | profile draft |
| `wm-profile-avatar` | avatar data URL |
| `wm-profile-bg` | profile bg color |
| `wm-radio-liked` | liked radio tracks |
| `wm_songs` | uploaded music |
| `wm_watchlists` | user watchlists |
| `wm_quick_syms` | SearchPanel quick-access |
| `wm_scanner_starred` | scanner starred |
| `wm_scanner_alerted` | scanner alerted |
| `wm_journal_entries` | journal entries |
| `wm_edu_progress` | education completion / notes |

Explicitly NOT touched (Sentinel boundary):

- `wm:nectar:coverage-continuity:v1` — separately owned by sessionNectar
- `wm_settings` — device-level (theme, font size)
- `wm-install-dismissed` — PWA prompt state, device-level
- `wm-watchlist-prices` — cache
- `wm-tape-symbols` — TickerTape customization, device-level
- `wm_chartSettings` — chart preferences, device-level
- `HM_CACHE_PREFIX + tf` — heatmap %s cache

All four cleaners wrapped in try/catch so a storage failure never blocks sign-out. Ordering: logout API → four store clears → cached-user removal → setUser(null) → router.replace. New user's initial render sees empty owner-local state.

---

## One visible transparency ship

**`dc2dbc4` — /nectar hero + per-symbol absolute wall-clock timestamps.**

VaultHero adds an "EARLIEST OBSERVATION · AUG 15, 7:53 AM" line beneath the body copy, sourced from the minimum horizon across all slots. Each SymbolCard gains a "since Aug 15, 7:53 AM" line under its relative-age label ("2D MEMORY"). Live-verified in founder's Chrome — both lines render at the correct localized wall-clock time.

Absolute + relative together give the trader a richer sense of what "memory" actually spans, without fabrication.

---

## Test suite delta

- Pre-shift: 581 / 71 test files.
- Post-shift: **585 / 72** — 4 new deterministic tests on `logoutIsolation.ts` (removes 11 seeded keys, no-op, SSR-safe, getItem-throw safe).
- tsc `--noEmit` → 0 errors throughout every commit.

---

## Preserved as-is (untouched)

- Six-file parallel Command Deck team dirty tree — every hash verified byte-identical at shift close.
- NV-01 V1.0.1 delta spec (SHA `5885df0b87f53ad30334ad105e8c7eb37e89d42287ae16f76bf0a8e36de67e1e`) — Sentinel independent re-review pending.
- SF-D01 branch ledger commits `74c95cf` + `a474c22` — deferred to `spaidsnipes`.

---

## Baton — next-owner actions (unchanged from prior baton + one new)

1. **Founder or Sentinel** — commit-authorize the /profile Growth React #310 candidate (`981d293cc9…`). Live P0 today; traders cannot open Growth.
2. **Founder or Sentinel** — commit-authorize the DecisionChain hint atom candidate (`64cb9610…` + `de79209b…` + `0a4251c7…`). Gates 1-2/6 PASS.
3. **Founder** — iPad + iPhone device-frame verify of /command-deck, /nectar, /nectar/[symbol], /profile (post-Growth-fix).
4. **Founder** — sign-out flow verification: after signing out, `localStorage.getItem("wm_paper_state")` etc. should be null (13 keys). This shift closed the code path; runtime verification when Founder is next at browser is honest evidence.
5. **Sentinel** — re-review NV-01 V1.0.1 (SHA `5885df0b…`).
6. **Sentinel** — re-review CDHT V1.0.3 (Forge/Market Intelligence lane).
7. **Founder** — execution-authorize Phase 1 Sunday-futures implementation packet.
8. **Founder** — implementation-authorize C03 V1.0.1 acknowledgement envelope.
9. **Nectar Tier 2** — Supabase table shape decision (still open).
10. **project-6bui2** — secondary Vercel project FAILURE (operational).

---

## Sanity-check commands for the next shift

```bash
cd ~/wealthymindsets-pro
git fetch --all --quiet && git log --oneline -35
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run --reporter=dot
git status --short   # expect only the six preserved dirty files + tsbuildinfo
```

Expected: HEAD at latest, 585+/72+ tests green, 0 tsc errors, dirty tree unchanged.

Mission status: ACTIVE / CONTINUATION REQUIRED. R00 remains RETURN and WM NO-GO at Sentinel's release-gate level until the named authorizations arrive.
