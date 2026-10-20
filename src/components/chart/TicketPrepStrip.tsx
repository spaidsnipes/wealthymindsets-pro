"use client";

/**
 * THE MORNING PLAY AT THE ORDER CONTROLS (Founder brief 2026-10-20: "put the morning checklist and emergency trigger
 * play where you will actually encounter them before opening the order controls"). One line at the top of the ticket:
 * today's market-data check as the trader marked it, and their anchor phrase — a tap opens the Command Center.
 * It decides nothing: a FAILED check is enforced by the order route (dataCheckRefusal), not by this strip.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";

export function TicketPrepStrip() {
  const [read, setRead] = useState<{ health: "PASS" | "FAIL" | null; anchor: string } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/morning-prep/protocol", { credentials: "include", cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(b => { if (alive && b?.protocol) setRead({ health: b.day?.health ?? null, anchor: String(b.protocol.anchor ?? "") }); })
      .catch(() => { /* no strip when it cannot be read */ });
    return () => { alive = false; };
  }, []);
  if (!read) return null;
  const failed = read.health === "FAIL";
  const word = failed ? "DATA CHECK FAILED — no new position" : read.health === "PASS" ? "Data check passed today" : "Data check not done today";
  return (
    <Link href="/morning-prep" prefetch={false} data-testid="trade-prep-strip" data-health={read.health ?? "NONE"}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 10px", minHeight: 44, padding: "6px 12px", textDecoration: "none",
        font: "600 13px/1.35 ui-sans-serif, system-ui, sans-serif", color: failed ? "#F3EBDD" : "#ede6d3",
        background: failed ? "rgba(122,42,34,.35)" : "rgba(212,175,55,0.06)", borderBottom: `1px solid ${failed ? "rgba(239,83,80,.5)" : "rgba(212,175,55,0.25)"}` }}>
      <span style={{ color: failed ? "#ff8a80" : read.health === "PASS" ? "#7fd7a8" : "#d4af37" }}>{word}</span>
      {read.anchor ? <span style={{ color: "#d4af37", fontWeight: 700 }}>{read.anchor}</span> : null}
      <span style={{ color: "#a69d89" }}>Command Center →</span>
    </Link>
  );
}
