/**
 * SESSION DAY — the trader's own day: target lock, "I'm done", the MNQ→NQ checkpoint, the Giveback meter and the
 * Toe Whooper verdict (GAPS-V3 trading #3, #12, #15, #18, #29, #30; Founder 08-26 "You completed your job. Go live
 * your life", 11-05 "Did you get your toes whipped today?… You gotta be honest", 11-11 "I need to start shutting the
 * computer all the way down… sign back in", 11-11 "I did this shit again when I got to 900").
 *
 * LAWS
 *   · HIS NUMBERS. Today's result and its peak are what he reads off his firm's dashboard and types here. Nothing
 *     is estimated; an empty field gives no verdict, never a zero.
 *   · A LOCK SENDS NO ORDERS. It locks this app's screens on this device. Flattening stays at his broker.
 *   · A LOCK ENDS BY SIGNING BACK IN (UNTIL_SIGN_IN) or at the next market day (REST_OF_DAY). Nothing else lifts it.
 *   · MONEY IS INTEGER CENTS.
 * PURE — no IO, no clock (the caller passes `nowMs` and the market day), no storage.
 */

import { readEmergencyLog, type EmergencyEvent } from "./emergencyCorner";

export type Cents = number;
export type LockMode = "UNTIL_SIGN_IN" | "REST_OF_DAY";
export type LockReason = "TARGET_HIT" | "DONE" | "MAX_LOSS";

export interface SessionLock {
  readonly day: string;
  readonly reason: LockReason;
  readonly mode: LockMode;
  readonly lockedAtMs: number;
  /** Set when he signs out from the lock screen; the next signed-in load lifts an UNTIL_SIGN_IN lock. */
  readonly signedOutAtMs: number | null;
}

export interface SessionDay {
  readonly day: string;
  readonly targetCents: Cents | null;
  /** A positive amount: the most he will lose today. */
  readonly maxLossCents: Cents | null;
  readonly netCents: Cents | null;
  /** The best the day stood at (never below the typed result). */
  readonly peakCents: Cents | null;
  readonly updatedAtMs: number | null;
  /** Lock the screen by itself when the typed result reaches the target or the max loss. */
  readonly lockOnTarget: boolean;
  readonly lockMode: LockMode;
  /** The MNQ→NQ checkpoint: when armed, a switch from a micro to its full-size contract asks first. */
  readonly checkpointArmed: boolean;
  /** His own words for the checkpoint ("24,900 — no NQ"). */
  readonly checkpointNote: string;
  readonly lock: SessionLock | null;
  /** Today's Emergency Corner presses (emergencyCorner.ts). */
  readonly emergencies: readonly EmergencyEvent[];
}

export const SESSION_DAY_KIND = "WM_SESSION_DAY" as const;
export const SESSION_DAY_BASE_KEY = "wm_session_day_v1";
export const SESSION_DEVICE_LINE = "Typed by you from your firm's dashboard · kept on this device only.";
export const LOCK_SENDS_NO_ORDERS = "This lock sends no orders. Anything open stays open at your broker until you close it there.";

export const emptySessionDay = (day: string): SessionDay => ({
  day, targetCents: null, maxLossCents: null, netCents: null, peakCents: null, updatedAtMs: null,
  lockOnTarget: true, lockMode: "UNTIL_SIGN_IN", checkpointArmed: false, checkpointNote: "", lock: null, emergencies: [],
});

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 1e13;
const intOrNull = (v: unknown): number | null => (isInt(v) ? v : null);

/**
 * The stored day, rolled to `today`: a new market day keeps his settings (target, max loss, checkpoint, lock mode)
 * and clears the numbers and any REST_OF_DAY lock. An UNTIL_SIGN_IN lock is carried until he signs back in.
 */
export function readSessionDay(raw: unknown, today: string): SessionDay {
  const base = emptySessionDay(today);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  if (o.kind !== SESSION_DAY_KIND) return base;
  const lockRaw = o.lock as Record<string, unknown> | null | undefined;
  const lock: SessionLock | null = lockRaw && typeof lockRaw === "object" && typeof lockRaw.day === "string"
    && (lockRaw.reason === "TARGET_HIT" || lockRaw.reason === "DONE" || lockRaw.reason === "MAX_LOSS")
    && (lockRaw.mode === "UNTIL_SIGN_IN" || lockRaw.mode === "REST_OF_DAY") && isInt(lockRaw.lockedAtMs)
    ? { day: lockRaw.day, reason: lockRaw.reason, mode: lockRaw.mode, lockedAtMs: lockRaw.lockedAtMs, signedOutAtMs: intOrNull(lockRaw.signedOutAtMs) }
    : null;
  const settings = {
    targetCents: intOrNull(o.targetCents) != null && (o.targetCents as number) > 0 ? (o.targetCents as number) : null,
    maxLossCents: intOrNull(o.maxLossCents) != null && (o.maxLossCents as number) > 0 ? (o.maxLossCents as number) : null,
    lockOnTarget: o.lockOnTarget !== false,
    lockMode: o.lockMode === "REST_OF_DAY" ? "REST_OF_DAY" as const : "UNTIL_SIGN_IN" as const,
    checkpointArmed: o.checkpointArmed === true,
    checkpointNote: typeof o.checkpointNote === "string" ? o.checkpointNote.slice(0, 80) : "",
  };
  const sameDay = o.day === today;
  const keptLock = lock && (lock.day === today || lock.mode === "UNTIL_SIGN_IN") ? lock : null;
  return {
    ...base, ...settings,
    netCents: sameDay ? intOrNull(o.netCents) : null,
    peakCents: sameDay ? intOrNull(o.peakCents) : null,
    updatedAtMs: sameDay ? intOrNull(o.updatedAtMs) : null,
    lock: keptLock,
    emergencies: sameDay ? readEmergencyLog(o.emergencies) : [],
  };
}

export const storedSessionDay = (d: SessionDay) => ({ kind: SESSION_DAY_KIND, version: 1 as const, ...d });

/** He typed today's result: the peak follows it up, never down; the target lock fires when it is reached. */
export function enterResult(d: SessionDay, netCents: Cents | null, nowMs: number): SessionDay {
  const peak = netCents == null ? d.peakCents : Math.max(netCents, d.peakCents ?? netCents);
  let next: SessionDay = { ...d, netCents, peakCents: peak, updatedAtMs: nowMs };
  if (!next.lock && netCents != null) {
    if (next.lockOnTarget && next.targetCents != null && netCents >= next.targetCents) next = lockNow(next, "TARGET_HIT", nowMs);
    else if (next.lockOnTarget && next.maxLossCents != null && netCents <= -next.maxLossCents) next = lockNow(next, "MAX_LOSS", nowMs);
  }
  return next;
}

export function lockNow(d: SessionDay, reason: LockReason, nowMs: number): SessionDay {
  return { ...d, lock: { day: d.day, reason, mode: d.lockMode, lockedAtMs: nowMs, signedOutAtMs: null } };
}

export function markSignedOut(d: SessionDay, nowMs: number): SessionDay {
  return d.lock ? { ...d, lock: { ...d.lock, signedOutAtMs: nowMs } } : d;
}

/**
 * Is the screen locked right now? `signedIn` is the app's own auth state on this load.
 * UNTIL_SIGN_IN lifts once he signed out from the lock and is signed in again; REST_OF_DAY holds until the day rolls.
 */
export function lockStanding(d: SessionDay, signedIn: boolean): { readonly locked: boolean; readonly lift: boolean } {
  const l = d.lock;
  if (!l) return { locked: false, lift: false };
  if (l.mode === "REST_OF_DAY") return l.day === d.day ? { locked: true, lift: false } : { locked: false, lift: true };
  if (l.signedOutAtMs != null && signedIn) return { locked: false, lift: true };
  return { locked: true, lift: false };
}

export const LOCK_REASON_WORDS: Readonly<Record<LockReason, string>> = {
  TARGET_HIT: "You reached today's target.",
  DONE: "You said you're done.",
  MAX_LOSS: "You reached today's max loss.",
};

/* ── the Giveback meter ─────────────────────────────────────────────────────────────────────── */

export interface Giveback { readonly known: boolean; readonly fraction: number; readonly givenCents: Cents; readonly words: string }

/** (peak − now) ÷ peak, while the day ever stood green. Nothing to give back from a day that never was. */
export function readGiveback(d: Pick<SessionDay, "netCents" | "peakCents">): Giveback {
  if (d.netCents == null || d.peakCents == null || d.peakCents <= 0) return { known: false, fraction: 0, givenCents: 0, words: "No green peak today — nothing to give back." };
  const given = Math.max(0, d.peakCents - d.netCents);
  const fraction = given / d.peakCents;
  return { known: true, fraction, givenCents: given, words: `${Math.round(fraction * 100)}% given back (peak ${money(d.peakCents)} → ${money(d.netCents)})` };
}

/* ── the Toe Whooper ───────────────────────────────────────────────────────────────────────── */

export type ToeVerdict = "WHIPPED_THEM_TOES" | "WENT_THE_DISTANCE" | "TOES_GOT_WHIPPED";
export const TOE_WORDS: Readonly<Record<ToeVerdict, string>> = {
  WHIPPED_THEM_TOES: "YOU WHIPPED THEM TOES",
  WENT_THE_DISTANCE: "WENT THE DISTANCE",
  TOES_GOT_WHIPPED: "YOU GOT YOUR TOES WHIPPED",
};
/** Giving back half a green peak is a whipping, whatever the close. */
export const TOE_GIVEBACK_WHIPPED = 0.5;

export type ToeReading = { readonly known: false; readonly why: string } | { readonly known: true; readonly verdict: ToeVerdict; readonly because: string };

/** Honest from his own numbers: the target and the max loss he set, the result and the peak he typed. */
export function readToeWhooper(d: Pick<SessionDay, "netCents" | "peakCents" | "targetCents" | "maxLossCents">): ToeReading {
  if (d.netCents == null) return { known: false, why: "Type today's result first — no verdict from an empty day." };
  const n = d.netCents;
  if (d.maxLossCents != null && n <= -d.maxLossCents) return { known: true, verdict: "TOES_GOT_WHIPPED", because: `${money(n)} reached your max loss of ${plain(d.maxLossCents)}.` };
  const g = readGiveback(d);
  if (g.known && g.fraction >= TOE_GIVEBACK_WHIPPED && (d.targetCents == null || n < d.targetCents)) {
    return { known: true, verdict: "TOES_GOT_WHIPPED", because: `You gave back ${Math.round(g.fraction * 100)}% of a ${plain(d.peakCents ?? 0)} peak.` };
  }
  if (d.targetCents != null && n >= d.targetCents) return { known: true, verdict: "WHIPPED_THEM_TOES", because: `${money(n)} met your ${plain(d.targetCents)} target.` };
  return { known: true, verdict: "WENT_THE_DISTANCE", because: `${money(n)} — inside your limits${d.targetCents != null ? `, short of the ${plain(d.targetCents)} target` : ""}.` };
}

/* ── the MNQ → NQ checkpoint ──────────────────────────────────────────────────────────────── */

/** The full-size contract a micro steps up to: MNQ→NQ, MES→ES, MYM→YM, M2K→RTY, MGC→GC, MCL→CL. */
const MICRO_TO_FULL: Readonly<Record<string, string>> = { MNQ: "NQ", MES: "ES", MYM: "YM", M2K: "RTY", MGC: "GC", MCL: "CL" };

/** The futures root of a chart symbol: "MNQ1!" → MNQ, "/NQZ6" → NQ, "NQ=F" → NQ. Null for anything else. */
export function futuresRoot(sym: string): string | null {
  const s = sym.trim().toUpperCase().replace(/^\//, "");
  const m = /^(MNQ|MES|MYM|M2K|MGC|MCL|NQ|ES|YM|RTY|GC|CL)(?:\d!|[FGHJKMNQUVXZ]\d{1,2}|=F)?$/.exec(s);
  return m ? m[1] : null;
}

/** Does this switch step a micro up to its full-size contract while the checkpoint is armed? */
export function checkpointBlocks(d: Pick<SessionDay, "checkpointArmed">, from: string, to: string): boolean {
  if (!d.checkpointArmed) return false;
  const a = futuresRoot(from), b = futuresRoot(to);
  return a != null && b != null && MICRO_TO_FULL[a] === b;
}

/** An amount with no sign (a target, a limit). */
export const plain = (c: Cents): string => money(Math.abs(c)).replace(/^[+−]/, "");

export function money(c: Cents): string {
  const a = Math.abs(c);
  const whole = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${c < 0 ? "−" : c > 0 ? "+" : ""}$${whole}.${String(a % 100).padStart(2, "0")}`;
}
