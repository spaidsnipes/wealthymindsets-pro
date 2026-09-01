export type ProviderTapeSource =
  | "polygon"
  | "finnhub"
  | "alpaca"
  | "coinbase"
  | "binance"
  | "moomoo"
  | "webull";

/**
 * Deterministic tape ownership for the two bounded provider reads.
 * Moomoo is primary, Webull is fallback, and neither may displace an already
 * elected independent stream. The return value is the sole source allowed to
 * enter the chart and canonical session store.
 */
export function electProviderTapeSource(
  current: ProviderTapeSource | null,
  candidate: "moomoo" | "webull",
): ProviderTapeSource {
  if (!current || current === candidate) return candidate;
  if (current === "webull" && candidate === "moomoo") return "moomoo";
  return current;
}
