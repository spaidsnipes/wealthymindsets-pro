"use client";
import * as React from "react";
import type { DecisionChainVM } from "@/lib/marketData/viewModels/selectDecisionChain";

/**
 * StructureContextNote — surfaces the Founder's "External vs Internal
 * structure" doctrine (FRL §C05) as a small inline warning when the
 * higher-timeframe DIRECTION and the lower-timeframe STRUCTURE
 * contradict each other.
 *
 * Founder Aug-13 super-directive:
 *   'External structure controls the larger story. Internal order
 *    blocks are not automatic reversal points. Location is not
 *    execution confirmation.'
 *
 * Rendered as an ADVISORY-toned note that never gates action — the
 * trader retains agency. Renders NOTHING when there is no contradiction
 * (silence-is-a-feature).
 */

export function StructureContextNote({ vm }: { vm: DecisionChainVM }) {
  const dirNode = vm.nodes.find((n) => n.key === "direction");
  const structureVal = vm.dlar.direction.value;
  const auctionVerdict = vm.auction.verdict;

  if (!dirNode || dirNode.verdict === "UNRESOLVED") return null;

  const dirLower = String(dirNode.verdict).toUpperCase();
  const dirIsLong = /LONG|UP|BULL/.test(dirLower);
  const dirIsShort = /SHORT|DOWN|BEAR/.test(dirLower);
  if (!dirIsLong && !dirIsShort) return null;

  // Auction FAILING while direction still shows an active bias is the
  // structural-contradiction pattern the founder called out.
  const contradiction = auctionVerdict === "FAILING";
  if (!contradiction) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        border: "1px solid rgba(240,180,41,0.4)",
        borderLeft: "3px solid #F0B429",
        borderRadius: 6,
        background: "rgba(11,11,13,0.9)",
        padding: 12,
        display: "flex",
        gap: 10,
      }}
    >
      <span aria-hidden="true" style={{ color: "#F0B429", fontSize: 14, fontWeight: 700 }}>◐</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#F0B429", fontWeight: 800, marginBottom: 4 }}>
          Structure context
        </div>
        <div style={{ fontSize: 12, color: "#ede6d3", lineHeight: 1.5 }}>
          Higher-timeframe direction is <strong>{dirNode.verdict}</strong>, but the current auction is <strong>FAILING</strong>.
          Internal setups against the external story deserve extra scrutiny — location is not execution confirmation.
        </div>
        {structureVal && (
          <div style={{ fontSize: 10, color: "#8a8271", marginTop: 4, fontStyle: "italic" }}>
            DLAR narrative: {vm.dlar.narrative}
          </div>
        )}
      </div>
    </div>
  );
}

export default StructureContextNote;
