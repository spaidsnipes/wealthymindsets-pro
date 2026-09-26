/**
 * F11B · THE PASSPORT'S SLOTS — the drawer the Founder's plate draws, as data.
 *
 * Plate: `WM_NewMockup_85_F11B_Passport_Drawer` ("passport inspect, not a
 * Passport Room"). One row per slot, in this order, each a medallion glyph at
 * the left, a gold title, a primary line, a secondary line and a status mark
 * at the right:
 *
 *   BIRTH SOURCE · AGE · TOUCHES · DEFENSES · CONSUMPTION · DECAY ·
 *   INVALIDATION · FIDELITY
 *
 * and a footer: PASSPORT ID · INSPECTED. "Not a room. Not a folder. A passport."
 *
 * ── LIVING-PIXEL LAW: EVERY LINE HAS AN OWNER, OR SAYS IT HAS NONE ─────────
 *
 * Nothing here measures anything. Each slot is read from one owner:
 *
 *   BIRTH SOURCE  the birth bar's admitted identity (`selectObjectLineage`)
 *   AGE           the zone lifecycle's asOf − birth, or the object's own
 *                 asOf − its birth bar's identity; bars since birth
 *   TOUCHES       the lifecycle's touch episodes / the object's test bars
 *   DEFENSES      the lifecycle's REJECTED responses
 *   CONSUMPTION   the lifecycle's `deepestPenetration` (v2) — the meter
 *   DECAY         the lifecycle state, stated not projected
 *   INVALIDATION  the lifecycle's own rule (close beyond the far edge)
 *   FIDELITY      the object's `fidelityAtBirth`, one of the closed five
 *
 * A slot whose owner has nothing to say renders its honest silence with an
 * UNKNOWN status — never a number the owner did not publish. A LEVEL has no
 * lifecycle owner yet, so its DEFENSES and CONSUMPTION are UNKNOWN and its
 * INVALIDATION says no rule is stated.
 *
 * The plate's "Strong / Slow / High" are GRADES. The house does not grade
 * (§15; `aVerdictIsNeverGraded`): the words here are counts and states.
 *
 * TIMES are formatted by the caller's `stamp` — the chart's display-zone clock
 * that names its zone (`inspectReadsTheAxisClock`). This module never picks a
 * zone, so it cannot print a hard-coded UTC beside an axis in another zone.
 *
 * PURE. DETERMINISTIC. No React, no clock, no IO.
 */

import { MARKET_FIDELITIES, type MarketFidelity } from "../marketFidelityAlgebra";
import type { MarketObject, MarketObjectState } from "../marketObjectKinds";
import type { StructureZone } from "./selectStructureZoneObjects";
import type { ObjectLineageVM } from "./selectZoneLineage";

export const PASSPORT_SLOTS_VERSION = 1;

/** The plate's order. Pinned by `passportSlotsAreTheF11BDrawer.sentinel.test.ts`. */
export const PASSPORT_SLOT_ORDER = [
  "BIRTH_SOURCE",
  "AGE",
  "TOUCHES",
  "DEFENSES",
  "CONSUMPTION",
  "DECAY",
  "INVALIDATION",
  "FIDELITY",
] as const;

export type PassportSlotId = (typeof PASSPORT_SLOT_ORDER)[number];

export const PASSPORT_SLOT_TITLES: Readonly<Record<PassportSlotId, string>> = Object.freeze({
  BIRTH_SOURCE: "BIRTH SOURCE",
  AGE: "AGE",
  TOUCHES: "TOUCHES",
  DEFENSES: "DEFENSES",
  CONSUMPTION: "CONSUMPTION",
  DECAY: "DECAY",
  INVALIDATION: "INVALIDATION",
  FIDELITY: "FIDELITY",
});

/** OK = the owner measured it and it stands · WATCH = measured, pending or
 *  armed · FAIL = measured, and it broke · UNKNOWN = no owner measured it. */
export type PassportSlotStatus = "OK" | "WATCH" | "FAIL" | "UNKNOWN";

/** The plate's right-hand marks: ✓ · clock · shield · ✕, and a dashed ring for silence. */
export type PassportMark = "CHECK" | "CLOCK" | "SHIELD" | "CROSS" | "UNKNOWN";

export interface PassportSlot {
  readonly id: PassportSlotId;
  /** The medallion glyph's key (the slot id — one glyph per slot, never per kind). */
  readonly icon: PassportSlotId;
  readonly title: string;
  readonly primary: string;
  readonly secondary: string;
  readonly status: PassportSlotStatus;
  readonly mark: PassportMark;
  /** CONSUMPTION only, and only when measured: the fraction in [0, 1]. */
  readonly meter: number | null;
}

export interface PassportFooter {
  /** Short, reversible form of the canonical object id. */
  readonly passportId: string;
  readonly objectId: string;
  /** The object's asOf (unix seconds), or null. */
  readonly inspectedAsOf: number | null;
  readonly inspectedLine: string;
  readonly decision:
    | { readonly state: "BESIDE"; readonly decisionId: string; readonly line: string }
    | { readonly state: "NONE"; readonly line: string };
}

export interface PassportSlotsVM {
  readonly version: number;
  readonly objectId: string;
  readonly kind: string;
  readonly state: MarketObjectState;
  readonly slots: readonly PassportSlot[];
  readonly footer: PassportFooter;
}

export interface PassportSlotsInput {
  readonly object: MarketObject;
  /** The zone the object belongs to, when it is a swing-origin zone (it has a lifecycle owner). */
  readonly zone?: StructureZone | null;
  /** The lineage — used only when compiled for THIS object. */
  readonly lineage?: ObjectLineageVM | null;
  /** A level's origin in words ("Swing high", "Prior-session POC"); zones derive their own. */
  readonly originWord?: string | null;
  /** Which owner published a level: STRUCTURE publishes only untouched levels; MEMORY keeps recent tests. */
  readonly levelOwner?: "STRUCTURE" | "MEMORY" | null;
  /** The Decision_ID born on this camera, used when no lineage is compiled. */
  readonly decisionId?: string | null;
  /** The caller's zoned clock: unix seconds → "YYYY-MM-DD HH:MM ZZZ". */
  readonly stamp: (sec: number) => string;
}

/* ── small pure helpers ─────────────────────────────────────────────────── */

/** Full precision — a 1.08347 FX level is not "1.08". */
export const passportPrice = (v: number) => String(+v.toPrecision(8));

export function passportDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/**
 * The canonical id, short. `ZONE:TSLA|15m|1758800000000|e0:SUPPLY` →
 * `ZONE-TSLA-15m-<birth seconds, base 36>-SUPPLY`: every part of the id is
 * still in it (reversible), only the birth instant is packed. An id that is
 * not bar-shaped is returned whole, or cut with an ellipsis past 28 chars.
 */
export function shortObjectId(id: string): string {
  const parts = id.split(":");
  if (parts.length >= 2) {
    const [kind, bar, ...rest] = parts;
    const b = bar.split("|");
    if (b.length >= 3 && /^\d+$/.test(b[2])) {
      const born = Math.floor(Number(b[2]) / 1000).toString(36).toUpperCase();
      return [kind, b[0], b[1], born, ...rest].filter(Boolean).join("-");
    }
  }
  return id.length > 28 ? `${id.slice(0, 27)}…` : id;
}

/** The mark a slot wears: the plate's glyph for that slot unless the status overrides it. */
export function markFor(id: PassportSlotId, status: PassportSlotStatus): PassportMark {
  if (status === "UNKNOWN") return "UNKNOWN";
  if (status === "FAIL") return "CROSS";
  if (id === "AGE") return "CLOCK";
  if (id === "DEFENSES") return "SHIELD";
  // The line the object dies on is a ✕ even while armed — coloured WATCH, not FAIL.
  if (id === "INVALIDATION") return "CROSS";
  return "CHECK";
}

const FIDELITY_WORDS: Readonly<Record<MarketFidelity, { line: string; status: PassportSlotStatus }>> = {
  [MARKET_FIDELITIES.INDICATIVE]: { line: "Lawful observation · not broker-backed", status: "OK" },
  [MARKET_FIDELITIES.EXECUTABLE]: { line: "The price the adapter will use", status: "OK" },
  [MARKET_FIDELITIES.PARTIAL]: { line: "Bar exists · some attachments missing", status: "WATCH" },
  [MARKET_FIDELITIES.DEGRADED]: { line: "Admitted with a known wound", status: "WATCH" },
  [MARKET_FIDELITIES.STALE]: { line: "asOf too old for the job — no new GO", status: "WATCH" },
};

const STATE_WORD: Readonly<Record<MarketObjectState, string>> = {
  ALIVE: "Edges intact · untested",
  TESTED: "Under test",
  DEFENDED: "Edges intact",
  CONSUMED: "Far edge swept",
  INVALID: "Broken",
};
const STATE_STATUS: Readonly<Record<MarketObjectState, PassportSlotStatus>> = {
  ALIVE: "OK",
  DEFENDED: "OK",
  TESTED: "WATCH",
  CONSUMED: "WATCH",
  INVALID: "FAIL",
};

function slot(id: PassportSlotId, primary: string, secondary: string, status: PassportSlotStatus, meter: number | null = null): PassportSlot {
  return { id, icon: id, title: PASSPORT_SLOT_TITLES[id], primary, secondary, status, mark: markFor(id, status), meter };
}

/* ── the selector ───────────────────────────────────────────────────────── */

export function selectPassportSlots(input: PassportSlotsInput): PassportSlotsVM {
  const o = input.object;
  const t = input.stamp;
  const zone = input.zone && input.zone.object.objectId === o.objectId ? input.zone : null;
  const lineage = input.lineage && input.lineage.objectId === o.objectId ? input.lineage : null;
  const lc = zone?.lifecycle ?? null;
  const state: MarketObjectState = lc?.state ?? o.state;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  const origin = zone
    ? (zone.side === "DEMAND" ? "Swing-low origin" : "Swing-high origin")
    : input.originWord ?? `${o.kind.charAt(0)}${o.kind.slice(1).toLowerCase()} birth`;
  const birthSec = zone ? zone.birthTime : lineage?.birth.state === "READ" ? Math.floor(lineage.birth.asOf / 1000) : null;

  // BIRTH SOURCE — the admitted identity's own words, or its absence.
  const birthSource = lineage?.birth.state === "READ"
    ? slot("BIRTH_SOURCE", `${origin} · ${lineage.birth.source}`,
      `${birthSec != null ? t(birthSec) : "birth time not read"} · ${lineage.birth.provenance}`, "OK")
    : slot("BIRTH_SOURCE", `${origin} · source not admitted`,
      `${birthSec != null ? `${t(birthSec)} · ` : ""}no canonical identity for the birth bar`, "UNKNOWN");

  // AGE — asOf − birth, and bars since birth.
  const bars = lc ? lc.barsSinceBirth : o.decay;
  const nowSec = lc ? lc.asOf : Number.isFinite(o.asOf) ? Math.floor(o.asOf / 1000) : null;
  const ageSec = birthSec != null && nowSec != null ? nowSec - birthSec : null;
  const age = slot("AGE",
    ageSec != null ? passportDuration(ageSec) : plural(bars, "bar"),
    `Since birth · ${plural(bars, "bar")} · ${state === "INVALID" ? "invalidated" : "still valid"}`,
    state === "INVALID" ? "FAIL" : "OK");

  // TOUCHES
  let touches: PassportSlot;
  if (lc) {
    const all = lc.touches;
    const done = all.filter(x => x.response !== "OPEN").length;
    const open = all.length - done;
    const swept = all.filter(x => x.swept).length;
    const last = all[all.length - 1];
    touches = all.length === 0
      ? slot("TOUCHES", "None since birth", "Price has not returned to the band", "OK")
      : slot("TOUCHES", `${done} confirmed${open ? ` · ${open} open` : ""}`,
        `Last ${t(last.start)}${swept ? ` · ${swept} swept the far edge` : ""}`, "OK");
  } else {
    const n = o.testBarIds.length;
    touches = n === 0
      ? slot("TOUCHES", "None since birth", input.levelOwner === "MEMORY"
        ? "Still naked"
        : "The level owner publishes only untouched levels; a touched level leaves the glass", "OK")
      : slot("TOUCHES", `${n} recent`, `Each test bar is in the evidence list${input.levelOwner === "MEMORY" ? " (Profile Memory keeps the most recent)" : ""}`, "OK");
  }

  // DEFENSES — REJECTED responses, counted; never graded.
  let defenses: PassportSlot;
  if (lc && zone) {
    const held = lc.touches.filter(x => x.response === "REJECTED").length;
    const side = zone.side === "DEMAND" ? "above" : "below";
    defenses = state === "INVALID"
      ? slot("DEFENSES", "Broken", `${plural(held, "rejection")} held before a close beyond`, "FAIL")
      : held > 0
        ? slot("DEFENSES", `${held} held`, `${plural(held, "rejection")} · price left ${side} the band${state === "CONSUMED" ? " · far edge swept" : ""}`,
          state === "CONSUMED" ? "WATCH" : "OK")
        : lc.touches.length > 0
          ? slot("DEFENSES", "Under test", "Price is inside the band — no response yet", "WATCH")
          : slot("DEFENSES", "Not yet tested", "Nothing to defend since birth", "WATCH");
  } else {
    defenses = slot("DEFENSES", "Not measured", "No lifecycle owner for this object — no response is read", "UNKNOWN");
  }

  // CONSUMPTION — the lifecycle's deepest penetration, or silence.
  let consumption: PassportSlot;
  const depth = lc?.deepestPenetration ?? null;
  if (lc && depth != null) {
    const pct = Math.round(depth * 100);
    const deepest = lc.touches.reduce<(typeof lc.touches)[number] | null>(
      (m, x) => (x.depth != null && (m == null || (x.depth ?? 0) > (m.depth ?? 0)) ? x : m), null);
    const words = state === "INVALID" ? "Closed through the far edge"
      : depth >= 1 ? "Far edge reached · swept, not broken"
        : depth > 0 ? "Mitigated · far edge intact"
          : "Untouched";
    consumption = slot("CONSUMPTION", `${pct}% of the band`,
      `${words}${deepest && depth > 0 ? ` · deepest ${t(deepest.start)}` : ""}`,
      state === "INVALID" ? "FAIL" : depth >= 1 ? "WATCH" : "OK", depth);
  } else {
    consumption = slot("CONSUMPTION", "Not measured", lc
      ? "The band has no height — no fraction to take"
      : "No lifecycle owner measures consumption for this object", "UNKNOWN");
  }

  // DECAY — what happened, never a half-life.
  const tests = lc ? lc.touches.length : o.testBarIds.length;
  const decay = slot("DECAY", STATE_WORD[state],
    `${plural(tests, "test")} in ${plural(bars, "bar")} · stated, not projected — no half-life`, STATE_STATUS[state]);

  // INVALIDATION — the object's own rule, or the statement that it has none.
  let invalidation: PassportSlot;
  if (lc && zone) {
    const beyond = zone.side === "DEMAND" ? "below" : "above";
    invalidation = lc.invalidatedAt != null
      ? slot("INVALIDATION", passportPrice(lc.invalidationPrice), `Closed ${beyond} it ${t(lc.invalidatedAt)}`, "FAIL")
      : slot("INVALIDATION", passportPrice(lc.invalidationPrice), `A bar close ${beyond} breaks it · a wick through is a sweep`, "WATCH");
  } else if (o.invalidationPrice != null) {
    invalidation = slot("INVALIDATION", passportPrice(o.invalidationPrice),
      state === "INVALID" ? "Stated by the owner · broken" : "Stated by the owner", state === "INVALID" ? "FAIL" : "WATCH");
  } else {
    invalidation = slot("INVALIDATION", "No rule stated", "This level has no lifecycle owner yet", "UNKNOWN");
  }

  // FIDELITY — one of the closed five, at birth.
  const f = FIDELITY_WORDS[o.fidelityAtBirth as MarketFidelity];
  const fidelity = f
    ? slot("FIDELITY", o.fidelityAtBirth, `At birth · ${f.line}`, f.status)
    : slot("FIDELITY", o.fidelityAtBirth || "Not stated", "Not one of the five fidelities — read as unknown", "UNKNOWN");

  const slots = [birthSource, age, touches, defenses, consumption, decay, invalidation, fidelity];

  const inspectedAsOf = Number.isFinite(o.asOf) ? Math.floor(o.asOf / 1000) : null;
  const decisionId = lineage?.chain.state === "READ" ? lineage.chain.decisionId : lineage ? null : input.decisionId ?? null;
  return {
    version: PASSPORT_SLOTS_VERSION,
    objectId: o.objectId,
    kind: o.kind,
    state,
    slots,
    footer: {
      passportId: shortObjectId(o.objectId),
      objectId: o.objectId,
      inspectedAsOf,
      inspectedLine: inspectedAsOf != null ? t(inspectedAsOf) : "asOf not read",
      decision: decisionId
        ? { state: "BESIDE", decisionId, line: `${decisionId} · beside the object — the decision publishes no evidence list` }
        : { state: "NONE", line: "none taken on this camera" },
    },
  };
}

/* ── where the drawer stands ───────────────────────────────────────────── */

export type PassportDock = "LEFT" | "RIGHT";

/**
 * The drawer stands on the wall AWAY from the selected object, so its candles
 * stay in view (the plate draws the object beside its passport).
 *
 * An object is drawn from its birth `objectX` rightward to the pane's right
 * inset (a zone's band runs birth → now). The drawer takes the side whose
 * rectangle covers less of that span, and never the side that covers the
 * birth pin itself. A tie goes RIGHT, where the plate stands it. With no
 * measured x (the pin is off camera, or nothing has laid out) it keeps the
 * LEFT wall: a zone is born at a recent swing, so it lives at the right.
 */
export function passportDockSide(input: {
  readonly objectX: number | null;
  readonly paneWidth: number;
  readonly drawerWidth: number;
  readonly leftInset?: number;
  readonly rightInset?: number;
}): PassportDock {
  const { objectX: x, paneWidth: W, drawerWidth: w } = input;
  const li = input.leftInset ?? 8;
  const ri = input.rightInset ?? 76;
  if (x == null || !Number.isFinite(x) || !(W > 0) || !(w > 0)) return "LEFT";
  const end = Math.max(x, W - ri);
  const overlap = (a0: number, a1: number) => Math.max(0, Math.min(end, a1) - Math.max(x, a0));
  const left = { a: li, b: li + w };
  const right = { a: W - ri - w, b: W - ri };
  const pinUnderLeft = x >= left.a - 14 && x <= left.b + 14;
  const pinUnderRight = x >= right.a - 14 && x <= right.b + 14;
  if (pinUnderLeft && !pinUnderRight) return "RIGHT";
  if (pinUnderRight && !pinUnderLeft) return "LEFT";
  return overlap(left.a, left.b) < overlap(right.a, right.b) ? "LEFT" : "RIGHT";
}

export default selectPassportSlots;
