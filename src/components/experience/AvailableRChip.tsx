"use client";

import * as React from "react";

import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";

/**
 * AvailableRChip — the RISK pixel Ticket T asked for.
 *
 * ── Why this file exists ──────────────────────────────────────────────────────
 *
 * The Founder's Ticket T (Command Center, 2026-09-11): "visible RISK pixels for
 * Available R + invalidation + protection/humility." The deck ALREADY computed
 * `chainVm.availableR` and handed it to `DecisionChainPanel` — but that panel
 * lived inside a `<details open={deckEmphasis.deepSectionsOpen}>` drawer titled
 * "Deep read · story · auction lens · decision chain · steward · fidelity."
 * Collapsed by default in most emphases.
 *
 * So the visible-RISK requirement was met "one click away", which is not met.
 * A trader arriving at the deck could not see the R without knowing to open
 * a drawer they did not know existed.
 *
 * This chip hoists the AvailableR summary out of the drawer to the primary
 * viewport. It is COMPACT — two lines — because the full breakdown still lives
 * in the deep-read drawer, and duplicating the whole DecisionChainPanel would
 * violate §"never duplicate existing infrastructure." It DERIVES from the same
 * AvailableRVM the chain panel does; there is no second computation.
 *
 * ── Honest states ────────────────────────────────────────────────────────────
 *
 * The VM's `resolution` and `reason` fields carry the whole grammar of "why
 * we do not know yet." UNKNOWN is not silence — the chip says WHY the
 * conservative R could not be produced (missing entry, missing stop, missing
 * costs) so a trader knows what to do to make it resolvable.
 */
export interface AvailableRChipProps {
  readonly vm: AvailableRVM | null;
}

/**
 * PURE — exposed so a guard test can pin the label without spinning up a DOM.
 * A resolved R renders as a signed number to one decimal ("1.8R"); an UNKNOWN
 * or missing VM renders as literal "UNKNOWN". Any other resolution collapses
 * to a qualified read.
 */
export function formatAvailableRLabel(vm: AvailableRVM | null): string {
  if (!vm) return "UNKNOWN";
  if (vm.resolution === "UNKNOWN") return "UNKNOWN";
  if (typeof vm.conservativeR !== "number") return "UNKNOWN";
  const rounded = Math.round(vm.conservativeR * 10) / 10;
  const label = `${rounded.toFixed(1)}R`;
  return vm.resolution === "PARTIAL" ? `${label} · partial` : label;
}

/**
 * The null-VM disclosure.
 *
 * §13 SURFACE, DO NOT RUSH-WIRE. `selectDecisionChain` only produces an
 * `availableR` when it is handed `availableRInputs`, and that field has ZERO
 * production referencers — only its own declaration and its unit test. The
 * deck calls `selectDecisionChain({ state, history, nowMs, phase })`. So on
 * /command-deck `chainVm.availableR` is not probably null; it is provably
 * null, for every trader, forever, by construction.
 *
 * The old copy read "Available R has not been evaluated on this scene." Every
 * word true except the tense, which tells a trader that evaluation is
 * something their next action causes. It is not. That is the same fabricated
 * FUTURE as the Decision Receipt's "No decision sealed YET" — not a wrong
 * number, a wrong promise, and no numeric-truth gate can see it.
 *
 * This sentence instead names the CONDITION and what would have to exist to
 * change it. It does not invent an entry, a stop, or an R. Wiring a real
 * declaration surface is a separate, non-rushed atom.
 *
 * The rule that this wording must stay is enforced in
 * `availableRReachability.test.ts`, BESIDE the zero-producer measurement that
 * justifies it — so the day somebody wires a producer, the measurement goes
 * red first and drags this disclosure red with it. The disclosure cannot
 * outlive its condition and quietly become the new lie.
 */
export const AVAILABLE_R_UNWIRED_DETAIL =
  "Available R needs a declared entry and a declared structural invalidation. " +
  "No surface in this build declares them, so no R can be computed here.";

/**
 * PURE — one sentence explaining the VM state to a trader who has never read
 * the risk kernel. Missing inputs win over `reason` because a name is more
 * actionable than prose ("stop needed" beats "cannot compute").
 */
export function selectAvailableRDetail(vm: AvailableRVM | null): string {
  if (!vm) return AVAILABLE_R_UNWIRED_DETAIL;
  if (vm.missingInputs.length > 0) {
    return `Missing: ${vm.missingInputs.join(", ")}.`;
  }
  if (vm.reason && vm.reason.trim().length > 0) return vm.reason;
  if (vm.resolution === "PARTIAL") return "Partial — some inputs stand in for measured values.";
  if (vm.resolution === "RESOLVED") return "Conservative R against the near edge of the destination.";
  return "Available R is UNKNOWN.";
}

export function AvailableRChip({ vm }: AvailableRChipProps): React.ReactElement {
  const label = formatAvailableRLabel(vm);
  const detail = selectAvailableRDetail(vm);
  const resolved = vm?.resolution === "RESOLVED" && typeof vm.conservativeR === "number";
  const partial = vm?.resolution === "PARTIAL";

  const color = resolved ? "#ede6d3" : partial ? "#c9a55c" : "#8a8271";

  return (
    <section
      data-testid="available-r-chip"
      aria-label={`Available R: ${label}. ${detail}`}
      style={{
        // SCENE_FRAGMENTATION repair (Founder audit 2026-09-13): the
        // full-box brass border made RISK read as "an app called
        // Available R". RISK is an aspect of the room, not a resident.
        // Only the resolved state gets a subtle left-edge accent — a
        // brass hairline, not a card outline — and only when we HAVE a
        // resolved value to accent. UNKNOWN reads as calm negative
        // space, which is what the founder brief asks for.
        borderLeft: `2px solid ${resolved ? "rgba(139,106,41,0.35)" : partial ? "rgba(201,165,92,0.35)" : "rgba(139,106,41,0.10)"}`,
        padding: "8px 14px",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span style={{
        fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800,
      }}>
        Available R
      </span>
      <span
        data-testid="available-r-chip-label"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 20,
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </span>
      <span
        data-testid="available-r-chip-detail"
        style={{
          fontSize: 10,
          letterSpacing: 0.2,
          color: "#8a8271",
          flex: "1 1 200px",
          minWidth: 0,
        }}
      >
        {detail}
      </span>
    </section>
  );
}

export default AvailableRChip;
