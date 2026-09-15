/**
 * THE DEFECT, as the Founder saw it on `/command-deck`:
 *
 *   PERMISSION   NOT_EVALUATED
 *   No trader rules configured — Permission not evaluated.
 *
 *   ... 140 pixels lower ...
 *
 *   4  STEWARD · RULES VERDICT
 *   STEWARD RULES · RESTRICTED
 *   Your rule says Trustworthy market data required.
 *   2/8 engaged · phase: preparation
 *
 * One screen, two answers to "does this trader have rules?" — no and eight.
 *
 * Root cause was not a selector bug. It was TWO CALLERS WITH TWO SOURCES:
 * the deck called `selectDecisionChain` without `permissionInputs`, so the
 * chain's permission node stayed null and narrated a fabricated cause, while
 * `composeMarketCanvasVM` independently compiled a real verdict from
 * `defaultFounderRules()`.
 *
 * Found by LOOKING at the screen, not by grep. It survived every previous
 * sweep of this page because nothing about it is wrong in any single file.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/**
 * Comments in these files QUOTE the defect in order to explain it. A Sentinel
 * that fails on its own honest prose is testing the wrong surface.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const DECK = "src/app/command-deck/page.tsx";
const CHAIN = "src/lib/marketData/viewModels/selectDecisionChain.ts";
const COMPOSE = "src/lib/marketData/viewModels/composeMarketCanvasVM.ts";

describe("the decision chain and the Steward cannot disagree about the trader's rules", () => {
  it("THE DEFECT: the deck supplies permissionInputs to selectDecisionChain", () => {
    const deck = codeOnly(read(DECK));
    const start = deck.indexOf("selectDecisionChain({");
    expect(start, "the deck must still call selectDecisionChain").toBeGreaterThan(-1);

    const call = deck.slice(start, deck.indexOf("}, [", start));
    expect(
      call,
      "Without permissionInputs the chain's permission node is null and it " +
        "narrates a non-evaluation while the Steward reads a real verdict off " +
        "the same rules. That contradiction was live on the Founder's screen.",
    ).toContain("permissionInputs");
  });

  it("THE DEFECT: the chain never claims the trader has no rules configured", () => {
    const chain = codeOnly(read(CHAIN));
    expect(
      chain,
      "`permission === null` means no inputs were supplied to THIS selector. " +
        "It is not evidence about whether the trader configured rules, and the " +
        "selector must not assert a state of the world it has not observed.",
    ).not.toContain("No trader rules configured");
  });

  it("the chain's permission fallback narrates its INPUT, not the world", () => {
    const chain = read(CHAIN);
    expect(chain).toContain("No rules supplied to this chain — Permission not evaluated here.");
  });

  it("both call sites read the SAME rules source", () => {
    const deck = codeOnly(read(DECK));
    const compose = codeOnly(read(COMPOSE));
    expect(deck, "the deck must hand the chain the founder rule set").toContain(
      "defaultFounderRules()",
    );
    expect(compose, "the compiler's fallback must use the same rule set").toContain(
      "defaultFounderRules()",
    );
  });

  it("the deck's sessionIdentity matches the compiler's defaultSessionIdentity exactly", () => {
    const compose = read(COMPOSE);
    const deck = read(DECK);
    // The compiler's own spelling, extracted rather than restated here — if it
    // ever changes, this test reads the new one and the deck must follow.
    const m = compose.match(/function defaultSessionIdentity[\s\S]*?return\s+(`[^`]+`)/);
    expect(m, "defaultSessionIdentity must still exist in the compiler").not.toBeNull();
    const spelling = m![1];
    expect(
      deck,
      "A different sessionIdentity would give the two computations different " +
        "inputs, which is how they drifted apart in the first place.",
    ).toContain(spelling);
  });

  it("the compiler DEFERS to a chain-supplied permission rather than compiling a rival", () => {
    const compose = codeOnly(read(COMPOSE));
    expect(
      compose,
      "canon §Single-Writer / Many-Readers: two independent permission " +
        "computations on one page is the shape that produced this defect.",
    ).toMatch(/chain\?\.permission\s*\?\?\s*selectPermission\(/);
  });

  it("OVER-CORRECTION: the compiler's own selectPermission call is NOT deleted", () => {
    const compose = codeOnly(read(COMPOSE));
    expect(
      compose,
      "Callers with no chain (/journal/[id]) and callers whose chain carries " +
        "no permission still need one compiled here. Removing the fallback " +
        "would silence the Steward on every surface that is not the deck.",
    ).toContain("selectPermission({");
    expect(compose).toContain("rules: defaultFounderRules()");
  });

  it("OVER-CORRECTION: permissionInputs stays OPTIONAL on the selector", () => {
    const chain = read(CHAIN);
    expect(
      chain,
      "Making it required would force every caller to own a rule set just to " +
        "read a chain. The selector degrading honestly without it is correct.",
    ).toMatch(/permissionInputs\?:/);
  });

  it("OVER-CORRECTION: the sibling chain links keep their honest input-narrations", () => {
    const chain = read(CHAIN);
    // These were already right. They are the pattern the permission link was
    // fixed to match, and the fix must not disturb them.
    expect(chain).toContain("No proposed setup — Available R not evaluated.");
    expect(chain).toContain("No CLC evaluation available.");
  });

  it("the Steward block is still ungated — the previous defect stays fixed", () => {
    // Slice on the RAW file — the section marker lives in a JSX comment, which
    // codeOnly() strips. Strip the slice afterwards instead.
    const deck = read(DECK);
    const start = deck.indexOf("Steward · Rules Verdict");
    expect(start).toBeGreaterThan(-1);
    const end = deck.indexOf("NECTAR / DATA FIDELITY", start);
    expect(end).toBeGreaterThan(start);
    expect(
      codeOnly(deck.slice(start, end)),
      "121b27a removed this gate; re-adding it would delete the verdict on " +
        "exactly the session where it matters most.",
    ).not.toContain("chainVm &&");
  });
});
