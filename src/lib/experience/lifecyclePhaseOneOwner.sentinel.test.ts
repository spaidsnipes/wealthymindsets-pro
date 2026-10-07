/**
 * ONE PHASE OWNER — Garden 16 §15/§32, 2026-09-27 (verifier HIGH round 3,
 * MEDIUM + LOW round 4).
 *
 * The commit that made decisionLifecycle the one owner left /command-deck with
 * its own `useState<CommandPhase>("PREPARATION")` and its own phase-word table:
 * a second, live owner of "where is the trader in this decision", invisible to
 * the Workspace mode row and to /charts. This sentinel reads EVERY source file
 * and fails if any file other than the owner holds phase state or phase words.
 *
 * ROUND 4 (verifier MEDIUM): the round-3 detector looked for the TYPE
 * (TradePhase) or a SEED that was an upper-case phase id. A second store that
 * was neither — `useState<"prep" | "manage">("prep")`, `useState("Manage")`,
 * a setter called with "POSITION", a module `let` holding "In trade", a store
 * `create(() => ({ stage: "manage" }))`, a copy of the owner's reading into
 * room state, or a room state variable handed to the deck as its `phase` —
 * passed. Phase state is now found by BEHAVIOUR: any state hook / store / mutable
 * binding whose values (literals, same-file type aliases and consts resolved)
 * include ANY of the owner's phase ids, stage ids or deck labels, compared
 * case-insensitively and with spaces, hyphens and underscores ignored.
 *
 *   · phase STATE — useState / useReducer / useRef / useSyncExternalStore /
 *     createContext / createStore / create, a useState setter, a module `let`
 *     or a `this.field` — holding a phase word, typed as a phase type (or a
 *     local alias), or copied from the owner's reading; and a room variable
 *     passed as the deck's `phase` that is not the owner's `lifecyclePhaseFor`.
 *   · phase WORDS — the deck's labels as string literals, case-insensitive
 *     ("Prep" and "Review" are ordinary words elsewhere — a chart arrangement is
 *     labelled "Review"; "Approach", "Decide", "In Trade" and "Post-Exit" are the
 *     deck's own).
 *
 * Comments are stripped first: saying "In Trade" in prose is not owning it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { DECK_PHASE_LABEL, DECK_PHASE_ORDER, LIFECYCLE_STAGES } from "./decisionLifecycle";

const ROOT = path.join(process.cwd(), "src");
const OWNER = path.join("src", "lib", "experience", "decisionLifecycle.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec|sentinel)\.|\.d\.ts$|__tests__/.test(p)) out.push(p);
  }
  return out;
}

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\s*\}/g, "{}");

/** Case, spaces, hyphens and underscores do not change a word: "In trade" is "IN_TRADE". */
export const normWord = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

/** Every word the owner uses for a place in the lifecycle — ids, stages and labels. */
const LIFECYCLE_WORDS: ReadonlySet<string> = new Set(
  [...DECK_PHASE_ORDER, ...LIFECYCLE_STAGES, ...Object.values(DECK_PHASE_LABEL)].map(normWord),
);
/** The deck's OWN labels — the ones that are not ordinary words anywhere else. */
const DECK_OWN_WORDS: ReadonlySet<string> = new Set(
  Object.entries(DECK_PHASE_LABEL)
    .filter(([id]) => id !== "PREPARATION" && id !== "REVIEW")
    .map(([, w]) => normWord(w)),
);

const PHASE_IDS: ReadonlySet<string> = new Set<string>([...DECK_PHASE_ORDER, ...LIFECYCLE_STAGES]);

const PHASE_TYPES = ["TradePhase", "LifecycleStage", "CommandPhase"];
/** Reading the owner — a state seeded or set from these is a COPY of the one stage. */
const OWNER_READS = /\b(?:lifecyclePhaseFor|stageAttachedTo|phaseForStage|stageForPhase|DECK_PHASE_ORDER|LIFECYCLE_STAGES|LIFECYCLE_START|COMMAND_DECK_PHASES)\b/;

const literals = (text: string) => [...text.matchAll(/["'`]([^"'`\n]{1,40})["'`]/g)].map((m) => m[1]);
const holdsLifecycleWord = (text: string) => literals(text).some((l) => LIFECYCLE_WORDS.has(normWord(l)));

/** The balanced `(...)` starting at `open` (an index of "("), or "" when unbalanced. */
function balanced(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length && i < open + 4000; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(open, i + 1);
  }
  return "";
}

/** Same-file `type X = …;` and `const X = …;` bodies, so an alias or a const cannot hide a word. */
function resolveNames(src: string, text: string): string {
  let out = text;
  for (const id of new Set(text.match(/\b[A-Za-z_]\w*\b/g) ?? [])) {
    const m = src.match(new RegExp(`\\b(?:type|const|let)\\s+${id}\\b(?:\\s*:[^=;]+)?\\s*=\\s*([^;]{0,600})`));
    if (m) out += " " + m[1];
  }
  return out;
}

const STATE_HOOK = /\b(?:useState|useReducer|useRef|useSyncExternalStore|createContext|createStore|create)\s*(<[^()]*?>)?\s*(?=\()/g;

/** Returns the phase-state and phase-word offences in one file's source. */
export function phaseOwnershipOffences(raw: string): string[] {
  const src = strip(raw);
  const out = new Set<string>();

  const aliases = [
    ...PHASE_TYPES,
    ...[...src.matchAll(new RegExp(`type\\s+(\\w+)\\s*=\\s*(?:${PHASE_TYPES.join("|")})\\s*;`, "g"))].map((m) => m[1]),
  ];
  if (new RegExp(`\\b(?:useState|useReducer|useRef)\\s*<\\s*(?:${aliases.join("|")})\\b`).test(src)) {
    out.add("phase state (typed)");
  }

  // BEHAVIOUR: what a state hook or store is seeded with, or typed to hold.
  for (const m of src.matchAll(STATE_HOOK)) {
    const args = balanced(src, (m.index ?? 0) + m[0].length);
    const held = resolveNames(src, `${m[1] ?? ""} ${args}`);
    if (holdsLifecycleWord(held)) out.add("phase state (holds a phase word)");
    if (OWNER_READS.test(args)) out.add("phase state (copied from the owner)");
  }
  // What a useState setter is later called with.
  for (const m of src.matchAll(/\[\s*\w+\s*,\s*(set\w+)\s*\]\s*=\s*(?:React\.)?useState\b/g)) {
    for (const c of src.matchAll(new RegExp(`\\b${m[1]}\\s*(?=\\()`, "g"))) {
      const arg = balanced(src, (c.index ?? 0) + c[0].length);
      if (holdsLifecycleWord(resolveNames(src, arg))) out.add("phase state (holds a phase word)");
      if (OWNER_READS.test(arg)) out.add("phase state (copied from the owner)");
    }
  }
  // A module `let` or a class field — a store without a hook. (A function's
  // local `verdict = "WAIT"` is a permission verdict, not a store.)
  for (const m of src.matchAll(/(?:^(?:export\s+)?let\s+\w+\s*(?::[^=;]+)?=|\bthis\.\w+\s*=(?!=))\s*(["'`][^"'`\n]{1,40}["'`])/gm)) {
    if (holdsLifecycleWord(m[1])) out.add("phase state (holds a phase word)");
  }
  // The deck's phase prop: only the owner's reading may be handed to it.
  for (const m of src.matchAll(/<CommandDeckSurface\b[^>]*?\bphase=\{\s*([^}]*?)\s*\}/g)) {
    const bound = new RegExp(`\\bconst\\s+${m[1].replace(/[^\w]/g, "")}\\s*(?::[^=]+)?=\\s*lifecyclePhaseFor\\(`);
    if (!/^\w+$/.test(m[1]) || !bound.test(src)) out.add("phase state (passed as the deck's phase)");
  }

  // A phase ID ("POST_EXIT") is the type's value and is read everywhere; a LABEL
  // in any case or spelling ("Post exit", "in trade") is the deck's word.
  if (literals(src).some((l) => !PHASE_IDS.has(l) && DECK_OWN_WORDS.has(normWord(l)))) out.add("phase words");
  return [...out];
}

describe("no file other than decisionLifecycle holds the trade phase", () => {
  it("the detector catches exactly what /command-deck used to hold (it is not a no-op)", () => {
    expect(phaseOwnershipOffences(`type CommandPhase = TradePhase;\nconst [phase, setPhase] = React.useState<CommandPhase>("PREPARATION");`))
      .toEqual(["phase state (typed)", "phase state (holds a phase word)"]);
    expect(phaseOwnershipOffences(`const P = [{ id: "POSITION", label: "In Trade" }];`)).toEqual(["phase words"]);
    expect(phaseOwnershipOffences(`const [p] = useState("POST_EXIT");`)).toEqual(["phase state (holds a phase word)"]);
    expect(phaseOwnershipOffences(`// "In Trade" said on TSLA\nconst phase = lifecyclePhaseFor(ctx, symbol);`)).toEqual([]);
  });

  it("round 4 — a second phase store that is neither typed TradePhase nor seeded with an upper-case id is caught by what it holds", () => {
    const state = ["phase state (holds a phase word)"];
    // a local union of lower-case stage words, seeded with one
    expect(phaseOwnershipOffences(`const [s, setS] = useState<"prep" | "manage">("prep");`)).toEqual(state);
    // untyped, mixed case, a stage word
    expect(phaseOwnershipOffences(`const [s] = React.useState("Manage");`)).toEqual(state);
    // seeded neutrally, the phase arrives through the setter
    expect(phaseOwnershipOffences(`const [s, setS] = useState<string | null>(null);\nonClick={() => setS("position")}`)).toEqual(state);
    // a same-file alias and a same-file const hide nothing
    expect(phaseOwnershipOffences(`type Where = "observe" | "Manage";\nconst [w] = useState<Where>(null as never);`)).toEqual(state);
    expect(phaseOwnershipOffences(`const START = "wait";\nconst [w] = useState(START);`)).toEqual(state);
    // useReducer seeded with an object, and a store with no hook at all
    expect(phaseOwnershipOffences(`const [st, dispatch] = useReducer(reduce, { where: "execute" });`)).toEqual(state);
    expect(phaseOwnershipOffences(`export const useWhere = create(() => ({ where: "decision" }));`)).toEqual(state);
    expect(phaseOwnershipOffences(`let where: string = "approach";`)).toEqual([...state, "phase words"]);
    expect(phaseOwnershipOffences(`class S { set() { this.where = "review"; } }`)).toEqual(state);
    // a room COPY of the owner's reading is a second store even with no word in it
    expect(phaseOwnershipOffences(`const [p, setP] = useState(() => lifecyclePhaseFor(ctx, symbol));`))
      .toEqual(["phase state (copied from the owner)"]);
    expect(phaseOwnershipOffences(`const [p, setP] = useState<string>("");\nsetP(DECK_PHASE_ORDER[3]);`))
      .toEqual(["phase state (copied from the owner)"]);
    // handed to the deck as its phase without being the owner's reading
    expect(phaseOwnershipOffences(`const where = pick(x);\n<CommandDeckSurface deck={d} phase={where} onPhase={f} />`))
      .toEqual(["phase state (passed as the deck's phase)"]);
    expect(phaseOwnershipOffences(`<CommandDeckSurface deck={d} phase={x ?? y} onPhase={f} />`))
      .toEqual(["phase state (passed as the deck's phase)"]);
    // …and the owner's reading handed to the deck is not an offence
    expect(phaseOwnershipOffences(`const tradePhase: TradePhase = lifecyclePhaseFor(ctx, symbol);\n<CommandDeckSurface deck={d} phase={tradePhase} onPhase={f} />`))
      .toEqual([]);
    // state that holds ordinary words is not phase state
    expect(phaseOwnershipOffences(`const [tab, setTab] = useState<"display" | "alerts">("display");\nsetTab("alerts");`)).toEqual([]);
  });

  it("round 4 (LOW) — the deck's words are found whatever their case or separator", () => {
    for (const w of ["In Trade", "In trade", "in trade", "IN TRADE", "IN_TRADE", "in-trade", "Post-Exit", "post exit", "DECIDE", "approach"]) {
      expect(phaseOwnershipOffences(`const L = { x: "${w}" };`), w).toEqual(["phase words"]);
    }
    // "Prep" and "Review" stay ordinary words as labels
    expect(phaseOwnershipOffences(`const L = ["Review", "prep"];`)).toEqual([]);
  });

  it("every source file in src is clean — the owner is the only one", () => {
    const files = walk(ROOT);
    expect(files.length).toBeGreaterThan(500);
    expect(files.map((f) => path.relative(process.cwd(), f))).toContain(OWNER);
    const offenders = files
      .filter((f) => path.relative(process.cwd(), f) !== OWNER)
      .map((f) => [path.relative(process.cwd(), f), phaseOwnershipOffences(readFileSync(f, "utf8"))] as const)
      .filter(([, o]) => o.length > 0);
    expect(offenders).toEqual([]);
  // The scan reads every source file; it grows with the repo and hit the
  // 5 s default under a full parallel run (2026-10-07). The assertion is
  // unchanged — only the time it is allowed to take.
  }, 30_000);

  it("the owner really holds the words (so the scan is looking for the right ones)", () => {
    expect(phaseOwnershipOffences(readFileSync(path.join(process.cwd(), OWNER), "utf8"))).toContain("phase words");
    for (const w of ["preparation", "position", "manage", "observe", "intrade", "postexit", "decide"]) {
      expect(LIFECYCLE_WORDS.has(w), w).toBe(true);
    }
  });
});
