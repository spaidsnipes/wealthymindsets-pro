"use client";

/**
 * THE SCREEN LOCK (Founder 11-11 11:37: "I need to start shutting the computer all the way down… sign back in").
 * When today's session is locked (target reached, max loss reached, or "I'm done"), every WM Pro screen on this
 * device is covered by Session Complete. The only way through is the one he asked for: sign out, then sign back in
 * (or the next market day, if he chose REST OF DAY). It sends no orders — said on the screen.
 */
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LOCK_REASON_WORDS, LOCK_SENDS_NO_ORDERS, lockStanding, markSignedOut, money } from "@/lib/session/sessionDay";
import { useSessionDay } from "./useSessionDay";
import { GivebackMeter, ToeWhooperCard } from "./SessionVerdict";

const GOLD = "#d4a94a", MUTED = "#9a927f";
/** Signing in, signing out and the legal pages stay reachable under a lock. */
const OPEN_UNDER_LOCK = ["/login", "/signup", "/reset-password", "/auth", "/terms", "/privacy", "/legal"];

export function SessionLockGate() {
  const { user, loading, signOut } = useAuth();
  const { day, update } = useSessionDay();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const standing = day ? lockStanding(day, !!user) : { locked: false, lift: false };

  // Signed back in after signing out from the lock: the lock is done.
  useEffect(() => { if (!loading && standing.lift) update(d => ({ ...d, lock: null })); }, [loading, standing.lift, update]);

  useEffect(() => {
    if (!standing.locked) return;
    document.documentElement.dataset.sessionLock = day?.lock?.reason ?? "LOCKED";
    return () => { delete document.documentElement.dataset.sessionLock; };
  }, [standing.locked, day?.lock?.reason]);

  if (loading || !user || !day || !day.lock || !standing.locked) return null;
  if (OPEN_UNDER_LOCK.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const lost = day.lock.reason === "MAX_LOSS";
  return (
    <div role="dialog" aria-modal="true" aria-label="Session complete" data-testid="session-lock"
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(5,5,6,0.97)", color: "#ede6d3", overflowY: "auto", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "min(640px, 100%)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: "28px 20px", background: "linear-gradient(#0e0d0b,#090908)", textAlign: "center" }}>
        <div style={{ font: "600 11px Inter, system-ui", letterSpacing: ".22em", color: GOLD, textTransform: "uppercase" }}>Session complete</div>
        <div style={{ font: "700 clamp(22px, 5vw, 30px) Georgia, serif", margin: "10px 0 6px" }}>
          {lost ? "Today's fight is over. Walk away — tomorrow is a new one." : "You completed your job. Go live your life."}
        </div>
        <div style={{ color: MUTED, fontSize: 13 }}>{LOCK_REASON_WORDS[day.lock.reason]}{day.netCents != null ? ` Today: ${money(day.netCents)}.` : ""}</div>
        <div style={{ textAlign: "left", margin: "18px 0" }}>
          <div style={{ font: "600 11px Inter, system-ui", letterSpacing: ".22em", color: GOLD, textTransform: "uppercase" }}>Giveback</div>
          <GivebackMeter day={day} />
        </div>
        <ToeWhooperCard day={day} big />
        <button type="button" data-testid="session-lock-signout" disabled={busy}
          onClick={async () => {
            setBusy(true);
            // Marked only AFTER the sign-out lands: marking first would read as "signed out and signed in" for the
            // instant before the session drops, and lift the lock on the spot.
            try { await signOut(); update(d => markSignedOut(d, Date.now())); } finally { router.push("/login"); }
          }}
          style={{ marginTop: 22, width: "100%", minHeight: 48, borderRadius: 8, border: "none", background: GOLD, color: "#120d02", fontWeight: 800, letterSpacing: ".14em", cursor: "pointer" }}>
          {day.lock.mode === "REST_OF_DAY" ? "SIGN OUT — LOCKED UNTIL TOMORROW" : "SIGN OUT — SIGN BACK IN TO UNLOCK"}
        </button>
        <div style={{ color: MUTED, fontSize: 11.5, marginTop: 10 }}>{LOCK_SENDS_NO_ORDERS}</div>
      </div>
    </div>
  );
}
