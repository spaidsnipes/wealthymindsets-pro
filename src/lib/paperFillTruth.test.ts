import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { selectOrderFill, type OrderFillInput } from "./paperTrade";

const paperPage = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"), "utf8");

/** Comments stripped so a PROSE mention of the old expression is not a match. */
const pageCode = paperPage
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const buy = (type: OrderFillInput["type"], px?: Partial<OrderFillInput>): OrderFillInput =>
  ({ side: "buy", type, ...px });
const sell = (type: OrderFillInput["type"], px?: Partial<OrderFillInput>): OrderFillInput =>
  ({ side: "sell", type, ...px });

/**
 * THE PRICE RECORDED IS THE PRICE OBSERVED — Founding Contract §13, paper
 * execution state-machine realism; canon weakness #9 PAPER-FILL OVERCONFIDENCE.
 *
 * /paper's fill loop booked `const fillPx = ord.limitPx ?? px`. For every limit
 * and stop-limit order that wrote the LIMIT LEVEL into the durable ledger — a
 * number no quote ever produced — onto the very same Trade that carries
 * `quoteObservedAt`, the observation time of `px`. Two fields on one record
 * describing two different things. §5 SYSTEM TRUTH LAW.
 *
 * The fix is NOT a fill model. No slippage, no spread, no queue. The limit
 * answers WHETHER the order fills; the observed price answers at what price.
 */
describe("selectOrderFill — the recorded price is the observed price", () => {
  it("THE FIX: a buy limit that triggers below its level books the observed price, not the limit", () => {
    // Market at 98 against a buy limit of 100: real price improvement of $2.
    // The old expression booked 100 and the improvement vanished.
    const fill = selectOrderFill(buy("limit", { limitPx: 100 }), 98);
    expect(fill).not.toBeNull();
    expect(fill!.fillPx).toBe(98);
  });

  it("THE FIX: a sell limit that triggers above its level books the observed price, not the limit", () => {
    // The error ran in BOTH directions — this one UNDER-reported the sale.
    const fill = selectOrderFill(sell("limit", { limitPx: 100 }), 102);
    expect(fill).not.toBeNull();
    expect(fill!.fillPx).toBe(102);
  });

  it("THE FIX: a stop-limit books the observed price, not the limit leg", () => {
    const f = selectOrderFill(buy("stop-limit", { stopPx: 100, limitPx: 101 }), 100.4);
    expect(f).not.toBeNull();
    expect(f!.fillPx).toBe(100.4);
  });

  it("books the observed price for every order type that fills", () => {
    const cases: OrderFillInput[] = [
      buy("market"),
      sell("market"),
      buy("limit", { limitPx: 100 }),
      sell("limit", { limitPx: 90 }),
      buy("stop", { stopPx: 90 }),
      sell("stop", { stopPx: 100 }),
      buy("stop-limit", { stopPx: 90, limitPx: 100 }),
      sell("stop-limit", { stopPx: 100, limitPx: 90 }),
    ];
    for (const ord of cases) {
      const f = selectOrderFill(ord, 95);
      expect(f, `${ord.side} ${ord.type} should fill at an observed 95`).not.toBeNull();
      expect(f!.fillPx, `${ord.side} ${ord.type}: the only price anyone observed was 95`).toBe(95);
    }
  });

  it("never returns a price the observation did not produce", () => {
    // A sweep: whatever fills, the price is the tick. There is no third number.
    for (const ordFactory of [buy, sell]) {
      for (const type of ["market", "limit", "stop", "stop-limit"] as const) {
        for (let px = 90; px <= 110; px += 1) {
          const f = selectOrderFill(ordFactory(type, { limitPx: 100, stopPx: 100 }), px);
          if (f) expect(f.fillPx, `${type} @ ${px}`).toBe(px);
        }
      }
    }
  });
});

describe("selectOrderFill — the trigger arithmetic, lifted verbatim", () => {
  it("a market order fills on any usable observation", () => {
    expect(selectOrderFill(buy("market"), 1)).toEqual({ fillPx: 1 });
    expect(selectOrderFill(sell("market"), 12345)).toEqual({ fillPx: 12345 });
  });

  it("a buy limit fills at or below its level and not above", () => {
    expect(selectOrderFill(buy("limit", { limitPx: 100 }), 99.99)).not.toBeNull();
    expect(selectOrderFill(buy("limit", { limitPx: 100 }), 100)).not.toBeNull();
    expect(selectOrderFill(buy("limit", { limitPx: 100 }), 100.01)).toBeNull();
  });

  it("a sell limit fills at or above its level and not below", () => {
    expect(selectOrderFill(sell("limit", { limitPx: 100 }), 100.01)).not.toBeNull();
    expect(selectOrderFill(sell("limit", { limitPx: 100 }), 100)).not.toBeNull();
    expect(selectOrderFill(sell("limit", { limitPx: 100 }), 99.99)).toBeNull();
  });

  it("a buy stop triggers at or above its level and not below", () => {
    expect(selectOrderFill(buy("stop", { stopPx: 100 }), 100)).not.toBeNull();
    expect(selectOrderFill(buy("stop", { stopPx: 100 }), 99.99)).toBeNull();
  });

  it("a sell stop triggers at or below its level and not above", () => {
    expect(selectOrderFill(sell("stop", { stopPx: 100 }), 100)).not.toBeNull();
    expect(selectOrderFill(sell("stop", { stopPx: 100 }), 100.01)).toBeNull();
  });

  it("a stop-limit needs BOTH legs — a gap through the limit does not fill", () => {
    const ord = buy("stop-limit", { stopPx: 100, limitPx: 100.5 });
    expect(selectOrderFill(ord, 99), "not yet triggered").toBeNull();
    expect(selectOrderFill(ord, 100.2), "triggered and inside the limit").not.toBeNull();
    // The real reason stop-limits exist: price gapped past the limit, so the
    // order must NOT fill. Booking it anyway is the overconfidence the gate names.
    expect(selectOrderFill(ord, 101), "gapped through the limit").toBeNull();
  });

  it("a sell stop-limit needs BOTH legs", () => {
    const ord = sell("stop-limit", { stopPx: 100, limitPx: 99.5 });
    expect(selectOrderFill(ord, 101)).toBeNull();
    expect(selectOrderFill(ord, 99.8)).not.toBeNull();
    expect(selectOrderFill(ord, 99)).toBeNull();
  });
});

describe("selectOrderFill — an unusable observation is not a fill", () => {
  it("declines a price that is not a usable number", () => {
    for (const px of [NaN, Infinity, -Infinity, 0, -5]) {
      expect(selectOrderFill(buy("market"), px), `px=${px}`).toBeNull();
    }
  });

  it("treats a missing level as unconstrained rather than freezing the order forever", () => {
    // Shipped behaviour: `ord.limitPx ?? px` made the comparison trivially true.
    // An order whose level was never recorded is not silently unfillable.
    expect(selectOrderFill(buy("limit", {}), 50)).toEqual({ fillPx: 50 });
    expect(selectOrderFill(sell("stop", {}), 50)).toEqual({ fillPx: 50 });
    expect(selectOrderFill(buy("stop-limit", {}), 50)).toEqual({ fillPx: 50 });
  });

  it("treats a non-finite level the same way — never a silent NaN comparison", () => {
    expect(selectOrderFill(buy("limit", { limitPx: NaN }), 50)).toEqual({ fillPx: 50 });
  });

  it("returns null for an order type it does not recognise, rather than filling", () => {
    const rogue = { side: "buy", type: "iceberg" } as unknown as OrderFillInput;
    expect(selectOrderFill(rogue, 50)).toBeNull();
  });
});

describe("/paper delegates the fill decision instead of re-typing it", () => {
  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    // Without this, an unreadable or renamed file makes every not.toContain
    // below pass against an empty string. That has happened for real in this
    // codebase once already.
    expect(paperPage.length).toBeGreaterThan(50_000);
    expect(pageCode).toContain("quoteObservedAt");
    expect(pageCode).toContain("selectOrderRejection");
  });

  it("calls selectOrderFill", () => {
    expect(pageCode).toContain("selectOrderFill(ord, px)");
  });

  it("THE DEFECT: does not book the limit level as the fill price", () => {
    expect(pageCode).not.toContain("ord.limitPx ?? px");
    expect(pageCode).not.toContain("ord.limitPx??px");
  });

  it("and the OWNER does not book it either — where the defect actually moved", () => {
    // MEASURED, not hypothetical. The extraction that created `selectOrderFill`
    // copied `order.limitPx ?? px` into the new function's return statement,
    // one line below a docblock explaining at length why that is wrong. The
    // guard above only reads the COMPONENT, so it watched the defect walk out
    // of the file it was guarding and into the one it was moving to.
    //
    // Extracting a defect into a function named after the correct behaviour
    // makes it harder to see, not easier: the name and the comment both read
    // as if the fix had happened. Only the red tests disagreed.
    //
    // `??` is the specific hazard — it catches null and undefined but passes a
    // NaN level straight through, so a non-finite limit became a NaN fill.
    const ownerCode = fs.readFileSync(
      path.join(process.cwd(), "src/lib/paperTrade.ts"), "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(ownerCode).toContain("selectOrderFill");
    expect(
      ownerCode.replace(/\s+/g, ""),
      "the fill price is the OBSERVED price for every order type; the limit " +
        "answers WHETHER, never HOW MUCH",
    ).not.toContain("fillPx:(order.limitPx??px)");
  });

  it("does not re-type the trigger comparisons in the component", () => {
    // The owner holds them now. Two copies drift.
    expect(pageCode).not.toContain("ord.stopPx??px");
    expect(pageCode).not.toContain("ord.stopPx ?? px");
  });

  it("the funded-buy gate is priced from the same fill the ledger records", () => {
    // fillPx feeds selectOrderRejection AND the running cash decrement, so a
    // wrong fill price propagated into the account balance, not just the blotter.
    expect(pageCode).toContain("const fillPx = fill.fillPx;");
    expect(pageCode).toContain("price: fillPx");
    expect(pageCode).toContain("cashRunning -= ord.qty * fillPx * mult");
  });

  it("the recorded fill and its observation time come from the same tick", () => {
    // This is the invariant the whole atom exists to protect: one Trade, one
    // observation. `quoteObservedAt` is readiness.observedAt for the same `px`
    // that selectOrderFill was handed.
    expect(pageCode).toContain("const px = readiness.price;");
    expect(pageCode).toContain("quoteObservedAt: readiness.observedAt");
  });
});
