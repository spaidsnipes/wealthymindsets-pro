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
import { type SignalGroup, type SignalProvenance } from "@/lib/experience/deckSceneSignals";
import {
  selectSceneGovernance,
  type GovernanceStanding,
} from "@/lib/experience/selectSceneGovernance";

import SignalProvenanceStrip from "./SignalProvenanceStrip";

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

/**
 * THE §10 BAND'S MATERIALS — FILL, NOT HUE.
 *
 * §9 requires the three standings to survive a greyscale screen and a
 * colour-blind reader, so they are told apart by whether the mark is FILLED,
 * OUTLINED, or neither. The colour difference is secondary and carries no
 * information the shape does not.
 *
 * A TOTAL `Record` on purpose: a standing added later must fail to compile
 * rather than fall through to a default, and the only default that could
 * possibly exist here is a filled mark — the one that reads as "the OS ran
 * this pixel." A new standing must never arrive already flattering the build.
 */
const STANDING_MARK: Record<GovernanceStanding, React.CSSProperties> = {
  // Governed and allowed. Solid, in the same brass the admitted chip uses.
  ADMITTED: { background: GOLD_DIM, boxShadow: "none" },
  // Governed and removed — a refusal the OS actually enforced. Hollow, so it
  // reads as "an element with a ruling behind it that is not on the screen."
  WITHHELD: { background: "transparent", boxShadow: `inset 0 0 0 1px ${MUTED}` },
  // No ruling reaches this pixel. Neither filled nor outlined: an absence of
  // authority should not look like a decision, because it is not one.
  UNGOVERNED: { background: "rgba(138,130,113,0.22)", boxShadow: "none" },
};

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
        fontSize: 11,
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
  /**
   * THE ONE PARTITION.
   *
   * Only a GOVERNED element can be admitted or withheld here. The scene's
   * verdict on anything else is real, but this route does not apply it, and
   * reporting it as a refusal would claim an authority the surface lacks.
   *
   * That rule used to be enforced by three `SURFACE_ELEMENTS.filter(...)` calls
   * in this component. It is now compiled by `selectSceneGovernance`, and the
   * chips, the three headings and the band all read the SAME object — because
   * the moment the band counted the populations itself, the picture and the
   * headings could disagree about how much of the screen the OS runs while both
   * stayed green. §24: one answer per question, and this is one question.
   */
  const governance = React.useMemo(
    () => selectSceneGovernance({ admits: compilation.admits, governed }),
    [compilation.admits, governed],
  );

  const admitted = React.useMemo(
    () => governance.marks.filter((m) => m.standing === "ADMITTED").map((m) => m.element),
    [governance],
  );
  const withheld = React.useMemo(
    () => governance.marks.filter((m) => m.standing === "WITHHELD").map((m) => m.element),
    [governance],
  );
  const ungoverned = React.useMemo(
    () => governance.marks.filter((m) => m.standing === "UNGOVERNED").map((m) => m.element),
    [governance],
  );

  // The "signals WM did not read" sentence moved into SignalProvenanceStrip
  // along with the chips it explains. It is derived from `provenance`, never
  // assumed from the route — the reason is recorded in that file, because the
  // first version of the sentence hard-coded "this route has no broker panel"
  // and became a lie the moment /paper adopted the panel.

  const headlineTone = compilation.degraded ? WARN : GOLD;

  return (
    <section
      aria-label={`Scene ${compilation.scene}. ${compilation.reason}`}
      style={{
        // SCENE_FRAGMENTATION cure (Founder audit 2026-09-13): the
        // full-box border + tint made scene admission read as an
        // "app alert card". The scene state IS a headline read; a
        // left-edge accent carries the same state signal (gold for
        // normal, warn-red for degraded) without walling itself off
        // from the room.
        borderLeft: `3px solid ${compilation.degraded ? "rgba(224,123,92,0.65)" : "rgba(212,175,55,0.55)"}`,
        background: "transparent",
        padding: "10px 14px 10px 18px",
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
            fontSize: 11,
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
              fontSize: 11,
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

      {/* THE §10 REACH, AT A GLANCE.
          Three headings reading "Admitted · 1", "Withheld · 0" and "Not
          governed here · 11" are three facts a reader has to add up. One band
          is the single fact they add up to: eleven twelfths of this screen
          answers to nobody. That is the number this panel's header calls "meant
          to be uncomfortable and to rise", and until now it was a prose clause
          at the foot of the third list.

          One mark per SURFACE_ELEMENT, always all of them — a band drawn only
          over governed elements would be full on every route and would report
          total authority over a screen the OS does not touch. Governed marks
          lead, so the OS's actual reach reads as one run from the left edge and
          can be judged by length without counting.

          aria-hidden: the counts and every element's name are already spoken by
          the headings and chips below. Twelve unlabelled marks announced in
          sequence would be noise, not access. */}
      <div
        data-testid="scene-governance-band"
        data-governed={governance.governed}
        data-total={governance.total}
        aria-hidden="true"
        style={{ display: "flex", gap: 2, marginTop: 10 }}
      >
        {governance.marks.map((mark) => (
          <span
            key={mark.element}
            data-testid="scene-governance-mark"
            data-standing={mark.standing}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              height: 4,
              borderRadius: 1,
              ...STANDING_MARK[mark.standing],
            }}
          />
        ))}
      </div>

      {/* UNCONDITIONAL, and that is the repair.
          This sentence used to live inside `{ungoverned.length > 0 && ...}`, so
          a route that governed every element printed no reach figure at all —
          the one number proving the OS had finally taken the screen vanished
          exactly when it became good news. A meter that hides its best reading
          is not a meter. It prints on every route now, in both directions. */}
      <p
        data-testid="scene-governance-reach"
        style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.5, color: MUTED }}
      >
        The scene governs {governance.governed} of {governance.total} surface
        elements on this route.
      </p>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
            }}
          >
            Admitted · {governance.admitted}
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
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
            }}
          >
            Withheld · {governance.withheld}
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
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 5,
              }}
            >
              Not governed here · {governance.ungoverned}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {ungoverned.map((e) => (
                <Chip key={e} text={ELEMENT_LABEL[e]} tone="ungoverned" />
              ))}
            </div>
            {/* The count moved up to the reach line beside the band, where it
                prints on every route. Repeating it here would be a second
                answer to the same question (§24); what is left is the part the
                number cannot say — WHY these are not refusals. */}
            <p style={{ margin: "7px 0 0", fontSize: 11, lineHeight: 1.5, color: MUTED }}>
              These are compiled but not applied here — the scene has an opinion
              about them and no power over them, so they are not counted as
              refusals.
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

        {/* SIGNAL PROVENANCE — the anti-fabrication disclosure.

            Lifted into SignalProvenanceStrip so the deck can ALSO render it
            outside the proof-chain toggle. This panel is now its first caller,
            not its owner: a second copy of the chip loop would be a second
            ANSWER to "which signals did WM read?", and §24 forbids exactly
            that. See the strip's header for the measurement that forced it. */}
        <SignalProvenanceStrip
          provenance={provenance}
          observedCount={observedCount}
          totalCount={totalCount}
        />
      </div>
    </section>
  );
}

export default SceneAdmissionPanel;
