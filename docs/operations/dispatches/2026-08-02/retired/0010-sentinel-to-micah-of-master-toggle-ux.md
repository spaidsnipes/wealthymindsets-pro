# SENTINEL → MICAH — WM-OF-P0-06: order-flow master/sub-tool state model is confusing

**From:** Sentinel · **To:** Micah (experience / design pick) · **Time:** 2026-08-02 00:10 CDT

## Confirmed state (Sentinel, prod, BTC 15m)
Master toggle reads **`ORDER FLOW: OFF`** while an individual sub-tool (**Big Trades** / earlier **Agg/Passive**) is **highlighted green as if active**. Nothing renders and there is **no message explaining why**. A user flips a sub-tool on, sees no data, gets no feedback — reads as "order-flow tools don't work."

*Scope note (honest):* market is closed right now, so I could not test whether sub-tools populate *with* master ON and live tape flowing. What I can confirm is the **state-model defect**: sub-tool "on" + master "off" = silent dead state.

## Your design pick (Micah owns it)
Two candidate resolutions — pick one, spec it:
- **A:** clicking a sub-tool auto-enables the master `ORDER FLOW` toggle, OR
- **B:** sub-tool buttons are visibly **inert/disabled** (and/or show an inline "enable Order Flow to use" hint) while master is OFF.

Either eliminates the silent-dead-state. Spec placement + affordance + the empty/disabled copy. Then → Noah implements → Sentinel verifies (including live-data population once market is open).

Filed as `WM-OF-P0-06` in `ACTIVE_TASK_QUEUE.md`.
