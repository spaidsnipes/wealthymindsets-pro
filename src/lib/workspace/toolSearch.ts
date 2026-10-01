/**
 * TOOL SEARCH — Garden 18 §XXVI–§XXVIII: "NOTHING IMPORTANT MAY HIDE."
 *
 * Typing ABSORPTION finds Absorption; TPO finds TPO; CLARITY finds the Clarity
 * Candle — without the trader knowing which family door a tool lives behind.
 * Pure: the entries come from `selectProfileMenu` (the one catalogue), this
 * module only ranks them against what was typed.
 */
import type { ProfileFamily, ProfileId, ProfileMenuEntry } from "@/lib/marketData/viewModels/selectProfileMenu";

/** The words traders actually type for a tool, where they differ from its label. */
export const TOOL_ALIASES: Readonly<Partial<Record<ProfileId, readonly string[]>>> = {
  ABSORPTION: ["absorption shelf", "shelf", "exhaustion"],
  TPO_PROFILE: ["tpo", "auction distribution", "market profile", "letters"],
  VALUE_CANDLE: ["candle", "value"],
  CLARITY_CANDLE: ["clarity", "candle", "body efficiency", "wick intent", "truth gap"],
  DELTA_VP: ["bid ask", "bid/ask", "delta profile", "split"],
  FIXED_RANGE: ["volume profile", "vp", "classic"],
  SESSION: ["session profile", "vp"],
  IMBALANCE_STACK: ["imbalance", "stacked"],
  DELTA_DIVERGENCE: ["delta", "divergence"],
  DELTA_LEVELS: ["delta"],
  LIQUIDITY_WEATHER: ["weather", "liquidity"],
  LIQUIDITY_LIFECYCLE: ["liquidity", "walls", "lifecycle"],
  BRICK_WALLS: ["brick", "walls", "liquidity wall"],
  EFFORT_MARK: ["effort", "effort response", "effort/response"],
  MARKET_STRUCTURE: ["structure", "bos", "choch", "swings"],
  MEMORY_GHOST: ["memory", "ghost"],
  PROFILE_MEMORY: ["memory"],
  ANATOMY_CARDS: ["anatomy"],
  DERIVATIVES_PRESSURE: ["options", "gamma", "pressure", "oi"],
  REGIME_LIGHTING: ["regime"],
  RISK_ON_PRICE: ["risk", "stop", "target"],
};

/** The family's human name, as the Tools library prints it. */
export const FAMILY_WORD: Readonly<Record<ProfileFamily, string>> = {
  ORDER_FLOW: "Order flow",
  PROFILE: "Profile / auction",
  READING: "Structure · memory · market sense",
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Any searchable tool row — a catalogue entry or a chart instrument outside it (footprint, Big Trades). */
export interface ToolRow { readonly id: string; readonly label: string; readonly what: string; readonly aliases?: readonly string[]; readonly familyWord?: string }

/** Same ranking as `searchTools`, over plain rows. */
export function searchToolRows<T extends ToolRow>(rowsIn: readonly T[], query: string): T[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: { e: T; s: number; i: number }[] = [];
  rowsIn.forEach((e, i) => {
    const label = norm(e.label);
    const aliases = (e.aliases ?? []).map(norm);
    const hay = [label, ...aliases, norm(e.what), norm(e.familyWord ?? "")].join(" | ");
    if (!words.every(w => hay.includes(w))) return;
    const s = label.startsWith(q) ? 0 : label.includes(q) ? 1 : aliases.some(a => a.startsWith(q)) ? 2 : aliases.some(a => a.includes(q)) ? 3 : 4;
    scored.push({ e, s, i });
  });
  return scored.sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.e);
}

/**
 * Entries matching every typed word, best first: a label that starts with the
 * query, then a label containing it, then an alias, then the one-line job.
 * An empty query matches nothing — the Active strip owns the empty state.
 */
export function searchTools(entries: readonly ProfileMenuEntry[], query: string, family?: (id: ProfileId) => ProfileFamily): ProfileMenuEntry[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: { e: ProfileMenuEntry; s: number; i: number }[] = [];
  entries.forEach((e, i) => {
    const label = norm(e.label);
    const aliases = (TOOL_ALIASES[e.id] ?? []).map(norm);
    const fam = family ? norm(FAMILY_WORD[family(e.id)]) : "";
    const hay = [label, ...aliases, norm(e.what), fam].join(" | ");
    if (!words.every(w => hay.includes(w))) return;
    const s = label.startsWith(q) ? 0
      : label.includes(q) ? 1
      : aliases.some(a => a.startsWith(q)) ? 2
      : aliases.some(a => a.includes(q)) ? 3
      : 4;
    scored.push({ e, s, i });
  });
  return scored.sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.e);
}
