"use client";
/** Loads the shared WOW dock for signed-in members. Rules and reasons: src/lib/wow/wowDock.ts. */
import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { loadWowDock, shouldLoadWowDock } from "@/lib/wow/wowDock";

export function WowDockLoader() {
  const { user, loading } = useAuth();
  const on = shouldLoadWowDock({ signedIn: !!user, checking: loading });
  useEffect(() => {
    if (on) loadWowDock({ window, document } as never);
    // Signed out in this tab: hide the dock (its frame keeps nothing of WM Pro's).
    const host = document.getElementById("wow-dock-root");
    if (host) host.hidden = !on;
  }, [on]);
  return null;
}
