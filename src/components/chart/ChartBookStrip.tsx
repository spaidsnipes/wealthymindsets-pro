"use client";

/**
 * THE CHART'S POSITION STRIP — the broker's own readback, beside the TRADE door.
 *
 * Founder order §6 (2026-10-09): "order entry cannot be buried." Position and
 * working orders lived only inside the ticket; a trader holding a position saw
 * nothing about it on the chart. This is one row: FLAT / LONG 2 @ … /
 * UNPROTECTED / 1 working / as of …, and a tap opens the ticket.
 *
 * ONE OWNER. It reads `useBrokerBookStrip` — the same shared poll the ticket
 * reads (10 s closed and visible, 3 s while the ticket is open, paused hidden).
 * It names no contract and grades nothing itself.
 *
 * WHO SEES IT. Only the broker's owner (`useBrokerAudience`, the ticket's own
 * gate). A guest, a member without the rail, or a symbol the broker cannot name
 * a contract for: nothing is mounted and nothing is polled.
 *
 * PROOF SCENES. `scene=ticket-fixture` shows the scene's SAMPLE book through
 * the same selector the ticket uses for it, labelled SAMPLE; no broker read.
 * Every other fixture scene mounts nothing.
 *
 * It is a door, not a control: it opens the ticket. It cannot cancel, flatten
 * or send.
 */

import { requestClose } from "@/lib/execution/closeRequest";
import React, { useEffect, useMemo, useState } from "react";

import { traderClock } from "@/components/time/traderClock";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { proofFixtureScene } from "@/lib/chart/proofScene";
import { bookStripDisplay, type BookStripPart } from "@/lib/execution/bookStripDisplay";
import { bookStripFrom, useBrokerBookStrip, useBrokerContract } from "@/lib/execution/brokerReadbackStore";
import { parseTicketFixture, ticketFixtureLines, type TicketFixture } from "@/lib/execution/ticketFixture";

const TONE: Record<BookStripPart["tone"], string> = {
  STATE: "#ede6d3",
  RISK: "#e0806c",
  SAFE: "#9abf72",
  MUTED: "#8a8271",
  WARN: "#e8b923",
};

export function ChartBookStrip({
  symbol, lastPrice, placement, onOpenTicket, ticketOpen = false,
}: {
  readonly symbol: string;
  /** The chart's last price — only the SAMPLE book's reference; never shown. */
  readonly lastPrice: number | null;
  /** BAR = beside the TRADE door (tablet / desktop). ROW = the phone's WAIT / WHY row. CSS shows one. */
  readonly placement: "BAR" | "ROW";
  readonly onOpenTicket: () => void;
  readonly ticketOpen?: boolean;
}): React.ReactElement | null {
  const audience = useBrokerAudience();
  const owner = audience === "OWNER";
  // The URL is read after mount: the server renders no strip.
  const [scene, setScene] = useState<{ fixture: TicketFixture | null; anyFixture: boolean } | null>(null);
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    setScene({ fixture: parseTicketFixture(search), anyFixture: proofFixtureScene(search) !== null });
  }, []);
  const sample = owner && scene?.fixture ? scene.fixture : null;
  // The broker is read only for its owner, and never under a fixture scene.
  const live = useBrokerBookStrip(symbol, owner && scene !== null && !scene.anyFixture);
  const sampleContract = useBrokerContract(symbol, sample !== null);
  const [sampleAt] = useState(() => Date.now());
  const strip = useMemo(() => {
    if (!sample) return live;
    const lines = sampleContract.state === "RESOLVED"
      ? ticketFixtureLines(sample, sampleContract.contract.symbol, lastPrice, null, sampleAt)
      : null;
    return bookStripFrom(sampleContract, lines, ms => traderClock(ms));
  }, [sample, sampleContract, lastPrice, sampleAt, live]);

  if (!owner || scene === null) return null;
  if (!sample && scene.anyFixture) return null;
  const compact = placement === "ROW";
  const display = bookStripDisplay(strip, { compact, sample: sample !== null, clock: ms => traderClock(ms, { seconds: false }) });
  if (!display) return null;

  // CLOSE beside a held position (2026-10-10): opens the ONE ticket and asks it to load FLATTEN — the same
  // closing order, gate and confirmation as the ticket's own Load FLATTEN. It sends nothing.
  // PHONE (Founder ruling 2026-10-10): hidden at ≤767px (globals.css .wm-book-close) — it would sit behind a
  // sideways scroll or push UNPROTECTED off screen. There the strip is the door, and the ticket header carries CLOSE.
  const holding = strip.state === "LONG" || strip.state === "SHORT";
  return (
    <>
    <button
      type="button"
      data-testid="chart-book-strip"
      data-owner-private="position-strip"
      data-placement={placement}
      data-book-state={strip.state}
      data-book-freshness={strip.freshness}
      data-book-sample={sample ? "yes" : undefined}
      className={`wm-book-strip wm-book-strip--${placement.toLowerCase()} wm-tap-slop`}
      onClick={onOpenTicket}
      aria-expanded={ticketOpen}
      aria-label={`${display.spoken} ${ticketOpen ? "The trade ticket is open." : "Opens the trade ticket."}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, minHeight: 30, padding: "0 10px", marginRight: 6,
        borderRadius: 4, border: "1px solid rgba(196,165,116,.42)", background: "rgba(13,12,10,.6)", cursor: "pointer",
        font: "700 11px/1.1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".04em", whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true" data-book-label="yes" style={{ color: "#8a8271", letterSpacing: ".1em" }}>POSITION</span>
      {display.parts.map((part, i) => (
        <span
          key={`${part.text}-${i}`}
          aria-hidden="true"
          data-book-truth={part.truth ? "yes" : undefined}
          data-book-detail={part.detail ? "yes" : undefined}
          style={{ color: TONE[part.tone], flexShrink: 0, fontWeight: part.truth ? 800 : 700 }}
        >
          {part.text}
        </span>
      ))}
    </button>
    {holding ? (
      <button type="button" data-testid="chart-book-close" className="wm-book-strip wm-book-close wm-tap-slop"
        onClick={() => { requestClose(symbol); onOpenTicket(); }}
        aria-label={`Close the ${strip.state.toLowerCase()} position — loads FLATTEN into the trade ticket; you still preview and confirm`}
        style={{ display: "inline-flex", alignItems: "center", minHeight: 30, padding: "0 10px", marginRight: 6, borderRadius: 4, flexShrink: 0,
          border: "1px solid rgba(224,120,107,.6)", background: "transparent", color: "#e0786b", cursor: "pointer",
          font: "800 11px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em" }}>
        CLOSE
      </button>
    ) : null}
    </>
  );
}

export default ChartBookStrip;
