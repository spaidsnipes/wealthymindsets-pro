<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# MICAH — 3 design specs owed TODAY (drawing tools, Delta panel migration, DEC-012 backfill)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 08:57 CDT · **Repo HEAD:** `62229ed`

## Situation

Founder is on live market at 08:52 CDT and named two design-lane items directly at you, plus your existing DEC-012 backfill dispatch. Market open = real testing window. Go.

## Your 3 specs

### 1. WM-DRAW-P0-01 — Drawing tools "fully clean and smooth"

All 20 tools on left rail. Founder's word: "clean and smooth." That's your definition to write — precise pixel + timing + interaction spec, so Noah has criteria not vibes.

Deliverable (`docs/operations/handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md`):
- Tool inventory (20 tools by name).
- Per-tool interaction spec: mousedown → mousemove → mouseup + touchstart → touchmove → touchend + keyboard cancel (Esc).
- Handles: size, target ≥12px, hover state, drag responsiveness, snap behavior.
- Animation timing: transitions <150ms, no jank at 60fps, no layout shifts.
- Empty state (no drawings yet), active state (one selected), locked state (visibility off).
- Acceptance criteria Noah can verify against.
- Screenshots or annotated mocks at 360×800, 390×844, 834×1194, desktop.

### 2. WM-UX-P0-01 — Move Delta bubble count control from Big Trades → Smart Money panel

Founder ruling: "on the big trades drop down, i can choose how many delta bubbles i want also, thats wrong i should be able to choose how many delta bubles i want in the smart money tools panel when i open the wealthyminds smart money tools."

CURRENT: `src/components/chart/FootprintControls.tsx:213-233` (Delta levels 5/7/10/15 grid inside Big Trades gear).
EXPECTED: control lives inside the Smart Money panel opened by the branded W trigger.
Storage `wm_delta_levels` already exists — don't move the key, just the UI.

Deliverable (`docs/operations/handoffs/micah/2026-07-31-micah-wm-ux-p0-01-delta-panel-migration.md`):
- Where in the SM panel it goes (recommend: dedicated Delta Bubbles section, top-third).
- Interaction: same 5/7/10/15 grid or upgrade to slider — you decide, justify.
- What visually happens on the chart when value changes (Founder feedback loop).
- Removal from Big Trades gear (no dual-source of truth).
- Acceptance criteria + screenshots at 4 viewports.

### 3. DEC-012 backfill (from yesterday's dispatch `2131-micah-inherit-3-surfaces-going-forward.md`)

Still open. 3 surfaces (badges, P0-05b input, W trigger). Verdict per surface: KEEP AS-IS / ITERATE / RETURN. Publish today.

## Never do

- Change price calculations, source resolution, or data values. Presentation only.
- Ship implementation. Noah implements after your spec.
- Redesign scope you weren't asked for. Founder listed exactly what.
- Wait for the Founder. DEC-011.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# open authenticated production /charts in Chrome, drive each drawing tool + open SM panel
# publish 3 design spec handoffs + retire the earlier dispatch
git add docs/operations/handoffs/micah/2026-07-31-*.md docs/operations/EMPLOYEE_STATUS.md docs/operations/dispatches/2026-07-30/retired/
git commit -q -m "design(micah): drawing tools + Delta panel migration + DEC-012 backfill verdicts"
git push origin main
# dispatch Noah with each spec's acceptance criteria
```
