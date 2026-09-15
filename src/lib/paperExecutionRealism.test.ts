/**
 * /paper told the trader the MONEY was fake. It never told them the FILL was.
 *
 * Those are two different claims and only the first was on screen. The second
 * was written down twice — in `selectOrderFill`'s docblock and in
 * `FillQueueBasisNote`'s — where no trader will ever read it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectExecutionRealism,
  describeExecutionRealism,
} from "./paperExecutionRealism";

const filled = (qty: number) => ({ status: "filled", qty });
const pending = (qty: number) => ({ status: "pending", qty });

describe("selectExecutionRealism — nothing to caveat until something filled", () => {
  it("an empty book discloses NOTHING — a permanent banner is not read", () => {
    const r = selectExecutionRealism([]);
    expect(r.filledCount).toBe(0);
    expect(r.assumptions).toEqual([]);
    expect(r.largestFillQty).toBeNull();
    expect(describeExecutionRealism(r)).toBeNull();
  });

  it("null and undefined are the empty book, not a crash", () => {
    expect(selectExecutionRealism(null).assumptions).toEqual([]);
    expect(selectExecutionRealism(undefined).assumptions).toEqual([]);
  });

  it("orders that never filled are not fills", () => {
    // A resting order has assumed nothing yet. Caveating it would be the same
    // overclaim in the other direction.
    const r = selectExecutionRealism([pending(10), pending(5)]);
    expect(r.filledCount).toBe(0);
    expect(r.assumptions).toEqual([]);
  });
});

describe("selectExecutionRealism — THE DEFECT: the two universal assumptions", () => {
  it("one fill discloses BOTH assumptions", () => {
    const r = selectExecutionRealism([filled(10)]);
    expect(r.filledCount).toBe(1);
    expect(r.assumptions.map(a => a.id)).toEqual(["no-spread", "unbounded-size"]);
  });

  it("names the spread advantage, its DIRECTION, and that it is systematic", () => {
    const s = selectExecutionRealism([filled(10)]).assumptions[0].sentence;
    expect(s).toContain("pays the offer");
    expect(s).toContain("hits the bid");
    expect(s, "the advantage is the trader's, every time").toContain("better than");
  });

  it("LABEL NOT MODEL: no sentence mints a spread, a slippage or a probability", () => {
    // There is no bid and no ask in PaperQuoteReadiness. A number here would be
    // invented, which is the defect this file closes, not the cure.
    for (const a of selectExecutionRealism([filled(10)]).assumptions) {
      expect(a.sentence, `"${a.id}" must not estimate`).not.toMatch(
        /\b\d+(\.\d+)?\s*(%|bps|cents?|ticks?)\b/i,
      );
      expect(a.sentence).not.toMatch(/estimat|approximat|roughly|likely|probab/i);
    }
  });

  it("the size sentence is DERIVED from the trader's own largest fill", () => {
    const r = selectExecutionRealism([filled(10), filled(250), filled(3)]);
    expect(r.largestFillQty).toBe(250);
    expect(r.assumptions[1].sentence).toContain("250");
  });

  it("counts every fill, and a short's size is its magnitude", () => {
    const r = selectExecutionRealism([filled(-40), filled(5)]);
    expect(r.filledCount).toBe(2);
    expect(r.largestFillQty, "a 40-lot short assumed as much as a 40-lot long").toBe(40);
  });

  it("an unreadable quantity does not suppress a TRUE statement", () => {
    // The assumption held for that fill whether or not the digit survived.
    const r = selectExecutionRealism([{ status: "filled", qty: NaN }]);
    expect(r.filledCount).toBe(1);
    expect(r.largestFillQty).toBeNull();
    expect(r.assumptions.map(a => a.id)).toEqual(["no-spread", "unbounded-size"]);
    expect(r.assumptions[1].sentence).toContain("no order-book depth");
  });

  it("mixes filled and resting without counting the resting ones", () => {
    const r = selectExecutionRealism([filled(10), pending(9_999), filled(2)]);
    expect(r.filledCount).toBe(2);
    expect(r.largestFillQty, "a resting order is not a fill").toBe(10);
  });
});

describe("describeExecutionRealism — singular and plural, and silence", () => {
  it("says nothing on an empty book", () => {
    expect(describeExecutionRealism(selectExecutionRealism([]))).toBeNull();
  });

  it("gets the count right", () => {
    expect(describeExecutionRealism(selectExecutionRealism([filled(1)])))
      .toBe("Your 1 fill was easier than a real one would have been");
    expect(describeExecutionRealism(selectExecutionRealism([filled(1), filled(2)])))
      .toBe("Your 2 fills were easier than real ones would have been");
  });
});

describe("the boundary with the caveats that already have owners", () => {
  const OWNER = readFileSync(resolve(__dirname, "./paperExecutionRealism.ts"), "utf8");
  const code = OWNER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("does NOT restate queue priority — it is per-fill and already rendered", () => {
    // `FillQueueBasisNote` shows it only on the at-the-touch fills it is true
    // of. Hoisting it into a standing panel would state it about fills it is
    // NOT true of — the same overclaim, pointed the other way.
    for (const a of selectExecutionRealism([filled(10)]).assumptions) {
      expect(a.sentence).not.toMatch(/queue/i);
    }
  });

  it("does NOT restate quote age — quoteObservedAt already discloses it", () => {
    for (const a of selectExecutionRealism([filled(10)]).assumptions) {
      expect(a.sentence).not.toMatch(/\bstale\b|\bold\b|seconds? old/i);
    }
  });

  it("the owner imports nothing — it is a pure sentence table over order fields", () => {
    expect(code).not.toMatch(/^\s*import\s/m);
  });
});

describe("/paper renders the disclosure", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
  });

  it("THE DEFECT: the page consults the realism owner rather than staying silent", () => {
    expect(code, "the fill-realism caveat existed only in a source comment")
      .toContain("selectExecutionRealism");
    expect(code).toContain("describeExecutionRealism");
  });

  /**
   * FOUND BY REVIVE, NOT BY DESIGN.
   *
   * The first draft of this file asserted only the two guards above. A revive
   * that deleted the `<ExecutionRealismNote />` element from the orders tab —
   * leaving the component declared and the imports intact — passed GREEN. The
   * owner was consulted by a function nobody called, so the trader saw exactly
   * the silence this atom exists to end, and the suite said it was fine.
   *
   * Consulting a selector is not rendering its answer. This asserts the
   * ELEMENT, which is the thing the trader can actually read.
   */
  it("REVIVE-FOUND: the note is actually RENDERED, not merely declared", () => {
    expect(
      code,
      "an unrendered ExecutionRealismNote is the original silence with extra steps",
    ).toContain("<ExecutionRealismNote orders={orders} />");
  });

  it("and it is rendered in the ORDERS tab, beside the fills it describes", () => {
    const ordersTab = code.slice(code.indexOf('tab==="orders"'));
    expect(ordersTab.indexOf("<ExecutionRealismNote"), "not found after the orders tab opens")
      .toBeGreaterThan(-1);
  });
});
