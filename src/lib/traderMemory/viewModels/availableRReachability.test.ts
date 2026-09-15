/**
 * availableR REACHABILITY — the RISK pixel has no producer, and says so.
 *
 * WHAT WAS MEASURED
 *
 * `selectDecisionChain` emits `availableR` only when it is handed
 * `availableRInputs`:
 *
 *     const availableR = input.availableRInputs
 *       ? selectAvailableR({ ...input.availableRInputs, state })
 *       : null;
 *
 * `availableRInputs` has ZERO production referencers. The only places the
 * identifier appears are its own declaration, the two lines above, and
 * `selectDecisionChain.test.ts`. The deck's call is:
 *
 *     selectDecisionChain({ state, history, nowMs, phase })
 *
 * — no inputs. So `chainVm.availableR` is `null` on /command-deck for every
 * trader, in every phase, on every symbol. Not probably null. Provably null,
 * by construction, until somebody builds a surface where a trader declares an
 * entry and a structural invalidation.
 *
 * WHY THAT WAS A TRUTH DEFECT AND NOT JUST A GAP
 *
 * `AvailableRChip` rendered, for that null, the sentence "Available R has not
 * been evaluated on this scene." Every word of it true except the tense. "Has
 * not been evaluated" tells a trader that evaluation is a thing their next
 * action causes — keep watching, keep clicking, the number will arrive. It
 * will not.
 *
 * That is the same class as the Decision Receipt's "No decision sealed YET",
 * closed in `d72f76b`: not a fabricated number, a fabricated FUTURE. §35
 * PROTECTED TRUTH of the quietest kind, because no numeric gate can see it —
 * there is no number to check.
 *
 * §13 says SURFACE, do not rush-wire. Honored exactly: no entry is invented,
 * no stop is invented, no R is invented, and no producer is hastily bolted on
 * to make the chip light up. The capability stays unwired; the product stops
 * implying otherwise.
 *
 * WHY THE WORDING RULE LIVES HERE AND NOT BESIDE THE COMPONENT
 *
 * A disclosure is only honest while its condition holds. Put the wording
 * assertion next to the chip and it becomes a free-standing rule that
 * outlives the fact it describes: somebody wires a real producer, the chip
 * starts resolving, and this sentence — now false — is still fenced by a
 * green test.
 *
 * Beside the measurement, the failure order is correct. Wire a producer and
 * the zero-producer assertions go red FIRST; the disclosure assertion goes
 * red with them, in the same file, under a heading that explains why. The
 * disclosure cannot quietly become the new lie.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";

import { AVAILABLE_R_UNWIRED_DETAIL, selectAvailableRDetail } from "@/components/experience/AvailableRChip";

const SRC = path.resolve(__dirname, "..", "..", "..");

/** Every .ts/.tsx under src/ that is NOT a test or a fixture. */
function productionFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__fixtures__") continue;
      productionFiles(full, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    if (full.includes(`${path.sep}__tests__${path.sep}`)) continue;
    acc.push(full);
  }
  return acc;
}

/**
 * Read CODE, not prose.
 *
 * The chip's own docstring explains WHY it discloses, and doing that honestly
 * requires naming `availableRInputs` — the field whose absence is the whole
 * reason the disclosure exists. Scanning raw text made the explanation itself
 * the "producer" this gate reports. Third time this exact shape has bitten in
 * this block. A test a comment can turn red is a test that teaches the next
 * author to stop explaining, and an unexplained gate is a deleted gate.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const PRODUCTION = productionFiles(SRC);
const CHAIN_OWNER = path.join(SRC, "lib", "marketData", "viewModels", "selectDecisionChain.ts");

describe("availableR reachability — the producer does not exist in production", () => {
  it("finds a real production file set to search (FALSE_RIPENESS guard)", () => {
    // If the walker returned [] — a renamed directory, a changed extension —
    // every zero-referencer assertion below would pass vacuously and this
    // file would report green while measuring nothing.
    expect(PRODUCTION.length).toBeGreaterThan(200);
    expect(PRODUCTION).toContain(CHAIN_OWNER);
  });

  it("no production file outside selectDecisionChain supplies availableRInputs", () => {
    const referencers = PRODUCTION.filter((f) => {
      if (f === CHAIN_OWNER) return false; // its own declaration + its own read
      return /\bavailableRInputs\b/.test(code(readFileSync(f, "utf8")));
    }).map((f) => path.relative(SRC, f));

    expect(
      referencers,
      `availableRInputs now has a production producer:\n  ${referencers.join("\n  ")}\n` +
        `That is GOOD — it means a trader can finally declare an entry and a ` +
        `structural invalidation. But it also means AVAILABLE_R_UNWIRED_DETAIL ` +
        `is no longer true. Replace the disclosure with the real UNKNOWN grammar ` +
        `(missingInputs already names what is absent) and delete this gate.`,
    ).toEqual([]);
  });

  it("the deck calls selectDecisionChain without availableRInputs", () => {
    // Narrower than the sweep above and worth having separately: the sweep
    // would also pass if the deck stopped calling selectDecisionChain at all.
    // This pins the actual shape of the actual call the Founder's route makes.
    const deck = code(readFileSync(path.join(SRC, "app", "command-deck", "page.tsx"), "utf8"));
    const marker = deck.indexOf("selectDecisionChain({");
    expect(marker, "the deck no longer calls selectDecisionChain").toBeGreaterThan(-1);
    const call = deck.slice(marker, deck.indexOf("});", marker));
    expect(call).not.toContain("availableRInputs");
    expect(call).toContain("state");
  });
});

describe("availableR disclosure — the chip names the condition, not a pending evaluation", () => {
  it("the null-VM detail DISCLOSES the unwired capability rather than implying a pending one", () => {
    expect(selectAvailableRDetail(null)).toBe(AVAILABLE_R_UNWIRED_DETAIL);
    expect(AVAILABLE_R_UNWIRED_DETAIL).toMatch(/no surface in this build declares them/i);
  });

  it("the permanent chart RISK rail reuses the same disclosure owner", () => {
    const rail = code(readFileSync(path.join(SRC, "components", "experience", "DecisionSpineBand.tsx"), "utf8"));
    expect(rail).toContain('import { selectAvailableRDetail } from "@/components/experience/AvailableRChip";');
    expect(rail).toContain("selectAvailableRDetail(availableR)");
    expect(rail).not.toContain("Available R not computed — no chain.");
  });

  it("does not tell the trader that evaluation is coming", () => {
    // The exact failure the Decision Receipt had. "yet", "pending",
    // "not been evaluated", "will be" — all of them promise a future this
    // build cannot deliver. Named individually so a regression says WHICH
    // word came back.
    for (const promise of [/\byet\b/i, /\bpending\b/i, /has not been evaluated/i, /\bwill be\b/i, /\bcoming\b/i, /\bsoon\b/i]) {
      expect(
        AVAILABLE_R_UNWIRED_DETAIL,
        `the RISK disclosure promises a future: ${promise}`,
      ).not.toMatch(promise);
    }
  });

  it("does not fabricate an entry, a stop, or an R to fill the space", () => {
    // §35 PROTECTED TRUTH. The cheapest way to make a RISK pixel look alive
    // is a plausible placeholder. The disclosure must contain no digits at
    // all — there is no measured quantity here to render.
    expect(AVAILABLE_R_UNWIRED_DETAIL).not.toMatch(/\d/);
  });
});
