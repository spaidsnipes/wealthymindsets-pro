"use client";

/**
 * osStandingContext — how a ROOM tells the OS what it knows.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The OS frame has to be the OUTERMOST thing on the page: one masthead, one
 * room rail, one provenance line. But the readings those regions display —
 * evidence debt, right of way, feed observation — are compiled INSIDE the
 * room, by the page that has the data. A frame above cannot reach down, and a
 * room cannot wrap itself in a second frame without recreating the exact
 * "separate shells" defect the OS exists to end.
 *
 * So rooms PUBLISH upward. The frame renders whatever has been published, and
 * — critically — renders honest ignorance when nothing has.
 *
 * THE DEFAULT IS THE WHOLE POINT
 *
 * `UNPUBLISHED` is not a placeholder to be filled in later; it is the correct
 * reading for a room that has not compiled anything. A room that publishes
 * nothing gets FEED UNKNOWN, an UNKNOWN ledger, and an unresolved Right of
 * Way. The chrome is never more confident than the room that fed it.
 *
 * WHICH IS WHY "I HAVE NO FEED" HAD TO BECOME A THING A ROOM SAYS
 *
 * FEED UNKNOWN is right for a room that has not spoken. It is wrong for a room
 * with no feed to speak about — measured live, the Vault wore an open question
 * about a pipeline it does not have. A room declares that case explicitly by
 * publishing `FEEDLESS_SURFACE`, and only then does the masthead go quiet.
 * Inferring it from the default would silence every trading surface for the
 * frames before its first publication.
 *
 * AND IT MUST FORGET
 *
 * Publication is scoped to the room's lifetime. Without the unmount reset, a
 * trader walking from a room with a live feed into a room with none would see
 * the previous room's green LIVE badge over the new room's empty surface —
 * chrome asserting a fact about a page it is no longer describing. That is the
 * same defect as a stale cache, in the one place on screen that claims to be
 * the machine's own self-report.
 */

import * as React from "react";
import type { FeedDeclaration } from "@/lib/os/osChrome";

export interface OsStanding {
  /** Name of the surface, for the masthead. `null` ⇒ the frame says nothing. */
  readonly surface: string | null;
  /** Open evidence items, or `null` when no ledger has been compiled. */
  readonly openEvidenceItems: number | null;
  readonly rightOfWay: string;
  readonly rightOfWayResolved: boolean;
  /**
   * An observation to grade, `FEEDLESS_SURFACE` to declare there is no feed
   * here, or `null` for "not yet spoken". The third is the default below, and
   * it is deliberately NOT the second — see FeedDeclaration.
   */
  readonly feed: FeedDeclaration;
  readonly asOfLabel: string | null;
}

/** What the OS is entitled to say before any room has spoken. */
export const UNPUBLISHED_STANDING: OsStanding = Object.freeze({
  surface: null,
  openEvidenceItems: null,
  rightOfWay: "UNKNOWN",
  rightOfWayResolved: false,
  feed: null,
  asOfLabel: null,
});

/**
 * Fill a room's partial publication out to a complete reading.
 *
 * Pure and exported so the merge semantics are provable without a DOM: the
 * fields a room DID NOT publish must fall back to ignorance, never to the
 * previous room's values and never to a flattering default.
 */
export function mergeStanding(partial: Partial<OsStanding>): OsStanding {
  return { ...UNPUBLISHED_STANDING, ...partial };
}

const StandingValue = React.createContext<OsStanding>(UNPUBLISHED_STANDING);
const StandingPublish = React.createContext<((s: OsStanding) => void) | null>(null);

export function OsStandingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [standing, setStanding] = React.useState<OsStanding>(UNPUBLISHED_STANDING);
  // Stable identity: a new function every render would re-fire every room's
  // publishing effect on every frame, which is both a render loop and a way
  // for a room to clobber a sibling's reading at arbitrary times.
  const publish = React.useCallback((next: OsStanding) => setStanding(next), []);
  return (
    <StandingPublish.Provider value={publish}>
      <StandingValue.Provider value={standing}>{children}</StandingValue.Provider>
    </StandingPublish.Provider>
  );
}

/** What the frame renders. Outside a provider this is honest ignorance. */
export function useOsStanding(): OsStanding {
  return React.useContext(StandingValue);
}

/**
 * Publish this room's compiled readings to the OS chrome.
 *
 * Safe to call outside a provider — it simply does nothing, so a room can be
 * unit-tested or previewed without dragging the whole frame in.
 */
export function usePublishOsStanding(standing: Partial<OsStanding>): void {
  const publish = React.useContext(StandingPublish);
  // Rooms build this object inline from render-scoped values, so its identity
  // changes every render. Comparing by VALUE is what makes the effect fire on
  // a real change and stay quiet otherwise.
  const key = JSON.stringify(standing);

  React.useEffect(() => {
    if (!publish) return;
    publish(mergeStanding(JSON.parse(key) as Partial<OsStanding>));
    // The reset is not tidiness. Without it the chrome keeps asserting the
    // previous room's readings over the next room's content.
    return () => publish(UNPUBLISHED_STANDING);
  }, [publish, key]);
}
