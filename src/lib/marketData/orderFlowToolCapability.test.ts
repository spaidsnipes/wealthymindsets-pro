/**
 * THE TWO ABSENCES MUST NEVER COLLAPSE INTO ONE.
 *
 * The live defect: six order-flow buttons on /charts light up green and draw
 * nothing, saying nothing about why. The repair is NOT "grey them out when
 * there is no tape" — that erases the difference between a feed that CAN'T
 * supply sides and a feed that HASN'T YET. The first means "stop waiting"; the
 * second means "keep the tool armed". A trader who reads one as the other is
 * mis-informed by the fix rather than the bug.
 *
 * So the load-bearing tests here are the ones that pin the two states APART,
 * and pin `drawable` to OBSERVED volume rather than to a capability claim. A
 * suite that only checked "a reason string exists" would pass just as well
 * after someone made every arm return the same sentence.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { orderFlowToolCapability } from "./orderFlowToolCapability";

/** Reviewed, carries provider-stamped sides. */
const COINBASE = "coinbase";
/** Reviewed, but the side is a tick-rule reconstruction (confidence 0.5). */
const ALPACA = "alpaca";

const DELTA = ["delta", "Delta"] as const;

describe("orderFlowToolCapability — an empty overlay must say WHICH emptiness", () => {
  it("names the feed's inability when the source carries no aggressor side", () => {
    // `finnhub` is a RuntimeTapeSource but has no TAPE_SOURCE_PATHS identity,
    // so the registry answers null — an honest "we have not reviewed this".
    const c = orderFlowToolCapability(...DELTA, { source: "finnhub", observedAggressorFlow: true });
    expect(c.state).toBe("NO_AGGRESSOR_TAPE");
    expect(c.drawable).toBe(false);
  });

  it("treats no connected feed as the permanent absence, not the waiting one", () => {
    const c = orderFlowToolCapability(...DELTA, { source: null, observedAggressorFlow: false });
    expect(c.state).toBe("NO_AGGRESSOR_TAPE");
  });

  it("THE LOAD-BEARING ASSERTION — the two absences use different words", () => {
    // If these two sentences ever converge, the fix has re-created the defect
    // in a politer font: the trader still cannot tell "wait" from "never".
    const never = orderFlowToolCapability(...DELTA, { source: null, observedAggressorFlow: false });
    const yet = orderFlowToolCapability(...DELTA, { source: COINBASE, observedAggressorFlow: false });
    expect(never.state).not.toBe(yet.state);
    expect(never.reason).not.toBe(yet.reason);
    expect(never.reason).toContain("Waiting will not change this");
    expect(yet.reason).toContain("YET");
    expect(yet.reason).not.toContain("Waiting will not change this");
  });

  it("a capable feed with no observed print is AWAITING, and still not drawable", () => {
    // The distinction the whole module exists for: CAN publish sides is not
    // evidence that one ARRIVED. Reporting drawable here would put the green
    // ring back on an empty overlay.
    const c = orderFlowToolCapability(...DELTA, { source: COINBASE, observedAggressorFlow: false });
    expect(c.state).toBe("AWAITING_TAPE");
    expect(c.drawable).toBe(false);
  });

  it("only observed sided volume earns DRAWABLE", () => {
    const c = orderFlowToolCapability(...DELTA, { source: COINBASE, observedAggressorFlow: true });
    expect(c.state).toBe("DRAWABLE");
    expect(c.drawable).toBe(true);
  });

  it("discloses that a tick-rule side is INFERRED, not asserted by the venue", () => {
    // Alpaca is the only live US-equity tape today and it receives no aggressor
    // flag at all — it reconstructs one. A tool drawing from it is drawing a
    // reconstruction, and the sentence on the button must not hide that behind
    // the same wording a provider-stamped feed gets.
    const inferred = orderFlowToolCapability(...DELTA, { source: ALPACA, observedAggressorFlow: true });
    const stamped = orderFlowToolCapability(...DELTA, { source: COINBASE, observedAggressorFlow: true });
    expect(inferred.reason).toContain("INFERRED");
    expect(stamped.reason).not.toContain("INFERRED");
  });

  it("quotes the label ON the button, never the internal id", () => {
    // An explanation that says "aggressive-passive" when the button reads
    // "Agg/Passive Proxy" reads as being about some other control.
    const c = orderFlowToolCapability("aggressive-passive", "Agg/Passive Proxy", {
      source: COINBASE,
      observedAggressorFlow: false,
    });
    expect(c.reason).toContain("Agg/Passive Proxy");
    expect(c.reason).not.toContain("aggressive-passive");
    expect(c.toolId).toBe("aggressive-passive");
  });

  it("carries the toolId back on every arm, so a verdict cannot be mis-filed", () => {
    for (const ev of [
      { source: null, observedAggressorFlow: false },
      { source: COINBASE, observedAggressorFlow: false },
      { source: COINBASE, observedAggressorFlow: true },
    ]) {
      expect(orderFlowToolCapability("vol-profile", "Vol Profile", ev).toolId).toBe("vol-profile");
    }
  });

  it("never returns an empty or bare-'unavailable' reason", () => {
    // "Unavailable" is precisely the wording that made two different absences
    // look like one. Every arm owes a full sentence naming the feed.
    for (const ev of [
      { source: null, observedAggressorFlow: false },
      { source: "finnhub", observedAggressorFlow: true },
      { source: COINBASE, observedAggressorFlow: false },
      { source: ALPACA, observedAggressorFlow: true },
    ]) {
      const { reason } = orderFlowToolCapability(...DELTA, ev);
      expect(reason.length).toBeGreaterThan(40);
      expect(reason).toContain("Delta");
      expect(reason.trim().toLowerCase()).not.toBe("unavailable");
    }
  });

  it("says outright that the historical bars are not a fallback", () => {
    // The tempting "fix" is to draw a footprint from OHLCV. getBarSubProfile
    // refuses to; the copy must not imply it ever would.
    const never = orderFlowToolCapability(...DELTA, { source: null, observedAggressorFlow: false });
    const yet = orderFlowToolCapability(...DELTA, { source: COINBASE, observedAggressorFlow: false });
    expect(never.reason).toContain("OHLCV");
    expect(yet.reason).toContain("OHLCV");
  });
});

/**
 * SENTINELS — pinned to MEANING, not to spelling.
 *
 * A guard that asserts a literal string passes vacuously the moment the code it
 * guards is renamed, and can be satisfied by prose in a comment. These read the
 * COMMENT-STRIPPED source, because a rule quoted in a docblock is not a render.
 */
const CONTROLS = fs
  .readFileSync(path.join(process.cwd(), "src/components/chart/FootprintControls.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("SENTINEL — the toolbar consumes the compiler, it does not re-derive", () => {
  it("delegates the verdict instead of asking the registry a second time", () => {
    // A second owner of this question is the vacuous-agreement shape: two
    // answers that agree until one is edited, on the same toolbar.
    expect(CONTROLS).toContain("orderFlowToolCapability");
    expect(CONTROLS).not.toContain("hasVerifiedAggressorTape");
    expect(CONTROLS).not.toContain("getRuntimeTapeCapability");
    expect(CONTROLS).not.toContain("aggressorMethod");
  });

  it("DISCLOSES rather than disables — the tape can arrive mid-session", () => {
    // `disabled` would be the easy fix and the wrong one: it strips the control
    // from a screen reader's button list and from a phone's tap targets, so one
    // silence becomes two, and it lies about a state that is temporary.
    expect(CONTROLS).not.toMatch(/disabled=\{[^}]*cap\./);
    expect(CONTROLS).not.toMatch(/disabled=\{![^}]*drawable/);
  });

  it("withholds the SELECTED ring from a tool that cannot draw", () => {
    // A green ring over an empty overlay reads as "delta is flat" — a reading
    // of the market, and a false one. The ring is the claim.
    expect(CONTROLS).toContain("selected && cap.drawable");
  });

  it("renders the reason VISIBLY, not only in a title or an aria-label", () => {
    // A hover does not exist on a phone and an aria-label is announced only on
    // focus. Neither reaches the trader who clicked and saw nothing happen.
    expect(CONTROLS).toContain("armedCapability");
    expect(CONTROLS).toContain("!armedCapability.drawable");
    expect(CONTROLS).toContain('role="status"');
    expect(CONTROLS).toContain("data-of-armed-state");
    expect(CONTROLS).toContain("data-of-capability");
  });

  it("keeps the two absences distinguishable AT THE PIXEL, not just in the reason", () => {
    // The visible sentence branches on the state. If it ever collapses to one
    // string, the trader is back to being unable to tell "wait" from "never"
    // without hovering — which on a phone means never.
    expect(CONTROLS).toContain('armedCapability.state === "AWAITING_TAPE"');
  });
});
