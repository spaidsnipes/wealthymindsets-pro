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
import type { PassportStampVM, StampField } from "@/lib/experience/selectPassportStamp";
import { traderClock } from "@/components/time/traderClock";

export interface PassportStampProps {
  readonly vm: PassportStampVM;
}

/** Fields whose value is a machine identity: shown in the Receipt, not on the glass. */
const RECEIPT_ONLY: ReadonlySet<string> = new Set(["Object ID", "Protocol"]);

function StampCell({ label, f, children }: { label: string; f: Pick<StampField, "unresolved" | "absence">; children: React.ReactNode }) {
  return (
    <span data-stamp-field={label} style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
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
        {label}
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
        {children}
      </span>
    </span>
  );
}

export function PassportStamp({ vm }: PassportStampProps): React.ReactElement {
  // Local time is the VIEWER's, so it is read only after mount: the server and
  // the browser disagree about zone and locale, and printing it during the
  // first render is the React #418 class selectPassportStamp's header names.
  // Until then the cell shows a dash, never the UTC stamp wearing a local label.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const issuedLocal = (f: StampField): string =>
    f.unresolved || f.atMs == null ? f.value : mounted ? traderClock(f.atMs, { seconds: false, nowMs: Date.now() }) : "—";
  const glass = vm.fields.filter((f) => !RECEIPT_ONLY.has(f.label));
  const receipt = vm.fields.filter((f) => RECEIPT_ONLY.has(f.label) || f.label === "Issued");
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

      {glass.map((f) => (
        <StampCell key={f.label} label={f.label} f={f}>
          {f.label === "Issued" ? issuedLocal(f) : f.value}
        </StampCell>
      ))}

      {/* THE RECEIPT (ruling 2026-10-09, sheriff batch 5): the glass speaks
          trader words — local time with its zone. The machine identity — the
          object id, the protocol version and the exact UTC stamp, verbatim from
          selectPassportStamp — sits one deliberate press below, never deleted.
          A disclosure, not a link (the Command Deck carries no links). */}
      <details data-testid="passport-stamp-receipt" style={{ flexBasis: "100%", minWidth: 0 }}>
        {/* 24px on a desk; 44px under a finger or at phone width — a class, because
            inline min-height cannot follow the pointer (measured 284x24 at 390). */}
        <summary className="min-h-[24px] max-[767px]:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center"
          style={{ cursor: "pointer", fontSize: 10, letterSpacing: 1.3, textTransform: "uppercase", color: "#8a8271" }}>Receipt</summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 28px", paddingTop: 6 }}>
          {receipt.map((f) => (
            <StampCell key={f.label} label={f.label === "Issued" ? "Issued (UTC)" : f.label} f={f}>
              {f.value}
            </StampCell>
          ))}
        </div>
      </details>
    </section>
  );
}

export default PassportStamp;
