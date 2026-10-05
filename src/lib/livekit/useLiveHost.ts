"use client";

import { useEffect, useState } from "react";

/**
 * Is the signed-in user a WM host? null while asking. Only hosts publish
 * (2026-10-04); /tv and /lounge read the same answer so neither offers a
 * guest "Go Live" that the token server will refuse (garden pass 2026-10-05).
 */
export function useLiveHost(): boolean | null {
  const [host, setHost] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/livekit/host", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { host: false }))
      .then(j => { if (live) setHost(j?.host === true); })
      .catch(() => { if (live) setHost(false); });
    return () => { live = false; };
  }, []);
  return host;
}
