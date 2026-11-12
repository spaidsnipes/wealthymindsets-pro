/**
 * THE EMERGENCY CORNER (Founder 11-10 18:14: "Yes, need those buttons… journaling section"; shift notes: STOP → DIAGNOSE
 * → RECOVER → REASSESS, "the button must make stopping easier, not just show a quote").
 *
 * Five buttons name the trigger. Each press is time-stamped into today's log and opens the same three steps:
 *   STOP      close what is open — the ticket's own FLATTEN, which he previews and confirms (nothing is sent here);
 *   RECOVER   leave the market — a menu of what works for him;
 *   REASSESS  lock the screen for the rest of the day, or come back later.
 * PURE. The log rides on the Session Day (sessionDay.ts) and resets each market day.
 */
export const EMERGENCY_KINDS = [
  { id: "LOSS_TILT", label: "LOSS / TILT", stop: "Stop. A loss is information, not an invitation." },
  { id: "MISSED_BUS", label: "MISSED THE BUS", stop: "The bus left. Chasing it is how the day turns." },
  { id: "WIN_PROTECTION", label: "WIN PROTECTION", stop: "You're green. Protect it — the job may be done." },
  { id: "NEED_CONNECTION", label: "I NEED CONNECTION", stop: "Step away from the screen and reach a person." },
  { id: "TOO_LOUD", label: "TOMORROW IS TOO LOUD", stop: "Today is enough. Put tomorrow down." },
] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number]["id"];

export const RECOVERY_MENU = [
  "Walk outside", "Water + sunlight", "Push-ups", "Pray", "Talk to my wife", "The Simpsons / something funny", "Make music", "Nap",
] as const;

export interface EmergencyEvent { readonly kind: EmergencyKind; readonly atMs: number; readonly recovered: readonly string[] }

export function readEmergencyLog(raw: unknown): EmergencyEvent[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>(EMERGENCY_KINDS.map(k => k.id));
  const menu = new Set<string>(RECOVERY_MENU);
  return raw.slice(-40).flatMap(e => {
    if (!e || typeof e !== "object") return [];
    const o = e as Record<string, unknown>;
    if (typeof o.kind !== "string" || !ids.has(o.kind) || typeof o.atMs !== "number" || !Number.isFinite(o.atMs)) return [];
    const rec = Array.isArray(o.recovered) ? o.recovered.filter((r): r is string => typeof r === "string" && menu.has(r)) : [];
    return [{ kind: o.kind as EmergencyKind, atMs: o.atMs, recovered: rec }];
  });
}

export function pressEmergency(log: readonly EmergencyEvent[], kind: EmergencyKind, nowMs: number): EmergencyEvent[] {
  return [...log, { kind, atMs: nowMs, recovered: [] }];
}

export function toggleRecovery(log: readonly EmergencyEvent[], item: string): EmergencyEvent[] {
  if (!log.length) return [...log];
  const last = log[log.length - 1];
  const rec = last.recovered.includes(item) ? last.recovered.filter(r => r !== item) : [...last.recovered, item];
  return [...log.slice(0, -1), { ...last, recovered: rec }];
}

/** The chart door that loads FLATTEN into the ticket after a tap — never on load. */
export const FLATTEN_ASK_PARAM = "flatten";
export const FLATTEN_ASK_VALUE = "ask";
