"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import { loadPaperState, subscribePaperState } from "@/lib/paperTrade";
import {
  selectPracticeHonestyLedger,
  type PracticeHonestyLedger,
} from "@/lib/practiceHonestyLedger";

/**
 * PracticeHonestyLayer — the REVIEW contextual layer of the decision room.
 *
 * WHY IT IS HERE AND NOT ON /paper
 * --------------------------------
 * Five modules already measure the ways the practice book was easier than a
 * real venue. Until this component, every one of those truths was visible
 * ONLY inside the legacy /paper page's tab chrome — which is precisely the
 * SCENE_FRAGMENTATION the current visual repair law names: truth living in a
 * mini-app instead of in the one room. The Visual Implementation Pack's
 * coverage matrix lists REVIEW / RECEIPT as an outright GAP. This is the room
 * consuming truth it already owned.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not a second /paper. There is no book here, no order list, no ticket,
 * no action. It renders SENTENCES a compiler produced and nothing else, and it
 * is a contextual DRAWER rather than permanent primary pixels, because the
 * repair law reserves the room's primary surface for MARKET and sends
 * secondary machinery to drawers.
 *
 * TRUTH DISCIPLINE
 * ----------------
 * · Reads the book only AFTER MOUNT. `loadPaperState` touches localStorage,
 *   which the server cannot see; computing this during render would be the
 *   same React #418 hydration mechanism already traced five times in this
 *   codebase.
 * · `nowMs` is captured once at read time and passed in, never called inside a
 *   render body, for the same reason.
 * · Renders NOTHING when the ledger is empty. A trader who has not practised
 *   is owed silence, not a disclosure about fills that never happened.
 */
export function PracticeHonestyLayer() {
  // null = "not read yet" (server render + first client paint). Distinct from
  // an empty ledger, which means "read, and the book had nothing to disclose".
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
        // An unreadable book is not a claim that the book was honest. Stay
        // null — the layer renders nothing — rather than rendering an empty
        // ledger, which would read as "nothing to disclose".
        setLedger(null);
      }
    };
    read();
    // The book can be written from another tab or from the chart's order path.
    // Re-reading on that signal keeps the room from showing a stale receipt.
    return subscribePaperState(read);
  }, []);

  if (ledger == null || ledger.caption == null || ledger.easements.length === 0) {
    return null;
  }

  return (
    <details data-testid="practice-honesty-layer" style={{ marginTop: WM.space.sm }}>
      <summary
        style={{
          // 44px is the tap-target floor this codebase already enforces on
          // every other summary control in the room.
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: WM.gold.mark,
          padding: "4px 0",
        }}
      >
        Practice honesty · {ledger.caption}
      </summary>
      <div style={{ marginTop: WM.space.sm, display: "grid", gap: WM.space.md }}>
        {ledger.easements.map((e) => (
          <section
            key={e.id}
            data-easement={e.id}
            style={{
              borderLeft: `1px solid ${WM.border.line}`,
              paddingLeft: WM.space.md,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: WM.gold.mark,
              }}
            >
              {e.heading}
            </p>
            {e.sentences.map((s) => (
              <p
                key={s}
                style={{
                  margin: `${WM.space.xs}px 0 0`,
                  fontSize: 11,
                  lineHeight: 1.55,
                  color: WM.text.body,
                }}
              >
                {s}
              </p>
            ))}
          </section>
        ))}
      </div>
    </details>
  );
}

export default PracticeHonestyLayer;
