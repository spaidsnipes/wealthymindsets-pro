/**
 * ONE PHASE OWNER — Garden 16 §15/§32, 2026-09-27 (verifier HIGH, round 3).
 *
 * The commit that made decisionLifecycle the one owner left /command-deck with
 * its own `useState<CommandPhase>("PREPARATION")` and its own phase-word table:
 * a second, live owner of "where is the trader in this decision", invisible to
 * the Workspace mode row and to /charts. This sentinel reads EVERY source file
 * and fails if any file other than the owner holds phase state or phase words.
 *
 *   · phase STATE — a useState / useReducer / useRef typed as TradePhase (or a
 *     local alias of it), or seeded with a TradePhase literal;
 *   · phase WORDS — the deck's labels as string literals ("Prep" and "Review"
 *     are ordinary words elsewhere — a chart arrangement is labelled "Review";
 *     "Approach", "Decide", "In Trade" and "Post-Exit" are the deck's own).
 *
 * Comments are stripped first: saying "In Trade" in prose is not owning it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { DECK_PHASE_LABEL } from "./decisionLifecycle";

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

const PHASE_LITERAL = '"(?:PREPARATION|APPROACH|DECISION|POSITION|POST_EXIT|REVIEW)"';

/** Returns the phase-state and phase-word offences in one file's source. */
export function phaseOwnershipOffences(raw: string): string[] {
  const src = strip(raw);
  const aliases = ["TradePhase", ...[...src.matchAll(/type\s+(\w+)\s*=\s*TradePhase\s*;/g)].map((m) => m[1])];
  const typed = new RegExp(`\\b(?:useState|useReducer|useRef)\\s*<\\s*(?:${aliases.join("|")})\\b`);
  const seeded = new RegExp(`\\b(?:useState|useRef)\\s*(?:<[^>]*>)?\\(\\s*${PHASE_LITERAL}\\s*\\)`);
  const words = Object.entries(DECK_PHASE_LABEL)
    .filter(([id]) => id !== "PREPARATION" && id !== "REVIEW")
    .map(([, w]) => w);
  const worded = new RegExp(`["'\`](?:${words.join("|")})["'\`]`);
  const out: string[] = [];
  if (typed.test(src)) out.push("phase state (typed)");
  if (seeded.test(src)) out.push("phase state (seeded with a phase)");
  if (worded.test(src)) out.push("phase words");
  return out;
}

describe("no file other than decisionLifecycle holds the trade phase", () => {
  it("the detector catches exactly what /command-deck used to hold (it is not a no-op)", () => {
    expect(phaseOwnershipOffences(`type CommandPhase = TradePhase;\nconst [phase, setPhase] = React.useState<CommandPhase>("PREPARATION");`))
      .toEqual(["phase state (typed)", "phase state (seeded with a phase)"]);
    expect(phaseOwnershipOffences(`const P = [{ id: "POSITION", label: "In Trade" }];`)).toEqual(["phase words"]);
    expect(phaseOwnershipOffences(`const [p] = useState("POST_EXIT");`)).toEqual(["phase state (seeded with a phase)"]);
    expect(phaseOwnershipOffences(`// "In Trade" said on TSLA\nconst phase = lifecyclePhaseFor(ctx, symbol);`)).toEqual([]);
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
  });

  it("the owner really holds the words (so the scan is looking for the right ones)", () => {
    expect(phaseOwnershipOffences(readFileSync(path.join(process.cwd(), OWNER), "utf8"))).toContain("phase words");
  });
});
