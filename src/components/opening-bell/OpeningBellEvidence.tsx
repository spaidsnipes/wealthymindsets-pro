"use client";
import * as React from "react";
import Link from "next/link";
import { PREP_VERDICT_WITHHELD, type PrepEvidence } from "@/lib/experience/openingBellPrep";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";

/**
 * OpeningBellEvidence — the only way any surface is allowed to answer
 * "am I prepared?".
 *
 * WHY THIS IS A SHARED COMPONENT AND NOT TWO BLOCKS OF JSX
 * -------------------------------------------------------
 * Because the defect it replaces existed TWICE, in two files, and the second
 * copy was worse than the first.
 *
 * `/command-deck` built its readiness verdict from
 *
 *     items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false }))
 *
 * — every item hardcoded incomplete, so the room returned NOT_READY with
 * "Preparation incomplete. Rushing preparation correlates with process
 * failure." A judgement about the trader's morning, from no observation.
 *
 * `/morning-prep` did the same thing and then went further:
 *
 *     completed:   t.category === "personal" ? hasTodayEntry : false,
 *     completedAt: t.category === "personal" && hasTodayEntry ? nowMs : undefined,
 *
 * Two fabrications in opposite directions, on the page that owns the real data:
 *
 *   1. Six items hardcoded NOT DONE — the accusation, same as the deck.
 *   2. Two items marked DONE, and stamped with a completion TIME of `nowMs`,
 *      because the trader had *some* prep entry. Not today's — `hasTodayEntry`
 *      was `entries.length > 0`, i.e. any entry ever written. So a trader who
 *      journalled once in March had "Personal reflection completed at 09:41"
 *      asserted about them today, on a surface that never looked.
 *
 * A fabricated tick is not the gentler error. It is the worse one: a false NOT
 * DONE can be argued with, a false DONE is a record of something the trader
 * never did, wearing a timestamp.
 *
 * So the honest rendering ships as ONE component. A second surface that wants
 * to talk about preparation composes this; it cannot fork its own wording, and
 * it has nowhere to put an invented tick.
 *
 * DISPLAY ONLY — takes already-compiled evidence, decides nothing.
 */
export default function OpeningBellEvidence({
  evidence,
  dataQuality,
  showPrepLink = true,
}: {
  /** Compiled by `selectPrepEvidence`. This component never derives it. */
  evidence: PrepEvidence;
  /** The one axis that IS observed. Omit when genuinely unknown — never default it. */
  dataQuality?: MarketQualityState;
  /** Suppressed on /morning-prep, where the trader is already standing in it. */
  showPrepLink?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label="Opening Bell — session preparation"
      data-testid="opening-bell-evidence"
      style={{
        borderTop: "1px solid rgba(139,106,41,0.20)",
        background: "transparent",
        padding: "12px 0 4px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "#c9a55c",
          fontWeight: 800,
        }}
      >
        Opening Bell
      </div>

      <div
        data-testid="opening-bell-prep-evidence"
        style={{ fontSize: 13, color: "#ede6d3", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}
      >
        {evidence.sentence}
      </div>

      {/* Observed, so it may be stated. A reading, never a grade. */}
      {dataQuality != null && (
        <div style={{ fontSize: 11, color: "#c0b8a0", marginTop: 8, lineHeight: 1.5 }}>
          Market data health right now: <span style={{ color: "#ede6d3" }}>{dataQuality}</span>.
        </div>
      )}

      {/* The refusal, explained where the verdict used to be. */}
      <div
        data-testid="opening-bell-verdict-withheld"
        style={{
          fontSize: 11,
          color: "#8a8271",
          lineHeight: 1.5,
          marginTop: 10,
          paddingLeft: 10,
          borderLeft: "2px solid rgba(139,106,41,0.35)",
        }}
      >
        {PREP_VERDICT_WITHHELD}
      </div>

      {showPrepLink && (
        <Link
          href="/morning-prep"
          prefetch={false}
          style={{
            display: "inline-block",
            marginTop: 10,
            minHeight: 44,
            lineHeight: "44px",
            fontSize: 9,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: "#c9a55c",
            textDecoration: "none",
          }}
          aria-label="Open Morning Prep to review or complete your prep list"
        >
          Open Morning Prep →
        </Link>
      )}
    </div>
  );
}
