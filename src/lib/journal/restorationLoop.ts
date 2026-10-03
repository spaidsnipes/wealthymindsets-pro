/**
 * ATH RESTORATION LOOP — the Recovery Room made operational (Garden 18 v2
 * §47/§52) — PURE.
 *
 * NOTICE → NAME → PAUSE → DIAGNOSE → CHOOSE REPLACEMENT → REHEARSE → APPLY →
 * REVIEW → REPEAT, walked for one trading day. The day's broker evidence (its
 * trades and their INFERRED behaviour tags) is set beside the loop; every word
 * in it is the trader's. Shame-free: the loop describes a repair path, it never
 * grades the person.
 */
import type { BehaviourTag } from "./behaviorTags";

export const RESTORATION_STEPS = [
  { id: "notice", label: "Notice", prompt: "What happened, in facts?" },
  { id: "name", label: "Name", prompt: "Name the pattern in plain words." },
  { id: "pause", label: "Pause", prompt: "Did you stop before the next entry? What did that look like?" },
  { id: "diagnose", label: "Diagnose", prompt: "Where did the process first break — market read, authorization, execution, risk, management?" },
  { id: "replace", label: "Choose replacement", prompt: "What will you do instead next time this shows up?" },
  { id: "rehearse", label: "Rehearse", prompt: "How will you rehearse it (replay, drill, checklist)?" },
  { id: "apply", label: "Apply", prompt: "When will you apply it live, and how will you know?" },
  { id: "review", label: "Review", prompt: "After applying it: what changed?" },
] as const;
export type RestorationStep = (typeof RESTORATION_STEPS)[number]["id"];

export interface RestorationDay { readonly notes: Partial<Record<RestorationStep, string>>; readonly updatedAt: number }

export const RESTORATION_KEY = "wm_restoration_days_v1";

export function parseRestoration(raw: string | null): Record<string, RestorationDay> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    const out: Record<string, RestorationDay> = {};
    if (!v || typeof v !== "object") return out;
    for (const [day, d] of Object.entries(v as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !d || typeof d !== "object") continue;
      const notes: Partial<Record<RestorationStep, string>> = {};
      const src = ((d as Record<string, unknown>).notes ?? {}) as Record<string, unknown>;
      for (const s of RESTORATION_STEPS) if (typeof src[s.id] === "string") notes[s.id] = (src[s.id] as string).slice(0, 600);
      out[day] = { notes, updatedAt: Number((d as Record<string, unknown>).updatedAt) || 0 };
    }
    return out;
  } catch { return {}; }
}

/** How far the loop has been walked: steps with words, in order (REPEAT = all eight done). */
export function loopProgress(day: RestorationDay | undefined): { done: number; total: number; complete: boolean } {
  const done = RESTORATION_STEPS.filter(s => (day?.notes[s.id] ?? "").trim().length > 0).length;
  return { done, total: RESTORATION_STEPS.length, complete: done === RESTORATION_STEPS.length };
}

/** The day's broker evidence, counted by tag — facts to NOTICE, never a verdict. */
export function dayEvidence(tagsByEpisode: readonly (readonly BehaviourTag[])[]): { id: string; label: string; count: number }[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const tags of tagsByEpisode) for (const t of tags) {
    const r = m.get(t.id) ?? { label: t.id === "THIRD_PLUS_ATTEMPT" ? "Trades beyond the second" : t.id === "RAPID_REENTRY" ? "Re-entries within 5 min" : t.id === "NO_BRACKET_AT_ENTRY" ? "Entries without a bracket" : "Above-usual size", count: 0 };
    r.count++;
    m.set(t.id, r);
  }
  return [...m.entries()].map(([id, r]) => ({ id, ...r }));
}
