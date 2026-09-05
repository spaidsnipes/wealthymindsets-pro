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

/** Human-readable names. The enum is for code; the trader reads English. */
const ELEMENT_LABEL: Record<SurfaceElement, string> = {
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
}

function Chip({
  text,
  tone,
}: {
  readonly text: string;
  readonly tone: "admitted" | "withheld";
}): React.ReactElement {
  const admitted = tone === "admitted";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 10,
        letterSpacing: 0.3,
        border: `1px solid ${admitted ? "rgba(212,175,55,0.45)" : "rgba(138,130,113,0.32)"}`,
        background: admitted ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.02)",
        color: admitted ? GOLD : MUTED,
        textDecoration: admitted ? "none" : "line-through",
        whiteSpace: "nowrap",
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
}: SceneAdmissionPanelProps): React.ReactElement {
  const admittedSet = React.useMemo(
    () => new Set<SurfaceElement>(compilation.admits),
    [compilation.admits],
  );
  const withheld = React.useMemo(
    () => SURFACE_ELEMENTS.filter((e) => !admittedSet.has(e)),
    [admittedSet],
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
            Admitted · {compilation.admits.length}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {compilation.admits.map((e) => (
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
              Nothing is withheld in this scene.
            </span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {withheld.map((e) => (
                <Chip key={e} text={ELEMENT_LABEL[e]} tone="withheld" />
              ))}
            </div>
          )}
        </div>

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
          {observedCount < totalCount && (
            <p style={{ margin: "7px 0 0", fontSize: 10.5, lineHeight: 1.5, color: MUTED }}>
              This route has no broker panel, so WM has not read a book, an order
              or a fill here. The unobserved signals above are not assumed flat —
              the scene below them is compiled only from what was actually seen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default SceneAdmissionPanel;
