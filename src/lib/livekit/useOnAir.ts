"use client";

import { useEffect, useState } from "react";

/**
 * Publisher counts for the registered rooms — null while asking or when the
 * room host did not answer (then cards say nothing about being live). Polls
 * every 30 s (ATHOS order P0.8).
 */
export function useOnAir(): Record<string, number> | null {
  const [rooms, setRooms] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let live = true;
    const pull = () => fetch("/api/livekit/on-air", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setRooms(j?.state === "OK" ? (j.rooms as Record<string, number>) : null); })
      .catch(() => { if (live) setRooms(null); });
    void pull();
    const t = setInterval(pull, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return rooms;
}
