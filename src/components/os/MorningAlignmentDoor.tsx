"use client";

/**
 * MORNING ALIGNMENT, FOUND FROM THE MARKET RAIL (Founder brief 2026-10-20: "easy to find immediately after opening
 * the app"). One quiet doorway after ROOMS · COMMUNITY while today's market-data check is not passed: how far the
 * routine is, and a tap opens Morning Prep. Once the check is passed it steps aside so the trading glass stays clean.
 * Reads the trader's own record; decides nothing.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { DAY_STEPS } from "@/lib/morningProtocol/protocol";

export function MorningAlignmentDoor() {
  const [read, setRead] = useState<{ done: number; health: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/morning-prep/protocol", { credentials: "include", cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(b => { if (alive && b?.day) setRead({ done: Array.isArray(b.day.done) ? b.day.done.length : 0, health: b.day.health ?? null }); })
      .catch(() => { /* no door when it cannot be read */ });
    return () => { alive = false; };
  }, []);
  if (!read || read.health === "PASS") return null;
  const failed = read.health === "FAIL";
  return (
    <Link href="/morning-prep" prefetch={false} data-testid="os-morning-alignment" data-health={read.health ?? "NONE"}
      className="hidden sm:inline-flex"
      title="Morning alignment — your routine, the data check, the plan and the trigger play"
      style={{ alignItems: "center", minHeight: 32, padding: "6px 9px", borderRadius: 3, textDecoration: "none", border: `1px solid ${failed ? "rgba(239,83,80,.6)" : "rgba(212,175,55,0.45)"}`,
        color: failed ? "#ff8a80" : "#d4af37", fontSize: 13, fontWeight: 700, letterSpacing: 0.6, whiteSpace: "nowrap" }}>
      {failed ? "DATA CHECK FAILED ›" : `MORNING ${read.done}/${DAY_STEPS.length} ›`}
    </Link>
  );
}
