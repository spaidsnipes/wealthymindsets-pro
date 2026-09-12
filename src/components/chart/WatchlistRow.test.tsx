/**
 * THE ROW MUST SAY WHAT IT IS.
 *
 * MEASURED from the live DOM on prod 2026-09-12, /charts, Founder session,
 * watchlist panel 199px wide — every one of sixteen rows:
 *
 *   div "ES1!"                            width   0
 *   div "E-Mini S&P 500"                  width   0
 *   span "SESSION CLOSED — LAST VERIFIED" width 172
 *   div "7659.50"                         x 309 → right edge 355, panel ends 318
 *
 * The chip had eaten the row, the price had been pushed out of the panel, and
 * the name — the one thing a watchlist exists to tell you — was zero pixels
 * wide. It was still in the DOM. `getByText("ES1!")` would have passed. Every
 * existing test passed. Sixteen identical amber sentences shipped.
 *
 * So these tests do NOT ask "is the symbol present". They ask WHERE it is: the
 * name and the canon fidelity sentence must not be competing for one line,
 * because at 199px only one of them can win and the loser is declared by the
 * flex rules, not by anyone's intent.
 */

import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import { WatchlistRow, WATCHLIST_IDENTITY_FLOOR_PX, type WatchlistRowProps } from "./WatchlistRow";

const base: WatchlistRowProps = {
  sym: "ES1!", fullName: "E-Mini S&P 500",
  price: 7659.5, changePct: 0.8, changeObserved: true, changeWindow: "PRIOR_CLOSE",
  src: "yahoo", isActive: false, up: true, dirColor: "#00C076", dp: 2,
  // Saturday afternoon ET. The futures session is shut — the state the defect
  // was measured in, and the one that produces the longest canon label.
  sessionNow: new Date("2026-09-12T18:00:00Z"),
  onSelect: () => {}, onContextMenu: () => {},
};

const render = (p: Partial<WatchlistRowProps> = {}) =>
  renderToStaticMarkup(<WatchlistRow {...base} {...p} />);

/**
 * The two lines are marked in the shipping markup and rendered in this order,
 * so slicing on the markers reads exactly what the browser lays out. No DOM
 * library is available in this suite; the marker attributes exist precisely so
 * the boundary is readable from the string.
 */
function lines(html: string): { identity: string; fidelity: string } {
  const i = html.indexOf('data-wm-row="identity"');
  const f = html.indexOf('data-wm-row="fidelity"');
  expect(i, "the row no longer marks its identity line").toBeGreaterThanOrEqual(0);
  return {
    identity: f >= 0 ? html.slice(i, f) : html.slice(i),
    fidelity: f >= 0 ? html.slice(f) : "",
  };
}

describe("the name and the fidelity sentence do not share a line", () => {
  it("puts the canon label on its own line, away from the symbol", () => {
    const { identity, fidelity } = lines(render());
    expect(identity).toContain("ES1!");
    expect(identity).toContain("E-Mini S&amp;P 500");
    // The exact eviction: a thirty-character sentence next to the name.
    expect(identity).not.toContain(CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED);
    expect(fidelity).toContain(CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED);
    expect(fidelity).not.toContain("ES1!<");
  });

  it("keeps the price on the identity line, where the name can be priced at a glance", () => {
    const { identity, fidelity } = lines(render());
    expect(identity).toContain("7659.50");
    expect(fidelity).not.toContain("7659.50");
  });

  it("never truncates the canon label to buy room", () => {
    // Abbreviating a fidelity sentence is not a smaller truth; "SESSION
    // CLOSED — LAST VERI…" is a different claim. Giving the chip the whole
    // width is what makes the full string affordable.
    expect(render()).toContain(CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED);
  });
});

describe("the identity column can never be the thing that disappears", () => {
  it("declares a hard floor rather than min-width 0", () => {
    // `minWidth: 0` was the whole defect. It reads as "this column may shrink",
    // and a flex row with exactly one shrinkable sibling will shrink it to
    // nothing without any rule being broken.
    const html = render();
    expect(WATCHLIST_IDENTITY_FLOOR_PX).toBeGreaterThanOrEqual(56);
    expect(html).toContain(`min-width:${WATCHLIST_IDENTITY_FLOOR_PX}px`);
    expect(html).not.toContain("min-width:0px");
  });

  it("still ellipsizes a long name instead of widening the row", () => {
    // The floor is a floor, not a demand. A long name must fold into the
    // column, never push the price out of the panel the way the chip did.
    const html = render({ fullName: "A Very Long Instrument Description That Will Not Fit" });
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
  });
});

describe("a row with nothing to price says so, and says nothing else", () => {
  it("shows no fidelity line at all when no quote was observed", () => {
    // A chip reading a canon fidelity string about a price that does not exist
    // would be a verdict on nothing. The row falls back to the one honest
    // sentence it has.
    const html = render({ price: 0, src: undefined, changeObserved: false });
    expect(html).toContain("quote pending");
    expect(html).not.toContain('data-wm-row="fidelity"');
  });

  it("treats a refusal as a row with something to say, not a pending one", () => {
    // SF-D01 — a provider answered and WM declined it. The price is 0 but the
    // row is not waiting; calling it "quote pending" hands a designed refusal
    // a transient state's vocabulary.
    const html = render({ price: 0, refusal: "resolution UNKNOWN", changeObserved: false });
    expect(html).not.toContain("quote pending");
    expect(html).toContain("not certified");
    expect(html).toContain('data-wm-row="fidelity"');
  });
});
