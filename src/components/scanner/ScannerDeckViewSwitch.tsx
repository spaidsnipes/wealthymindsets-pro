"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WM } from "@/lib/design/wmTokens";
import { SCANNER_DECK_VIEWS } from "@/lib/routing/opportunityMap";

/**
 * The Scanner Deck's two views — Signals and Opportunity Map — as ONE switch
 * inside ONE room. It is the only door to the map: the map is not in the
 * Rooms door, the rail or the House door, because it is not a room
 * (see `@/lib/routing/opportunityMap` for the authority).
 */
export function ScannerDeckViewSwitch() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Scanner Deck views" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {SCANNER_DECK_VIEWS.map((view) => {
        const current = pathname === view.href;
        return (
          <Link
            key={view.href}
            href={view.href}
            aria-current={current ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "0 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              whiteSpace: "nowrap",
              textDecoration: "none",
              border: current ? `1px solid ${WM.gold.mark}` : "1px solid transparent",
              color: current ? WM.text.hero : WM.text.muted,
            }}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
