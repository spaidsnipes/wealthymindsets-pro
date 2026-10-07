/**
 * A CLOSING FILL'S RESULT, FROM TASTYTRADE'S OWN ROUND TRIP — §J 2026-10-07. PURE.
 *
 * The round trip is paired by the ledger owner (tastytradeLedger
 * `buildTtRoundTrips`, flat to flat by signed quantity); this only finds the
 * trip a given closing order finished and reads the broker's numbers off it.
 *
 * It answers null — and the draft keeps P&L UNREPORTED — whenever the pairing
 * cannot be trusted from the fills in hand:
 *   · the order's fills are not all "… to Close" on one symbol;
 *   · no closed trip ends at this order's last fill;
 *   · the trip's first fill seen is not an opening fill, or its direction
 *     disagrees with the close (the read window started mid-position).
 */

import { buildTtRoundTrips } from "@/lib/broker/tastytradeLedger";
import type { TtFill } from "@/lib/broker/tastytradeFills";
import type { FillCaptureBrokerResult } from "./journalCaptureFromFill";

const at = (f: TtFill) => f.executedAt ?? "";

export function closingResultForOrder(fills: readonly TtFill[], orderId: string): FillCaptureBrokerResult | null {
  const mine = fills.filter(f => f.orderId === orderId);
  if (!mine.length) return null;
  const symbol = mine[0].symbol;
  if (!symbol || mine.some(f => f.symbol !== symbol)) return null;
  if (!mine.every(f => /to close/i.test(f.action ?? ""))) return null;
  const lastAt = mine.map(at).sort().at(-1) ?? "";
  if (!lastAt) return null;

  const sameSymbol = fills.filter(f => f.symbol === symbol);
  const trip = buildTtRoundTrips(sameSymbol).find(t => t.truth === "ACTUAL BROKER RESULT" && t.closedAt === lastAt);
  if (!trip || !trip.openedAt) return null;

  const inTrip = sameSymbol.filter(f => at(f) >= trip.openedAt! && at(f) <= lastAt).sort((a, b) => at(a).localeCompare(at(b)));
  const first = inTrip[0];
  if (!first || !/to open/i.test(first.action ?? "")) return null;
  const closeIsSell = /^sell/i.test(mine[0].action ?? "");
  if ((trip.direction === "LONG") !== closeIsSell) return null;

  const opens = inTrip.filter(f => /to open/i.test(f.action ?? "") && f.price != null && f.quantity != null && f.quantity > 0);
  const openQty = opens.reduce((s, f) => s + (f.quantity as number), 0);
  const openAvgPx = openQty > 0 ? Math.round((opens.reduce((s, f) => s + (f.price as number) * (f.quantity as number), 0) / openQty) * 1e6) / 1e6 : null;

  return { net: trip.net, fees: trip.fees, closedAt: trip.closedAt, openAvgPx, qty: trip.maxQty };
}
