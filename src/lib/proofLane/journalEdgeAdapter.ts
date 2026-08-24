import type { EdgeEntry, SessionOutcome, SessionProcess } from "./selectSessionEdge";

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pure, order-preserving projection. It never derives R from P&L. */
export function journalRecordsToEdgeEntries(records: readonly unknown[]): readonly EdgeEntry[] {
  const entries: EdgeEntry[] = [];
  for (const value of records) {
    if (!isRecord(value) || typeof value.date !== "string" || value.date.trim() === "") continue;
    if (value.result !== "win" && value.result !== "loss" && value.result !== "be") continue;
    const processQuality: SessionProcess = value.processQuality === "FOLLOWED_PLAN" || value.processQuality === "BROKE_RULES"
      ? value.processQuality
      : "UNRESOLVED";
    entries.push({
      date: value.date,
      result: value.result as SessionOutcome,
      realizedR: finite(value.realizedR),
      processQuality,
      mfeR: finite(value.mfeR),
      maeR: finite(value.maeR),
    });
  }
  return entries;
}

