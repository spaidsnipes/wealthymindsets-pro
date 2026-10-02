/**
 * BEHAVIOUR TAGS FROM BROKER EVIDENCE + AMENDMENT LINEAGE (Garden 18 v2
 * §59/§60/§61) — PURE.
 *
 * Tags are only what fills can establish — sequence, timing, size, whether a
 * bracket was attached. Never an emotion, motive or story (§59). Each tag is
 * INFERRED with the evidence it used. The trader may CONFIRM or CORRECT it; a
 * correction is appended as lineage (original inference → evidence → the
 * trader's correction and reason → when), never written over the inference.
 */
import type { Episode } from "@/lib/broker/webullLedger";

export type TagId = "THIRD_PLUS_ATTEMPT" | "RAPID_REENTRY" | "NO_BRACKET_AT_ENTRY" | "ABOVE_USUAL_SIZE";

export interface BehaviourTag {
  readonly id: TagId; readonly label: string; readonly evidence: string; readonly truth: "INFERRED";
  /** The profile rule / §48 prescription this behaviour meets — a process reminder, never a diagnosis of feeling. */
  readonly rule: string;
}

const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

export const RAPID_REENTRY_MS = 5 * 60_000;

/** Tags for every closed episode, by episode id. */
export function behaviourTags(episodes: readonly Episode[]): Map<string, BehaviourTag[]> {
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED" && e.closedAt).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const sizes = closed.map(e => e.maxQuantity).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const perDay = new Map<string, number>();
  const lastExit = new Map<string, Episode>();
  const out = new Map<string, BehaviourTag[]>();
  for (const e of closed) {
    const tags: BehaviourTag[] = [];
    const d = nyDay(e.openedAt);
    const n = (perDay.get(d) ?? 0) + 1;
    perDay.set(d, n);
    if (n >= 3) tags.push({ id: "THIRD_PLUS_ATTEMPT", label: `Trade ${n} of the day`, evidence: `${n - 1} trades were already opened on ${d} (New York).`, truth: "INFERRED", rule: "Profile rule: a second attempt only after fresh authorization — no third." });
    const prev = lastExit.get(`${e.accountId}|${e.instrumentKey}`);
    if (prev?.closedAt) {
      const gap = Date.parse(e.openedAt) - Date.parse(prev.closedAt);
      if (gap >= 0 && gap <= RAPID_REENTRY_MS) tags.push({ id: "RAPID_REENTRY", label: "Re-entered the same contract within 5 min", evidence: `Previous ${e.instrumentKey} trade exited ${hhmm(prev.closedAt)}${prev.net != null ? ` (${prev.net >= 0 ? "+" : "−"}$${Math.abs(prev.net).toFixed(2)})` : ""}; this one opened ${hhmm(e.openedAt)} (${Math.round(gap / 1000)} s later).`, truth: "INFERRED",
        rule: prev.net != null && prev.net < 0 ? "Prescription: a loss creates zero permission — return to regime and re-authorize before the next entry." : "Prescription: a win does not lower standards — same size, same checklist, fresh authorization." });
    }
    lastExit.set(`${e.accountId}|${e.instrumentKey}`, e);
    if (e.entries[0] && e.entries[0].comboType !== "MASTER") tags.push({ id: "NO_BRACKET_AT_ENTRY", label: "No bracket at entry", evidence: `Entry order type ${e.entries[0].orderType ?? "?"}, combo ${e.entries[0].comboType ?? "none"} — no stop/target attached in the same order.`, truth: "INFERRED", rule: "Profile rule: protection is defined before entry." });
    if (median > 0 && e.maxQuantity >= median * 2) tags.push({ id: "ABOVE_USUAL_SIZE", label: `Size ${e.maxQuantity}× (usual ${median}×)`, evidence: `Largest position in this trade was ${e.maxQuantity}; the median across all trades is ${median}.`, truth: "INFERRED", rule: "Prescription: same size after a win or a loss — size changes only by plan." });
    out.set(e.id, tags);
  }
  return out;
}

// ── amendment lineage ────────────────────────────────────────────────────────

export interface Amendment {
  readonly episodeId: string;
  readonly tag: TagId;
  readonly original: { readonly label: string; readonly evidence: string; readonly truth: "INFERRED" };
  readonly verdict: "CONFIRMED" | "CORRECTED";
  /** The trader's own words for a correction (e.g. "planned scale-in, not a re-entry"). */
  readonly correction: string;
  readonly at: number;
}

export const AMENDMENTS_KEY = "wm_ledger_tag_amendments_v1";

export function parseAmendments(raw: string | null): Amendment[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter(a => a && typeof a.episodeId === "string" && typeof a.tag === "string" && (a.verdict === "CONFIRMED" || a.verdict === "CORRECTED")) : [];
  } catch { return []; }
}

/** Append-only: a new amendment never removes an earlier one; the latest per (episode, tag) is the current reading. */
export function appendAmendment(list: readonly Amendment[], a: Amendment): Amendment[] {
  return [...list, { ...a, correction: a.correction.slice(0, 400) }];
}

export function latestAmendment(list: readonly Amendment[], episodeId: string, tag: TagId): Amendment | null {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].episodeId === episodeId && list[i].tag === tag) return list[i];
  return null;
}
