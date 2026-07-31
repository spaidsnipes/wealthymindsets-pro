# WM PRO — REGIME-AWARE RISK MANAGER ARCHITECTURE (Design)

**Author:** Forge · **Date:** 2026-07-30 · **Base:** `708b5c4` · **Status:** DESIGN — architecture before implementation, no ticket claimed yet
**Feeds:** Founder roadmap item **#6** (Regime-aware Risk / Position Size Overlay)
**Evidence:** `docs/research/COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md` + Drive doc
`1poNyahhb_58fe9XtgVcte638WmmneB6NWPllKPNmMPE` (§6, "WM Pro — Deep 5-App UI Enumeration",
2026-07-30 14:35 CDT).

---

## 1. What DeepCharts actually ships

Structural observation from their public help center — claims-only, no proprietary code or UI
adopted. Recorded so the WM design has a real reference to define its edge against.

**Two levels of control:**
- **Connection-level:** Pause (1min → full session), Close (flatten all positions on this
  connection).
- **Account-level:** Eye (details), Pause, Close.

**Risk parameters:**
- Daily Loss Limit (as $ or %)
- Daily Profit Limit (as $ or %)
- Individual trade caps → auto-flatten
- Portfolio combined loss/profit
- Trailing Drawdown (with unrealized-PnL option)
- Trading hour windows (EST)
- Symbol whitelisting

**Enforcement modes:**
- Daily Pause (lockout till 18:00 EST)
- Time Pause (until specified time)
- Flat (immediate close)

**Critical limitation, admitted in DeepCharts' own docs:**
> *"If the platform is closed, the money manager will not function."*

Client-side only. Close the tab, close the app, or drop the network — the enforcement is gone.
On free retail data this is a real gap; for a trader who set a $2000 daily-loss lockout, it is
also a **trust-breaking gap** because the trader thinks the guard is armed when it may not be.

---

## 2. The WM edge — three layers, not one

The Founder-visible differentiator, and the reason this design exists rather than a
DeepCharts clone:

### Layer 1 — Suggestion (regime-aware, advisory, always-on)

Advisory position-size recommendations that read the same market-state substrate the Confluence
Meter reads:

- **Regime scaling.** Volatile regime → suggest fractional size vs Trending regime. Value
  sourced from the same `regime` component (§4 of the Confluence spec).
- **Confluence scaling.** Higher Confluence score → suggest larger fraction of the trader's
  own risk budget; below the meter's minimum-evidence threshold → suggest zero (not "small,"
  actually zero — the honesty gate propagates).
- **Volatility scaling.** ATR-scaled stop distance → position size that makes stop-distance-in-
  dollars equal to the trader's per-trade $ risk. Not novel arithmetic; novel is that WM
  refuses to render a suggestion when its inputs are unavailable — same discriminated union as
  Markov and the meter.

**These are recommendations. They do not enforce anything.** They render alongside the trade
ticket the way a mentor would sit next to a trader.

### Layer 2 — Enforcement (hard caps, client-side, on par with DeepCharts)

Same parameter set as DeepCharts (§1), same three enforcement modes. Implementation lives in
the client so it can react in milliseconds:

- Auto-flatten open positions when a hard cap is breached.
- Reject new orders when a lockout is active.
- Visible countdown, always — the user sees exactly what state the guard is in.

**Not a copy** — same category, same responsibility, WM code, WM naming, WM UI. The pattern is
established; the differentiator is layers 1 and 3.

### Layer 3 — Server-side backstop (the actual edge)

This is what DeepCharts admits it cannot do.

- **Backstop cap** stored server-side per (user, account, connection). When the client sees the
  cap is being approached, it **also** notifies the broker connection layer, which enforces the
  same lockout at the account-connection level.
- **Kill-switch** endpoint the trader can hit from **any device or phone-only URL** to trigger
  flat + lockout when the desktop app is closed. The lockout survives app-close, tab-close, and
  network drop — because the enforcement lives on the connection, not the client.
- **Reconciliation on reconnect.** When the client re-establishes, it reads the current lockout
  state from the server rather than trusting its own local memory. A user who thought their
  guard was armed and closed the tab still has an armed guard.
- **Immutable audit log.** Every enforcement action (pause, flat, cap adjustment) is written
  server-side, timestamped, and displayed in the account history. Not "we say we did it"
  → "here is the record with the exact time and reason."

The trust story: *"If you set a $2000 daily-loss lockout, we will honour it even if your
computer is off."* That is a claim DeepCharts cannot make. It also raises the operational bar
for us — the server-side layer needs the same discipline as the Passport identity layer, and
the same test coverage as the Markov honesty gate.

---

## 3. Honesty gates — the same discipline that shipped in Markov

The Risk Manager fabrication class is: **displaying an "armed" state that isn't actually
enforced.** That is the DeepCharts limitation dressed up as a green light. So:

- **Never render "armed" without proving enforcement is live.** UI subscribes to the same
  server-side backstop state the enforcement layer uses. If the WebSocket to the backstop
  drops, the UI badge flips to *"guard degraded — client-side only until connection returns"*
  and the trader sees exactly what protection is currently in force.
- **Never claim server-side enforcement if it isn't wired for the broker.** Not every broker
  connection supports account-level lockout hooks. When it doesn't, the UI says
  *"server-side backstop unavailable for this broker — client-side lockout only"* rather than
  silently degrading.
- **Never absorb an unavailable component into a suggestion.** Layer 1 recommendations that
  would need `regime` or Confluence inputs and can't get them render `--`, not a "safe default."
  Same rule as §4 of the Confluence spec.
- **Every enforcement action is confirmed before it fires.** Explicit user opt-in per parameter
  when first set, and the server-side backstop cannot be armed without the trader typing the
  cap value (not clicking a slider that could be scroll-nudged).

---

## 4. Sequencing (proposed; awaiting triage)

1. **`src/lib/riskAdvice.ts`** — pure module returning `{sizeRecommendation, reasoning,
   status: "ready" | "insufficient-evidence"}`. Depends on Markov (`e0a5ed7`) and the eventual
   Confluence Meter score. No I/O. Testable in isolation with the same honesty-gate discipline.
2. **Client-side enforcement UI + local state machine.** Ships with the countdown-visible-
   always requirement. Parameter set matches DeepCharts (§1) so the trader isn't relearning
   category conventions.
3. **Server-side backstop schema + endpoint.** Passport-linked, per (user, account,
   connection). Ratified by Founder decision (§5 Q3) before schema lands.
4. **Broker integration matrix** — which brokers support account-level lockout hooks? Alpaca?
   tastytrade? Tradovate? Documented per-broker with `serverBackstop: "supported" | "planned"
   | "unavailable"` badges.
5. **Kill-switch mobile URL.** Passport-authed, single button, big visible confirmation of
   state before and after. Ships with an audit log entry.

Do not begin at step 5. The kill switch is only useful if the server-side backstop is real.

---

## 5. Open questions for the Founder

1. **Does WM Pro do this at all?** Category is real; the WM edge is real; the operational cost
   (server-side infra, per-broker integration, incident response) is also real. Founder call.
2. **Broker priority order** for the server-side integration. Alpaca first is the natural pick
   because it's already in production; tastytrade close behind.
3. **Server-side backstop model** — do lockouts persist across sessions and devices by default
   (recommended), or per-session? The DeepCharts model is per-session; the WM edge implies
   cross-session by default.
4. **Regulatory review** — position-size recommendations that a user acts on could be
   construed as financial advice depending on jurisdiction. Legal review required before Layer
   1 ships; Layer 2 is neutral because the user sets their own limits.
5. **Advisory tone** — the Founder-visible "mentor next to you" framing versus a purely
   numeric recommendation. Product decision.

---

## 6. What this design refuses to promise

- **Not a copy trader.** Trade-Copier is a separate DeepCharts feature and out of scope here.
- **Not a broker.** WM does not route orders in this design; the backstop nudges the broker's
  own account-level controls.
- **Not "trade for you."** Layer 1 is advisory. Layer 2 is user-configured hard caps. Layer 3
  is the trader's own kill switch. Nothing in this document autonomously initiates a position.
- **Not "protection from yourself when the market is closed."** The backstop only enforces when
  the market is open; when the market is closed, its state persists and re-arms on next open.

The honest slogan: *"You set the limits. We keep them, even when you're not looking."* That
is what the server-side layer is for. Making it true is what the rest of the discipline is for.

---

## 7. Reference

Full observation with UI details for all six DeepCharts modules and the 5-app comparison lives
in Drive doc `1poNyahhb_58fe9XtgVcte638WmmneB6NWPllKPNmMPE` — "WM Pro — Deep 5-App UI
Enumeration + DeepCharts Feature Crawl", 2026-07-30 14:35 CDT.
