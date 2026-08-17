export const OPERATIONAL_GAP_SCHEMA_VERSION = "wm.operational-gap.v1" as const;

export type OperationalGapAction = "OPEN" | "CLOSE";
export type OperationalGapReason =
  | "RATE_LIMIT"
  | "PROVIDER_UNAVAILABLE"
  | "CIRCUIT_OPEN"
  | "STALE_FALLBACK";

export interface OperationalGapCommand {
  schemaVersion: typeof OPERATIONAL_GAP_SCHEMA_VERSION;
  action: OperationalGapAction;
  instrumentId: string;
  normalizedSymbol: string;
  providerPath: string;
  assetClass: "crypto" | "equity" | "etf" | "futures" | "forex" | "options";
  channel: string;
  reasonCode: OperationalGapReason;
  occurredAt: number;
  retryAfterMs: number | null;
  detail: string;
}

const ACTIONS = new Set<OperationalGapAction>(["OPEN", "CLOSE"]);
const REASONS = new Set<OperationalGapReason>([
  "RATE_LIMIT",
  "PROVIDER_UNAVAILABLE",
  "CIRCUIT_OPEN",
  "STALE_FALLBACK",
]);
const ASSET_CLASSES = new Set<OperationalGapCommand["assetClass"]>([
  "crypto", "equity", "etf", "futures", "forex", "options",
]);

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

/** Strict allow-list: provider payload fields never cross this boundary. */
export function parseOperationalGapCommand(value: unknown): OperationalGapCommand | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const action = raw.action as OperationalGapAction;
  const reasonCode = raw.reasonCode as OperationalGapReason;
  const instrumentId = boundedText(raw.instrumentId, 96);
  const normalizedSymbol = boundedText(raw.normalizedSymbol, 32);
  const providerPath = boundedText(raw.providerPath, 128);
  const assetClass = raw.assetClass as OperationalGapCommand["assetClass"];
  const channel = boundedText(raw.channel, 32);
  const detail = boundedText(raw.detail, 240);
  const occurredAt = Number(raw.occurredAt);
  const retryAfterMs = raw.retryAfterMs == null ? null : Number(raw.retryAfterMs);
  if (raw.schemaVersion !== OPERATIONAL_GAP_SCHEMA_VERSION ||
      !ACTIONS.has(action) || !REASONS.has(reasonCode) ||
      !instrumentId || !normalizedSymbol || !providerPath || !ASSET_CLASSES.has(assetClass) || !channel || !detail ||
      !Number.isSafeInteger(occurredAt) || occurredAt <= 0 ||
      (retryAfterMs != null && (!Number.isSafeInteger(retryAfterMs) || retryAfterMs < 0 || retryAfterMs > 86_400_000))) {
    return null;
  }
  return {
    schemaVersion: OPERATIONAL_GAP_SCHEMA_VERSION,
    action,
    instrumentId,
    normalizedSymbol: normalizedSymbol.toUpperCase(),
    providerPath,
    assetClass,
    channel,
    reasonCode,
    occurredAt,
    retryAfterMs,
    detail,
  };
}
