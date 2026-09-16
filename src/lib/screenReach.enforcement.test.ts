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
 * - "Reaches a screen" means reachable from `src/app`. A module reached only
 *   from middleware or a build script is correctly reported as not reaching a
 *   screen, and that is the intended reading.
 *
 *   CORRECTED 2026-09-15 — A ROOT THAT NOTHING REACHES IS NOT A ROOT.
 *
 *   This walk used to root at `src/app` AND `src/components`, and the note
 *   below said a component nothing renders was "named, not silently skipped."
 *   It was worse than skipped. Making every component a root meant a component
 *   nothing renders was still a ROOT, so everything it imported counted as
 *   reached. A dead consumer laundered its dependencies into the live set.
 *
 *   MEASURED at the moment of the fix: 14 of 118 components are unreachable
 *   from any route, and 7 `src/lib` modules were reported as screen-reachable
 *   when the only thing reaching them was one of those 14. Among them
 *   `src/lib/sessionVP.ts` and `selectOpeningBell.ts` — real logic a human has
 *   no way to see, reported as visible.
 *
 *   A route is the only thing a human can open, so `src/app` is the only
 *   honest root. Components are now reached, or not, like anything else.
 * - Scope is `src/lib` only for the reason ledger. Components that no route
 *   renders are counted and frozen separately, below.
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
/*
 * EDGE_RUNTIME added 2026-09-15.
 *
 * The walk below roots at `src/app` and `src/components`, so "reachable" has
 * always meant "reachable from a SCREEN". `src/middleware.ts` is neither: it
 * runs at the edge, before any screen exists, and it is as shipped as any
 * component. A module consumed only there is not awaiting a surface, is not a
 * fixture, and is not ops tooling — it is correctly wired to the one consumer
 * it should have.
 *
 * Filing such a module under one of the existing three would have made the
 * ledger say something false in order to make this suite go green, which is
 * the failure mode the ledger exists to prevent. The vocabulary was the thing
 * that was wrong, so the vocabulary is what changed.
 */
/*
 * DEAD_CONSUMER added 2026-09-15, with the root correction described above.
 *
 * These modules have exactly one importer, and that importer is a component no
 * route renders. They are NOT awaiting a surface in the usual sense — a surface
 * was built for them and then never mounted, which is a different and more
 * deceptive shape of debt: reading the repo makes them look finished.
 *
 * The note on each one names the dead consumer, so the fix is a lookup rather
 * than a re-derivation. When the component is finally mounted by a route, both
 * the component and its module leave this file in the same commit.
 */
/*
 * RETIRED_BY_SPEC added 2026-09-15, hours after DEAD_CONSUMER, because
 * DEAD_CONSUMER was too coarse and the coarseness was itself dangerous.
 *
 * DEAD_CONSUMER means: a surface was built and never mounted. That is debt.
 * RETIRED_BY_SPEC means: a surface was built, mounted, and then deliberately
 * unmounted. That is a DECISION, and re-mounting it reverses the decision.
 *
 * Collapsing the two invites exactly one mistake: an engineer reads "no screen
 * reaches this", concludes a mount is missing, and restores something a
 * Founder removed on purpose. The ledger must be able to say "this is finished
 * and intentionally invisible", or it will keep nominating retirements for
 * revival.
 */
/*
 * SUPERSEDED added 2026-09-15, in the same pass, for the same reason one more
 * time: the third unmounting turned out to have a third cause.
 *
 *   DEAD_CONSUMER    built, never mounted.                      -> debt.
 *   RETIRED_BY_SPEC  built, mounted, deliberately unmounted.    -> a decision.
 *   SUPERSEDED       built, mounted, REPLACED by an honest owner.
 *
 * The distinction is not taxonomy for its own sake; each one hands the next
 * engineer a different instruction. DEAD_CONSUMER says "mount it or delete it."
 * RETIRED_BY_SPEC says "the decision was to have less — leave it alone."
 * SUPERSEDED says "this job is already being done correctly somewhere else, go
 * and find that." Send an engineer the wrong one of those three and they will
 * either reverse a Founder decision or rebuild something that already exists.
 *
 * SUPERSEDED is the most dangerous to mis-file, because the replacement is
 * usually a TRUTH fix. Restoring the superseded module does not just duplicate
 * work — it restores the defect the replacement was written to kill.
 */
type ReachReason =
  | "AWAITING_SURFACE"
  | "TEST_FIXTURE"
  | "OPS_TOOLING"
  | "EDGE_RUNTIME"
  | "DEAD_CONSUMER"
  | "RETIRED_BY_SPEC"
  | "SUPERSEDED";

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
  // The seven below became visible on 2026-09-15 when `src/components` stopped
  // being a walk root. Each was already unreachable by a human; only the walk
  // said otherwise.
  "src/lib/authority/executionReceiptView.ts": {
    reason: "DEAD_CONSUMER",
    note: "Reached only by components/authority/ExecutionReceiptCard.tsx, which no route renders.",
  },
  "src/lib/authority/formatExecutionReceipt.ts": {
    reason: "DEAD_CONSUMER",
    note: "Reached only by components/authority/ExecutionReceiptCard.tsx, which no route renders.",
  },
  "src/lib/authority/parseExecutionReceipt.ts": {
    reason: "DEAD_CONSUMER",
    note: "Reached only by components/authority/ExecutionReceiptCard.tsx, which no route renders.",
  },
  "src/lib/chart/indexBarFacts.ts": {
    reason: "DEAD_CONSUMER",
    note: "Reached only by components/chart/BottomIndexBar.tsx, which no route renders.",
  },
  // NOT DEAD_CONSUMER. Corrected 2026-09-15, hours after being filed as one.
  //
  // Filing it as DEAD_CONSUMER was accurate about the graph and wrong about the
  // intent: it read as debt awaiting a mount. It is not. The panel was mounted,
  // and then deliberately unmounted per Founder spec in 89a350e, which freed
  // ~340px so Smart Money and the DOM ladder fit without cutoffs.
  //
  // This distinction has already nearly caused the same mistake twice. The
  // §13 gate "Live VP render geometry proof" makes this module look like the
  // thing to wire up, and wiring it up would silently reverse a spec decision
  // while believing a canon gate was being closed. 89a350e says its author was
  // "one step from" doing exactly that; so was this ledger entry.
  //
  // The live VP surfaces are the ON-CHART ones — `sessionVPChart`, "WM Session
  // VP", "WM Fixed VP" — and they do not import this module.
  "src/lib/sessionVP.ts": {
    reason: "RETIRED_BY_SPEC",
    note: "Session VP side-panel math. The panel was retired per Founder spec in 89a350e and is held retired by src/lib/sessionVpRetired.test.ts. Reached only by the retained-for-history WMSessionVP.tsx. Restoring it must be a deliberate spec change, never a side effect of gate-chasing.",
  },
  // NOT DEAD_CONSUMER either. Corrected 2026-09-15 by the discipline the
  // sessionVP.ts correction above had just written down: run `git log` on the
  // component before deciding it is missing something.
  //
  // The note here used to read "the mount was never made." That was a FALSE
  // HISTORICAL CLAIM, and the worst kind — it described a finished thing as an
  // unfinished one, so it read as an invitation. The mount WAS made:
  //
  //     74ad348  feat(morning-prep): wire OpeningBellPanel above the feed
  //     ce90890  Opening Bell accused the trader of rushing, from zero observation
  //     b326282  fix(morning-prep): stop the Opening Bell fabricating both a NOT DONE and a DONE
  //
  // It was torn out of BOTH rooms because it manufactured a verdict about the
  // trader's morning from no observation of the trader — six items hardcoded
  // NOT DONE on one surface, and on the other, two items marked DONE and
  // stamped with a completion TIME the trader never earned.
  //
  // SUPERSEDED, not RETIRED_BY_SPEC: a spec retirement leaves a hole on
  // purpose, and the instruction is "the decision was to have less." Here an
  // honest owner took the job over, and the instruction is different: go use
  // THAT one. Collapsing the two would send the next engineer looking for a
  // gap that has already been filled.
  "src/lib/traderMemory/viewModels/selectOpeningBell.ts": {
    reason: "SUPERSEDED",
    note: "Per-item readiness verdicts for the Opening Bell. Superseded by src/lib/experience/openingBellPrep.ts (selectPrepEvidence), which both rooms compose through OpeningBellEvidence. Held superseded by src/lib/experience/openingBellPrep.test.ts. Reached only by the retained-for-history OpeningBellPanel.tsx. This vm needs per-item `completed` flags, and neither room can know WHICH items were ticked — only how many. A count is not a checklist.",
  },
  "src/lib/truthStatus/truthStatusLabels.ts": {
    reason: "DEAD_CONSUMER",
    note: "Reached only by components/truthStatus/TruthStatusChip.tsx, which no route renders.",
  },
  "src/lib/legacyRouteAliases.ts": {
    reason: "EDGE_RUNTIME",
    note: "Consumed by src/middleware.ts, which answers the legacy aliases with a real 308 before any screen exists. Correct that no route renders it — a route that rendered it would mean the redirect had already shipped the app.",
  },
  "src/lib/broker/adapters/__fixtures__/webullResponses.ts": {
    reason: "TEST_FIXTURE",
    note: "Offline shape lock for the Webull MCP. Correct that it never ships.",
  },
  // REMOVED 2026-09-12, in the commit after the one that added it:
  // "selectFirstBrokenJoint.ts — capability ladder owner, unreached on
  // arrival." It was declared AWAITING_SURFACE with BrokerConnectPanel named
  // as the creditor, and the panel now consumes it: CapabilityLadderStatus
  // renders the twelve rungs where moomoo and tastytrade previously showed a
  // static caption. providerReportToStageEvidence is the seam, and it is
  // reached transitively through the same component. This is the second time
  // this ledger's reciprocal sentinel has forced a same-session deletion,
  // which is the behaviour it was written for.
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
  "src/lib/ops/sourceGraph.ts": {
    reason: "OPS_TOOLING",
    note: "The one reader of this repo's own source text — walks src, drops tests, delegates comment-stripping to sourceScan. Two anti-orphan Sentinels (API routes, components) ask the same structural question and now share one answer instead of holding two private opinions about what counts as source. Its audience is CI. A screen reaching it would mean the product was reading its own files at runtime, which is the wrong thing for this module to become.",
  },
  "src/lib/ops/visualReceipt.ts": {
    reason: "OPS_TOOLING",
    note: "Executable owner of the canon's NO-ESCAPE VISUAL VERIFICATION BREAKER — it judges whether a BUILDER'S green claim is admissible, not whether a trader's scene is. Its audience is CI and the person writing the receipt. A screen would be the wrong place for it: the one party it must be able to refuse is the party operating the app.",
  },
  "src/lib/ops/healthDimensions.ts": {
    reason: "AWAITING_SURFACE",
    note: "Executable owner of the Garden Pass health-dimension Sentinel — AVAILABLE / ENTITLED / FRESH / AUTHORIZED / EXECUTABLE / RECOVERABLE may not collapse into one green flag. Unlike visualReceipt this one IS eventually a trader-facing concern: a provider health matrix is exactly the thing a human should be able to read instead of a colour. It is ledgered rather than wired because the surface that would render it does not exist yet, and inventing a badge purely to satisfy this guard would be building the screen for the test rather than for the trader. Honest state: the owner exists, the surface is owed.",
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

/**
 * A "screen" is a ROUTE. `src/app` only.
 *
 * A ROOT THAT NOTHING REACHES IS NOT A ROOT. `src/components` used to be a root
 * set too, which meant a component no route renders still seeded the walk, and
 * everything it imported was reported as screen-reachable. See the correction
 * at the top of this file for the measurement.
 */
const SCREEN_ROOTS = FILES.filter((f) => f.startsWith(path.join(SRC_DIR, "app")));

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

/** Components that no route renders. These are the roots that were not roots. */
const UNREACHED_COMPONENTS: readonly string[] = FILES.filter(
  (f) => f.startsWith(path.join(SRC_DIR, "components")) && !REACHED.has(f),
)
  .map(repoRelative)
  .sort();

/**
 * The orphan components as counted on 2026-09-15, the day they stopped being
 * walk roots.
 *
 * This list is a CEILING, not a target. It exists so the number cannot quietly
 * grow: shipping a component no route renders is how the seven DEAD_CONSUMER
 * modules above came to exist, and each one looked finished from the source.
 *
 * Deliberately NOT a reason ledger. Giving each of these a reason would mean
 * inventing fourteen justifications for components nobody has triaged, which
 * would put guesses in the one file that exists to hold facts. The count is
 * the honest thing that is known today.
 *
 * Where a component HAS been triaged, the finding is annotated inline below.
 * SIX of the fourteen are annotated so far, and every single one turned out to
 * be FINISHED WORK rather than debt — a mount someone deliberately took away,
 * in each case with a Sentinel shipped in the same commit to hold it away.
 *
 * Six for six is the finding. The prior assumption — that an unreferenced
 * component is an unfinished one — has now been wrong every time it was
 * actually checked. Treat "no route renders this" as a QUESTION, never as a
 * diagnosis.
 *
 * All six were found the same way, and it is the cheapest check in this file:
 *
 *     RUN `git log` ON THE COMPONENT BEFORE DECIDING IT IS MISSING SOMETHING.
 *
 * The import graph cannot tell a mount that was never made from a mount that
 * was deliberately taken away. It reports both as "no route renders this", and
 * the second one is a decision someone already made on purpose.
 *
 * Removing a name from this list is always correct — it means a route finally
 * renders it, or it was deleted.
 */
const KNOWN_ORPHAN_COMPONENTS: readonly string[] = [
  "src/components/ErrorBoundary.tsx",
  "src/components/authority/ExecutionReceiptCard.tsx",
  // RETIRED in 1677698 ("remove decorative decision chrome"). Locked by
  // src/lib/responsiveShell.test.ts: `expect(deck).not.toContain(...)`.
  "src/components/brand/CinematicAtmosphere.tsx",
  // RETIRED in aa54175 ("Retire duplicate charts index ticker") — a SECOND
  // index ticker on a room that already had one. Locked by
  // src/lib/experience/chartsMarketFirst.test.ts, which flipped from asserting
  // the mount was PRESENT to asserting it is ABSENT. Re-mounting restores the
  // duplication. A DEFAULT IS A CLAIM, and so is a second one of anything.
  "src/components/chart/BottomIndexBar.tsx",
  "src/components/chart/ConnectedStoryRibbon.tsx",
  // RETIRED in 777665d ("Keep order flow behind Smart Money"). Locked by
  // src/lib/experience/chartsMarketFirst.test.ts and
  // src/lib/experience/chartsRoomChrome.test.ts, which additionally pin
  // SmartMoneyPanel to exactly ONE occurrence — so the order-flow story has
  // one owner on this room and cannot be told twice.
  "src/components/chart/OrderFlowCockpitStrip.tsx",
  "src/components/chart/TimeframeSelector.tsx",
  // RETIRED PER FOUNDER SPEC in 89a350e, not untriaged. Held retired by
  // src/lib/sessionVpRetired.test.ts. Do not "fix" this by mounting it.
  "src/components/chart/WMSessionVP.tsx",
  "src/components/experience/CanvasBadgeMini.tsx",
  // RETIRED in 6ae33ea ("keep private market plumbing out of navigation") —
  // a private collection concept had climbed into the GLOBAL header, where it
  // is shown to people who have no vault. Locked by
  // src/lib/shellPublicVocabulary.test.ts. Re-mounting it in MainLayout puts
  // private vocabulary back in front of the public.
  "src/components/layout/HeaderVaultPill.tsx",
  // SUPERSEDED, not untriaged. Mounted in 74ad348, then torn out of BOTH rooms
  // by ce90890 and b326282 because it rendered a verdict about the trader's
  // morning from no observation of the trader. Its job is now done honestly by
  // OpeningBellEvidence + selectPrepEvidence. Held superseded by
  // src/lib/experience/openingBellPrep.test.ts (× THE SUPERSEDED PANEL).
  // Re-mounting this does not duplicate work; it restores the defect.
  "src/components/opening-bell/OpeningBellPanel.tsx",
  "src/components/systemHealth/FailureStateChip.tsx",
  "src/components/truthStatus/TruthStatusChip.tsx",
  "src/components/ui/HeroNumber.tsx",
];

// ── The locks ───────────────────────────────────────────────────────────────

describe("screen reach — IMPLEMENTED is not REACHABLE", () => {
  it("the graph walk is actually working (guards against a vacuous pass)", () => {
    // If the resolver silently broke, everything would look reachable and every
    // assertion below would pass while proving nothing. Anchor on facts that
    // must hold in any working walk.
    expect(FILES.length).toBeGreaterThan(300);
    // 92 route files at the 2026-09-15 root correction. This floor was 100 when
    // `src/components` was also a root; it is lowered because the root set got
    // SMALLER and more honest, not because the walk got weaker.
    expect(SCREEN_ROOTS.length).toBeGreaterThan(80);
    expect(REACHED.size).toBeGreaterThan(SCREEN_ROOTS.length);

    // compileScene is reached through deckSceneSignals from /command-deck. If
    // this ever fails, the walk is broken, not the architecture.
    expect(REACHED.has(path.join(SRC_DIR, "lib/experience/compileScene.ts"))).toBe(true);
  });

  it("× THE LAUNDERING ROOT: a component no route renders is not a root", () => {
    // The defect this replaces. `src/components` was a root set, so a component
    // nothing mounts still seeded the walk and everything it imported was
    // reported as screen-reachable. If someone widens SCREEN_ROOTS back, this
    // fails by name.
    for (const root of SCREEN_ROOTS) {
      expect(root.startsWith(path.join(SRC_DIR, "app")), repoRelative(root)).toBe(true);
    }

    // NON-VACUITY. The correction has to actually bite: at least one component
    // must be unreachable, and at least one src/lib module must be unreachable
    // ONLY because of that. If both were zero this lock would pass while
    // proving nothing.
    expect(UNREACHED_COMPONENTS.length).toBeGreaterThan(0);
    const deadConsumerModules = Object.entries(LEDGER)
      .filter(([, e]) => e.reason === "DEAD_CONSUMER")
      .map(([p]) => p);
    expect(deadConsumerModules.length).toBeGreaterThan(0);
    for (const p of deadConsumerModules) {
      expect(UNREACHED_LIB, `${p} is ledgered DEAD_CONSUMER but IS reached`).toContain(p);
    }
  });

  /**
   * × THE ROTTED ANNOTATION
   *
   * The triage findings above live in COMMENTS, and a comment is checked by
   * nobody. Each one tells the next engineer "this is held retired by
   * <file>.test.ts" — which is the single most load-bearing sentence in the
   * list, because it is the reason they will stop reading and walk away.
   *
   * If that file is renamed or deleted, the annotation keeps saying it. The
   * retirement would then be held by a comment citing a lock that no longer
   * exists, which is strictly worse than no annotation at all: it answers the
   * question falsely instead of leaving it open.
   *
   * × THE REVIVED RETIREMENT already does this for the LEDGER. This is the
   * same guarantee for the component list, because the same claim is being
   * made in both places and only one of them was checkable.
   */
  it("× THE ROTTED ANNOTATION: an orphan annotation cannot cite a lock that is gone", () => {
    const self = fs.readFileSync(__filename, "utf8");
    const block = self.slice(
      self.indexOf("const KNOWN_ORPHAN_COMPONENTS"),
      self.indexOf("// ── The locks"),
    );
    expect(block.length, "could not locate the orphan list in this file").toBeGreaterThan(200);

    const cited = [...block.matchAll(/[\w/.]+\.test\.ts/g)].map((m) => m[0]);
    // NON-VACUITY: the annotations must actually cite locks. If a future edit
    // strips every citation, this lock must not go quietly green.
    expect(cited.length, "no orphan annotation cites a lock file").toBeGreaterThan(3);

    for (const rel of cited) {
      expect(
        fs.existsSync(path.join(REPO_ROOT, rel)),
        `an orphan annotation cites ${rel}, which does not exist`,
      ).toBe(true);
    }
  });

  it("× THE REVIVED RETIREMENT: a closed question names the lock that holds it", () => {
    // RETIRED_BY_SPEC and SUPERSEDED are the strongest claims in this file.
    // Every other reason describes an OPEN question — debt, a fixture, a wire
    // that runs elsewhere. These two close the question: "leave this alone",
    // "this is already done correctly elsewhere." A claim that strong must be
    // checkable, or it is just a word that stops questions. Each entry must
    // name a real test file, and that file must really exist — otherwise the
    // reason becomes a way to retire things by assertion.
    const CLOSED: readonly ReachReason[] = ["RETIRED_BY_SPEC", "SUPERSEDED"];
    const retired = Object.entries(LEDGER).filter(([, e]) => CLOSED.includes(e.reason));
    expect(retired.length).toBeGreaterThan(0);
    // NON-VACUITY: both closing reasons must actually be exercised, or one of
    // them is an untested escape hatch sitting in the type.
    for (const reason of CLOSED) {
      expect(
        retired.some(([, e]) => e.reason === reason),
        `no ledger entry uses ${reason}, so this lock does not guard it`,
      ).toBe(true);
    }
    for (const [file, entry] of retired) {
      const named = entry.note.match(/[\w/.]+\.test\.ts/)?.[0];
      expect(named, `${file} is ${entry.reason} but names no lock`).toBeTruthy();
      expect(
        fs.existsSync(path.join(REPO_ROOT, named as string)),
        `${file} names ${named}, which does not exist`,
      ).toBe(true);
    }
  });

  it("× THE GROWING ORPHANAGE: no NEW component ships without a route", () => {
    const novel = UNREACHED_COMPONENTS.filter((p) => !KNOWN_ORPHAN_COMPONENTS.includes(p));
    expect(
      novel,
      `These components are rendered by no route, and are not on the frozen ` +
        `2026-09-15 list. A component nothing mounts reads as finished in the ` +
        `source and is invisible to a human. Mount it, or delete it.\n\n` +
        `${novel.map((p) => `  ${p}`).join("\n")}`,
    ).toEqual([]);

    // The ceiling stays true in the other direction too: a name that is no
    // longer an orphan must leave the list, or the list becomes a stale claim.
    const nowMounted = KNOWN_ORPHAN_COMPONENTS.filter((p) => !UNREACHED_COMPONENTS.includes(p));
    expect(
      nowMounted,
      `These are listed as orphan components but a route now reaches them (or ` +
        `they were deleted). Remove them from KNOWN_ORPHAN_COMPONENTS — a ` +
        `ceiling that overstates is still a false number.\n\n` +
        `${nowMounted.map((p) => `  ${p}`).join("\n")}`,
    ).toEqual([]);
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
      expect(
        [
          "AWAITING_SURFACE",
          "TEST_FIXTURE",
          "OPS_TOOLING",
          "EDGE_RUNTIME",
          "DEAD_CONSUMER",
          "RETIRED_BY_SPEC",
          "SUPERSEDED",
        ],
        file,
      ).toContain(entry.reason);
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
