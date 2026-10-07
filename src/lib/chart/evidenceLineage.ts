/**
 * H-301 · EVIDENCE LINEAGE — "DO NOT COUNT 7" (F12 Indicator Graduation,
 * plate WM_NewMockup_118_F12_Evidence_Lineage_Do_Not_Count_7).
 *
 * Seven readings on the glass are not seven votes. RSI, MACD and an MA slope
 * are one question asked three ways of the same closes; a profile POC and
 * VWAP are both the auction's answer. This compiler groups what the trader has
 * ON into INDEPENDENT FAMILIES by what each reading is computed FROM, so the
 * rail can say "7 observations / 3 independent families — do not count 7".
 *
 * Input is only what is switched on: names and ids. It reads no market data,
 * scores nothing, and never says which family is right. PURE.
 */

export type EvidenceFamilyId = "MOMENTUM" | "AUCTION" | "PARTICIPATION" | "LIQUIDITY" | "VOLATILITY" | "STRUCTURE" | "DERIVATIVES";

export const EVIDENCE_FAMILY: Readonly<Record<EvidenceFamilyId, { readonly label: string; readonly from: string }>> = {
  MOMENTUM:      { label: "Momentum",      from: "price bars — the same candles, re-asked" },
  AUCTION:       { label: "Auction",       from: "where volume and time accepted price" },
  PARTICIPATION: { label: "Participation", from: "who traded, and how hard" },
  LIQUIDITY:     { label: "Liquidity",     from: "resting orders in the book" },
  VOLATILITY:    { label: "Volatility",    from: "range and dispersion" },
  STRUCTURE:     { label: "Structure",     from: "swings, breaks and patterns" },
  DERIVATIVES:   { label: "Derivatives",   from: "options and futures positioning" },
};

/** Indicator catalog category → family. Names override below where the category misleads. */
const CATEGORY_FAMILY: Readonly<Record<string, EvidenceFamilyId>> = {
  Trend: "MOMENTUM", Momentum: "MOMENTUM", Oscillators: "MOMENTUM",
  Volume: "PARTICIPATION", "Order Flow": "PARTICIPATION",
  Volatility: "VOLATILITY",
  Pivots: "AUCTION", Sessions: "AUCTION",
  Patterns: "STRUCTURE", "Smart Money": "STRUCTURE", Statistics: "STRUCTURE",
};

/** Catalog entries filed under a category that is not what they are computed from. */
const NAME_FAMILY: ReadonlyArray<readonly [RegExp, EvidenceFamilyId]> = [
  [/bollinger|keltner|donchian|atr|envelope|price channel|regression channel/i, "VOLATILITY"],
  [/vwap|volume profile|vol ?profile|market profile|tpo/i, "AUCTION"],
  [/obv|cvd|delta|big ?trades|imbalance|footprint|money flow|accumulation/i, "PARTICIPATION"],
];

/** Tools switches (selectProfileMenu ids) → family. Lenses that read nothing new are absent on purpose. */
const TOOL_FAMILY: Readonly<Record<string, EvidenceFamilyId>> = {
  FIXED_RANGE: "AUCTION", SESSION: "AUCTION", DELTA_VP: "PARTICIPATION", FLOW_CURRENT: "PARTICIPATION", VALUE_CANDLE: "AUCTION",
  LIVING_PROFILE: "AUCTION", TPO_PROFILE: "AUCTION", STRUCTURE_PROFILE: "AUCTION", PROFILE_DNA: "AUCTION",
  VALUE_MIGRATION: "AUCTION", PROFILE_MEMORY: "AUCTION", PROFILE_FUSION: "AUCTION", COMPOSITE_PROFILE: "AUCTION",
  VISIBLE_RANGE_PROFILE: "AUCTION", ANCHORED_RANGE: "AUCTION",
  // Clarity reads the bar alone (body efficiency, wick intent) — price-derived.
  CLARITY_CANDLE: "MOMENTUM", ABSORPTION: "PARTICIPATION", EXHAUSTION: "PARTICIPATION",
  ANATOMY_CARDS: "PARTICIPATION", IMBALANCE_STACK: "PARTICIPATION", DELTA_DIVERGENCE: "PARTICIPATION",
  EFFORT_MARK: "PARTICIPATION", DELTA_LEVELS: "PARTICIPATION",
  LIQUIDITY_WEATHER: "LIQUIDITY", LIQUIDITY_LIFECYCLE: "LIQUIDITY",
  // Brick Walls are options open-interest strikes (Cboe delayed, INFERRED),
  // not resting orders in the book: serving SPY 5m 2026-10-07 listed them
  // under "Liquidity · from resting orders in the book" beside a chip reading
  // "Cboe delayed · INFERRED". Same family as Derivatives Pressure — one source.
  BRICK_WALLS: "DERIVATIVES",
  MARKET_STRUCTURE: "STRUCTURE", MTF_ANCESTRY: "STRUCTURE", SCAFFOLDING: "STRUCTURE",
  EXPECTED_ENVELOPE: "VOLATILITY",
  DERIVATIVES_PRESSURE: "DERIVATIVES",
};

export interface EvidenceInput {
  /** Active indicators, with the catalog category each is filed under. */
  readonly indicators: ReadonlyArray<{ readonly name: string; readonly cat: string | null }>;
  /**
   * Active Tools switches, by id, with the label the trader sees. `quiet`:
   * the switch is on but the chart's own receipt says nothing of it is on
   * this camera (NO CURRENT EVENT / unavailable) — 2026-10-04, Founder: tools
   * "pop up with a description in the right panel and nothing on the chart".
   * A quiet tool is not an observation; it is listed as waiting.
   */
  readonly tools: ReadonlyArray<{ readonly id: string; readonly label: string; readonly quiet?: boolean; readonly needsVolume?: boolean }>;
}

export interface EvidenceFamilyGroup {
  readonly id: EvidenceFamilyId;
  readonly label: string;
  readonly from: string;
  readonly members: readonly string[];
}

export interface EvidenceLineageVM {
  readonly observations: number;
  readonly families: readonly EvidenceFamilyGroup[];
  /** Observations that share a family with another — the count a naive read would inflate. */
  readonly correlated: number;
  /** "DO NOT COUNT 7" — present only when observations outnumber independent families. */
  readonly warning: string | null;
  readonly summary: string;
  /** Switched on, nothing of them on this camera — named, never counted. */
  readonly waiting: readonly string[];
  /**
   * Switched on, and the MARKET cannot feed them (spot FX: no traded volume).
   * Not "waiting": no event will ever come (FX lane, 2026-10-06).
   */
  readonly unsupported: readonly string[];
}

export function evidenceFamilyOfIndicator(name: string, cat: string | null): EvidenceFamilyId | null {
  for (const [re, fam] of NAME_FAMILY) if (re.test(name)) return fam;
  return cat ? CATEGORY_FAMILY[cat] ?? null : null;
}

export function evidenceFamilyOfTool(id: string): EvidenceFamilyId | null {
  return TOOL_FAMILY[id] ?? null;
}

const ORDER: readonly EvidenceFamilyId[] = ["MOMENTUM", "AUCTION", "PARTICIPATION", "LIQUIDITY", "VOLATILITY", "STRUCTURE", "DERIVATIVES"];

/** Null when nothing evidential is on — an empty card is a ghost. */
export function compileEvidenceLineage(input: EvidenceInput): EvidenceLineageVM | null {
  const byFam = new Map<EvidenceFamilyId, string[]>();
  const add = (fam: EvidenceFamilyId | null, label: string) => {
    if (!fam) return;
    const list = byFam.get(fam) ?? [];
    if (!list.includes(label)) list.push(label);
    byFam.set(fam, list);
  };
  for (const i of input.indicators) add(evidenceFamilyOfIndicator(i.name, i.cat), i.name);
  const waiting: string[] = [];
  const unsupported: string[] = [];
  for (const t of input.tools) {
    if (t.needsVolume && evidenceFamilyOfTool(t.id)) { if (!unsupported.includes(t.label)) unsupported.push(t.label); continue; }
    if (t.quiet && evidenceFamilyOfTool(t.id)) { if (!waiting.includes(t.label)) waiting.push(t.label); continue; }
    add(evidenceFamilyOfTool(t.id), t.label);
  }
  if (byFam.size === 0 && waiting.length === 0 && unsupported.length === 0) return null;
  const families = ORDER.filter(f => byFam.has(f)).map(f => ({ id: f, label: EVIDENCE_FAMILY[f].label, from: EVIDENCE_FAMILY[f].from, members: byFam.get(f)! }));
  const observations = families.reduce((n, f) => n + f.members.length, 0);
  const correlated = families.reduce((n, f) => n + (f.members.length > 1 ? f.members.length : 0), 0);
  const k = families.length;
  return {
    observations,
    families,
    correlated,
    warning: observations > k ? `DO NOT COUNT ${observations}` : null,
    summary: `${observations} observation${observations === 1 ? "" : "s"} / ${k} independent famil${k === 1 ? "y" : "ies"}`,
    waiting,
    unsupported,
  };
}
