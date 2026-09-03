import { describe, expect, it } from "vitest";
import type { BrokerCapabilities } from "./broker/BrokerAdapter";
import {
  ORDER_PURPOSES,
  TRIGGER_NOT_FILL_WARNING,
  compileOrderPurpose,
  purposeTradeoff,
  supportedPurposes,
} from "./orderPurpose";

const FULL: BrokerCapabilities = {
  assetClasses: ["equity"],
  orderTypes: ["market", "limit", "stop", "stop-limit"],
  supportsPaper: true,
  supportsLive: true,
  supportsBracketOrders: true,
  supportsShort: true,
  notes: [],
};

const NO_STOPS: BrokerCapabilities = { ...FULL, orderTypes: ["market", "limit"] };

/**
 * §7 ORDER PURPOSE BEFORE ORDER TYPE.
 *
 * The failure this module exists to prevent is the SILENT SUBSTITUTION: a
 * trader asks to cap their loss, the broker cannot do stops, and the software
 * "helpfully" sends a market order. The trader believes they are protected.
 * They are not. Refusal is the only honest answer.
 */
describe("order purpose — refusal over substitution", () => {
  it("refuses an unsupported primitive instead of downgrading it", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: NO_STOPS,
      positionSide: "long",
      level: 90,
      referencePrice: 100,
    });
    expect(r.status).toBe("UNSUPPORTED");
    if (r.status === "COMPILED") throw new Error("must not compile");
    expect(r.reason).toContain("does not support stop orders");
    expect(r.reason).toContain("will not substitute");
  });

  it("never emits a market primitive for a purpose that asked for a stop", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: NO_STOPS,
      positionSide: "long",
      level: 90,
    });
    // The whole defect class: a "protected" trader holding an unbounded order.
    expect(JSON.stringify(r)).not.toContain('"market"');
  });

  it("offers only the purposes this broker can honour", () => {
    const menu = supportedPurposes(NO_STOPS);
    expect(menu).not.toContain("EXIT_IF_THESIS_FAILS");
    expect(menu).toContain("GET_ME_IN_NOW");
    expect(supportedPurposes(FULL)).toHaveLength(ORDER_PURPOSES.length);
  });
});

/**
 * A level is a risk decision. Defaulting it to the market price would convert
 * a deliberate limit into an accidental market order.
 */
describe("order purpose — never fabricates a level", () => {
  it("reports INCOMPLETE when a required level is missing", () => {
    const r = compileOrderPurpose({
      purpose: "GET_ME_IN_DO_NOT_CHASE",
      capabilities: FULL,
      direction: "long",
      referencePrice: 100,
    });
    expect(r.status).toBe("INCOMPLETE");
    if (r.status !== "INCOMPLETE") throw new Error("expected INCOMPLETE");
    expect(r.reason).toContain("invented level is an invented risk");
  });

  it("rejects NaN — `??` does not guard it, so the check must be explicit", () => {
    const r = compileOrderPurpose({
      purpose: "WORK_FOR_A_BETTER_PRICE",
      capabilities: FULL,
      direction: "long",
      level: Number.NaN,
    });
    expect(r.status).toBe("INCOMPLETE");
  });

  it("rejects a non-positive level rather than sending it", () => {
    for (const level of [0, -5]) {
      const r = compileOrderPurpose({
        purpose: "WORK_FOR_A_BETTER_PRICE",
        capabilities: FULL,
        direction: "long",
        level,
      });
      expect(r.status).toBe("INCOMPLETE");
    }
  });
});

/**
 * Exiting a position you do not have is not a no-op — it OPENS one.
 */
describe("order purpose — exit geometry", () => {
  it("refuses an exit while flat, because it would open a new position", () => {
    const r = compileOrderPurpose({
      purpose: "FLATTEN_EVERYTHING",
      capabilities: FULL,
      positionSide: "flat",
    });
    expect(r.status).toBe("REFUSED");
    if (r.status === "COMPILED") throw new Error("must not compile");
    expect(r.reason).toContain("open a NEW position");
  });

  it("refuses a long stop already through the market — that is 'exit now'", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: FULL,
      positionSide: "long",
      level: 105,
      referencePrice: 100,
    });
    expect(r.status).toBe("REFUSED");
    if (r.status === "COMPILED") throw new Error("must not compile");
    expect(r.reason).toContain("trigger immediately");
  });

  it("refuses the mirror case for a short position", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: FULL,
      positionSide: "short",
      level: 95,
      referencePrice: 100,
    });
    expect(r.status).toBe("REFUSED");
  });

  it("compiles a correctly-placed long stop and sells to exit", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: FULL,
      positionSide: "long",
      level: 95,
      referencePrice: 100,
    });
    expect(r.status).toBe("COMPILED");
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.primitive).toEqual({ type: "stop", side: "sell", stopPx: 95 });
  });
});

describe("order purpose — trigger price is not fill price", () => {
  it("warns on every trigger-based primitive", () => {
    const r = compileOrderPurpose({
      purpose: "EXIT_IF_THESIS_FAILS",
      capabilities: FULL,
      positionSide: "long",
      level: 95,
      referencePrice: 100,
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.warnings).toContain(TRIGGER_NOT_FILL_WARNING);
  });

  it("does not attach the trigger warning to a plain limit", () => {
    const r = compileOrderPurpose({
      purpose: "WORK_FOR_A_BETTER_PRICE",
      capabilities: FULL,
      direction: "long",
      level: 95,
      referencePrice: 100,
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.warnings).not.toContain(TRIGGER_NOT_FILL_WARNING);
  });

  it("discloses when it could not verify level geometry", () => {
    const r = compileOrderPurpose({
      purpose: "WORK_FOR_A_BETTER_PRICE",
      capabilities: FULL,
      direction: "long",
      level: 95,
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.warnings.join(" ")).toContain("could not check");
  });
});

describe("order purpose — contradiction warnings", () => {
  it("warns when a 'do not chase' limit is already chasing", () => {
    const r = compileOrderPurpose({
      purpose: "GET_ME_IN_DO_NOT_CHASE",
      capabilities: FULL,
      direction: "long",
      level: 101,
      referencePrice: 100,
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.warnings.join(" ")).toContain("that is chasing");
  });

  it("stays silent when the patient entry is genuinely patient", () => {
    const r = compileOrderPurpose({
      purpose: "GET_ME_IN_DO_NOT_CHASE",
      capabilities: FULL,
      direction: "long",
      level: 99,
      referencePrice: 100,
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.warnings.join(" ")).not.toContain("chasing");
  });
});

describe("order purpose — every choice states its cost", () => {
  it("no purpose is offered without naming what it sacrifices", () => {
    for (const p of ORDER_PURPOSES) {
      const t = purposeTradeoff(p);
      expect(t.prioritises.length).toBeGreaterThan(0);
      expect(t.sacrifices.length).toBeGreaterThan(0);
    }
  });

  it("market purposes carry no price fields at all", () => {
    const r = compileOrderPurpose({
      purpose: "GET_ME_IN_NOW",
      capabilities: FULL,
      direction: "long",
    });
    if (r.status !== "COMPILED") throw new Error("expected COMPILED");
    expect(r.primitive).toEqual({ type: "market", side: "buy" });
    expect(r.primitive.limitPx).toBeUndefined();
    expect(r.primitive.stopPx).toBeUndefined();
  });

  it("an entry with no direction chosen does not guess long", () => {
    const r = compileOrderPurpose({ purpose: "GET_ME_IN_NOW", capabilities: FULL });
    expect(r.status).toBe("INCOMPLETE");
  });
});
