"use client";

/**
 * PassportStamp — the MARKET OBJECT PASSPORT identity band from the canon's
 * Canonical Market State mockup.
 *
 * The deck already compiled the passport and then hid the whole thing inside a
 * collapsed `<details>`. A passport that must be unfolded to prove it exists is
 * a passport the trader never looks at. The mockup treats it as a DOCUMENT
 * HEADER — a stamped band across the top, always visible, with the per-object
 * lineage one deliberate click below it.
 *
 * This component renders the band. It spells no value of its own; every field
 * arrives from `selectPassportStamp`, which is where the decision about what is
 * real and what is mockup fiction is made and tested.
 *
 * TOKENS — Visual Implementation Pack §1. Gold is the rule and the label, never
 * the reading. UNKNOWN wears muted #8a8271 and italic, because UNKNOWN has a
 * look.
 */

import * as React from "react";
import type { PassportStampVM } from "@/lib/experience/selectPassportStamp";

export interface PassportStampProps {
  readonly vm: PassportStampVM;
}

export function PassportStamp({ vm }: PassportStampProps): React.ReactElement {
  return (
    <section
      aria-label="Market object passport stamp"
      data-testid="passport-stamp"
      data-unissued={vm.unissued ? "true" : "false"}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "10px 28px",
        padding: "11px 16px",
        border: "1px solid rgba(196,165,116,0.24)",
        background: "linear-gradient(180deg, rgba(196,165,116,0.045) 0%, rgba(7,8,10,0) 100%)",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 10,
          letterSpacing: 1.7,
          textTransform: "uppercase",
          color: "#c4a574",
          whiteSpace: "nowrap",
        }}
      >
        Market Object Passport
      </span>

      {vm.fields.map((f) => (
        <span
          key={f.label}
          data-stamp-field={f.label}
          style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}
        >
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 9,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: "#8a8271",
              whiteSpace: "nowrap",
            }}
          >
            {f.label}
          </span>
          <span
            style={{
              fontSize: 11.5,
              letterSpacing: 0.3,
              // THREE states, two marks, no new token.
              //
              //   finding   #ede6d3 upright   a reading the trader can act on
              //   absence   #8a8271 upright   a reading whose content is "nothing"
              //   no reading #8a8271 italic   nothing was compiled at all
              //
              // The INK answers "is this a finding?" and the FACE answers "is
              // this a reading at all?". Measured live, STATE QUALITY
              // UNAVAILABLE wore full ivory beside the protocol version — an
              // absence in the ink reserved for facts. It is not folded into
              // the italic, because "we never looked" and "we looked and there
              // is nothing" are opposite facts about the engine.
              color: f.unresolved || f.absence ? "#8a8271" : "#ede6d3",
              fontStyle: f.unresolved ? "italic" : "normal",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {f.value}
          </span>
        </span>
      ))}
    </section>
  );
}

export default PassportStamp;
