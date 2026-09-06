"use client";

/**
 * SceneAdmissionPanel — the OS made visible.
 *
 * BUILD ORDER §10 says a scene variable changes what is ADMITTED to the
 * surface. The temptation is to render a pretty scene name and call the hole
 * closed — that is a badge, and §H19 calls badges dead vocabulary.
 *
 * So this panel leads with the thing a badge cannot show: WITHHELD. The list of
 * surfaces the scene refused is the only visible proof that admission is real
 * and not decoration. If WITHHELD is empty in every scene, the compiler is not
 * doing anything and the Founder can see that at a glance.
 *
 * It also renders SIGNAL PROVENANCE. A scene compiled from two real signals and
 * three unobserved ones must never look like a scene compiled from five real
 * ones — §14.1 (FLAT is a finding, never a default) applies to the wiring as
 * much as to the compiler.
 *
 * ── The second overclaim, and why `governed` is required ─────────────────────
 *
 * The first version of this panel printed "Withheld · 9" on /command-deck and
 * struck through nine chips — Thesis geometry, Flatten control, Receipt sheet,
 * Open broker… Exactly ONE of those nine named a surface this route routes
 * through admission. The other eight were refusals of things the scene has no
 * power over here.
 *
 * That is the mirror image of the defect the gate closed. There the SURFACE
 * overclaimed by rendering what the compiler refused; here the PANEL
 * overclaimed by reporting refusals it could not enforce. Nine struck-through
 * chips read as "WM has a Flatten control and is choosing not to show it." WM
 * has no Flatten control on this route. That is a claim with no owner behind
 * it — LIVING-PIXEL LAW, and §H19 dead vocabulary.
 *
 * So a caller must declare which elements it actually routes through
 * `SceneAdmits`, and the panel splits the scene's verdict three ways:
 *
 *   ADMITTED   — governed, and the scene allowed it. It is on this screen.
 *   WITHHELD   — governed, and the scene removed it. A real refusal.
 *   NOT GOVERNED — the scene compiled a verdict this route does not apply.
 *
 * `governed` is REQUIRED, not optional-with-a-default. A default would let the
 * next surface silently inherit whatever flatters it, which is how the first
 * overclaim happened. And because the list is a claim, a sentinel checks it:
 * every element named here must have a real `<SceneAdmits>` on that page.
 *
 * The honest consequence is that this panel now shows how much of the screen
 * the OS actually governs — 1 of 12 on the deck today. That number is meant to
 * be uncomfortable and to rise. It is the §10 progress meter, not decoration.
 *
 * Presentation only. Reads canonical owners, decides no facts.
 */

import React from "react";

import {
  SURFACE_ELEMENTS,
  type SceneCompilation,
  type SurfaceElement,
} from "@/lib/experience/compileScene";
import {
  SIGNAL_GROUPS,
  type SignalGroup,
  type SignalProvenance,
} from "@/lib/experience/deckSceneSignals";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const WARN = "#e07b5c";

/**
 * Human-readable names. The enum is for code; the trader reads English.
 *
 * Exported so tests can read a refusal back off the rendered panel by its real
 * label. A test that hard-codes "One story" would keep passing after the label
 * changed, and would then be proving nothing about this screen.
 */
export const ELEMENT_LABEL: Record<SurfaceElement, string> = {
  MARKET_CANVAS: "Market canvas",
  THESIS_GEOMETRY: "Thesis geometry",
  EXPRESSION_CARD: "Expression shortlist",
  ONE_STORY: "One story",
  PROTECTION_GRADE: "Protection grade",
  PENDING_BANNER: "Pending banner",
  HOT_PATH_REMOTE: "Hot path remote",
  FLATTEN_CONFIRM: "Flatten control",
  HUMILITY_PANEL: "What we do not know",
  FIDELITY_CHIPS: "Fidelity chips",
  RECEIPT_SHEET: "Receipt sheet",
  OPEN_BROKER: "Open broker",
};

const GROUP_LABEL: Record<SignalGroup, string> = {
  SESSION: "Session",
  DECISION: "Decision",
  POSITION: "Position",
  ORDERS: "Orders",
  LINK: "Broker link",
};

export interface SceneAdmissionPanelProps {
  readonly compilation: SceneCompilation;
  readonly provenance: Readonly<Record<SignalGroup, SignalProvenance>>;
  readonly observedCount: number;
  readonly totalCount: number;
  /**
   * The elements this surface actually routes through `SceneAdmits`.
   *
   * Required on purpose. This is the difference between "the scene refused it"
   * and "the scene has no say here", and only the caller knows which.
   */
  readonly governed: readonly SurfaceElement[];
}

type ChipTone = "admitted" | "withheld" | "ungoverned";

function Chip({
  text,
  tone,
}: {
  readonly text: string;
  readonly tone: ChipTone;
}): React.ReactElement {
  // A refusal is struck through; an ungoverned element must NOT be, or the
  // panel goes straight back to claiming refusals it cannot enforce.
  const style: React.CSSProperties =
    tone === "admitted"
      ? {
          border: "1px solid rgba(212,175,55,0.45)",
          background: "rgba(212,175,55,0.10)",
          color: GOLD,
        }
      : tone === "withheld"
        ? {
            border: "1px solid rgba(138,130,113,0.32)",
            background: "rgba(255,255,255,0.02)",
            color: MUTED,
            textDecoration: "line-through",
          }
        : {
            border: "1px dashed rgba(138,130,113,0.28)",
            background: "transparent",
            color: "rgba(138,130,113,0.75)",
            fontStyle: "italic",
          };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 10,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </span>
  );
}

export function SceneAdmissionPanel({
  compilation,
  provenance,
  observedCount,
  totalCount,
  governed,
}: SceneAdmissionPanelProps): React.ReactElement {
  const admittedSet = React.useMemo(
    () => new Set<SurfaceElement>(compilation.admits),
    [compilation.admits],
  );
  const governedSet = React.useMemo(
    () => new Set<SurfaceElement>(governed),
    [governed],
  );

  // Only a GOVERNED element can be admitted or withheld here. The scene's
  // verdict on anything else is real, but this route does not apply it, and
  // reporting it as a refusal would claim an authority the surface lacks.
  const admitted = React.useMemo(
    () => SURFACE_ELEMENTS.filter((e) => governedSet.has(e) && admittedSet.has(e)),
    [governedSet, admittedSet],
  );
  const withheld = React.useMemo(
    () => SURFACE_ELEMENTS.filter((e) => governedSet.has(e) && !admittedSet.has(e)),
    [governedSet, admittedSet],
  );
  const ungoverned = React.useMemo(
    () => SURFACE_ELEMENTS.filter((e) => !governedSet.has(e)),
    [governedSet],
  );

  /**
   * The signals that were NOT read, named.
   *
   * The first version of this line said "This route has no broker panel, so WM
   * has not read a book, an order or a fill here." That was true on
   * /command-deck and became a LIE the moment a route with a real book adopted
   * the panel: /paper reads positions, working orders and a persistence result,
   * and may still be missing only the DECISION signal. Printing "no broker
   * panel" over an observed book is the same class of overclaim this file was
   * written to kill — a sentence with no owner behind it.
   *
   * So the sentence is derived from `provenance` rather than assumed from the
   * route. It can only ever name groups that actually came back UNOBSERVED.
   */
  const unobservedLabels = React.useMemo(
    () =>
      SIGNAL_GROUPS.filter((g) => provenance[g] !== "OBSERVED").map(
        (g) => GROUP_LABEL[g].toLowerCase(),
      ),
    [provenance],
  );

  const headlineTone = compilation.degraded ? WARN : GOLD;

  return (
    <section
      aria-label={`Scene ${compilation.scene}. ${compilation.reason}`}
      style={{
        border: `1px solid ${compilation.degraded ? "rgba(224,123,92,0.45)" : "rgba(212,175,55,0.35)"}`,
        background: compilation.degraded ? "rgba(224,123,92,0.06)" : "rgba(212,175,55,0.04)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: MUTED,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          Scene
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            color: headlineTone,
            lineHeight: 1.1,
          }}
        >
          {compilation.scene}
        </span>
        {compilation.capitalAtRisk && (
          <span
            style={{
              fontSize: 9,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: WARN,
              border: `1px solid rgba(224,123,92,0.45)`,
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            Capital accountable
          </span>
        )}
      </div>

      {/* §9: sentences, not badges. The reason names the single signal that won. */}
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          lineHeight: 1.5,
          color: "#cfc7b4",
        }}
      >
        {compilation.reason}
      </p>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
            }}
          >
            Admitted · {admitted.length}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {admitted.map((e) => (
              <Chip key={e} text={ELEMENT_LABEL[e]} tone="admitted" />
            ))}
          </div>
        </div>

        {/* The load-bearing half. Without this, admission is invisible and the
            panel is decoration. */}
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
            }}
          >
            Withheld · {withheld.length}
          </div>
          {withheld.length === 0 ? (
            <span style={{ fontSize: 11, color: MUTED }}>
              Nothing this route governs is withheld in this scene.
            </span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {withheld.map((e) => (
                <Chip key={e} text={ELEMENT_LABEL[e]} tone="withheld" />
              ))}
            </div>
          )}
        </div>

        {/* NOT GOVERNED — the §10 build-completeness meter.
            These are elements the compiler ruled on and this route does not
            route through admission. Printing them as refusals would be the
            panel claiming a power the surface does not have. Printing them at
            all is the honest alternative to quietly dropping them: the Founder
            can see exactly how much of the screen the OS actually runs. */}
        {ungoverned.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 5,
              }}
            >
              Not governed here · {ungoverned.length}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {ungoverned.map((e) => (
                <Chip key={e} text={ELEMENT_LABEL[e]} tone="ungoverned" />
              ))}
            </div>
            <p style={{ margin: "7px 0 0", fontSize: 10.5, lineHeight: 1.5, color: MUTED }}>
              The scene governs {governed.length} of {SURFACE_ELEMENTS.length}{" "}
              surface elements on this route. The rest are compiled but not
              applied here — the scene has an opinion about them and no power
              over them, so they are not counted as refusals.
            </p>
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: compilation.admitsAmbient ? GOLD_DIM : WARN,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 8,
          }}
        >
          {compilation.admitsAmbient
            ? "Ambient surfaces may take the room — Academy, Nectar and celebration are allowed here."
            : "Ambient surfaces are withheld — only capital truth and material invalidation may take the room."}
        </div>

        {/* SIGNAL PROVENANCE — the anti-fabrication disclosure. */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
            }}
          >
            Signals observed · {observedCount} / {totalCount}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {SIGNAL_GROUPS.map((g) => {
              const observed = provenance[g] === "OBSERVED";
              return (
                <span
                  key={g}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 5,
                    border: `1px solid ${observed ? "rgba(212,175,55,0.45)" : "rgba(138,130,113,0.3)"}`,
                    color: observed ? GOLD : MUTED,
                    background: observed ? "rgba(212,175,55,0.08)" : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {GROUP_LABEL[g]} · {observed ? "OBSERVED" : "UNOBSERVED"}
                </span>
              );
            })}
          </div>
          {unobservedLabels.length > 0 && (
            <p style={{ margin: "7px 0 0", fontSize: 10.5, lineHeight: 1.5, color: MUTED }}>
              WM has not read {unobservedLabels.join(", ")} on this screen. Those
              signals are not assumed flat or safe — the scene above them is
              compiled only from what was actually seen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default SceneAdmissionPanel;
