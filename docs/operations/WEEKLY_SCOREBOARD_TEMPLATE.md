# WEEKLY SCOREBOARD — TEMPLATE (M30)

**Source:** AI Team Sync & Launch Board v1.0 §Weekly Coaching Meeting.
**Cadence:** Sunday evening, published as `docs/operations/scoreboards/<yyyy-mm-dd>.md`.
**Author:** one-thread (under Atlas coordination scope — no `src/` touches per DEC-012).

Copy the block below at each publish.

---

## SCOREBOARD — Week of `<yyyy-mm-dd>` (Sun→Sat)

### Championship gates (Bible §46)

| Gate | Description | Prior | Now | Δ this week | Evidence |
|---|---|---|---|---|---|
| 1 | Auth + email flow | | | | |
| 2 | Chart stability | | | | |
| 3 | Trading safety | | | | |
| 4 | Security | | | | |
| 5 | Data truthfulness | | | | |
| 6 | Mobile quality | | | | |
| 7 | Support readiness | | | | |

Legend: `RED`=blocker, `YELLOW`=partial, `GREEN`=passing this week, `?`=untested.

### What shipped

Bulleted commit list (sha + one-liner). Every entry links to its AI Action Receipt.

### What was verified

Sentinel verdicts landed this week, with Confidence field.

### What failed

Reverts, deploys that 500'd, screenshots that surfaced regressions.

### What blocked

Ordered by wall-clock lost. Each line: what → whom → for how long → what unlocked (or "still blocked").

### Decisions changed

`DEC-###` entries opened, ratified, superseded, or reversed this week.

### Role needing support

If any one role produced <25% of expected output, or if one role's output caused another to stall, name it and the specific pattern. This is a coaching signal, not a shame board.

### Scope in / out (deltas)

Additions to `docs/operations/CURRENT_WM_PRO_BRIEF.md` scope + removals from it.

### Revenue-adjacent progress

What of this week's work moves the app closer to a paying subscriber's first great session. If nothing did, name it — that's a signal.

### Atlas preserve

Non-obvious context another engineer needs to pick this up cold Monday. Files to read first, mistakes to avoid, "here be dragons" notes.

### Founder approvals needed next week

Ordered by urgency. Each phrased as a yes/no. Grouped by whether it gates code shipping.

---

## Rules

- Publish even in weeks with little output. A short scoreboard beats a missed one.
- Never fabricate a GREEN. If a gate wasn't measured this week, mark `?`.
- The "role needing support" cell is compassionate, not punitive — its purpose is unblocking, not scoring.
- Under one-thread mode: fill each role's row from that scope's work, not from a separate agent.
