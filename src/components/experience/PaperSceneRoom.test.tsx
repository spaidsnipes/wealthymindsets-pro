/**
 * The room /paper compiles — the first WM Pro screen whose furniture is
 * decided by an OBSERVED book.
 *
 * ── Why this file exists separately from the /paper page ────────────────────
 *
 * Two different lies are possible here and each needs its own lock:
 *
 *   1. The PAGE could stop using the gates. That is pinned by source-walking
 *      sentinels in `compileScene.enforcement.test.ts` — they prove the
 *      Academy banner is INSIDE `<SceneAdmitsAmbient>`, the exit ramp is
 *      INSIDE `<SceneAdmits element="FLATTEN_CONFIRM">`, and the §B14 cancel
 *      control is INSIDE `<SceneAdmits element="PENDING_BANNER">`.
 *
 *   2. The MECHANISM could stop meaning anything — gates that admit
 *      everything, or a panel that reports refusals nobody honours. A page
 *      scan cannot see that. This file renders the real triple (adapter →
 *      compiler → gates + panel) against real ledger states and asserts the
 *      room actually CHANGES.
 *
 * Together: the page uses the mechanism, and the mechanism does something.
 * Either lock alone was survivable — that is the §22 lesson that produced the
 * ONE_STORY regression in the first place.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SceneAdmits, { SceneAdmitsAmbient } from "./SceneAdmits";
import SceneAdmissionPanel from "./SceneAdmissionPanel";
import { compileScene, type SurfaceElement } from "@/lib/experience/compileScene";
import {
  paperSceneSignals,
  type PaperLedgerView,
  type PaperSceneInput,
} from "@/lib/experience/paperSceneSignals";

const NOW = 1_757_000_000_000;

/** The exact list `/paper` declares. Kept in step by the enforcement sentinel. */
const PAPER_GOVERNED: readonly SurfaceElement[] = ["PENDING_BANNER", "FLATTEN_CONFIRM"];

function ledger(over: Partial<PaperLedgerView> = {}): PaperLedgerView {
  return { hydrated: true, persistence: "PERSISTED", positions: [], orders: [], ...over };
}

/**
 * The composition /paper renders, with the three real surfaces replaced by
 * markers. The GATES and the PANEL are the production components; only the
 * furniture inside them is stubbed, because what is under test is which
 * furniture survives.
 */
function Room(input: PaperSceneInput): React.ReactElement {
  const projection = paperSceneSignals(input);
  const compilation = compileScene(projection.signals);
  return (
    <div>
      <SceneAdmits compilation={compilation} element="PENDING_BANNER">
        <div>EXPOSURE-BANNER · {compilation.reason}</div>
      </SceneAdmits>
      <SceneAdmits compilation={compilation} element="FLATTEN_CONFIRM">
        <div>EXIT-RAMP</div>
      </SceneAdmits>
      <SceneAdmitsAmbient compilation={compilation}>
        <div>ACADEMY-CHALLENGE</div>
      </SceneAdmitsAmbient>
      <SceneAdmissionPanel
        compilation={compilation}
        provenance={projection.provenance}
        observedCount={projection.observedCount}
        totalCount={projection.totalCount}
        governed={PAPER_GOVERNED}
      />
    </div>
  );
}

function room(over: Partial<PaperSceneInput> = {}): string {
  return renderToStaticMarkup(
    <Room
      session="RTH"
      rightOfWay={null}
      symbol="TSLA"
      ledger={ledger()}
      now={NOW}
      {...over}
    />,
  );
}

describe("/paper room — §9 INTERRUPTION LAW is finally enforced by something", () => {
  it("admits Academy on a confirmed-flat book with nothing working", () => {
    // The control. Without this, every assertion below is satisfied by a gate
    // that simply never admits anything.
    expect(room()).toContain("ACADEMY-CHALLENGE");
  });

  it("REMOVES Academy the moment a position is open", () => {
    // §9: "Only capital truth and material invalidation may take the room.
    // Academy may not." This banner shipped unconditionally on the one route
    // in WM Pro where a position can actually exist — the law's own named
    // example, violated by the literal surface it names.
    const html = room({ ledger: ledger({ positions: [{ symbol: "TSLA", qty: 10 }] }) });
    expect(html).not.toContain("ACADEMY-CHALLENGE");
    expect(html).toContain("EXIT-RAMP");
  });

  it("REMOVES Academy while a working order can still open exposure", () => {
    // §B14: FLAT quantity is not zero future exposure. The trader is not done,
    // so the room is not free.
    const html = room({
      ledger: ledger({ orders: [{ symbol: "TSLA", side: "buy", status: "pending" }] }),
    });
    expect(html).not.toContain("ACADEMY-CHALLENGE");
    expect(html).toContain("EXPOSURE-BANNER");
    expect(html).toContain("NOT DONE");
  });

  it("REMOVES Academy when the ledger's last write did not survive", () => {
    // §9: a failure may reduce capability; it may not increase certainty. A
    // screen that cannot prove the basics has not earned the right to teach.
    const html = room({
      ledger: ledger({ persistence: "CONFLICT", positions: [{ symbol: "TSLA", qty: 4 }] }),
    });
    expect(html).not.toContain("ACADEMY-CHALLENGE");
  });
});

describe("/paper room — the exit ramp survives every scene that has one to survive", () => {
  it("is WITHHELD while flat — a flatten button with nothing to close is dead vocabulary (§H19)", () => {
    expect(room()).not.toContain("EXIT-RAMP");
  });

  it("is ADMITTED while long", () => {
    expect(room({ ledger: ledger({ positions: [{ symbol: "TSLA", qty: 10 }] }) }))
      .toContain("EXIT-RAMP");
  });

  it("is ADMITTED while short", () => {
    expect(room({ ledger: ledger({ positions: [{ symbol: "TSLA", qty: -3 }] }) }))
      .toContain("EXIT-RAMP");
  });

  it("SURVIVES DEGRADED — §9 / §H6, the way out outlives the failure", () => {
    // The single most important assertion in this file. A screen that cannot
    // tell you what your money is doing must never also be the screen that
    // hides the way to act on it.
    const html = room({
      ledger: ledger({ persistence: "FAILED", positions: [{ symbol: "TSLA", qty: 10 }] }),
    });
    expect(html).toContain("EXIT-RAMP");
    expect(html).toContain("Open broker");
  });

  it("SURVIVES the session closing while risk is still held", () => {
    const html = room({
      session: "CLOSED",
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 2 }] }),
    });
    expect(html).toContain("EXIT-RAMP");
    expect(html).not.toContain("ACADEMY-CHALLENGE");
  });
});

describe("/paper room — the exposure banner cannot become furniture", () => {
  it("is withheld while flat and idle", () => {
    expect(room()).not.toContain("EXPOSURE-BANNER");
  });

  it("is withheld while simply long — MANAGE is not PENDING", () => {
    expect(room({ ledger: ledger({ positions: [{ symbol: "TSLA", qty: 10 }] }) }))
      .not.toContain("EXPOSURE-BANNER");
  });

  it("is withheld for an EXIT order against a long — closing is not opening (§B14)", () => {
    // The §21 failure this prevents: counting the exit as exposure pins the
    // screen to NOT DONE while the trader is actually closing out.
    const html = room({
      ledger: ledger({
        positions: [{ symbol: "TSLA", qty: 10 }],
        orders: [{ symbol: "TSLA", side: "sell", status: "pending" }],
      }),
    });
    expect(html).not.toContain("EXPOSURE-BANNER");
    expect(html).toContain("EXIT-RAMP");
  });
});

describe("/paper room — the panel tells the truth about what was READ", () => {
  it("reports 4 of 5 signal groups observed — DECISION is genuinely unwired here", () => {
    // SESSION + POSITION + ORDERS + LINK are real on this route. DECISION is
    // not, and the panel says so instead of borrowing the deck's verdict.
    const html = room();
    expect(html).toContain("Signals observed · 4 / 5");
    expect(html).toContain("Decision · UNOBSERVED");
    expect(html).toContain("Position · OBSERVED");
  });

  it("no longer claims this route has no broker panel — it has a book", () => {
    // The sentence that shipped with the panel was written for /command-deck
    // and became false the instant a route with a real ledger adopted it.
    const html = room();
    expect(html).not.toContain("no broker panel");
    expect(html).toContain("WM has not read decision on this screen");
  });

  it("drops POSITION, ORDERS and LINK before the ledger has hydrated (§14.1)", () => {
    const html = room({ ledger: ledger({ hydrated: false }) });
    expect(html).toContain("Signals observed · 1 / 5");
    expect(html).toContain("Position · UNOBSERVED");
    // And the empty positions array must NOT have compiled to a quiet room.
    expect(html).not.toContain("Signals observed · 4 / 5");
  });

  it("reports refusals ONLY for the two elements /paper actually governs", () => {
    // The overclaim this panel was rewritten to kill: nine struck-through
    // chips naming controls the route does not have.
    const html = room();
    expect(html).toContain("Not governed here · 10");
    expect(html).toContain("Withheld · 2");
  });
});
