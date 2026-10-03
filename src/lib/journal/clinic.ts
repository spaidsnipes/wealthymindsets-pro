/**
 * TRADER DIAGNOSTIC CLINIC — Double Diagnosis + Pattern Pathology Map for one
 * broker episode (Garden 18 v2 §43/§44/§45/§46) — PURE.
 *
 * Body of Market and Body of Student, then the pathology chain TRIGGER →
 * STORY → EMOTION → IMPULSE → RULE BREAK / CLEAN ACTION → RESULT → REVIEW →
 * REPLACEMENT. Every field is the trader's own words (USER-CONFIRMED CONTEXT,
 * §46); WM infers none of it, and emotions appear only when the trader writes
 * them (§59). Educational behavioural metaphor, not a medical diagnosis.
 * Private to the device (§69).
 */

export const MARKET_FIELDS = [
  { id: "regime", label: "Regime", prompt: "Model 0 / 1 / 2 — trend, rotation, or no-trade?" },
  { id: "structure", label: "Structure", prompt: "External structure — what was the market doing around you?" },
  { id: "location", label: "Location", prompt: "Where was the entry relative to the plan's location?" },
  { id: "clc", label: "CLC", prompt: "Context, location, confirmation — complete?" },
  { id: "invalidation", label: "Invalidation", prompt: "Where was the thesis wrong?" },
  { id: "availableR", label: "Available R", prompt: "Clean room to target vs risk?" },
] as const;

export const STUDENT_FIELDS = [
  { id: "behaviour", label: "Repeating behaviour", prompt: "Does this look like something you do again and again?" },
  { id: "preceding", label: "Preceding condition", prompt: "What came just before — a miss, a loss, a win, a distraction?" },
  { id: "rule", label: "Rule negotiated or skipped", prompt: "Which rule bent, if any?" },
  { id: "consequence", label: "Consequence", prompt: "What did it cost or teach?" },
] as const;

export const PATHOLOGY_CHAIN = [
  { id: "trigger", label: "Trigger" },
  { id: "story", label: "Story" },
  { id: "emotion", label: "Emotion (if you name one)" },
  { id: "impulse", label: "Impulse" },
  { id: "action", label: "Rule break / clean action" },
  { id: "result", label: "Result" },
  { id: "replacement", label: "Replacement" },
] as const;

type FieldId = (typeof MARKET_FIELDS)[number]["id"] | (typeof STUDENT_FIELDS)[number]["id"] | (typeof PATHOLOGY_CHAIN)[number]["id"];
export type ClinicNotes = Partial<Record<FieldId, string>>;

export const CLINIC_KEY = "wm_ledger_clinic_v1";
const ALL_IDS: readonly string[] = [...MARKET_FIELDS, ...STUDENT_FIELDS, ...PATHOLOGY_CHAIN].map(f => f.id);

export function parseClinic(raw: string | null): Record<string, ClinicNotes> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    const out: Record<string, ClinicNotes> = {};
    if (!v || typeof v !== "object") return out;
    for (const [ep, notes] of Object.entries(v as Record<string, unknown>)) {
      if (!notes || typeof notes !== "object") continue;
      const clean: Record<string, string> = {};
      for (const [k, t] of Object.entries(notes as Record<string, unknown>)) if (ALL_IDS.includes(k) && typeof t === "string") clean[k] = t.slice(0, 500);
      out[ep] = clean as ClinicNotes;
    }
    return out;
  } catch { return {}; }
}

/** How much of the diagnosis has the trader's words: market, student, chain. */
export function clinicProgress(n: ClinicNotes | undefined) {
  const filled = (ids: readonly { id: string }[]) => ids.filter(f => ((n as Record<string, string> | undefined)?.[f.id] ?? "").trim()).length;
  return { market: filled(MARKET_FIELDS), student: filled(STUDENT_FIELDS), chain: filled(PATHOLOGY_CHAIN), total: MARKET_FIELDS.length + STUDENT_FIELDS.length + PATHOLOGY_CHAIN.length };
}
