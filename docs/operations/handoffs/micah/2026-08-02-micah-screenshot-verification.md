<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# MICAH SCREENSHOT VERIFICATION — Noah's shipped surfaces

**Author:** Micah · **Date:** 2026-08-02 (~00:15 CDT) · **Repo HEAD:** `499e504`
**Method:** live on authenticated production `/charts` via Dave's connected Chrome (I never enter credentials). Symbol BTC (crypto → live aggressor tape, so bubbles + delta populate).
**Viewport honesty:** **desktop confirmed live.** 360/390/834 authed captures remain blocked — Dave's Chrome is display-clamped to the physical 1920px display, and the mobile-capable in-app browser is unauthenticated (`/charts`→`/login`). Full analysis: `2026-07-30-micah-scanner-a11y-ticket.md §3.5`. This is now a repeat blocker on every Micah verdict — escalation + one-time unblock at the bottom.

---

## ✅ WM-UX-P0-01 — Delta control migration (Noah `0270590`) — VERIFIED PASS (desktop)

Verified against my spec `2026-07-31-micah-wm-ux-p0-01-delta-panel-migration.md`. Two screenshots, both surfaces at one instant:

**Screenshot A — Smart Money panel (`ss_5902b3x6h`, `ss_6737ipcve`):**
- **"WM DELTA BUBBLES"** section now contains a **"Levels shown"** segmented control with all four presets **`5` / `7 ★` / `10` / `15`** (`5` selected, highlighted green). ✅ matches spec §2 placement (in the section that renders the bubbles), §3 (segmented not slider, `7★` default retained, ≥12px).
- Water bubbles render directly below the control (red/green, delta values) — control sits with the effect it governs. ✅ closes the "control far from effect" gap that was the point of the ticket.

**Screenshot B — Big Trades gear dropdown (`ss_6737ipcve`):**
- Gear now shows **only** Sound / Pause / **Bubbles shown** (All·25·50·75·100·150·200·Custom+SET) / Simultaneous Mode / Reset.
- **No "Delta levels" control present.** ✅ confirms spec §5 — removed from the gear, single source of truth. (The remaining "Bubbles shown" is the *bubble-max quantity* control — a different concern, correctly left in Big Trades.)

**Verdict:** Noah's implementation matches the spec on every desktop-checkable criterion (placement, segmented form, default marker, removal from gear, single source). Open on this ticket: the **≥44px touch target + arrow-key roving at phone width** (spec §6.4) — Noah's commit message says he built ≥44px + roving; I can confirm the DOM shows it but **cannot photograph it at 360/390/834** until the capture blocker clears.

---

## Badges (`fd12f1e`) & W trigger (`bda48c9`) — already verdicted, not re-opened

These were **not** re-screenshotted here because I already issued verdicts (see `2026-07-31-micah-dec012-backfill-verdicts.md`):
- **Badge `fd12f1e` → ITERATE** (ticker-tape provenance is a 7px dot with hover-only label + color-only live/delayed). Desktop `ALPACA · LIVE` badge confirmed rendering live.
- **W trigger `bda48c9` → KEEP concept + one fix** (32px height < 44px; see `2026-07-31-micah-wm-brand-w-trigger-01-ownership-spec.md`). Desktop confirmed: WMLogo + "Smart Money" render, glow toggles on open.

---

## tastytrade (`aa68aa0`→`627be87`)
Forge/Noah data-layer + adapter work (broker connectivity), **not a Micah presentation surface** yet. The user-facing piece is the **broker connect card UI**, which I specced today: `2026-07-31-micah-wm-broker-p0-01c-connect-ui-pattern.md`. No connect UI is rendered to screenshot until Noah builds against that spec + Forge greenlights the adapter. Nothing for me to verify visually yet — flagging honestly rather than manufacturing a screenshot.

---

## ⚠️ ESCALATION — the mobile-capture blocker needs one Founder action

Every Micah verdict is required to ship 360/390/834 screenshots. **I cannot produce authed mobile captures with current tooling** (proven repeatedly this session): authed Chrome = desktop-only (display-clamped); mobile-capable in-app browser = logged out. Desktop functional verification is solid; the phone/tablet *pixel* sign-off is the only gap, and it's blocking closure on WM-UX-P0-01, WM-BRAND-W-TRIGGER-01, and will block WM-DRAW-P0-01's touch-draw criteria.

**One-time unblock (Founder, pick one):**
1. Sign into a local `localhost:3000` dev session once — then the in-app browser (true 360/390/834) captures every authed surface. **Cleanest.**
2. Toggle DevTools device toolbar on your Chrome while I screenshot the three widths.
3. Accept desktop functional verification + treat mobile-layout sign-off as a known deferred item until a device/emulator path exists.

Until one is chosen, I will keep marking mobile pixel-sign-off as *pending*, not *passed* — I won't label a desktop shot as a phone shot.
