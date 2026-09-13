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
 * PURE — one sentence explaining the VM state to a trader who has never read
 * the risk kernel. Missing inputs win over `reason` because a name is more
 * actionable than prose ("stop needed" beats "cannot compute").
 */
export function selectAvailableRDetail(vm: AvailableRVM | null): string {
  if (!vm) return "Available R has not been evaluated on this scene.";
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
  const borderColor = resolved ? "rgba(139,106,41,0.45)" : partial ? "rgba(201,165,92,0.45)" : "rgba(139,106,41,0.25)";

  return (
    <section
      data-testid="available-r-chip"
      aria-label={`Available R: ${label}. ${detail}`}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "8px 12px",
        background: "rgba(11,11,13,0.55)",
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
