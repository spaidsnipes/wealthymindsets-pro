/**
 * composeMarketCanvasVM — the shared pure compiler that turns a
 * decision surface's raw inputs into a Phase 3 Market Canvas VM.
 *
 * The Command Deck built this pipeline inline: state → chainVm →
 * permission → oneStory → decisionWhy → marketCanvas. Any other
 * surface (Nectar deep-dive, /paper receipts, /journal detail) that
 * wants to render the same canvas would have to duplicate that
 * compilation — one silent divergence and two "authoritative" reads
 * disagree.
 *
 * This function is the canonical single-writer for the compilation.
 * PURE — no React, no I/O, no clock. Consumers supply the timestamps
 * (nowMs) and the loaded reads (state, history, sessionDecisions).
 */

import type { CanonicalMarketState } from "../canonicalMarketState";
import {
  selectDecisionChain,
  type DecisionChainVM,
  type TradePhase,
} from "./selectDecisionChain";
import { selectMarketStory } from "./selectMarketStory";
import { selectOneStory, type OneStoryVM } from "./selectOneStory";
import {
  selectPermission,
  defaultFounderRules,
  type PermissionVM,
} from "@/lib/traderMemory/viewModels/selectPermission";
import type { DecisionMemorySnapshot } from "@/lib/traderMemory/viewModels/selectProcessLandscape";
import { selectDecisionWhyNot, type DecisionWhyVM } from "./selectDecisionWhyNot";
import {
  selectMarketCanvas,
  type MarketCanvasVM,
} from "./selectMarketCanvas";

export interface ComposeMarketCanvasInput {
  readonly state: CanonicalMarketState | null;
  readonly history: readonly CanonicalMarketState[];
  readonly sessionDecisions: readonly DecisionMemorySnapshot[];
  readonly ownerId: string;
  readonly nowMs: number;
  /**
   * Optional trade phase. When omitted the compiler defaults to
   * PREPARATION so a "we're just looking at the market" surface
   * (Nectar / /charts hero) still gets a valid chain compilation.
   */
  readonly phase?: TradePhase;
  /**
   * Optional session identity. When omitted the compiler derives
   * a UTC-day string. Consumers with a durable session identity
   * (e.g. the paper trading session) SHOULD pass their own.
   */
  readonly sessionIdentity?: string;
  /**
   * Optional pre-compiled chain. When supplied the compiler skips its
   * internal `selectDecisionChain` call and reuses the caller's chain
   * — this avoids double-compilation on surfaces (like /command-deck)
   * that already need `chain` for sibling panels.
   */
  readonly chain?: DecisionChainVM | null;
}

export interface ComposeMarketCanvasOutput {
  readonly canvas: MarketCanvasVM;
  /** Intermediate VMs the compiler produced. Callers may reuse to avoid re-derivation. */
  readonly chain: DecisionChainVM | null;
  readonly permission: PermissionVM;
  readonly oneStory: OneStoryVM;
  readonly decisionWhy: DecisionWhyVM;
}

function defaultSessionIdentity(nowMs: number): string {
  return `session-${new Date(nowMs).toISOString().slice(0, 10)}`;
}

/**
 * Compile the Market Canvas + every intermediate VM from what a
 * decision surface already loaded. Silent-safe on null/empty inputs.
 */
export function composeMarketCanvasVM(
  input: ComposeMarketCanvasInput,
): ComposeMarketCanvasOutput {
  const phase: TradePhase = input.phase ?? "PREPARATION";
  const sessionIdentity =
    input.sessionIdentity ?? defaultSessionIdentity(input.nowMs);

  const chain: DecisionChainVM | null = input.chain !== undefined
    ? input.chain
    : input.state
      ? selectDecisionChain({
          state: input.state,
          history: input.history,
          nowMs: input.nowMs,
          phase,
        })
      : null;

  /**
   * canon §Single-Writer / Many-Readers.
   *
   * If the chain already compiled a permission, READ IT — do not compile a
   * second one. `selectDecisionChain` orders its own work correctly (clc →
   * availableR → permission), so a chain carrying a permission carries one
   * built from the same evidence this compiler would have used.
   *
   * This branch exists because the two computations were observed disagreeing
   * on `/command-deck`: the chain's PERMISSION row read "not evaluated" while
   * the Steward, compiled here, read RESTRICTED off eight rules — both on one
   * screen. The deck now supplies `permissionInputs` to the chain, and the
   * compiler defers to it rather than re-deriving a rival answer.
   *
   * The fallback is NOT dead code: callers whose chain was built without
   * `permissionInputs` still need a permission compiled here.
   *
   * Until 2026-09-19 this comment also cited "the /journal/[id] detail canvas"
   * as a live caller with no chain. That route does not exist — `src/app/journal`
   * holds only `page.tsx`. The detail canvas is a PLANNED surface, currently
   * blocked on there being zero journal entries to render. Naming an unbuilt
   * route in the present tense is how a reader concludes a branch is covered
   * when its only real justification is the second clause above.
   */
  const permission: PermissionVM = chain?.permission ?? selectPermission({
    ownerId: input.ownerId,
    sessionIdentity,
    nowMs: input.nowMs,
    rules: defaultFounderRules(),
    sessionDecisions: input.sessionDecisions,
    marketState: input.state ?? undefined,
    clc: chain?.clc ?? null,
    availableR: chain?.availableR ?? undefined,
  });

  const oneStory: OneStoryVM = (() => {
    const storyVm = input.state ? selectMarketStory(input.state, input.history) : null;
    return selectOneStory({
      story: storyVm,
      chainNodes: chain?.nodes,
      permission,
    });
  })();

  const decisionWhy: DecisionWhyVM = selectDecisionWhyNot(oneStory, permission);

  const canvas: MarketCanvasVM = selectMarketCanvas(input.state, decisionWhy);

  return { canvas, chain, permission, oneStory, decisionWhy };
}

/**
 * Re-exported so decision surfaces can source the founder rule set FROM THE
 * COMPILER rather than reaching around it into `selectPermission`.
 *
 * `/command-deck` needs the rule set to hand `selectDecisionChain` its
 * `permissionInputs` — without that, the chain's permission node and the
 * Steward verdict compiled here disagree on screen about whether the trader
 * has any rules. Routing the import through here keeps one source of rules per
 * page, and keeps the compiler the thing surfaces depend on.
 */
export { defaultFounderRules };

export default composeMarketCanvasVM;
