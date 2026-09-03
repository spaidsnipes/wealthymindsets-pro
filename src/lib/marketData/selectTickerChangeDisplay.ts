/**
 * selectTickerChangeDisplay — ONE guard for every day-change display.
 *
 * `useWebSocket.flush()` only writes `change` / `changePct` once `prevCloseRef`
 * holds a REAL prior close. Until then it deliberately leaves them at their
 * initial 0 while still updating price — so a seed-derived fake never reaches
 * the UI.
 *
 * Every consumer therefore has to distinguish "genuinely flat" from "no
 * reference close yet". Five sites each re-implemented that check and four got
 * it wrong, because finiteness alone does not prove a reference exists: 0 and 0
 * are perfectly finite. Observed on prod:
 *
 *   ChartsDashboard  "BTC 77,556.11 ↑ +0.00 +0.00%"   (green, beside LIVE)
 *   MainChart        "381.33 +0.00 (+0.00%)"          (green, beside
 *                                                      HISTORICAL BARS VERIFIED)
 *
 * both while the ticker tape showed a real multi-percent move for the same
 * symbol — a fabricated direction and a multi-price disagreement (Weakness #1).
 *
 * A separate bug in the same family: `changePct?.toFixed(2) ?? "0.00"`
 * manufactures a zero when the value is absent entirely.
 *
 * Rules:
 *   - No reference close (both exactly 0) → NOT displayable. Render the
 *     surface's own honest fallback, never "+0.00%".
 *   - Non-finite → NOT displayable.
 *   - Exactly-zero-but-referenced cannot be distinguished from the above with
 *     the current ticker shape, so it is also withheld. Omitting a change until
 *     price moves is honest; painting a green arrow on unknown data is not.
 *   - Direction is three-state. An exactly-zero change is FLAT, never "up".
 *
 * PURE — no I/O, no clock.
 */

export type ChangeDirection = "up" | "down" | "flat";

export interface TickerChangeInput {
  readonly change?: number | null;
  readonly changePct?: number | null;
}

export interface TickerChangeDisplay {
  /** True only when a real provider reference close backs these numbers. */
  readonly displayable: boolean;
  /** Signed change; 0 when not displayable — callers must check `displayable`. */
  readonly change: number;
  /** Signed percent; 0 when not displayable. */
  readonly changePct: number;
  /** Three-state direction. "flat" whenever not displayable or exactly zero. */
  readonly direction: ChangeDirection;
}

export function selectTickerChangeDisplay(
  ticker: TickerChangeInput | null | undefined,
): TickerChangeDisplay {
  const withheld: TickerChangeDisplay = {
    displayable: false,
    change: 0,
    changePct: 0,
    direction: "flat",
  };
  if (!ticker) return withheld;

  const change = ticker.change;
  const changePct = ticker.changePct;

  if (typeof change !== "number" || typeof changePct !== "number") return withheld;
  if (!Number.isFinite(change) || !Number.isFinite(changePct)) return withheld;
  // The "no reference close yet" signature.
  if (change === 0 && changePct === 0) return withheld;

  return {
    displayable: true,
    change,
    changePct,
    direction: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat",
  };
}
