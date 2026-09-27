"use client";
/**
 * THE DECK'S ONE BROKER READER (five-hour order, 2026-09-27: "COMMAND DECK …
 * binds … broker, orders, position"). Reads the OWNER's Webull book — the
 * owner-gated status and positions routes — when the deck mounts, then every
 * minute. It opens no market wire: no socket, no quote, no bar. The surface
 * imports this and never fetches itself (commandDeckOneOrganism.sentinel).
 */
import * as React from "react";
import type { WebullPositionsRead, WebullStatusRead } from "./brokerBookRows";

/** The deck reads the owner's Webull book when it mounts, then every minute (brokerBookRows.ts). */
export function useWebullBook(): { status: WebullStatusRead | null; positions: WebullPositionsRead | null } {
  const [status, setStatus] = React.useState<WebullStatusRead | null>(null);
  const [positions, setPositions] = React.useState<WebullPositionsRead | null>(null);
  React.useEffect(() => {
    let alive = true;
    const read = async (url: string) => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        return { httpStatus: r.status, body: await r.json().catch(() => null) };
      } catch { return null; }
    };
    const load = async () => {
      const [s, p] = await Promise.all([read("/api/broker/webull/status"), read("/api/broker/webull/positions")]);
      if (!alive) return;
      if (s) setStatus(s);
      if (p) setPositions(p);
    };
    void load();
    const t = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  return { status, positions };
}

