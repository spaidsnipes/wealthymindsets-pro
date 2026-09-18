"use client";

/**
 * THE OBJECT PASSPORT — "SAME SLOTS. ANY KIND."
 *
 * Visual source: WM_NewMockup_137_Object_Kinds_Shared_Passport_Slots.jpg
 * (2026-09-18). Contract source: `src/lib/marketData/marketObjectKinds.ts`,
 * itself from SUPPORT — Truth Resolver Fidelity + MarketObject Attachments §2.
 *
 * ── WHY THIS IS NOT MarketObjectPassportPanel ────────────────────────────────
 *
 * There is already a component in this folder called a Passport, and it renders
 * something else. `MarketObjectPassportPanel` is a DIMENSION passport: one row
 * per canonical dimension the resolver sealed, each with a lifecycle, a
 * fidelity and an evidence lineage. Its objects have no kind, no geometry, no
 * state and no decay — `MarketObjectPassport` carries `label`, `confidence` and
 * `evidence`, and nothing that answers "what shape is this and where does it
 * sit on the chart".
 *
 * So the two could not be merged by renaming one. Converting a dimension row
 * into a `MarketObject` would mean choosing a kind for it, and choosing a kind
 * for something that has no geometry is precisely the laundering that
 * `canonicalBar.ts` refuses to offer for bars: manufacturing the fields the
 * source does not contain, in a function convenient enough to be called
 * everywhere.
 *
 * ── WHAT IS HONEST TO DRAW TODAY ─────────────────────────────────────────────
 *
 * The contract shipped before its producer. Nothing in the app currently emits
 * a `MarketObject`, and there are two ways to handle that. The dishonest one is
 * to render five empty slot chips, which reads as an object with no memory
 * rather than as no object — the H1 defect, absence rendered as a value.
 *
 * So this component renders THREE distinct things and never conflates them:
 *
 *   object === undefined   Never looked. Draws nothing at all.
 *   object === null        Looked, nothing selected. Says so in words.
 *   object present         The five shared slots, every kind, same layout.
 *
 * The CLOSED KINDS rail at the foot is in the third category regardless: the
 * list of seven is not data about the market, it is the contract itself, and it
 * is true whether or not an object is selected. It is drawn always, because the
 * question it answers — "is my Order Block supported?" — is asked by a trader
 * who has NOT selected anything.
 *
 * ── AND WHY THERE IS NO METER ────────────────────────────────────────────────
 *
 * `decay` keeps its number and gains no bar. A length beside a value invites
 * the read "how full is this object", which is a grade, and §15 does not permit
 * the house to grade. `state` is a WORD for the same reason: an object that is
 * 0.73 alive is a score. The mockup shows both as plain values and the absence
 * of a track in it is a specification, not an omission.
 */

import * as React from "react";

import {
  MARKET_OBJECT_KINDS,
  type MarketObject,
} from "@/lib/marketData/marketObjectKinds";

/* ── PALETTE ───────────────────────────────────────────────────────────────── */

const BRASS = "#c9a55c";
const IVORY = "#ede6d3";
const PARCHMENT = "#c2b892";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

export interface ObjectPassportSlotsProps {
  /**
   * `undefined` means this surface has not asked. `null` means it asked and
   * nothing is selected. The distinction is the whole point and is why this is
   * not simply an optional prop with a default.
   */
  readonly object?: MarketObject | null;
}

/* ── ONE SLOT ──────────────────────────────────────────────────────────────── */

/**
 * Every slot is this component. Not "every slot except the one that needed a
 * different treatment" — the moment one slot gets its own renderer, the drawer
 * layout has started to branch by field, which is the same overbuild the kinds
 * contract refuses one level up.
 */
function Slot({
  name,
  value,
}: {
  readonly name: string;
  readonly value: string | null;
}): React.ReactElement {
  return (
    <div
      data-testid={`object-slot-${name}`}
      style={{
        flex: "1 1 128px",
        minWidth: 112,
        border: `1px solid ${HAIR}`,
        borderRadius: 8,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: 0.6, color: MUTED, textTransform: "uppercase" }}>
        {name}
      </span>
      {/* A slot the object genuinely does not carry prints a dash in the ABSENCE
          tone and in italic — it must not be able to be mistaken for a value,
          and it must not be blank, because blank reads as "not rendered yet". */}
      <span
        style={{
          fontSize: 13,
          color: value == null ? MUTED : IVORY,
          fontStyle: value == null ? "italic" : "normal",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value ?? "none"}
      </span>
    </div>
  );
}

/* ── THE CLOSED KINDS RAIL ─────────────────────────────────────────────────── */

/**
 * The contract, drawn. Seven nouns and the word CLOSED, because a list without
 * that word reads as the kinds we have got to so far.
 */
function ClosedKindsRail({ current }: { readonly current?: string }): React.ReactElement {
  return (
    <div
      data-testid="closed-kinds-rail"
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${HAIR}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: 0.8, color: MUTED, textTransform: "uppercase" }}>
        Closed kinds
      </span>
      {MARKET_OBJECT_KINDS.map((kind) => {
        const isCurrent = kind === current;
        return (
          <span
            key={kind}
            data-testid={`closed-kind-${kind}`}
            data-current={isCurrent ? "true" : "false"}
            style={{
              fontSize: 11,
              letterSpacing: 0.5,
              // §9: the selected kind is distinguished by WEIGHT and a rule
              // beneath it, never by hue. Two kinds in two colours would make
              // the palette mean something about the market, and it does not:
              // a ZONE is not warmer than a LEVEL.
              color: isCurrent ? IVORY : PARCHMENT,
              opacity: isCurrent ? 1 : 0.62,
              fontWeight: isCurrent ? 600 : 400,
              borderBottom: isCurrent ? `1px solid ${BRASS}` : "1px solid transparent",
              paddingBottom: 2,
            }}
          >
            {kind}
          </span>
        );
      })}
    </div>
  );
}

/* ── THE PASSPORT ──────────────────────────────────────────────────────────── */

export function ObjectPassportSlots({
  object,
}: ObjectPassportSlotsProps): React.ReactElement | null {
  // NEVER LOOKED. Drawing a "no object" card here would be this surface
  // reporting a finding it never went and got.
  if (object === undefined) return null;

  const header = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, letterSpacing: 1.4, color: IVORY, textTransform: "uppercase" }}>
        Passport
      </span>
      <span style={{ fontSize: 10, letterSpacing: 0.8, color: MUTED, textTransform: "uppercase" }}>
        Same slots. Any kind.
      </span>
      {object && (
        <span
          data-testid="object-kind-chip"
          style={{
            marginLeft: "auto",
            fontSize: 11,
            letterSpacing: 0.8,
            color: BRASS,
            border: `1px solid ${HAIR}`,
            borderRadius: 6,
            padding: "3px 9px",
            textTransform: "uppercase",
          }}
        >
          Kind · {object.kind}
        </span>
      )}
    </div>
  );

  return (
    <section
      data-testid="object-passport-slots"
      style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: "12px 14px" }}
    >
      {header}

      {object === null ? (
        // LOOKED, FOUND NOTHING. A real finding, stated in words rather than as
        // five empty chips — empty chips read as an object with no memory.
        <p
          data-testid="object-passport-none-selected"
          style={{ margin: "10px 0 0", fontSize: 12, color: MUTED, fontStyle: "italic" }}
        >
          No object selected. The slots below are the same for every kind — choosing
          one changes the noun on the door, not the drawer.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Slot name="birthBarId" value={object.birthBarId} />
          <Slot name="tests" value={String(object.testBarIds.length)} />
          <Slot name="lastResponse" value={object.lastResponseBarId} />
          {/* A WORD, not a score. §15. */}
          <Slot name="state" value={object.state} />
          {/* A number, and pointedly no track beside it. */}
          <Slot name="decay" value={object.decay.toFixed(4)} />
        </div>
      )}

      <ClosedKindsRail current={object?.kind} />
    </section>
  );
}

export default ObjectPassportSlots;
