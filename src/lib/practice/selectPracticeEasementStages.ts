/**
 * THE FIVE PLACES A PRACTICE BOOK CAN BE EASIER, DRAWN AS FIVE.
 *
 * `selectPracticeHonestyLedger` examines a trade's whole life — entry, fill,
 * rest, cancel, stop — and emits a line for each stage where the book WAS
 * easier than a real venue. The panel then renders that list, which means a
 * book easier in one way and a book easier in four look like the same object:
 * a stack of headings, longer or shorter. The trader cannot see WHERE in the
 * trade's life the softness lives, which is the only thing the five-stage
 * ordering was designed to tell them.
 *
 * This projects the SAME ledger onto its own fixed grammar: five stages, always
 * five, in the order the trader lived them.
 *
 * ── WHAT A DIM STAGE MEANS, EXACTLY ─────────────────────────────────────────
 *
 * It means NO EASEMENT WAS RECORDED THERE. That is not "this stage was
 * realistic", and it is certainly not "this stage was examined and passed".
 * Several owners can only speak when the book gave them something to speak
 * about — `short-located` has nothing to say about a book with no positions —
 * so an unlit stage can equally mean "nothing happened here to judge".
 *
 * Both readings share one honest word: NOT RECORDED. The surface must use it,
 * and must never colour an unlit stage as a pass. A green tick here would be
 * WM certifying realism it never measured, which is the exact overclaim the
 * ledger's own compiler refuses when it drops `marketPx` rather than print a
 * fill price as a quote.
 *
 * Pure / deterministic. Renders elsewhere. Invents no stage the compiler does
 * not already own: the id union IS the grammar.
 */

import type {
  PracticeEasementId,
  PracticeHonestyLedger,
} from "@/lib/practiceHonestyLedger";

export interface PracticeEasementStage {
  readonly id: PracticeEasementId;
  /** Two-to-six character stage word for the strip. Never the heading. */
  readonly word: string;
  /** True when the ledger recorded an easement at this stage. */
  readonly recorded: boolean;
  /** The owner's own heading, when recorded. Never rewritten. */
  readonly heading: string | null;
}

export interface PracticeEasementStrip {
  readonly stages: readonly PracticeEasementStage[];
  /** How many of the five stages recorded an easement. */
  readonly recordedCount: number;
  /** Always the grammar's size. Never the length of what fired. */
  readonly stageCount: number;
}

/**
 * ORDERED BY WHEN IN THE TRADE'S LIFE IT HAPPENED, matching the id union's own
 * documented ordering. If a stage is ever added to that union, this record stops
 * compiling until it is named here — which is the point of keying it TOTAL.
 */
const STAGE_WORD: Record<PracticeEasementId, string> = {
  "short-located": "ENTRY",
  fill: "FILL",
  rest: "REST",
  cancel: "CANCEL",
  stop: "STOP",
};

const STAGE_ORDER: readonly PracticeEasementId[] = [
  "short-located",
  "fill",
  "rest",
  "cancel",
  "stop",
];

export function selectPracticeEasementStages(
  ledger: PracticeHonestyLedger | null,
): PracticeEasementStrip | null {
  // Not read yet is not an empty book. Drawing five unlit stages over a book
  // WM has not opened would claim an examination that has not happened.
  if (!ledger) return null;
  if (ledger.easements.length === 0) return null;

  const byId = new Map(ledger.easements.map((e) => [e.id, e]));
  const stages = STAGE_ORDER.map((id) => {
    const hit = byId.get(id);
    return {
      id,
      word: STAGE_WORD[id],
      recorded: hit != null,
      heading: hit ? hit.heading : null,
    };
  });

  return {
    stages,
    recordedCount: stages.filter((s) => s.recorded).length,
    stageCount: STAGE_ORDER.length,
  };
}

export default selectPracticeEasementStages;
