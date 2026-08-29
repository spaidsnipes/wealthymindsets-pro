/**
 * canonicalRoster — canon §THE TWELVE ROLES (ATHOS Master Manual v2.0,
 * 2026-07-28).
 *
 * Canon verbatim:
 *   "1. Elias — Chief Strategy Officer — Love
 *    2. Grace — Chief Revenue Officer — Kindness
 *    3. Caleb — Director of Business Intelligence — Patience
 *    4. Sophia — Chief Consulting Officer — Goodness
 *    5. Noah — Chief Engineering Officer — Faithfulness
 *    6. Micah — Chief Experience Officer — Gentleness
 *    7. Hope — Chief Growth Officer — Joy
 *    8. Shalom — Chief Customer Officer — Peace
 *    9. Nehemiah — Chief Operations and Production Officer — Self-Control
 *    10. Atlas — Chief Knowledge System — Truth, Wisdom, Stewardship,
 *        Clarity, Legacy
 *    11. Forge — Master Systems Builder — Excellence
 *    12. Sentinel — Master Quality Builder — Precision"
 *
 *   "Forge and Sentinel are not backups, lesser builders, or
 *    second-string workers. They are equal master builders with
 *    different specialties. AI accounts are replaceable seats; roles
 *    and standards are permanent."
 *
 * Retires the informally-invented "ORKIN" name (never appeared in
 * canon). Every ATHOS-role reference in shift ledgers, comments, and
 * receipts should now cite this module — one canonical writer, twelve
 * canonical roles.
 *
 * The Fruit-of-Spirit column encodes each role's core value; canon
 * §GOVERNANCE preserves the doctrine that "God is not represented by
 * an AI, system, persona, or employee" — the fruits are ATHOS core
 * values, not spiritual authority.
 */

export interface CanonicalRole {
  /** Canonical role name, verbatim from ATHOS Master Manual §Twelve Roles. */
  readonly name: string;
  /** Full title (e.g., "Chief Strategy Officer"). */
  readonly title: string;
  /**
   * Core value — one of the Fruit-of-Spirit for the first nine, or
   * an ATHOS-specific value for Atlas / Forge / Sentinel.
   */
  readonly coreValue: string;
  /** One-sentence mission, canon-quoted or canon-derived. */
  readonly mission: string;
  /**
   * Which of the seven-role shorthand I've been using in shift ledgers
   * this canonical role maps to. `null` when the canonical role has
   * no shorthand equivalent (Elias / Grace / Caleb / Sophia / Hope /
   * Shalom / Forge) — those seven were absent from my ledgers.
   */
  readonly legacyShorthand:
    | "NOAH"
    | "MICAH"
    | "NEHEMIAH"
    | "ATLAS"
    | "SENTINEL"
    | "ATHOS"
    | null;
}

/**
 * The twelve canonical roles in canon order. Order is deliberate:
 * §Twelve Roles enumerates 1..12 with Elias first (Strategy — Love)
 * and Sentinel twelfth (Master Quality — Precision).
 */
export const CANONICAL_ATHOS_ROSTER: readonly CanonicalRole[] = Object.freeze([
  {
    name: "Elias",
    title: "Chief Strategy Officer",
    coreValue: "Love",
    mission: "Set the vision, integrate all roles, and keep the mission true.",
    legacyShorthand: "ATHOS",
  },
  {
    name: "Grace",
    title: "Chief Revenue Officer",
    coreValue: "Kindness",
    mission: "Convert audience into paying customers with honesty and generosity.",
    legacyShorthand: null,
  },
  {
    name: "Caleb",
    title: "Director of Business Intelligence",
    coreValue: "Patience",
    mission: "Turn raw data into disciplined insight the team can act on.",
    legacyShorthand: null,
  },
  {
    name: "Sophia",
    title: "Chief Consulting Officer",
    coreValue: "Goodness",
    mission: "Diagnose client problems and prescribe honest interventions.",
    legacyShorthand: null,
  },
  {
    name: "Noah",
    title: "Chief Engineering Officer",
    coreValue: "Faithfulness",
    mission: "Ship engineering that does what it claims, correctly, every time.",
    legacyShorthand: "NOAH",
  },
  {
    name: "Micah",
    title: "Chief Experience Officer",
    coreValue: "Gentleness",
    mission: "Ensure every surface feels intentional, calm, and human.",
    legacyShorthand: "MICAH",
  },
  {
    name: "Hope",
    title: "Chief Growth Officer",
    coreValue: "Joy",
    mission: "Grow the audience through work that genuinely deserves attention.",
    legacyShorthand: null,
  },
  {
    name: "Shalom",
    title: "Chief Customer Officer",
    coreValue: "Peace",
    mission: "Protect the customer's experience across every touchpoint.",
    legacyShorthand: null,
  },
  {
    name: "Nehemiah",
    title: "Chief Operations and Production Officer",
    coreValue: "Self-Control",
    mission: "Own the critical path; convert plans into shipped work.",
    legacyShorthand: "NEHEMIAH",
  },
  {
    name: "Atlas",
    title: "Chief Knowledge System",
    coreValue: "Truth, Wisdom, Stewardship, Clarity, Legacy",
    mission: "Preserve the company's memory; make knowledge retrievable and honest.",
    legacyShorthand: "ATLAS",
  },
  {
    name: "Forge",
    title: "Master Systems Builder",
    coreValue: "Excellence",
    // Canon: "Transform ambitious ideas into elegant, scalable,
    // production-grade systems." — architecture, performance,
    // integrations, refactors, production hardening.
    mission: "Transform ambitious ideas into elegant, scalable, production-grade systems.",
    legacyShorthand: null,
  },
  {
    name: "Sentinel",
    title: "Master Quality Builder",
    coreValue: "Precision",
    // Canon: "Protect the company's reputation by ensuring that
    // nothing reaches users before it is trustworthy, polished,
    // secure, and release-ready."
    mission: "Ensure nothing reaches users before it is trustworthy, polished, secure, and release-ready.",
    legacyShorthand: "SENTINEL",
  },
]);

/**
 * Legacy shorthand → canonical role name lookup. Historical shift
 * ledgers used a seven-role shorthand (ATHOS/NOAH/ATLAS/SENTINEL/
 * ORKIN/MICAH/NEHEMIAH). This map:
 *   - resolves each still-valid shorthand to its canonical name
 *   - EXPLICITLY records "ORKIN" as SUPERSEDED with no canonical
 *     equivalent (canon: it never existed).
 */
export const LEGACY_SHORTHAND_MAP: Readonly<Record<string, string | "SUPERSEDED">> = Object.freeze({
  ATHOS:     "Elias",
  NOAH:      "Noah",
  MICAH:     "Micah",
  NEHEMIAH:  "Nehemiah",
  ATLAS:     "Atlas",
  SENTINEL:  "Sentinel",
  // Never appeared in ATHOS Master Manual — retire in favor of
  // Sentinel (quality gates) or Forge (state-matrix / hardening).
  ORKIN:     "SUPERSEDED",
});

/**
 * Case-insensitive name lookup — resolves any canonical role name or
 * legacy shorthand to a CanonicalRole. Returns null for unknown
 * names (canon §Master Truth Covenant: do not invent).
 */
export function resolveRole(nameOrShorthand: string): CanonicalRole | null {
  const upper = nameOrShorthand.trim().toUpperCase();
  const shorthand = LEGACY_SHORTHAND_MAP[upper];
  if (shorthand === "SUPERSEDED") return null;
  const target = (shorthand ?? nameOrShorthand).trim().toLowerCase();
  return (
    CANONICAL_ATHOS_ROSTER.find((r) => r.name.toLowerCase() === target) ?? null
  );
}

/** Names-only helper for iteration + Sentinel enforcement. */
export const CANONICAL_ROLE_NAMES: readonly string[] = Object.freeze(
  CANONICAL_ATHOS_ROSTER.map((r) => r.name),
);
