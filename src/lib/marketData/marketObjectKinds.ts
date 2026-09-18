/**
 * OBJECT KINDS AND SHARED SLOTS — eight nouns, one drawer.
 *
 * Source: SUPPORT — Truth Resolver Fidelity + MarketObject Attachments
 * (2026-09-18), §2. The section exists because of a failure mode the canon
 * names precisely:
 *
 *   "This is where teams usually overbuild."
 *
 * ── THE DISTINCTION THE WHOLE FILE RESTS ON ──────────────────────────────────
 *
 *   KIND        = what shape it is.
 *   ATTACHMENT  = what memory every shape is allowed to carry.
 *
 *   "Kinds may differ in geometry. Attachments must not."
 *
 * That second sentence is the load-bearing one. The overbuild always arrives
 * the same way: a new kind shows up, it "needs" one extra field, the field is
 * added to that kind only, and within a quarter the Passport drawer has a
 * layout per kind and the inspect has become eight inspects. So the slots are
 * declared ONCE here, every kind carries all of them, and a kind that needs its
 * own database is by definition too much.
 *
 * ── WHY EIGHT AND NOT EIGHTY ─────────────────────────────────────────────────
 *
 * The canon's rejected list is more instructive than its accepted one:
 *
 *   "Do not make kinds of: Order Block Room, Wyckoff Event Object, Smart Money
 *    Thing, Indicator Graduation Object. Those are READINGS of the same kinds,
 *    or overlays, or inspect notes."
 *
 * OB, FVG, MB, IFVG and BPR are five names for geometry that folds into GAP,
 * ZONE and LEVEL. They are strategies arguing, and §Strategy Is Not The OS is
 * explicit that WM does not own whether a given reading is correct. Promoting
 * a reading to a KIND is how the house would accidentally take a side.
 *
 * ── AND WHY A KIND IS NEVER A PERMISSION ─────────────────────────────────────
 *
 * The canon's sharpest rejection in the table: "Kind = permission — 'touched OB
 * = GO'". A shape is not a reason. Whether capital may move is answered by the
 * gates, the Evidence Debt and the fidelity algebra, and nothing in this module
 * returns a boolean that could be mistaken for consent. There is deliberately
 * no `isTradeable(kind)` here and there must never be one.
 */

/* ── THE CLOSED KINDS ──────────────────────────────────────────────────────── */

/**
 * P0 — enough to trade the underlying. Three shapes.
 */
export const P0_OBJECT_KINDS = [
  /** A price: shelf, HVN, LVN. One number the market keeps returning to. */
  "LEVEL",
  /** A band: range, opening range, value area. */
  "ZONE",
  /** The hard line the thesis dies on. Geometry, and also a promise. */
  "INVALIDATION",
] as const;

/**
 * P1 — still geometry, still the same slots. The canon's instruction after
 * this list is "Stop there for consumer chrome."
 */
export const P1_OBJECT_KINDS = [
  "GAP",
  "STRUCTURE",
  "LIQUIDITY",
  "ANCHOR",
] as const;

export const MARKET_OBJECT_KINDS = [...P0_OBJECT_KINDS, ...P1_OBJECT_KINDS] as const;

export type MarketObjectKind = (typeof MARKET_OBJECT_KINDS)[number];

/**
 * The nouns that must NEVER become kinds, carried as data rather than as prose
 * so a Sentinel can ask the question instead of a reviewer remembering to.
 *
 * Each is a READING of the kinds above, and adopting one would have the house
 * take a side in a strategy argument it has said it does not own.
 */
export const REJECTED_KIND_NAMES: readonly string[] = Object.freeze([
  "ORDER_BLOCK",
  "ORDERBLOCK",
  "WYCKOFF",
  "SMART_MONEY",
  "INDICATOR_GRADUATION",
  "FVG_ROOM",
  "BPR",
  "IFVG",
  "MITIGATION_BLOCK",
]);

/**
 * Where a rejected name's geometry actually belongs. The point of naming the
 * destination is that "we don't support that" is a refusal, while "that is a
 * ZONE" is an answer — and the second one is what keeps a team from building
 * the kind anyway under a different spelling.
 */
export const REJECTED_KIND_HOME: Readonly<Record<string, MarketObjectKind>> = Object.freeze({
  ORDER_BLOCK: "ZONE",
  ORDERBLOCK: "ZONE",
  WYCKOFF: "STRUCTURE",
  SMART_MONEY: "ZONE",
  INDICATOR_GRADUATION: "LEVEL",
  FVG_ROOM: "GAP",
  BPR: "GAP",
  IFVG: "GAP",
  MITIGATION_BLOCK: "ZONE",
});

export function isMarketObjectKind(s: string): s is MarketObjectKind {
  return (MARKET_OBJECT_KINDS as readonly string[]).includes(s);
}

/**
 * Resolve a name that is not a kind to the kind that already holds its
 * geometry, or null if the house genuinely has no home for it.
 *
 * Null is an honest answer and is not the same as ZONE. Folding an unknown
 * shape into the most capacious kind would quietly file it as understood.
 */
export function homeForRejectedKind(name: string): MarketObjectKind | null {
  return REJECTED_KIND_HOME[name.trim().toUpperCase()] ?? null;
}

/* ── THE SHARED SLOTS ──────────────────────────────────────────────────────── */

/**
 * Object life stages. Qualitative, and deliberately not a number — an object
 * that is 0.73 alive is a score, and §15 does not permit the house to grade.
 */
export type MarketObjectState = "ALIVE" | "TESTED" | "DEFENDED" | "CONSUMED" | "INVALID";

export const MARKET_OBJECT_STATES: readonly MarketObjectState[] = Object.freeze([
  "ALIVE",
  "TESTED",
  "DEFENDED",
  "CONSUMED",
  "INVALID",
]);

/**
 * Every kind carries all of these. That is the rule, not a convention.
 *
 * Note what is NOT here: any OHLC. "Attachments reprint bars" is on the canon's
 * creep table, and an object that stores its own open and close is a second
 * market with a second past — the exact cut the DECISION_ID doc warns about.
 * Objects reference `birthBarId` and read the CanonicalBar; they never copy it.
 */
export interface MarketObject {
  readonly objectId: string;
  readonly kind: MarketObjectKind;
  readonly symbolId: string;
  readonly sessionId: string;
  /** Geometry, on one scale. A LEVEL is a ZONE whose edges meet. */
  readonly priceLow: number;
  readonly priceHigh: number;
  /** A CanonicalBar id. Never a copy of the bar. */
  readonly birthBarId: string;
  readonly testBarIds: readonly string[];
  readonly lastResponseBarId: string | null;
  readonly invalidationPrice: number | null;
  readonly state: MarketObjectState;
  /** Lineage. Not a second market. */
  readonly evidenceIds: readonly string[];
  /** Age / tests / failed response. */
  readonly decay: number;
  readonly asOf: number;
  readonly fidelityAtBirth: string;
}

/**
 * The slot names, as data, so the "one drawer" law is checkable.
 *
 * A Passport that renders these and only these renders identically for all
 * eight kinds — which is how eight nouns stay one inspect. The canon: "Kind
 * only changes the noun on the door. The drawer layout does not change."
 */
export const SHARED_ATTACHMENT_SLOTS: readonly (keyof MarketObject)[] = Object.freeze([
  "objectId",
  "kind",
  "symbolId",
  "sessionId",
  "priceLow",
  "priceHigh",
  "birthBarId",
  "testBarIds",
  "lastResponseBarId",
  "invalidationPrice",
  "state",
  "evidenceIds",
  "decay",
  "asOf",
  "fidelityAtBirth",
]);

/**
 * Optional attachments — still SLOTS, and pointedly not new kinds. Absent is a
 * legitimate value for every one of them, and the canon says what absence
 * means: "missing attachment = Evidence Debt, not a new type."
 */
export const OPTIONAL_ATTACHMENT_SLOTS: readonly string[] = Object.freeze([
  "profileContribution",
  "liquidityLifecycle",
  "forceResponseAtLastTest",
  "analoguePointer",
]);

/* ── GEOMETRY ──────────────────────────────────────────────────────────────── */

export type GeometryVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * The one thing kinds are allowed to differ about, checked in the one place.
 *
 * A LEVEL is a price and a ZONE is a band, and the difference is real — but it
 * is a difference in GEOMETRY, which is exactly the axis the canon permits. It
 * buys no extra slot, no extra drawer and no extra permission.
 */
export function checkGeometry(
  kind: MarketObjectKind,
  priceLow: number,
  priceHigh: number,
): GeometryVerdict {
  if (!Number.isFinite(priceLow) || !Number.isFinite(priceHigh)) {
    return { ok: false, reason: "An object without finite geometry is not on the chart." };
  }
  if (priceHigh < priceLow) {
    return { ok: false, reason: "priceHigh is below priceLow — the band is inside out." };
  }
  if ((kind === "LEVEL" || kind === "INVALIDATION" || kind === "ANCHOR") && priceHigh !== priceLow) {
    return {
      ok: false,
      reason:
        `${kind} is a price, not a band. A thesis that dies "somewhere around here" `
        + "cannot size a position, because Available R has no denominator.",
    };
  }
  return { ok: true };
}
