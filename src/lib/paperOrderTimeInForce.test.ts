/**
 * Scope, stated honestly.
 *
 * This proves the GRADE and the SENTENCES — that an order placed today is left
 * alone, that one date boundary is graded more cautiously than two, that a
 * missing timestamp is disclosed rather than defaulted, and that nothing here
 * ever cancels anything.
 *
 * It does not prove that a real venue would have killed any particular order.
 * It cannot: that depends on the session the order was entered for and on the
 * exchange calendar, and this module deliberately refuses to claim either. The
 * strongest thing asserted below is a statement about the CALENDAR.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  nyDateOf,
  selectOrderRest,
  describeRestingBook,
  type TimeInForceInput,
} from "./paperOrderTimeInForce";

/** 2026-09-15 14:30 New York (18:30 UTC, EDT). */
const NOW = Date.parse("2026-09-15T18:30:00Z");
const DAY = 86_400_000;

const pending = (ts: number | undefined): TimeInForceInput => ({ status: "pending", ts });

describe("nyDateOf", () => {
  it("reports the NEW YORK date, not UTC — the session boundary is the US close", () => {
    // 2026-09-16T02:00Z is still 2026-09-15 at 22:00 in New York.
    expect(nyDateOf(Date.parse("2026-09-16T02:00:00Z"))).toBe("2026-09-15");
  });

  it("refuses to invent a date for an unreadable timestamp", () => {
    expect(nyDateOf(undefined)).toBeNull();
    expect(nyDateOf(null)).toBeNull();
    expect(nyDateOf(Number.NaN)).toBeNull();
    expect(nyDateOf(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("selectOrderRest", () => {
  it("says nothing about an order placed today — a caveat on every row is read by nobody", () => {
    const r = selectOrderRest(pending(NOW - 60_000), NOW);
    expect(r.basis).toBe("same-session");
    expect(r.nyDatesCrossed).toBe(0);
    expect(r.sentence).toBeNull();
  });

  it("grades one date boundary as `overnight` and does NOT claim a DAY order is dead", () => {
    // Placed 20:00 New York yesterday: that order belongs to TODAY's session,
    // so a real DAY order is still working. The sentence must not say otherwise.
    const r = selectOrderRest(pending(Date.parse("2026-09-15T00:00:00Z")), NOW);
    expect(r.basis).toBe("overnight");
    expect(r.nyDatesCrossed).toBe(1);
    expect(r.sentence).toMatch(/no time-in-force/i);
    expect(r.sentence).not.toMatch(/already (been )?cancelled|would be dead|is dead/i);
  });

  it("only says no DAY order survives once TWO date boundaries have passed", () => {
    const r = selectOrderRest(pending(NOW - 2 * DAY), NOW);
    expect(r.basis).toBe("outlived-day-order");
    expect(r.nyDatesCrossed).toBe(2);
    expect(r.sentence).toMatch(/no DAY order lives this long/i);
    expect(r.sentence).toContain("2 days ago");
  });

  it("names the date the order was placed, so the trader can find it", () => {
    const r = selectOrderRest(pending(Date.parse("2026-09-11T18:00:00Z")), NOW);
    expect(r.placedOnNyDate).toBe("2026-09-11");
    expect(r.sentence).toContain("2026-09-11");
    expect(r.nyDatesCrossed).toBe(4);
  });

  it("discloses a missing timestamp instead of defaulting it to `fresh`", () => {
    // Silence here would read as "this order is from today", which is a claim
    // no recorded field supports.
    for (const bad of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = selectOrderRest({ status: "pending", ts: bad as number }, NOW);
      expect(r.basis).toBe("age-unknown");
      expect(r.placedOnNyDate).toBeNull();
      expect(r.sentence).toMatch(/not recorded/i);
      expect(r.sentence).toMatch(/no time-in-force/i);
    }
  });

  it("treats a null/undefined order as age-unknown rather than throwing", () => {
    expect(selectOrderRest(null, NOW).basis).toBe("age-unknown");
    expect(selectOrderRest(undefined, NOW).basis).toBe("age-unknown");
  });

  it("does not report a negative rest when the clock or the stamp is skewed", () => {
    const r = selectOrderRest(pending(NOW + 3 * DAY), NOW);
    expect(r.nyDatesCrossed).toBe(0);
    expect(r.basis).toBe("same-session");
    expect(r.sentence).toBeNull();
  });

  it("is a LABEL: it never returns a cancellation, an expiry or a new status", () => {
    const r = selectOrderRest(pending(NOW - 9 * DAY), NOW);
    expect(Object.keys(r).sort()).toEqual(
      ["basis", "nyDatesCrossed", "placedOnNyDate", "sentence"].sort(),
    );
    expect(JSON.stringify(r)).not.toMatch(/cancelled|expired|status/i);
  });

  it("grades by the ORDER's own ts, so orders persisted before this existed are graded too", () => {
    // No new stored field: the only input is `ts`, which every order has
    // carried since the book was first written.
    const ancient = { status: "pending", ts: NOW - 400 * DAY };
    expect(selectOrderRest(ancient, NOW).basis).toBe("outlived-day-order");
    expect(selectOrderRest(ancient, NOW).nyDatesCrossed).toBe(400);
  });
});

describe("describeRestingBook", () => {
  it("is null when there is nothing to disclose", () => {
    expect(describeRestingBook([], NOW)).toBeNull();
    expect(describeRestingBook(null, NOW)).toBeNull();
    expect(describeRestingBook([pending(NOW - 60_000)], NOW)).toBeNull();
  });

  it("counts only PENDING orders — a filled order is not resting", () => {
    const old = NOW - 5 * DAY;
    expect(
      describeRestingBook(
        [
          { status: "filled", ts: old },
          { status: "cancelled", ts: old },
          { status: "rejected", ts: old },
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("agrees in number with the rows that actually carry a sentence", () => {
    const orders: TimeInForceInput[] = [
      pending(NOW - 60_000),  // same-session — no sentence
      pending(NOW - 1 * DAY), // overnight
      pending(NOW - 4 * DAY), // outlived
      { status: "filled", ts: NOW - 4 * DAY },
    ];
    expect(describeRestingBook(orders, NOW)).toBe(
      "2 working orders have outlasted the day you placed them",
    );
  });

  it("does not fold an unmeasurable order into a count of measured ones", () => {
    // Its magnitude is exactly what is unknown; that row discloses itself.
    const orders: TimeInForceInput[] = [pending(NOW - 3 * DAY), pending(undefined)];
    expect(describeRestingBook(orders, NOW)).toBe(
      "1 working order has outlasted the day you placed it",
    );
  });

  it("agrees with itself in the singular", () => {
    expect(describeRestingBook([pending(NOW - 1 * DAY)], NOW)).toMatch(/^1 working order /);
  });
});

describe("the owner refuses to cancel anything", () => {
  const OWNER = readFileSync(resolve(__dirname, "./paperOrderTimeInForce.ts"), "utf8");
  const code = OWNER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("LABEL NOT MODEL: it never writes a status, and never reads the clock itself", () => {
    // Expiring the trader's saved working orders would enforce a policy they
    // were never offered and destroy a book they already own. And `Date.now()`
    // inside a pure selector is what makes a disclosure untestable AND makes
    // its caller a hydration hazard — `nowMs` is a parameter for both reasons.
    expect(code).not.toMatch(/status\s*[:=]\s*["']/);
    expect(code).not.toMatch(/\bDate\.now\s*\(/);
  });

  it("is pure: no imports, no storage, no side effects", () => {
    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/localStorage|sessionStorage/);
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

  it("THE DEFECT: the page consults the time-in-force owner rather than staying silent", () => {
    expect(code, "the TIF gap existed only in this repo's absence of a field")
      .toContain("selectOrderRest");
    expect(code).toContain("describeRestingBook");
  });

  /**
   * The lesson already paid for once on this page: consulting a selector is
   * not rendering its answer. A revive that deletes the element while leaving
   * the import and the component declaration intact restores the exact silence
   * the atom closes, so the ELEMENT is what gets asserted.
   */
  it("the per-order note is actually RENDERED, not merely declared", () => {
    expect(code).toContain("<RestingOrderNote ord={ord} nowMs={restNowMs} />");
  });

  it("the book-level note is actually RENDERED", () => {
    expect(code).toContain("<RestingBookNote orders={orders} nowMs={restNowMs} />");
  });

  it("both are rendered in the ORDERS tab, beside the book they describe", () => {
    const ordersTab = code.slice(code.indexOf('tab==="orders"'));
    expect(ordersTab.indexOf("<RestingOrderNote")).toBeGreaterThan(-1);
    expect(ordersTab.indexOf("<RestingBookNote")).toBeGreaterThan(-1);
  });

  it("the clock is read AFTER mount — React #418 has already been paid for here", () => {
    // Five separate hydration mismatches were traced on this codebase, one of
    // them a `Date.now()` in a render body (HeroTruth). The disclosure must not
    // be the sixth: `useNowMs` starts null and is filled by an effect.
    const hook = code.slice(code.indexOf("function useNowMs"));
    expect(hook.slice(0, 400)).toMatch(/useState<number \| null>\(null\)/);
    expect(hook.slice(0, 400)).toMatch(/useEffect\(/);
  });
});
