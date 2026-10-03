/**
 * LEDGER EXPORT (Garden 18 v2 §69 — export control) — PURE.
 * One row per episode: when, account tail, instrument, direction, size, average
 * prices, gross, fees, net, truth label, and the Webull order ids behind it.
 * Built in the browser on the trader's own click; nothing is sent anywhere.
 */
import type { Episode } from "./webullLedger";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const LEDGER_CSV_HEADER = ["opened_at", "closed_at", "account", "instrument", "direction", "max_qty", "multiplier", "avg_entry", "avg_exit", "gross", "fees", "net", "truth", "entry_order_ids", "exit_order_ids", "note"];

export function ledgerCsv(episodes: readonly Episode[]): string {
  const rows = [...episodes].sort((a, b) => a.openedAt.localeCompare(b.openedAt)).map(e => [
    e.openedAt, e.closedAt ?? "", e.accountId, e.instrumentKey, e.direction, e.maxQuantity, e.multiplier,
    e.avgEntry.toFixed(4), e.avgExit == null ? "" : e.avgExit.toFixed(4),
    e.gross ?? "", e.fees.toFixed(2), e.net ?? "", e.label,
    e.entries.map(f => f.orderId).join(" "), e.exits.map(f => f.orderId).join(" "), e.note ?? "",
  ].map(cell).join(","));
  return [LEDGER_CSV_HEADER.join(","), ...rows].join("\n") + "\n";
}
