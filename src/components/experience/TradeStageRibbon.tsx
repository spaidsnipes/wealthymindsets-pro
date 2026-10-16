"use client";

/**
 * PLATE 34 · THE WAIT CARD COMES ALIVE — the six stages under the rail's plaque.
 * Wait · Watch · Ready · In trade · Manage · Review: the current one lit in gold with its one sentence.
 * The stage comes from selectTradeStage; the position is the broker's own readback (the same hook the
 * chart's position strip reads), read only for its owner and never under a fixture scene.
 */
import React, { useEffect, useState } from "react";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { useBrokerBookStrip } from "@/lib/execution/brokerReadbackStore";
import { proofFixtureScene } from "@/lib/chart/proofScene";
import { selectCardStage, CARD_STAGES, CARD_STAGE_LABEL, journalClosedToday, type CardStageInput } from "@/lib/experience/decisionLifecycle";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalBook } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import { marketDayKey } from "@/lib/journal/localDayKey";

export function TradeStageRibbon({ symbol, verdict, reason, nearZone, plan = null, fmtPrice }: {
  readonly symbol: string;
  readonly plan?: CardStageInput["plan"];
  readonly fmtPrice?: (p: number) => string;
  readonly verdict: string | null;
  readonly reason: string | null;
  readonly nearZone: CardStageInput["nearZone"];
}): React.ReactElement {
  const owner = useBrokerAudience() === "OWNER";
  const [fixture, setFixture] = useState(true);
  useEffect(() => { setFixture(proofFixtureScene(typeof window !== "undefined" ? window.location.search : "") !== null); }, []);
  const strip = useBrokerBookStrip(symbol, owner && !fixture);
  const book = owner && !fixture && (strip.state === "FLAT" || strip.state === "LONG" || strip.state === "SHORT")
    ? { state: strip.state, quantity: strip.quantity, averagePrice: strip.averagePrice, protection: strip.protection, working: strip.working }
    : null;
  // The journal moves the stage too (Founder 2026-10-16): today's closed trade on this market → REVIEW. The
  // broker's live book still outranks it (a position on is IN TRADE / MANAGE). Never under a fixture scene.
  // Any signed-in MEMBER's own journal, not only the broker owner's ("if somebody does enter inside of their
  // journal" — a member with no broker wired logs trades too).
  const { user } = useAuth();
  const member = !fixture ? user?.id ?? null : null;
  const journal = useJournalBook(member);
  const closedToday = member ? journalClosedToday(journal.entries, symbol, marketDayKey()) : null;
  const vm = selectCardStage({ verdict, reason, book, nearZone, closedToday, plan: fixture ? null : plan, fmtPrice });
  const at = CARD_STAGES.indexOf(vm.stage);
  return (
    <div data-testid="trade-stage" data-stage={vm.stage} role="group" aria-label={`Stage: ${CARD_STAGE_LABEL[vm.stage]}. ${vm.sentence}`}
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 2px 2px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      {/* 3 × 2, not one row (serving cb57e0a, 1440 rail: six 13px stage names ran 12px past the card and
          clipped the sentence to "rice is 28 points…"). */}
      <ol aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 3, margin: 0, padding: 0, listStyle: "none" }}>
        {CARD_STAGES.map((s, i) => (
          <li key={s} data-stage-step={s} style={{
            minWidth: 0, textAlign: "center", padding: "4px 0", borderRadius: 5,
            font: `${i === at ? 700 : 500} 13px/1.1 Georgia, 'Times New Roman', serif`,
            color: i === at ? "#F3D78A" : i < at ? "#a99f86" : "#6f6a5c",
            border: `1px solid ${i === at ? "rgba(232,198,104,0.9)" : "rgba(196,165,116,0.18)"}`,
            background: i === at ? "rgba(232,198,104,0.10)" : "transparent",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "clip",
          }}>{CARD_STAGE_LABEL[s]}</li>
        ))}
      </ol>
      <span data-testid="trade-stage-sentence" style={{ font: "500 14px/1.35 ui-sans-serif, system-ui, sans-serif", color: "#EDE6D3", textAlign: "center", whiteSpace: "normal", overflowWrap: "anywhere" }}>
        {vm.sentence}
      </span>
    </div>
  );
}
