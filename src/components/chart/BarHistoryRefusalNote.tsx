"use client";

import React from "react";

import type { BarHistoryRefusalVM } from "@/lib/marketData/compileBarHistoryRefusal";

/**
 * THE RECEIPT, ON THE GLASS.
 *
 * An empty chart canvas under a masthead reading FEED UNKNOWN is the single
 * most confusing thing this product does: it looks identical whether the
 * symbol is not carried, the vendor refused us, or the request is still in
 * flight. The reasons existed — classified, argued, and thrown away one stack
 * frame below the render. This paints them where the missing candles are.
 *
 * NOT A BADGE. NOT A TOOLTIP. NOT A `data-` ATTRIBUTE. Those are the three
 * drawers this product has already had to empty twice; the whole point is that
 * the sentence is readable without hovering, without a screen reader, and
 * without opening devtools.
 *
 * NO HUE GRADE — Build Order §9. One warm tone for "this is an absence, and it
 * is explained", and no green/red ramp implying the feed has been scored.
 */

/** Warm, not alarming. An explained absence is not an error. */
const QUIET = "#F0B429";
const BODY = "#C9CDDD";

export default function BarHistoryRefusalNote({
  vm,
}: {
  readonly vm: BarHistoryRefusalVM;
}) {
  // A served chart explains nothing — the bars are the explanation.
  if (vm.served) return null;
  // Nothing was handed to us. Saying "no source answered" here would be the
  // FEED UNKNOWN lie in a new costume, so the headline speaks for itself and
  // no vendor list is invented.
  const hasLines = vm.lines.length > 0;

  return (
    <div
      data-testid="bar-history-refusal"
      data-bhr-asked={vm.askedCount}
      data-bhr-attempts={vm.attemptCount}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 520,
        padding: "18px 22px",
        borderRadius: 10,
        border: "1px solid rgba(240,180,41,0.35)",
        background: "rgba(16,17,24,0.92)",
        pointerEvents: "none",
        zIndex: 6,
      }}
    >
      <div
        style={{
          color: QUIET,
          fontSize: 12,
          letterSpacing: "0.09em",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        NO BAR HISTORY
      </div>
      <div style={{ color: BODY, fontSize: 13, lineHeight: 1.5 }}>
        {vm.headline}
      </div>
      {hasLines && (
        <ul
          style={{
            margin: "10px 0 0",
            padding: 0,
            listStyle: "none",
            color: BODY,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {vm.lines.map((l, i) => (
            <li key={i} style={{ opacity: 0.88 }}>
              · {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
