# WM PRO SHIFT D — CANON-DIRECTED (open gates)
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Opened on Founder instruction to read all Drive canons before executing.

## CANON READ (this shift)
- **Founding Execution Contract & Living Implementation Ledger**
  (1KBFVpIkT0dDF1uXowddm0XpOoRCVyWwCzXvylHp6efs) — 543,170 chars, 17 top-level
  sections. Read §2 Authority Order, §5 System Truth Law, §6 No-Duplication,
  §8 Multi-Device Acceptance, §9 Four-Gate DoD, §10 2+ Hour Execution Law,
  §13 Open Gates in full. Sections 1/3/4/7/11/12/14–17 mapped by heading, not
  read line-by-line — stated plainly rather than implied.
- Previously read and still in force: Transformation UI Visual Implementation
  Contract (2026-09-01), WM Pro Five-Hour Finish Canon + ANTI-DRIFT law.

### What the contract changed about how I work
**§9 Gate 4 — EXPERIENCE**: "Observed live, interacted with, before/after
compared, desktop verified, **tablet/mobile verified where relevant**… If Gate
4 fails, the task is not done." Every prior shift verified desktop only.
**§8** names the required widths: iPhone ~375/390/393/430, iPad ~768/820/1024,
Desktop 1280/1440/1728+. "Candle readability is sacred."

## SHIPPED
| SHA | Fix |
|---|---|
| deb3437 | three chart overlays could not fit a phone viewport |
| 7e33a7c | /charts honours `?symbol=` — deep-link continuity |
| d1db3b2 | six navigation sites now emit shareable chart links |

### deb3437 — overlays that cannot fit a phone (§8)
- **ChartSettingsModal**: width 520 centred by `calc(50% - 260px)`. At 390px
  that computes left = **-65px** with a right edge at 455px — off BOTH sides at
  once, controls unreachable. Now clamped in width and left.
- **ChartToolbar indicators**: fixed 420px anchored to its trigger, ~130px past
  the right edge at 390px.
- **DrawingToolsPanel**: found by the new Sentinel, NOT by eye. Its width was
  already clamped (`maxWidth: 94vw`) but both portal dropdowns positioned at the
  trigger's raw `left` with no clamp, so a panel anchored mid-toolbar still ran
  off-screen. Added a shared clampLeft.

Sentinel sweeps for fixed overlays wider than the narrowest phone WITHOUT a
viewport clamp, unguarded `calc(50% - Npx)` centring, and anchored dropdowns
missing a position clamp; plus exercises the clamp arithmetic at all ten widths
§8 names. Desktop layout byte-identical.

**PROOF STATE: TESTED, not PROVEN.** See blocker below.

### 7e33a7c + d1db3b2 — Scanner → Deck → Chart continuity (§13 open gate)
Verified broken on prod: `/charts?symbol=NVDA` → opened **TSLA**.
`/charts?sym=AMD` → **TSLA**.

/command-deck already honoured `?symbol=` and its own comment says why —
external links from /heatmaps, /scanner and docs must seed a market. /charts
never implemented the other half: ChartsDashboard read SymbolContext only, and
that context restores from localStorage, so deep links, shared URLs and reloads
silently showed whatever symbol the browser last held.

Then the reverse half: SIX navigation sites across five surfaces pushed a BARE
`/charts` (scanner ×2, nectar, nectar/[symbol], heatmaps, news). All called
setActiveSymbol first, so in-app nav worked — which is exactly why it survived.
The break only appears once the URL matters: a shared chart link opened a
different market for the recipient than the sender saw.

SymbolContext remains the single owner (§6 NO-DUPLICATION) — the URL only seeds
and carries it. Same param name as the deck; no second convention. URL value is
pattern-validated before reaching setActiveSymbol, which persists to
localStorage.

**PROVEN ON PROD**: `/charts?symbol=NVDA` → breadcrumb NVDA;
`/charts?symbol=AMD` → breadcrumb AMD, search box AMD, AMD chart rendered.

## BLOCKER — GATE 4 RESPONSIVE PROOF STILL OWED
Programmatic window resize does not work in this environment: `resize_window`
reports success, but `outerWidth` stays pinned at 1568 and `innerWidth` never
leaves 1920, so no media query ever changes. I could not produce Gate 4 device
observation and did **not** claim it.

The overlay fixes are therefore TESTED (arithmetic proven at every §8 width)
but NOT device-observed. To close: open prod on an actual iPhone/iPad, or
un-maximise the Chrome window so resize takes effect, then open the chart
Settings modal, Indicators popover and Drawing Tools panel at 390px.

## SENTINELS UPDATED, NOT WEAKENED
Four existing Sentinels asserted the literal `router.push("/charts")`. Their
intent — /charts is the canonical navigation owner, and the symbol is set
BEFORE navigating — is preserved and now additionally asserts the symbol is
carried. I initially added a negative "no other route" assertion; that was
over-reach (these pages legitimately route elsewhere) and I removed it rather
than loosening the real check.

## STATE AT CLOSE
- Suite: **339 files / 3156 tests passing** (unpiped, exit 0)
- TypeScript: clean (exit 0)
- main: green

## CARRIED FORWARD
- **Gate 4 responsive observation** (blocker above) — highest priority.
- /journal trade-detail canvas — blocked, journal has 0 entries.
- §13 gates not yet attempted: Delta Bubbles level ownership, Live VP render
  geometry proof, Decision Memory sealed pre-outcome snapshots, Supabase
  migrations authored-but-unapplied, paper execution state machine realism.
- **Founder unblock:** `/api/market-memory/coverage` 503 names
  `SUPABASE_SERVICE_ROLE_KEY` — paste into Cloudflare env vars.
- Chrome flags "GoFullPage" extension as violating Web Store policy; Founder's
  decision, noted not actioned.

## TIMING TRUTH
No shift duration claimed. Recorded: 3 implementation commits, 9 files brought
under viewport/continuity guards, 2 live production verifications, 1 blocker
recorded honestly rather than worked around, 0 plan rewrites, 0 Founder questions.
