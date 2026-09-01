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
  currentAcceptedAt = 0,
  now = Date.now(),
  providerLeaseMs = 30_000,
): ProviderTapeSource {
  const providerOwner = current === "moomoo" || current === "webull";
  const leaseExpired = providerOwner && (
    !Number.isFinite(currentAcceptedAt) ||
    currentAcceptedAt <= 0 ||
    now - currentAcceptedAt > providerLeaseMs
  );
  const effectiveCurrent = leaseExpired ? null : current;
  if (!effectiveCurrent || effectiveCurrent === candidate) return candidate;
  if (effectiveCurrent === "webull" && candidate === "moomoo") return "moomoo";
  return effectiveCurrent;
}
