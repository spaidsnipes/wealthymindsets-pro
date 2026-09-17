"use client";

/**
 * usePracticeHonestyLedger — ONE reader of the practice book, for every surface
 * that needs to know what the book was easier about.
 *
 * WHY THIS EXISTS AS A HOOK AND NOT AS PRIVATE STATE INSIDE THE PANEL
 * ------------------------------------------------------------------
 * `PracticeHonestyLayer` owned this read privately. That was correct while the
 * panel was the only surface that needed it. It stopped being correct the
 * moment the ledger had to have a DOOR on the Workspace rail, because a door
 * has to say something truthful about what is behind it BEFORE it is pressed —
 * a verdict, a count — and the only place that knowledge lived was inside the
 * component the door had not opened yet.
 *
 * The alternative was for the ROOM to compile its own opinion of the practice
 * book so it could label the door. That is the second semantic brain the
 * equipment grammar bans by name: two compilations of one subject, free to
 * disagree, with nothing in the codebase that would notice when they did.
 *
 * So the read moves UP and both consumers take it from here. The panel renders
 * it; the room's descriptor describes it. Same object, one author.
 *
 * TRUTH DISCIPLINE — inherited verbatim from the panel that used to own this:
 * · The book is read only AFTER MOUNT. `loadPaperState` touches localStorage,
 *   which the server cannot see; computing it during render is the same React
 *   #418 hydration mechanism already traced five times in this codebase.
 * · `nowMs` is captured once at read time and passed in, never called inside a
 *   render body, for the same reason.
 * · `null` means NOT READ YET (server render + first client paint). It is a
 *   different fact from an empty ledger, which means "read, and the book had
 *   nothing to disclose". Collapsing the two would make a surface claim the
 *   trader practised honestly before it had looked.
 * · An unreadable book stays `null` rather than degrading to an empty ledger,
 *   because "I could not read it" is not the same claim as "it was clean".
 */

import * as React from "react";
import { loadPaperState, subscribePaperState } from "@/lib/paperTrade";
import {
  selectPracticeHonestyLedger,
  type PracticeHonestyLedger,
} from "@/lib/practiceHonestyLedger";

export function usePracticeHonestyLedger(): PracticeHonestyLedger | null {
  const [ledger, setLedger] = React.useState<PracticeHonestyLedger | null>(null);

  React.useEffect(() => {
    const read = () => {
      try {
        const state = loadPaperState();
        setLedger(
          selectPracticeHonestyLedger(
            { orders: state.orders, positions: state.positions },
            Date.now(),
          ),
        );
      } catch {
        setLedger(null);
      }
    };
    read();
    // The book can be written from another tab or from the chart's order path.
    // Re-reading on that signal keeps every consumer from showing a stale
    // receipt — and keeps the door's label in step with what is behind it.
    return subscribePaperState(read);
  }, []);

  return ledger;
}

/**
 * Does this ledger have anything to disclose? The emptiness test was stated
 * inline in the panel's early return and is now needed in two places, so it
 * gets a name rather than a second copy that can drift from the first.
 *
 * It is a TYPE GUARD rather than a plain boolean on purpose. A `boolean` helper
 * would be honest and unusable: the panel would still have to restate the whole
 * condition inline to convince the compiler the ledger is non-null, and that
 * restatement is exactly the second copy this function exists to prevent. The
 * guard lets the one author of the condition also be the one that narrows.
 */
export function practiceHonestyHasDisclosure(
  ledger: PracticeHonestyLedger | null,
): ledger is PracticeHonestyLedger {
  return ledger != null && ledger.caption != null && ledger.easements.length > 0;
}

/** The same question the other way up, for callers that read better in the negative. */
export function practiceHonestyIsSilent(
  ledger: PracticeHonestyLedger | null,
): boolean {
  return !practiceHonestyHasDisclosure(ledger);
}

export default usePracticeHonestyLedger;
