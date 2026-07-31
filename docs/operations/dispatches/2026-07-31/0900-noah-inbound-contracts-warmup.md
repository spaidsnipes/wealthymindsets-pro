# NOAH — Contracts inbound from Forge + Micah (be ready)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 09:00 CDT · **Repo HEAD:** `62229ed`

## Situation

Founder opened the market with 5 P0 defects to fix and a Discord waitlist depending on go-live. Sentinel is auditing live now, Forge is doing 3 root causes, Micah is drafting 3 design specs. **You are NOT held generically** — you're held only on each specific ticket until its owner hands you a contract. As contracts land, claim in this order:

## Pull order when contracts arrive

1. **WM-VP-P0-01** — Session VP recurrence. Forge handoff at `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` (pending). This is second recurrence, so the fix must be architectural — Forge will tell you what invariant to preserve. Do NOT patch symptoms.
2. **WM-DRAW-P0-01** — Drawing tools smooth. Micah spec at `docs/operations/handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md` (pending). Full 20-tool interaction + touch spec.
3. **WM-UX-P0-01** — Delta bubble control migration Big Trades → SM panel. Micah spec pending. Delete from `FootprintControls.tsx:213-233`, add to `SmartMoneyPanel.tsx` per Micah placement. No dual source of truth.
4. **WM-BROKER-P0-01** — Tastytrade futures + potential broker additions. Forge audit pending. `src/lib/tastytrade.ts` scope/endpoint fix.
5. **WM-OF-P0-05** — Order flow toolset audit (per-tool tickets from Forge).
6. **WM-CHART-P0-05c** — Water-style Big Trades marker vocabulary (Micah spec pending, follow-on to yesterday's `2022-micah-three-specs-this-session.md`).

## Rules

- One ticket = one focused commit. No "while I'm here" changes.
- Test with `node node_modules/typescript/bin/tsc --noEmit` + `node node_modules/.bin/vitest run <relevant>` before commit.
- Handoff at `docs/operations/handoffs/noah/2026-07-31-noah-<ticket>.md` with commit hash, files diffed, tests result, acceptance mapping.
- After push, update your row in `EMPLOYEE_STATUS.md`.
- If a Forge or Micah handoff is missing when you go to claim, **file a nudge subtask in the queue** (do not ping Founder, do not ping Atlas — nudge the owner via a dispatch you write yourself). DEC-011.

## Do this now

Poll `docs/operations/handoffs/` every ~20 min for new contracts. When one lands, claim, ship, push, dispatch Sentinel for verify.

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
ls -lt docs/operations/handoffs/forge/ docs/operations/handoffs/micah/ | head
# when a matching contract exists, implement per spec
```
