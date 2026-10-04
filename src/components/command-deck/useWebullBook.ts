"use client";
/**
 * THE DECK'S ONE BROKER READER (five-hour order, 2026-09-27: "COMMAND DECK …
 * binds … broker, orders, position"). Reads the OWNER's Webull book — the
 * owner-gated status and positions routes — when the deck mounts, then every
 * minute. It opens no market wire: no socket, no quote, no bar. The surface
 * imports this and never fetches itself (commandDeckOneOrganism.sentinel).
 */
import * as React from "react";
import { isOwnerRefusal } from "@/lib/broker/ownerRefusal";
import type { WebullBalanceRead, WebullPositionsRead, WebullStatusRead } from "./brokerBookRows";

/** The deck reads the owner's Webull book when it mounts, then every minute (brokerBookRows.ts). */
export function useWebullBook(): { status: WebullStatusRead | null; positions: WebullPositionsRead | null; balance: WebullBalanceRead | null } {
  const [status, setStatus] = React.useState<WebullStatusRead | null>(null);
  const [positions, setPositions] = React.useState<WebullPositionsRead | null>(null);
  const [balance, setBalance] = React.useState<WebullBalanceRead | null>(null);
  React.useEffect(() => {
    let alive = true;
    let t: number | undefined;
    const read = async (url: string) => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        return { httpStatus: r.status, body: await r.json().catch(() => null) };
      } catch { return null; }
    };
    const load = async () => {
      // In sequence, never together: both routes open with Webull's account
      // list, and two at once were answered 429 (serving 2026-09-27).
      const s = await read("/api/broker/webull/status");
      if (!alive) return;
      if (s) setStatus(s);
      // guest audit 2026-10-04: the owner gate refused — this user has no broker
      // here. The other reads would be refused the same way; stop polling.
      if (s && isOwnerRefusal(s.body, s.httpStatus)) {
        setPositions(s);
        setBalance(s);
        window.clearInterval(t);
        return;
      }
      await new Promise((r) => window.setTimeout(r, 2_000));
      if (!alive) return;
      const p = await read("/api/broker/webull/positions");
      if (!alive) return;
      if (p) setPositions(p);
      await new Promise((r) => window.setTimeout(r, 2_000));
      if (!alive) return;
      const bal = await read("/api/broker/webull/balance");
      if (!alive) return;
      if (bal) setBalance(bal);
    };
    void load();
    t = window.setInterval(load, 120_000); // Webull rate-limits the positions read (serving 2026-09-27): every two minutes.
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  return { status, positions, balance };
}

