"use client";

import * as React from "react";
import Link from "next/link";

import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";
import { WM_DESTINATIONS } from "@/lib/routing/wmDestinations";

/*
  THE ROOM SAYS THE WORD ITS DOOR SAYS.

  The M3 quarantine (Founder 2026-09-19: "as soon as /charts is legal HOME,
  Command Deck loses normal-route authority → explicit legacy/debug
  quarantine") was shipped onto the DOORS — three rail/drawer chips reading
  LEGACY, each gated on `authority === "legacy"` from the destination owner.

  Live observation of the serving build on 2026-09-19 found the gap that a
  door-only disclosure always has: /command-deck itself carries NO statement
  that it lost normal-route authority. A trader arriving by bookmark, by typed
  URL, by a stale link in a note, or from a Slack message never passes a door.
  They see a complete-looking workspace and are told nothing. The disclosure
  was attached to the hallway, and the hallway is the one part of the journey
  a deep link skips.

  A QUARANTINE THAT IS ONLY VISIBLE FROM OUTSIDE IS NOT A QUARANTINE.

  ── SINGLE OWNER ────────────────────────────────────────────────────────────

  This component reads `WM_DESTINATIONS` by href and renders nothing unless the
  registry itself says `authority === "legacy"`. It does NOT keep a local list
  of quarantined routes, and it must never grow one: a second list is a second
  owner, and the two would disagree the first time an order moves a room in or
  out of quarantine. The door chips and this plate are two READERS of one fact.

  It follows that dropping this component into a room with normal authority is
  harmless — it renders null. That is deliberate. The safe direction for a
  disclosure primitive is to under-claim when it is unsure, never to manufacture
  a quarantine out of a prop somebody passed by hand.

  ── WHY IT IS CALM ──────────────────────────────────────────────────────────

  No amber, no pulse, no modal, no dismissal. §9 is explicit that a state which
  means WAIT does not pulse, and this is weaker than WAIT — the room works, the
  capability is preserved, every organ is reachable. The trader is not being
  interrupted; they are being told where they are. An alarm here would train
  them to dismiss the honest signals too.

  It is not dismissible for the same reason it is not an alarm: a dismissed
  disclosure is a disclosure that exists only for the first visit, and the
  bookmark visit IS the repeat visit.
*/

export interface RoomAuthorityNoticeProps {
  /**
   * The route this notice is standing inside. Matched against the registry —
   * an href with no registry entry renders nothing, because a room the
   * destination owner has never heard of is not a room this component can make
   * a truthful statement about.
   */
  readonly href: string;
}

export function RoomAuthorityNotice({ href }: RoomAuthorityNoticeProps): React.ReactElement | null {
  const destination = WM_DESTINATIONS.find((d) => d.href === href);
  if (!destination) return null;
  if (destination.authority !== "legacy") return null;

  const home = WM_DESTINATIONS.find((d) => d.href === FOUNDER_LANDING_ROUTE);

  return (
    <div
      data-testid="room-legacy-notice"
      data-room-authority="legacy"
      role="note"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        border: "1px solid rgba(111,116,144,0.30)",
        borderRadius: 6,
        background: "rgba(17,19,28,0.55)",
        margin: "0 0 12px",
      }}
    >
      <span
        data-testid="room-legacy-notice-word"
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "#6F7490",
          border: "1px solid rgba(111,116,144,0.45)",
          borderRadius: 3,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        LEGACY
      </span>
      <span
        style={{
          fontSize: 11,
          lineHeight: 1.45,
          color: "#8B8FA8",
          letterSpacing: "0.01em",
          minWidth: 0,
        }}
      >
        {/* Says what was lost, and does NOT say the room is broken — because it
            is not. Overstating a quarantine as a fault would be its own lie. */}
        {destination.label} is kept for legacy and debug use. It is no longer part
        of the normal trading loop, and nothing here is maintained as a primary
        surface. Capability is preserved — every organ in this room still works.
      </span>
      {home ? (
        <Link
          href={home.href}
          data-testid="room-legacy-notice-home"
          style={{
            fontSize: 10,
            letterSpacing: "0.10em",
            color: "#C4A574",
            textDecoration: "none",
            border: "1px solid rgba(196,165,116,0.35)",
            borderRadius: 4,
            // 44px is the founder-canon touch target; the row is short, so the
            // height comes from padding rather than a fixed box that would
            // stretch the plate on a phone.
            padding: "10px 12px",
            minHeight: 40,
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* The word HOME is the claim founderLanding.ts owns, so the label
              names the destination rather than asserting a second landing. */}
          GO TO {home.label.toUpperCase()}
        </Link>
      ) : null}
    </div>
  );
}
