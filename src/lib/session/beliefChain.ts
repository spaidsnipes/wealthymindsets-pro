/**
 * THE BELIEF CHAIN CHECK — after Myron Golden's teaching on ending worry (Founder's Nov 12 transcripts; in our own
 * words, credited where taught). Before and after a session he names the FACT, where his FOCUS went (the good or
 * the bad side of it), what he BELIEVES (faith or doubt), how it FEELS (anticipation or anxiety) and how he
 * FUNCTIONS (power or powerlessness). Any link on the dark side asks for a thought replacement in his own words.
 * PURE. Kept per market day on his device.
 */
export type ChainSide = "LIGHT" | "DARK";
export const CHAIN_LINKS = [
  { key: "focus", label: "Focus", light: "On what's working", dark: "On what could go wrong" },
  { key: "belief", label: "Belief", light: "Faith — I can execute my plan", dark: "Doubt" },
  { key: "feeling", label: "Feeling", light: "Anticipation", dark: "Anxiety / worry" },
  { key: "function", label: "Function", light: "Power — calm, on plan", dark: "Powerless — forcing, chasing" },
] as const;
export type ChainKey = (typeof CHAIN_LINKS)[number]["key"];

export interface ChainCheck {
  readonly fact: string;
  readonly links: Partial<Record<ChainKey, ChainSide>>;
  /** His replacement thought: what he expects instead of what he fears. */
  readonly replacement: string;
  readonly atMs: number | null;
}
export interface BeliefDay { readonly day: string; readonly pre: ChainCheck; readonly post: ChainCheck }

export const BELIEF_BASE_KEY = "wm_belief_chain_v1";
export const EMPTY_CHECK: ChainCheck = { fact: "", links: {}, replacement: "", atMs: null };
export const emptyBeliefDay = (day: string): BeliefDay => ({ day, pre: EMPTY_CHECK, post: EMPTY_CHECK });

export function chainReading(c: ChainCheck): { readonly answered: number; readonly dark: number; readonly needsReplacement: boolean; readonly words: string } {
  const answered = CHAIN_LINKS.filter(l => c.links[l.key]).length;
  const dark = CHAIN_LINKS.filter(l => c.links[l.key] === "DARK").length;
  const needsReplacement = dark > 0 && c.replacement.trim().length === 0;
  const words = answered === 0 ? "Not checked yet."
    : dark === 0 ? "Anticipation, not worry. Trade the plan."
    : needsReplacement ? `${dark} link${dark === 1 ? "" : "s"} on the worry side — write the thought you'll stand on instead.`
    : "Thought replaced. Stand on it.";
  return { answered, dark, needsReplacement, words };
}

const text = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
function readCheck(v: unknown): ChainCheck {
  if (!v || typeof v !== "object") return EMPTY_CHECK;
  const o = v as Record<string, unknown>; const lr = (o.links ?? {}) as Record<string, unknown>;
  const links: Partial<Record<ChainKey, ChainSide>> = {};
  for (const l of CHAIN_LINKS) if (lr[l.key] === "LIGHT" || lr[l.key] === "DARK") links[l.key] = lr[l.key] as ChainSide;
  return { fact: text(o.fact, 280), links, replacement: text(o.replacement, 280), atMs: typeof o.atMs === "number" && Number.isFinite(o.atMs) ? o.atMs : null };
}
export function readBeliefDay(raw: unknown, today: string): BeliefDay {
  if (!raw || typeof raw !== "object") return emptyBeliefDay(today);
  const o = raw as Record<string, unknown>;
  if (o.day !== today) return emptyBeliefDay(today);
  return { day: today, pre: readCheck(o.pre), post: readCheck(o.post) };
}
