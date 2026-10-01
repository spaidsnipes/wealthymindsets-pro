/** Price fields shared by entry preview and live submit. No quote becomes a market price. */
export type TastytradeEntryType = "Market" | "Limit" | "Stop" | "Stop Limit";
export function tastytradeEntryFields(type: TastytradeEntryType, limitPx: number | null, stopPx: number | null) {
  const positive = (value: number | null): value is number => value != null && Number.isFinite(value) && value > 0;
  switch (type) {
    case "Market": return { type };
    case "Limit": return positive(limitPx) ? { type, limitPx } : null;
    case "Stop": return positive(stopPx) ? { type, stopPx } : null;
    case "Stop Limit": return positive(limitPx) && positive(stopPx) ? { type, limitPx, stopPx } : null;
  }
}
