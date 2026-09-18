"use client";

/**
 * DecisionReceiptPanel — compact renderer for selectDecisionReceipt (canon P8
 * "Decision Receipt").
 *
 * Projects a sealed DecisionMemoryRecord into the trader-facing receipt: the
 * verbatim commitment, the verifiable process facts, the append-only
 * management trail, the attached outcome, and — only if the trader recorded
 * one — their own Decision-Quality Split. It renders NO composite grade of its
 * own (respecting the "score addiction" weakness); a disciplined WAIT / NO_TRADE
 * reads as a complete decision, never a debt. Pure display — never invents.
 */

import * as React from "react";
import {
  RECEIPT_STAGE_ORDER,
  receiptStageIndex,
} from "@/lib/traderMemory/viewModels/selectDecisionReceipt";
import { DECISION_QUALITY_MAX } from "@/lib/traderMemory/decisionMemory";
import type {
  DecisionReceiptVM,
  ReceiptTone,
  ReceiptFact,
} from "@/lib/traderMemory/viewModels/selectDecisionReceipt";

export interface DecisionReceiptPanelProps {
  readonly vm: DecisionReceiptVM;
}

/**
 * §9 — "No green shield. No green means safe."
 *
 * `affirm` used to render in sage #9db88a under the comment "green — process
 * honored", which is the violation stated out loud: a colour whose entire job
 * is to mean A CONDITION WAS MET. It sat two lines from `flag`, so the receipt
 * — the surface whose whole purpose is to separate PROCESS from OUTCOME — read
 * as a traffic light.
 *
 * Ivory is the house colour for a FINDING, and a process fact the trader
 * honored is a finding. It stays distinct from `neutral` parchment by being
 * brighter, which is the §9 instruction: distinguish by how much light the
 * house pays, not by hue.
 */
const TONE_COLOR: Record<ReceiptTone, string> = {
  affirm: "#ede6d3", // ivory — a finding: this is what the record shows
  neutral: "#c2b892", // parchment — informational
  flag: "#e07b5c", // warm — needs attention
};

/**
 * The lifecycle, not a ranking. REVIEWED was the same sage green, which turned
 * the last stage of a receipt into a passing mark — and a receipt that can be
 * PASSED is a score, which §15 forbids this panel from keeping.
 *
 * REVIEWED takes ivory for the same reason `affirm` does: the trader came back
 * and recorded what happened, and recorded knowledge is what ivory is for. It
 * says the record is complete. It does not say the trade was good.
 */
const STAGE_COLOR: Record<string, string> = {
  SEALED: "#c9a55c",
  MANAGED: "#d4af37",
  CLOSED: "#c2b892",
  REVIEWED: "#ede6d3",
};

const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

const SPLIT_LABEL: Record<string, string> = {
  marketOpportunityQuality: "Opportunity",
  playbookMatch: "Playbook",
  riskQuality: "Risk",
  executionQuality: "Execution",
  processAdherence: "Process",
};

function fmtTime(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch {
    return String(ms);
  }
}

/**
 * THE STAGE IS A POSITION IN A SEQUENCE, SO IT IS DRAWN AS ONE.
 *
 * `vm.stage` was rendered as a lone uppercase word in one of four golds that
 * sit inside eight percent of each other's luminance. SEALED → MANAGED →
 * CLOSED → REVIEWED is a strict cascade — each stage requires everything the
 * previous one required plus one more thing attached — and none of that order
 * survived into the pixels. A trader reading MANAGED could not see that two
 * more things are still outstanding without knowing the cascade by heart.
 *
 * THE WORD STAYS. The track is `aria-hidden` decoration beside it, because a
 * position encoded only as "how many boxes are filled" is unreadable to a
 * screen reader.
 *
 * ── THE PART THAT IS NOT DECORATION ──────────────────────────────────────
 *
 * A four-step track with one step filled says "three things are outstanding".
 * For a disciplined WAIT or NO_TRADE that is a FABRICATED DEBT: the selector
 * is explicit that a non-trade is complete — it writes "No position by design"
 * into `pending` rather than flagging a missing outcome. A naive progress bar
 * would have drawn, directly above that sentence, a picture calling the same
 * decision 25% done.
 *
 * So the unreached steps are drawn in two different ways. MANAGED and CLOSED
 * on a non-trade are OUTLINED — the shape is held so the sequence keeps its
 * length, but nothing is owed there. Everything else genuinely outstanding is
 * dimmed. REVIEWED is never outlined: a trader can and should review a WAIT.
 */
function StageTrack({
  stage,
  isNonTrade,
}: {
  stage: DecisionReceiptVM["stage"];
  isNonTrade: boolean;
}): React.ReactElement | null {
  const index = receiptStageIndex(stage);
  // An unrecognised stage draws nothing rather than drawing an empty track:
  // "no stage" and "the earliest stage" must not look identical.
  if (index < 0) return null;
  return (
    <span
      aria-hidden="true"
      data-testid="receipt-stage-track"
      data-stage-index={index}
      style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
    >
      {RECEIPT_STAGE_ORDER.map((s, i) => {
        const reached = i <= index;
        const notOwed = !reached && isNonTrade && (s === "MANAGED" || s === "CLOSED");
        const state = reached ? "reached" : notOwed ? "not-owed" : "awaited";
        return (
          <span
            key={s}
            data-stage={s}
            data-step-state={state}
            style={{
              width: 12,
              height: 3,
              borderRadius: 2,
              background: reached
                ? (STAGE_COLOR[s] ?? MUTED)
                : notOwed
                  ? "transparent"
                  : "rgba(139,106,41,0.22)",
              boxShadow: notOwed ? `inset 0 0 0 1px ${HAIR}` : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * THE SPLIT EXISTS TO SHOW A SHAPE, AND IT WAS PRINTED AS FIVE FRACTIONS.
 *
 * The Decision-Quality Split is deliberately five separate axes rather than
 * one composite score — the whole point is seeing WHICH axis was weak when the
 * others held. Rendered as `Opportunity 4/5  Playbook 2/5  Risk 5/5 …` at 11px
 * that comparison is five reading tasks and a mental sort, and `4/5` differs
 * from `2/5` by a single glyph.
 *
 * Rungs put the five axes on one visual scale so the low one is found without
 * reading. The fraction stays beside it — this is an addition. And the
 * denominator is imported rather than typed as `5`, because a drawn rating
 * needs a scale and a hardcoded one here would be a second author for a number
 * `decisionMemory` already owns.
 */
function SplitRungs({ value }: { value: number }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      data-testid="receipt-split-rungs"
      data-score={value}
      style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 8 }}
    >
      {Array.from({ length: DECISION_QUALITY_MAX }, (_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 3 + i * 1.25,
            borderRadius: 0.5,
            background: i < value ? "#d4af37" : "rgba(139,106,41,0.18)",
          }}
        />
      ))}
    </span>
  );
}

function FactRow({ fact }: { fact: ReceiptFact }): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 11, letterSpacing: 0.4, color: MUTED, minWidth: 108, textTransform: "uppercase" }}>
        {fact.label}
      </span>
      <span style={{ fontSize: 11, color: TONE_COLOR[fact.tone], lineHeight: 1.4 }}>{fact.value}</span>
    </div>
  );
}

export function DecisionReceiptPanel({ vm }: DecisionReceiptPanelProps): React.ReactElement {
  const stageColor = STAGE_COLOR[vm.stage] ?? MUTED;

  return (
    <section
      aria-label="Decision receipt"
      style={{
        // SCENE_FRAGMENTATION cure: the receipt panel is REVIEW-mode
        // material — an aspect of the same decision the deck is
        // reading, not a separate application. Hairline continues the
        // room; the full box made it read as "receipt app".
        borderTop: `1px solid ${HAIR}`,
        padding: "12px 0 4px",
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Decision Receipt
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            letterSpacing: 0.5,
            color: stageColor,
            marginLeft: "auto",
            textTransform: "uppercase",
          }}
        >
          <StageTrack stage={vm.stage} isNonTrade={vm.isNonTrade} />
          {vm.stage}
        </span>
      </div>

      {/**
        * THE RECEIPT NAMES ITS OWN DECISION.
        *
        * `selectDecisionReceipt` has always compiled `decisionId`, and this
        * panel rendered every other field but that one. A receipt is the
        * artefact the trader carries to their journal and to their own review;
        * one that does not say WHICH decision it receipts cannot be checked
        * against anything. Two receipts for two different decisions were
        * previously distinguishable only by their contents.
        *
        * Wrapping, never ellipsised — the same law the decision spine band was
        * fixed under. A partial id is a filled absence wearing an ellipsis:
        * two decisions sharing a prefix render identically.
        *
        * Null is disclosed rather than hidden. An empty receipt has no id
        * because nothing was sealed, and that is a fact, not a blank.
        */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED }}>DECISION </span>
        {vm.decisionId ? (
          <code
            data-testid="receipt-decision-id"
            style={{
              fontSize: 11,
              color: "#c9a55c",
              fontWeight: 700,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {vm.decisionId}
          </code>
        ) : (
          <span data-testid="receipt-decision-absent" style={{ fontSize: 11, color: MUTED }}>
            NONE SEALED
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4, marginBottom: vm.empty ? 0 : 10 }}>
        {vm.headline}
      </div>

      {vm.empty ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vm.thesis && (
            <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>
              &ldquo;{vm.thesis}&rdquo;
            </div>
          )}

          {vm.commitment.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>COMMITMENT</div>
              {vm.commitment.map((f, i) => (
                <FactRow key={i} fact={f} />
              ))}
            </div>
          )}

          {vm.processFacts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>PROCESS</div>
              {vm.processFacts.map((f, i) => (
                <FactRow key={i} fact={f} />
              ))}
            </div>
          )}

          {vm.managementTrail.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>MANAGEMENT TRAIL</div>
              {vm.managementTrail.map((m, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>
                  <span style={{ color: "#c9a55c" }}>{m.type}</span>
                  {" — "}
                  {m.detail}
                  <span style={{ color: MUTED }}>{"  @ "}{fmtTime(m.at)}</span>
                </div>
              ))}
            </div>
          )}

          {vm.outcome && (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", borderTop: `1px solid ${HAIR}`, paddingTop: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, textTransform: "uppercase" }}>Outcome</span>
              {/*
                THE R DOES NOT CHANGE COLOUR WITH ITS SIGN.

                It used to: green above zero, warm below. That is the subtlest
                of this file's three §9 breaches and the most damaging, because
                this panel's own docblock says it renders no grade — and then
                painted the one number a trader is already primed to worship in
                the two colours of a win and a loss.

                A loss taken BY RULE is the receipt working. A win taken
                discretionarily is a rule that was broken and got away with it.
                Colouring by sign puts the house's light on the outcome and
                leaves the discipline — the fact printed immediately to the
                right, and the only one here the house actually judges — in
                muted grey. The sign is already in the glyph; it does not need
                a second, louder channel saying the same thing with a verdict
                attached.

                `> 0` rather than `>= 0`: a scratch is not a gain, and "+0R"
                swept the flat case into the favourable bucket for free.
              */}
              <span style={{ fontSize: 12, color: "#ede6d3" }}>
                {vm.outcome.realizedR > 0 ? "+" : ""}
                {vm.outcome.realizedR}R
              </span>
              <span style={{ fontSize: 11, letterSpacing: 0.4, color: MUTED, textTransform: "uppercase" }}>
                {vm.outcome.reason} · {vm.outcome.exitDiscipline === "BY_RULE" ? "by rule" : "discretionary"}
              </span>
            </div>
          )}

          {vm.qualitySplit && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>
                DECISION-QUALITY SPLIT · trader-declared
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(Object.keys(SPLIT_LABEL) as (keyof typeof SPLIT_LABEL)[]).map((k) => {
                  const score = (vm.qualitySplit as unknown as Record<string, number>)[k];
                  return (
                    <span
                      key={k}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#c2b892" }}
                    >
                      {SPLIT_LABEL[k]}
                      <SplitRungs value={score} />
                      <span style={{ color: "#d4af37" }}>
                        {score}/{DECISION_QUALITY_MAX}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {vm.lessons.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>LESSONS</div>
              {vm.lessons.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>{l}</div>
              ))}
            </div>
          )}

          {vm.pending.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, borderTop: `1px solid ${HAIR}`, paddingTop: 8 }}>
              {vm.pending.map((p, i) => (
                <div key={i} style={{ fontSize: 11, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>{p}</div>
              ))}
            </div>
          )}

          {vm.amendmentCount > 0 && (
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 0.3 }}>
              {vm.amendmentCount} amendment{vm.amendmentCount === 1 ? "" : "s"} · history preserved
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default DecisionReceiptPanel;
