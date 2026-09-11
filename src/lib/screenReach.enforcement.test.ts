/**
 * SCREEN REACH — the honesty gate between "it exists" and "a human can see it".
 *
 * ── The finding ──────────────────────────────────────────────────────────────
 *
 * WM has a standing rule: **SPECIFIED is not IMPLEMENTED. IMPLEMENTED is not
 * PROVEN.** Auditing `/command-deck`'s "the scene governs 1 of 12 surface
 * elements" number turned up the step missing between those two:
 *
 *   **IMPLEMENTED is not REACHABLE.**
 *
 * `selectExpressionCard` is 202 lines of canon-bearing logic with 111 lines of
 * tests. It keeps CONTRACT RETURN % separate from R, refuses to derive PLANNED
 * LOSS from CAPITAL DEPLOYED, and names the quote role behind every price so no
 * surface can present MID as executable. It is careful, correct work.
 *
 * **No screen imports it. Nothing in this repository imports it at all.**
 *
 * It is not alone. A transitive walk of the import graph, rooted at every file
 * under `src/app` and `src/components`, finds the modules listed in LEDGER
 * below unreachable from any screen. Among them: most of the decision chain
 * (`protectionState` / `responseEnvelope` → `expressionCard`, and
 * `decisionMemory`), the §Truth Resolution Matrix claim gate, the §4 Auto-Quiet
 * materiality gate, and nine Learning Genome selectors.
 *
 * `riskKernel` was on that list until 2026-09-07, when `selectAvailableR` gave
 * up its private copy of the R formula and started calling it. Reaching one
 * node revived nothing else in the chain — see the SUBTREE lock below.
 *
 * Several of these were shipped as named atoms in past shifts, tested,
 * committed, and recorded as complete in batons. Every one of those claims was
 * true. None of them was the whole truth, because a pure selector no surface
 * calls cannot be wrong in front of a trader — it also cannot be right.
 *
 * ── Why this is a test and not a document ────────────────────────────────────
 *
 * A document listing 28 orphans is accurate the day it is written and drifts
 * from then on. This shift has now closed the same defect three times in a row
 * — a claim announced by one surface and enforced by nothing — and the fix each
 * time was to give the claim teeth. A ledger nobody checks is the same defect
 * in a fourth costume.
 *
 * ── What this actually enforces ──────────────────────────────────────────────
 *
 * Exact set equality, in both directions, against the real import graph:
 *
 *   1. A NEW orphan fails the suite. Architectural debt cannot grow silently;
 *      adding one is a deliberate, reviewable act.
 *   2. Wiring an orphan into a screen ALSO fails the suite, until the ledger is
 *      updated. That is the good kind of friction: closing this debt should be
 *      a visible event, not a quiet one.
 *
 * ── Honest scope: what this does NOT claim ───────────────────────────────────
 *
 * - The ledger is editable. A developer can silence any failure by adding a
 *   line. That is fine and is the point: the goal is to convert silent rot into
 *   a decision someone has to write down and defend in review. This file does
 *   not pretend to be unbypassable, because a sentinel that overstates its own
 *   authority is the very thing it exists to catch.
 * - "Reaches a screen" means reachable from `src/app` or `src/components`. A
 *   module reached only from middleware or a build script is correctly reported
 *   as not reaching a screen, and that is the intended reading.
 * - Scope is `src/lib` only. A component nothing renders is the same class of
 *   debt and is NOT covered here. Named, not silently skipped.
 * - Being on this list is not an accusation. `__fixtures__` belongs here
 *   permanently. The `reason` field carries that distinction.
 *
 * Reads the filesystem. No network, no clock.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = path.dirname(SRC_DIR);

/**
 * Why a module has no screen.
 *
 * `AWAITING_SURFACE` is debt: real logic, no way for a human to see it.
 * `TEST_FIXTURE` and `OPS_TOOLING` are correct and permanent — they are listed
 * so the count is honest, not so they are fixed.
 */
type ReachReason = "AWAITING_SURFACE" | "TEST_FIXTURE" | "OPS_TOOLING";

interface LedgerEntry {
  readonly reason: ReachReason;
  /** What a human loses by this having no screen. */
  readonly note: string;
}

/**
 * Every `src/lib` module that no screen can reach, as of this commit.
 *
 * Paths are repo-relative and POSIX-separated. Generated from the graph walk
 * below, not typed from memory.
 */
const LEDGER: Readonly<Record<string, LedgerEntry>> = {
  "src/lib/athos/canonicalRoster.ts": {
    reason: "OPS_TOOLING",
    note: "Team roster for operations docs. Not a trader surface.",
  },
  "src/lib/athos/wowReleaseGates.ts": {
    reason: "OPS_TOOLING",
    note: "Release-gate definitions consumed by process, not by a screen.",
  },
  "src/lib/authority/executionConnectivity.ts": {
    reason: "AWAITING_SURFACE",
    note: "Named in the §13 open gates as orphaned. This confirms it from the import graph: no route renders it, including /readiness.",
  },
  "src/lib/broker/adapters/__fixtures__/webullResponses.ts": {
    reason: "TEST_FIXTURE",
    note: "Offline shape lock for the Webull MCP. Correct that it never ships.",
  },
  // REMOVED 2026-09-08: "decisionIdentity.ts — DECISION_ID owner, unreached on
  // arrival." It was declared AWAITING_SURFACE in 1ffd79d and given one in the
  // very next commit: /paper's order ticket now mints the id at the human's
  // first explicit intent. This ledger's reciprocal sentinel demanded the
  // deletion within the hour, which is the behaviour it was written for. See
  // decisionBirth.enforcement.test.ts for the wiring proof.
  "src/lib/sourceScan.ts": {
    reason: "OPS_TOOLING",
    note: "Comment stripper shared by the repo's three static guards (host-neutrality lock, both env-manifest gates). It is read by CI, never by a trader. Correct that no screen reaches it.",
  },
  "src/lib/decisionMemory.ts": {
    reason: "AWAITING_SURFACE",
    note: "§13: 'Decision Memory sealing has zero production callers.' Confirmed. useDecisionMemory reaches screens; the sealing module underneath does not.",
  },
  // REMOVED 2026-09-06: "Navigation emphasis compiler with no navigation
  // consuming it" — MainLayout's primary rail now calls selectNavEmphasis and
  // obeys its railWithheld verdict. This ledger's own sentinel demanded the
  // deletion; see navReduction.enforcement.test.ts for the wiring proof.
  "src/lib/experience/surfaceLink.ts": {
    reason: "AWAITING_SURFACE",
    note: "Cross-surface link resolution, unrouted.",
  },
  // REMOVED 2026-09-08: "expressionCard.ts — §10 EXPRESSION_CARD, the last §10
  // compiler with no screen." /paper's open-contracts list now compiles one per
  // contract and renders it: the §7 protection grade with its uncovered size,
  // and R as a stated UNKNOWN because no planned 1R is ever collected on this
  // path. Inputs /paper genuinely lacks are passed absent, so the card reports
  // named holes instead of invented numbers. See contractStance.enforcement.test.ts.
  "src/lib/learningGenome/learningGenomeScoreScale.ts": {
    reason: "AWAITING_SURFACE",
    note: "Score scale primitive; adopted in a past shift, never rendered.",
  },
  "src/lib/learningGenome/selectAvailabilityContract.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectCostAveragingFirewall.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectDteFit.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectMagnetClockState.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectMissedMoveReplay.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectModelCommitment.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectParticipationFilter.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/learningGenome/selectRegimeAwareness.ts": {
    reason: "AWAITING_SURFACE",
    note: "Learning Genome selector with no panel calling it.",
  },
  "src/lib/marketData/isOptionSymbol.ts": {
    reason: "AWAITING_SURFACE",
    note: "Symbol classification helper, unused by any surface.",
  },
  "src/lib/marketData/truthResolutionMatrix.ts": {
    reason: "AWAITING_SURFACE",
    note: "The canon §Truth Resolution Matrix claim gate. Shipped as an enforceable gate; nothing on screen is currently gated by it.",
  },
  "src/lib/marketData/viewModels/selectMateriality.ts": {
    reason: "AWAITING_SURFACE",
    note: "The canon §4 Auto-Quiet gate. WM decides what is material and then no surface asks.",
  },
  "src/lib/marketData/viewModels/timeframeRoles.ts": {
    reason: "AWAITING_SURFACE",
    note: "Timeframe role vocabulary with no chart consuming it.",
  },
  "src/lib/markov.ts": {
    reason: "AWAITING_SURFACE",
    note: "Transition model with no surface.",
  },
  // REMOVED 2026-09-08: "protectionState.ts — a dead subtree, not a dead leaf."
  // The subtree now has a root. expressionCard reaches a screen, so §7's grade
  // and uncovered quantity reach the trader: every open paper contract reads
  // UNPROTECTED with its size numbered, which was true all along and never said.
  // REMOVED 2026-09-08: "Honest premium band at the invalidation level. Reached
  // only by expressionCard." Revived by the same wire, and this entry is the
  // one I FORGOT — the ledger's own sentinel named it, which is the behaviour
  // it was written for. On /paper the band renders UNKNOWN with its reason,
  // because no structural invalidation is recorded for an option there; a named
  // missing input is a real answer, and it is what makes the gap visible.
  // REMOVED 2026-09-07: "§10 THESIS_GEOMETRY — the compiler exists, the surface
  // does not." It has one now. `selectAvailableR` deleted its private copy of
  // the R formula and calls `calculateAvailableR`, and that selector is
  // rendered by CommandContextRibbon — so the kernel's arithmetic is what a
  // trader reads on the deck. Not a new panel: an existing panel that stopped
  // doing its own arithmetic. See selectAvailableR.ts for the two answers the
  // two engines used to give.
  "src/lib/sfx.ts": {
    reason: "AWAITING_SURFACE",
    note: "Sound effects. §9 governs what may take the room; nothing currently calls this.",
  },
  // REMOVED 2026-09-08: "projectDecision.ts — the read arrow, unreached ON
  // ARRIVAL." Declared AWAITING_SURFACE in 8ab142d and given a surface in the
  // very next commit: /paper's blotter now lets the trader ask his account
  // whether a decision reached it, and renders the four answers apart. The
  // ATHOS "NO ORPHAN BREAKTHROUGHS" law names this exact shape — an internal
  // engine computing into nowhere — and this ledger's reciprocal sentinel
  // demanded the deletion. See decisionReach.enforcement.test.ts.
  "src/lib/traderMemory/viewModels/selectSteward.ts": {
    reason: "AWAITING_SURFACE",
    note: "Steward view model with no panel consuming it.",
  },
  "src/lib/traderMemory/viewModels/selectTradeExpectation.ts": {
    reason: "AWAITING_SURFACE",
    note: "Trade expectation view model with no panel consuming it.",
  },
};

// ── The graph walk ──────────────────────────────────────────────────────────

function collectSourceFiles(dir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") collectSourceFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.|\.spec\.|\.d\.ts$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

const FILES = collectSourceFiles(SRC_DIR, []);
const FILE_SET = new Set(FILES);

/**
 * Resolve an import specifier to a file in this repo, or null for a package.
 *
 * Handles the `@/` alias, relative paths, and the extension/index candidates
 * TypeScript would try. Deliberately conservative: an unresolved specifier is
 * treated as external, which can only ever UNDER-report reach — never invent it.
 */
function resolveSpecifier(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC_DIR, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;

  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (FILE_SET.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Matches `import … from "x"`, `export … from "x"`, and `import("x")`, which
 * is every way a module in this repo pulls in another one.
 */
const SPECIFIER = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

const DEPENDENCIES = new Map<string, readonly string[]>(
  FILES.map((file) => {
    const source = fs.readFileSync(file, "utf8");
    const deps = new Set<string>();
    for (const match of source.matchAll(SPECIFIER)) {
      const resolved = resolveSpecifier(match[1], file);
      if (resolved !== null) deps.add(resolved);
    }
    return [file, [...deps]] as const;
  }),
);

/** A "screen" is anything under src/app or src/components. */
const SCREEN_ROOTS = FILES.filter((f) =>
  f.startsWith(path.join(SRC_DIR, "app")) || f.startsWith(path.join(SRC_DIR, "components")),
);

const REACHED: ReadonlySet<string> = (() => {
  const seen = new Set<string>(SCREEN_ROOTS);
  const queue = [...SCREEN_ROOTS];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const dep of DEPENDENCIES.get(current) ?? []) {
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return seen;
})();

const repoRelative = (file: string): string =>
  path.relative(REPO_ROOT, file).split(path.sep).join("/");

const UNREACHED_LIB: readonly string[] = FILES.filter(
  (f) => f.startsWith(path.join(SRC_DIR, "lib")) && !REACHED.has(f),
)
  .map(repoRelative)
  .sort();

// ── The locks ───────────────────────────────────────────────────────────────

describe("screen reach — IMPLEMENTED is not REACHABLE", () => {
  it("the graph walk is actually working (guards against a vacuous pass)", () => {
    // If the resolver silently broke, everything would look reachable and every
    // assertion below would pass while proving nothing. Anchor on facts that
    // must hold in any working walk.
    expect(FILES.length).toBeGreaterThan(300);
    expect(SCREEN_ROOTS.length).toBeGreaterThan(100);
    expect(REACHED.size).toBeGreaterThan(SCREEN_ROOTS.length);

    // compileScene is reached through deckSceneSignals from /command-deck. If
    // this ever fails, the walk is broken, not the architecture.
    expect(REACHED.has(path.join(SRC_DIR, "lib/experience/compileScene.ts"))).toBe(true);
  });

  it("no NEW module drops off the screen without being written down", () => {
    const undeclared = UNREACHED_LIB.filter((p) => !(p in LEDGER));
    expect(
      undeclared,
      `These src/lib modules cannot be reached from any screen and are not in LEDGER.\n` +
        `Either wire them to a surface, or add them with a reason — silently is the ` +
        `one option this suite removes.\n\n${undeclared.map((p) => `  ${p}`).join("\n")}`,
    ).toEqual([]);
  });

  it("the ledger stays true when an orphan is finally given a surface", () => {
    const unreachedSet = new Set(UNREACHED_LIB);
    const nowReached = Object.keys(LEDGER).filter((p) => !unreachedSet.has(p));
    expect(
      nowReached,
      `These are listed as unreachable but a screen now reaches them.\n` +
        `That is good news — delete them from LEDGER so the count stays honest.\n\n` +
        `${nowReached.map((p) => `  ${p}`).join("\n")}`,
    ).toEqual([]);
  });

  it("every ledger entry states a reason and what is lost", () => {
    for (const [file, entry] of Object.entries(LEDGER)) {
      expect(["AWAITING_SURFACE", "TEST_FIXTURE", "OPS_TOOLING"], file).toContain(entry.reason);
      // §H19: a label with no sentence behind it is dead vocabulary.
      expect(entry.note.length, `${file} has no note`).toBeGreaterThan(20);
    }
  });

  it("the §10 gap is CLOSED: EXPRESSION_CARD has a surface", () => {
    // This assertion said the opposite until 2026-09-08, and the flip is the
    // point of the ledger. EXPRESSION_CARD is the element that alone separates
    // PERMISSION from WAIT; its compiler was built and tested and no screen
    // reached it, so the route had nothing to gate. /paper's open-contracts
    // list now compiles one card per contract.
    //
    // It is a REACHABILITY lock now: if this ever fails again, a surface has
    // stopped asking the §10 compiler what a contract is, and the answer the
    // trader reads has quietly become someone else's.
    expect(LEDGER["src/lib/expressionCard.ts"]).toBeUndefined();
    expect(UNREACHED_LIB).not.toContain("src/lib/expressionCard.ts");
  });

  it("riskKernel stays on a screen — the R a trader reads is the kernel's", () => {
    // This assertion used to say the opposite, and the flip is the point of the
    // ledger. `selectAvailableR` had its own copy of the Available-R formula
    // that charged costs only to the reward; the kernel charges them to both
    // sides. On one measured trade they answered 2.48R and 1.63R, and
    // `selectPermission` gates entry on that number.
    //
    // Deleting the second copy is what put the kernel on a screen, so this is a
    // reachability lock AND a duplication lock: if the kernel ever falls off
    // the graph again, the most likely cause is a surface growing a private
    // formula back.
    expect(UNREACHED_LIB).not.toContain("src/lib/riskKernel.ts");
    expect(
      REACHED.has(path.join(SRC_DIR, "lib/traderMemory/viewModels/selectAvailableR.ts")),
      "selectAvailableR is the path by which the kernel reaches a screen",
    ).toBe(true);
  });

  it("the decision SUBTREE revived as a unit — reaching the ROOT reached all of it", () => {
    // THIS TEST WAS WRONG IN AN INSTRUCTIVE WAY, and the correction is kept
    // rather than deleted. It claimed "wiring any single one of these to a
    // screen does not revive the others." That held while riskKernel — a
    // SIBLING — was wired. It was false for the ROOT: on 2026-09-08 /paper
    // rendered expressionCard, and protectionState and responseEnvelope came
    // back with it in the same commit, because both are its imports.
    //
    // The real shape is: reviving a LEAF revives one file, reviving a ROOT
    // revives the subtree. I removed two of the three entries by hand and
    // forgot responseEnvelope; the ledger's own sentinel named it. That is the
    // behaviour this file exists for, and it is why the count is asserted
    // rather than trusted to a human sweep.
    for (const file of [
      "src/lib/protectionState.ts",
      "src/lib/responseEnvelope.ts",
      "src/lib/expressionCard.ts",
    ]) {
      expect(UNREACHED_LIB, `${file} lost its screen again`).not.toContain(file);
    }
    // decisionMemory was never part of this subtree — it sits alone, and
    // reaching the expression chain did NOT revive it. The distinction is the
    // one the original test was reaching for, stated where it is actually true.
    expect(UNREACHED_LIB, "decisionMemory is a separate orphan").toContain("src/lib/decisionMemory.ts");
  });
});
