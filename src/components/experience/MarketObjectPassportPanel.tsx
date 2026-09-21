"use client";

/**
 * MarketObjectPassportPanel — compact renderer for selectMarketObjectPassport
 * (Founder canon P6 MARKET OBJECT PASSPORT / OBJECT DNA).
 *
 * Each canonical dimension the engine resolved gets a Passport line: label,
 * lifecycle chip, value + fidelity. Pressing a resolved/forming object opens
 * its DNA — evidence lineage (reversible to provider evidence), contradictions,
 * and the honest unknown residue. This is the Evidence-Reversibility Moat as a
 * surface: every claim travels backward to an evidence ref.
 *
 * Pure display — consumes a MarketObjectPassportVM, never derives truth.
 * Auto-Quiet: unresolved objects render dim and collapsed; resolved objects
 * lead. When nothing is sealed the panel states that honestly.
 */

import * as React from "react";
import {
  FIDELITY_RANK,
  FIDELITY_MAX,
} from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import type {
  MarketObjectPassportVM,
  MarketObjectPassport,
  PassportLifecycle,
} from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import { WM, objectionTint } from "@/lib/design/wmTokens";

export interface MarketObjectPassportPanelProps {
  readonly vm: MarketObjectPassportVM;
  /**
   * The shared equipment layer already owns the drawer frame, title, subject,
   * verdict and close controls. Repeating this panel's own card and title
   * inside that host creates a card inside a card and makes one instrument read
   * like two apps. Embedded mode removes only that duplicate furniture; the
   * same rows, resolution band, lifecycle truth and DNA disclosures remain.
   */
  readonly embedded?: boolean;
  /**
   * TRUE only when this panel has the whole screen (the equipment journey's
   * FULL stage). It does not mean "bigger" — it means NOTHING IS BEHIND A
   * DISCLOSURE. Each object's lineage, contradictions and unknowns render
   * inline instead of inside a `<details>`.
   *
   * That is the difference between depth and size, and here it is also a
   * direct answer to the directive's own failure condition: "if the intelligence
   * exists but requires hunting through implementation containers: FAIL." A
   * `<details>` inside a drawer inside a room is exactly that hunt, so the
   * stage whose whole job is the complete experience does not keep one.
   */
  readonly unabridged?: boolean;
}

const LIFECYCLE_COLOR: Record<PassportLifecycle, string> = {
  RESOLVED: "#d4af37", // gold — sealed with evidence
  FORMING: "#c9a55c", // dim gold — partial
  UNRESOLVED: "#8a8271", // muted — nothing verified yet
};

const FIDELITY_TONE: Record<string, string> = {
  OBSERVED: "#d4af37",
  DERIVED: "#c9a55c",
  PROXY: "#b8925a",
  INFERRED: "#9c8a63",
  SIMULATED: "#8a8271",
  UNAVAILABLE: "#6f6a5a",
};

const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

/**
 * FIDELITY AS A LADDER, BECAUSE FIDELITY IS A LADDER.
 *
 * The strength of the evidence behind a claim was rendered as a single word.
 * OBSERVED and INFERRED are five rungs apart on `FIDELITY_RANK` and they
 * occupied the same number of pixels, in two colours four percent apart in
 * luminance. Comparing two dimensions meant knowing the scale by heart.
 *
 * THE WORD STAYS. This is an addition, not a substitution: the rungs are
 * `aria-hidden` decoration beside the label, because rank encoded ONLY as
 * height is unreadable to a screen reader and unreliable for anyone who cannot
 * separate two adjacent golds. The picture is the fast path, not the only one.
 */
function FidelityRungs({ fidelity }: { fidelity: string }): React.ReactElement | null {
  const rank = FIDELITY_RANK[fidelity as keyof typeof FIDELITY_RANK];
  // An unrecognised class draws nothing rather than drawing zero rungs: an
  // empty ladder and a UNAVAILABLE ladder must not look identical.
  if (rank == null) return null;
  const tone = FIDELITY_TONE[fidelity] ?? MUTED;
  return (
    <span
      aria-hidden="true"
      data-testid="passport-fidelity-rungs"
      data-rank={rank}
      style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 10 }}
    >
      {Array.from({ length: FIDELITY_MAX }, (_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 3 + i * 1.75,
            borderRadius: 0.5,
            background: i < rank ? tone : "rgba(139,106,41,0.18)",
          }}
        />
      ))}
    </span>
  );
}

function fmtTime(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch {
    return String(ms);
  }
}

function PassportRow({
  obj,
  unabridged = false,
}: {
  obj: MarketObjectPassport;
  unabridged?: boolean;
}): React.ReactElement {
  const color = LIFECYCLE_COLOR[obj.lifecycle];
  const hasDetail =
    obj.evidence.length > 0 || obj.contradictions.length > 0 || obj.unknowns.length > 0;

  /**
   * THE MOAT NEEDS AN AFFORDANCE.
   *
   * This panel's whole claim is the Evidence-Reversibility Moat: every claim
   * travels backward to an evidence ref. It put that lineage behind a
   * `<details>` and then set `listStyle: "none"` on the summary, which removes
   * the disclosure triangle — the ONE native affordance saying "there is more
   * here". What remained was `cursor: pointer`, which does not exist on a
   * phone, and phones are primary.
   *
   * The result on the 390px sweep screenshot: a RESOLVED row carrying four
   * evidence refs and an UNRESOLVED row carrying nothing rendered
   * IDENTICALLY. A moat nobody can find is not a moat.
   *
   * Worse, CONTRADICTIONS lived only inside the collapsed block. A
   * contradiction the trader never opens is indistinguishable from no
   * contradiction — the panel was quietly holding a disagreement it had
   * already detected.
   *
   * So the summary now states what is behind it, while closed. Counts, not a
   * decorative chevron: the trader learns there are four refs and one
   * contradiction before deciding to spend a tap.
   */
  const detailChip = hasDetail ? (
    <span
      data-testid="passport-dna-affordance"
      style={{
        fontSize: 11,
        letterSpacing: 0.4,
        // A contradiction is an OBJECTION the passport is raising, not a fault
        // in the passport. `WM.state.objection`, never `WM.state.warn`.
        color: obj.contradictions.length > 0 ? WM.state.objection : color,
        border: `1px solid ${obj.contradictions.length > 0 ? objectionTint(0.45) : HAIR}`,
        borderRadius: 4,
        padding: "1px 5px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      DNA · {obj.evidence.length} ref{obj.evidence.length === 1 ? "" : "s"}
      {obj.contradictions.length > 0
        ? ` · ${obj.contradictions.length} contradiction${obj.contradictions.length === 1 ? "" : "s"}`
        : ""}
    </span>
  ) : null;

  const header = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, letterSpacing: 0.4, color, minWidth: 92, textTransform: "uppercase" }}>
        {obj.label}
      </span>
      <span style={{ fontSize: 11, letterSpacing: 0.5, color, opacity: 0.85, textTransform: "uppercase" }}>
        {obj.lifecycle}
      </span>
      <span style={{ fontSize: 12, color: obj.value ? "#d8cfb8" : MUTED, fontStyle: obj.value ? "normal" : "italic" }}>
        {obj.value ?? obj.summary}
      </span>
      {obj.fidelity && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            letterSpacing: 0.4,
            color: FIDELITY_TONE[obj.fidelity] ?? MUTED,
            marginLeft: "auto",
            textTransform: "uppercase",
          }}
        >
          <FidelityRungs fidelity={obj.fidelity} />
          {obj.fidelity}
          {/* CONFIDENCE KEEPS ITS NUMBER AND GAINS A LENGTH. `· 87%` and `· 12%`
              differ by one glyph at 11px; the bar makes the same fact legible
              without reading. Rendered only when the engine actually holds a
              confidence — `null` draws nothing rather than an empty track,
              because a zero-length bar reads as "no confidence" when the truth
              is "no measurement", and those are different claims. */}
          {obj.confidence != null && (
            <>
              <span
                aria-hidden="true"
                data-testid="passport-confidence-bar"
                data-confidence={Math.round(obj.confidence * 100)}
                style={{
                  display: "inline-block",
                  width: 28,
                  height: 3,
                  borderRadius: 2,
                  background: "rgba(139,106,41,0.18)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    // Clamped: a confidence outside [0,1] is a bug upstream, and
                    // a bar that overflows its track would hide it as a flourish.
                    width: `${Math.max(0, Math.min(1, obj.confidence)) * 100}%`,
                    background: FIDELITY_TONE[obj.fidelity] ?? MUTED,
                  }}
                />
              </span>
              {`${Math.round(obj.confidence * 100)}%`}
            </>
          )}
        </span>
      )}
      {/* Last in reading order: label, verdict, claim, fidelity, then what
          stands behind the claim. `marginLeft: auto` already pushed fidelity
          right, so this trails it rather than competing for the same edge. */}
      {detailChip}
    </div>
  );

  if (!hasDetail) {
    return <div style={{ padding: "6px 0", borderBottom: `1px solid ${HAIR}` }}>{header}</div>;
  }

  const dna = (
    <div
      data-testid="passport-dna"
      style={{ marginTop: 8, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
        {obj.evidence.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>EVIDENCE LINEAGE</div>
            {obj.evidence.map((e) => (
              <div key={e.eventId} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>
                <span style={{ color: FIDELITY_TONE[e.fidelity] ?? MUTED }}>{e.fidelity}</span>
                {" · "}
                <span style={{ color: "#d8cfb8" }}>{e.source}</span>
                {" — "}
                {e.basis}
                <span style={{ color: MUTED }}>{"  @ "}{fmtTime(e.availableAt)}</span>
              </div>
            ))}
          </div>
        )}
        {obj.contradictions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, color: WM.state.objection, marginBottom: 4 }}>CONTRADICTION</div>
            {obj.contradictions.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: "#e0a58c", lineHeight: 1.4 }}>{c}</div>
            ))}
          </div>
        )}
        {obj.unknowns.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>MISSING / INVALIDATION</div>
            {obj.unknowns.map((u, i) => (
              <div key={i} style={{ fontSize: 11, color: MUTED, lineHeight: 1.4, fontStyle: "italic" }}>{u}</div>
            ))}
          </div>
        )}
    </div>
  );

  // THE ONLY STRUCTURAL DIFFERENCE BETWEEN THE TWO DEPTHS. Same rows, same
  // lineage, same words — the docked panel folds them away because it is 420px
  // wide, and the full stage does not, because it has no excuse to. Nothing is
  // added at full and nothing is withheld below it; what changes is whether the
  // trader has to hunt.
  if (unabridged) {
    return (
      <div style={{ padding: "6px 0", borderBottom: `1px solid ${HAIR}` }}>
        {header}
        {dna}
      </div>
    );
  }

  return (
    <details style={{ padding: "6px 0", borderBottom: `1px solid ${HAIR}` }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>{header}</summary>
      {dna}
    </details>
  );
}

export function MarketObjectPassportPanel({
  vm,
  unabridged = false,
  embedded = false,
}: MarketObjectPassportPanelProps): React.ReactElement {
  // Resolved / forming objects lead; unresolved are quieted below (Auto-Quiet).
  const ordered = [...vm.objects].sort((a, b) => {
    const rank = (l: PassportLifecycle) => (l === "RESOLVED" ? 0 : l === "FORMING" ? 1 : 2);
    return rank(a.lifecycle) - rank(b.lifecycle);
  });

  return (
    <section
      aria-label="Market object passports"
      style={{
        border: embedded ? "none" : `1px solid ${HAIR}`,
        borderRadius: embedded ? 0 : 10,
        padding: embedded ? 0 : "12px 14px",
        background: embedded ? "transparent" : "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        {!embedded && (
          <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
            Market Object Passports · Object DNA
          </span>
        )}
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
          {vm.resolvedCount}/{vm.totalCount} resolved · {vm.qualityState}
        </span>
      </div>

      {/* THE STANDING OF THE WHOLE PICTURE, AT A GLANCE.
          `3/8 resolved` is accurate and it is a reading task — and it hides the
          shape of the eight. Two rooms both reporting 3/8 can mean "three sealed,
          five nothing" or "three sealed, five actively forming", which are
          different market states and were rendered in identical words.

          One segment per object, in the same order the rows appear below, so the
          band is an index of the list rather than a second opinion about it. The
          counts stay in the line above: this is a picture of a number that is
          still printed, not a replacement for printing it. */}
      {ordered.length > 0 && (
        <div
          aria-hidden="true"
          data-testid="passport-resolution-band"
          style={{ display: "flex", gap: 2, marginBottom: 10 }}
        >
          {ordered.map((obj) => (
            <span
              key={obj.id}
              data-lifecycle={obj.lifecycle}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: LIFECYCLE_COLOR[obj.lifecycle],
                // UNRESOLVED is dimmed rather than hidden. An absent segment
                // would shorten the band and quietly redraw the denominator —
                // eight objects must always read as eight.
                opacity: obj.lifecycle === "UNRESOLVED" ? 0.28 : 1,
              }}
            />
          ))}
        </div>
      )}

      {vm.objects.length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", padding: "4px 0" }}>
          No sealed market state yet — no objects to passport.
        </div>
      ) : (
        <div>
          {ordered.map((obj) => (
            <PassportRow key={obj.id} obj={obj} unabridged={unabridged} />
          ))}
        </div>
      )}

      {vm.snapshotId && (
        <div style={{ fontSize: 11, color: MUTED, marginTop: 8, letterSpacing: 0.3 }}>
          snapshot {vm.snapshotId}
          {vm.capturedAt ? ` · sealed ${fmtTime(vm.capturedAt)}` : ""}
        </div>
      )}
    </section>
  );
}

export default MarketObjectPassportPanel;
