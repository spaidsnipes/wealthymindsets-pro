/**
 * Rule Override Log — the "override log" half of Founder canon D06.
 *
 * Canon A07: WM informs, the human decides. When a trader proceeds despite an
 * ADVISORY/RESTRICTED permission verdict (their configured rules were engaged),
 * WM does NOT block them — but it records the override so the trader can review
 * their own discipline later. Accountability, never a gate.
 *
 * Pure core (buildOverrideEntry + summarizeOverrides) is fully testable; the
 * localStorage append/read is a thin SSR-safe wrapper.
 */

export type OverrideVerdict = "ADVISORY" | "RESTRICTED";

export interface RuleOverrideEntry {
  readonly atMs: number;
  /** What the permission engine said when the trader overrode it. */
  readonly verdict: OverrideVerdict;
  /** Which configured rules were engaged at override time. */
  readonly engagedRuleIds: readonly string[];
  readonly symbol: string;
  /** Optional trader-supplied reason. */
  readonly note?: string;
}

export interface OverrideSummary {
  readonly total: number;
  readonly last24h: number;
  /** Count of overrides per engaged rule id (which rules the trader ignores most). */
  readonly byRule: Readonly<Record<string, number>>;
  readonly restrictedOverrides: number; // overrides of a HARD/RESTRICTED verdict — the serious ones
}

/** Pure: normalize an override input into a validated entry, or null if invalid. */
export function buildOverrideEntry(input: {
  atMs: number;
  verdict: OverrideVerdict;
  engagedRuleIds: readonly string[];
  symbol: string;
  note?: string;
}): RuleOverrideEntry | null {
  if (!Number.isFinite(input.atMs) || input.atMs <= 0) return null;
  if (input.verdict !== "ADVISORY" && input.verdict !== "RESTRICTED") return null;
  if (typeof input.symbol !== "string" || input.symbol.trim() === "") return null;
  const engagedRuleIds = (input.engagedRuleIds ?? []).filter((id) => typeof id === "string" && id.length > 0);
  return {
    atMs: input.atMs,
    verdict: input.verdict,
    engagedRuleIds,
    symbol: input.symbol.trim().toUpperCase(),
    ...(input.note && input.note.trim() ? { note: input.note.trim() } : {}),
  };
}

/** Pure: summarize a log for a settings/Mirror surface. */
export function summarizeOverrides(entries: readonly RuleOverrideEntry[], nowMs: number): OverrideSummary {
  const byRule: Record<string, number> = {};
  let last24h = 0;
  let restrictedOverrides = 0;
  for (const e of entries) {
    if (nowMs - e.atMs <= 86_400_000) last24h += 1;
    if (e.verdict === "RESTRICTED") restrictedOverrides += 1;
    for (const id of e.engagedRuleIds) byRule[id] = (byRule[id] ?? 0) + 1;
  }
  return { total: entries.length, last24h, byRule, restrictedOverrides };
}

// ── Thin SSR-safe persistence ────────────────────────────────────────────────

const KEY = "wm_rule_override_log_v1";
const MAX_ENTRIES = 500; // bounded — keep the most recent

export function readOverrideLog(): readonly RuleOverrideEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((e) => buildOverrideEntry(e))
      .filter((e): e is RuleOverrideEntry => e != null);
  } catch {
    return [];
  }
}

export function appendOverride(entry: RuleOverrideEntry): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...readOverrideLog(), entry].slice(-MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota / privacy mode — a missed log write must never break the trade flow.
  }
}
