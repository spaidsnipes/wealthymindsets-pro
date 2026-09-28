/**
 * WALL CONTACT — the canonical event between the forming bar and a pressure
 * wall (Garden 16 master order §21: "market evidence → canonical interaction
 * → candle + wall + flow + anatomy manifest the same event"; never sprite
 * touching sprite). Decided on PRICES from the forming bar's own high / low /
 * close against the wall's face, so it can be proven from fixtures (§23:
 * "replay proves state machine; LIVE proves synchronization").
 *
 *   CLEAR     the bar's extreme is more than REACH from the wall
 *   PRESSURE  within REACH (0.4% of price): the face heats with proximity
 *   CONTACT   the extreme reached the wall's face
 *   HELD      contact, and this bar pulled back ≥ a quarter of its own range
 *
 * PURE. DETERMINISTIC.
 */
export const WALL_CONTACT_REACH = 0.004;
export const WALL_HELD_PULLBACK = 0.25;

export type WallContactState = "CLEAR" | "PRESSURE" | "CONTACT" | "HELD";

export interface WallContactInput {
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly strike: number;
  /** The price of the wall face toward price (its band edge). Defaults to the strike. */
  readonly facePrice?: number;
}

export interface WallContactVM {
  readonly state: WallContactState;
  /** 0..1 — how close the extreme came within REACH. */
  readonly proximity: number;
  readonly side: "WALL_ABOVE" | "WALL_BELOW";
}

export function wallContact(i: WallContactInput): WallContactVM {
  const above = i.strike >= i.close;
  const face = i.facePrice ?? i.strike;
  const ext = above ? i.high : i.low;
  const reach = Math.max(1e-9, i.close * WALL_CONTACT_REACH);
  const gap = above ? i.strike - ext : ext - i.strike;
  const proximity = Math.max(0, Math.min(1, 1 - gap / reach));
  const contact = above ? ext >= face : ext <= face;
  const range = Math.max(1e-9, i.high - i.low);
  const pulledBack = contact && (above ? ext - i.close : i.close - ext) >= range * WALL_HELD_PULLBACK;
  const state: WallContactState = contact ? (pulledBack ? "HELD" : "CONTACT") : proximity > 0 ? "PRESSURE" : "CLEAR";
  return { state, proximity, side: above ? "WALL_ABOVE" : "WALL_BELOW" };
}
