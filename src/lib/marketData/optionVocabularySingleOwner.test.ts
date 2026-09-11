/**
 * optionVocabularySingleOwner — the option chain's provenance has ONE speller.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * The literal pair `source: "alpaca"` / `fidelity: "INDICATIVE"` was hand-typed
 * into EIGHT files, on BOTH sides of the same wire:
 *
 *   1. `src/app/api/market-data/alpaca/options/route.ts` — the server, ×6 envelopes
 *   2. `src/lib/marketData/alpacaOptionChain.ts`         — the producer
 *   3. `src/lib/optionsChainRead.ts`                     — the client read path
 *   4. `src/components/chart/OptionsChain.tsx`           — a GATE + a rendered label
 *   5. `src/components/chart/OptionExpressionIntent.tsx` — a rendered label
 *   6. `src/components/chart/ChartsDashboard.tsx`        — a GATE
 *   7. `src/lib/optionExpressionSourceTruth.test.ts`     — a test DEMANDING the literal
 *   8. `src/lib/optionsChainTruthSurface.test.ts`        — a second such test
 *
 * Copies 4 and 6 are equality gates that REJECT the chain on mismatch. Copies
 * 4 and 5 are shown to the trader. Copy 1 is the server writing the very value
 * copies 3/4/6 gate on — client and server each holding a private opinion about
 * how this wire identifies itself. Copies 7 and 8 are the ugliest: tests that
 * asserted the consumer SOURCE TEXT contained `receipt.source !== "alpaca"`,
 * so the duplicate could not be repaired without the suite going red. The copy
 * had grown a guard protecting itself.
 *
 * Re-spell the pair in ONE of those eight and the chain fails an equality gate
 * silently: the trader sees the option surface as an invalid response, and
 * nothing in the codebase points at the typo.
 *
 * ── Why `tsc` could not see it ───────────────────────────────────────────────
 *
 * Each copy was an independently-inferred string literal type. Six literals
 * that happen to agree typecheck exactly as well as six that do not, because
 * nothing ever compares copy #3 to copy #5 at the type level. DUPLICATE TRUTH,
 * invisible at exit 0. This file is the machine that was missing.
 *
 * ── What this file enforces ──────────────────────────────────────────────────
 *
 * The owner is `src/lib/optionContractResponse.ts` — chosen because all five
 * runtime files ALREADY imported it, so ownership added zero import edges and
 * zero bundle weight. Every other file must import the spelling, never retype
 * it. The scan strips comments and this file's own prose so it judges CODE.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OPTION_CHAIN_FIDELITY,
  OPTION_CHAIN_SOURCE,
} from "@/lib/optionContractResponse";

const SRC = resolve(__dirname, "..", "..");

/** The one file permitted to SPELL the vocabulary. */
const OWNER = "lib/optionContractResponse.ts";

/**
 * Every file that previously held a hand-typed copy. Listed by real path so a
 * rename or deletion trips the anti-vacuity guard rather than silently
 * shrinking the scan to nothing.
 */
const FORMER_COPIES: readonly string[] = [
  // The SERVER end of the wire, found by revive O rather than by reading: the
  // route hand-typed `source: "alpaca"` on all six of its error envelopes,
  // while `optionsChainRead` gates those same envelopes on the owner's
  // spelling. Re-spell at the owner and the client stops recognising its own
  // route's "NOT CONFIGURED" / "INVALID RESPONSE" replies, collapsing a precise
  // operator message into a generic failure. Client and server must not each
  // hold a private opinion about how this wire identifies itself.
  "app/api/market-data/alpaca/options/route.ts",
  "lib/marketData/alpacaOptionChain.ts",
  "lib/optionsChainRead.ts",
  "lib/optionExpressionSourceTruth.test.ts",
  "lib/optionsChainTruthSurface.test.ts",
  "components/chart/OptionsChain.tsx",
  "components/chart/OptionExpressionIntent.tsx",
  "components/chart/ChartsDashboard.tsx",
];

function read(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

/**
 * Judge CODE, not commentary. Every one of these files now carries a doc
 * comment explaining the repair, and those comments necessarily QUOTE the old
 * literals as evidence. Counting quoted evidence as a fresh offence would make
 * the defect unrecordable — the same trap already hit and fixed in
 * `repoFrontDoorAuthority.test.ts`.
 */
function stripComments(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** The retyped spellings, as bare string literals in code. */
const SOURCE_LITERAL = new RegExp(`(['"\`])${OPTION_CHAIN_SOURCE}\\1`, "g");
const FIDELITY_LITERAL = new RegExp(`(['"\`])${OPTION_CHAIN_FIDELITY}\\1`, "g");

describe("the option provenance vocabulary has exactly one owner", () => {
  it("ANTI-VACUITY: the scan reads six real files that really import the owner", () => {
    // If a rename made these reads return nothing, every assertion below would
    // pass while checking zero bytes — which is the failure mode this file
    // exists to prevent, so it must not be its own.
    for (const rel of FORMER_COPIES) {
      const body = read(rel);
      expect(body.length, `${rel} is empty or missing — did it move?`).toBeGreaterThan(200);
    }

    // Six runtime files must reach the owner. The two source-text tests assert
    // on file CONTENTS and legitimately name the constants inside strings, so
    // they are scanned for bare literals but not required to import the owner.
    const runtime = FORMER_COPIES.filter(f => !f.endsWith(".test.ts"));
    expect(runtime.length).toBe(6);
    for (const rel of runtime) {
      expect(
        read(rel),
        `${rel} no longer imports the vocabulary owner — it has gone back to spelling its own`,
      ).toMatch(/from ["'](@\/lib|\.|\.\/)?[^"']*optionContractResponse["']/);
    }
  });

  it("THE MEASURED FAILURE: no file outside the owner retypes the literals", () => {
    const offenders: string[] = [];
    for (const rel of FORMER_COPIES) {
      const code = stripComments(read(rel));
      for (const [label, re] of [["source", SOURCE_LITERAL], ["fidelity", FIDELITY_LITERAL]] as const) {
        re.lastIndex = 0;
        const hits = [...code.matchAll(re)];
        if (hits.length > 0) offenders.push(`${rel} retypes the ${label} literal ×${hits.length}`);
      }
    }
    expect(
      offenders,
      `the option provenance vocabulary is owned by src/${OWNER}; these files must import ` +
        "OPTION_CHAIN_SOURCE / OPTION_CHAIN_FIDELITY instead of hand-typing the spelling, or a " +
        "single re-spelling will fail an equality gate silently and show the trader an invalid " +
        "option surface with nothing pointing at the typo",
    ).toEqual([]);
  });

  it("the owner actually SPELLS it — ownership is not an empty title", () => {
    // The mirror of the rule above. If the constants were themselves derived
    // from somewhere else, or the owner were emptied, the scan above would go
    // permanently green while nothing anywhere defined the vocabulary.
    const owner = stripComments(read(OWNER));
    expect(owner).toMatch(SOURCE_LITERAL);
    expect(owner).toMatch(FIDELITY_LITERAL);
    expect(owner).toMatch(/export const OPTION_CHAIN_SOURCE/);
    expect(owner).toMatch(/export const OPTION_CHAIN_FIDELITY/);
  });

  it("the gates still exist — de-duplicating a check must not delete it", () => {
    // The point of the repair was to make SIX gates agree, not to remove them.
    // These are the two equality gates that reject a mismatched chain.
    const dashboard = stripComments(read("components/chart/ChartsDashboard.tsx"));
    expect(dashboard, "ChartsDashboard no longer gates the receipt's provenance")
      .toMatch(/receipt\.source !== OPTION_CHAIN_SOURCE/);
    expect(dashboard).toMatch(/receipt\.fidelity !== OPTION_CHAIN_FIDELITY/);

    const chain = stripComments(read("components/chart/OptionsChain.tsx"));
    expect(chain, "OptionsChain no longer gates the receipt's provenance")
      .toMatch(/receipt\.source !== OPTION_CHAIN_SOURCE/);
    expect(chain).toMatch(/receipt\.fidelity !== OPTION_CHAIN_FIDELITY/);
  });

  it("RECORDED, NOT FIXED: the 'Unknown source' branch is unreachable by type", () => {
    // `OptionExpressionIntent`'s prop is `OptionChainSource`, which is the
    // single literal type "alpaca". So `source === OPTION_CHAIN_SOURCE` is
    // always true and the "Unknown source" fallback can never render. That is
    // a designed boundary wearing the vocabulary of a transient state — real,
    // but a SEPARATE atom from de-duplicating the spelling. Named here so the
    // next reader finds it deliberately recorded rather than overlooked.
    const expression = read("components/chart/OptionExpressionIntent.tsx");
    expect(expression).toContain('"Unknown source"');
    expect(
      Object.keys({ [OPTION_CHAIN_SOURCE]: true }).length,
      "OptionChainSource is a single-member union; widening it must revisit this branch",
    ).toBe(1);
  });
});
