"use client";

/**
 * `scene=verify` — the VERIFICATION banner (coordinator order 2026-10-09).
 *
 * One fixed line on every room, for a signed-in trader, while the page load is
 * a verification load: real data, real reads, nothing saved. It is the ONLY
 * visible difference the token makes. Mounted once in the root layout, outside
 * every room's own shell; it takes no layout space and no pointer.
 */
import React, { useEffect, useState } from "react";
import { PROOF_VERIFY_BANNER, proofVerifyOpen } from "@/lib/chart/proofScene";
import { useAuth } from "@/contexts/AuthContext";

export function VerifySceneBanner(): React.ReactElement | null {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // Read after mount (the address is a browser fact); latched by the owner.
  useEffect(() => { setOpen(proofVerifyOpen()); }, []);
  if (!open || !user) return null;
  return (
    <div role="status" data-testid="verify-scene-banner" data-proof-scene="verify"
      style={{
        position: "fixed", left: "50%", bottom: 6, transform: "translateX(-50%)", zIndex: 2147483000, pointerEvents: "none",
        maxWidth: "calc(100vw - 24px)", padding: "4px 10px", borderRadius: 8, border: "1px solid #d4af37",
        background: "rgba(11,10,8,0.92)", color: "#d4af37", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textAlign: "center",
      }}>
      {PROOF_VERIFY_BANNER}
    </div>
  );
}
