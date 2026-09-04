import { describe, expect, it } from "vitest";
import {
  EXIT_NEVER_BLOCKED_NOTE,
  selectExitPermission,
  type ExitPermissionInput,
} from "./exitPermission";

/**
 * BUILD ORDER §14.6 — "Nectar being down cannot block a flatten."
 *
 * Written against a real live defect: AlpacaTradingPanel disabled its whole
 * order form on `!account`, so a failed ACCOUNT BALANCE fetch — a read-only,
 * informational call — greyed out SELL and trapped a trader in a position.
 *
 * The asymmetry is the whole law. Degradation removes the ability to ADD risk.
 * It never removes the ability to SHED it.
 */

const base: ExitPermissionInput = {
  side: "sell",
  qty: 4,
  heldQty: 4,
  accountObserved: true,
};

describe("§14.6 — a degraded dependency cannot block the exit", () => {
  it("lets a flatten through when the account fetch failed", () => {
    const p = selectExitPermission({
      ...base,
      accountObserved: false,
      degraded: ["Account"],
    });

    expect(p.allowed).toBe(true);
    expect(p.effect).toBe("REDUCES_RISK");
    expect(p.reason).toBeNull();
    expect(p.disclosure).toContain(EXIT_NEVER_BLOCKED_NOTE);
  });

  it("lets a flatten through when Nectar is down — the named §14.6 case", () => {
    const p = selectExitPermission({
      ...base,
      degraded: ["Nectar", "Quotes"],
    });

    expect(p.allowed).toBe(true);
    expect(p.disclosure).toContain("Nectar, Quotes unavailable");
  });

  it("lets a short cover through, not just a long sale", () => {
    const p = selectExitPermission({
      side: "buy",
      qty: 3,
      heldQty: -3,
      accountObserved: false,
      degraded: ["Account"],
    });

    expect(p.allowed).toBe(true);
    expect(p.effect).toBe("REDUCES_RISK");
    expect(p.riskReducingQty).toBe(3);
  });

  it("allows a partial exit, not only a full one", () => {
    const p = selectExitPermission({ ...base, qty: 1, accountObserved: false });
    expect(p.allowed).toBe(true);
    expect(p.effect).toBe("REDUCES_RISK");
  });

  it("says nothing extra when nothing is degraded", () => {
    const p = selectExitPermission(base);
    expect(p.allowed).toBe(true);
    expect(p.disclosure).toBeNull();
  });

  it("blocks only for an in-flight submit — the one non-data reason", () => {
    const p = selectExitPermission({ ...base, inFlight: true });
    expect(p.allowed).toBe(false);
    expect(p.reason).toContain("already being submitted");
  });

  it("refuses an empty or nonsense quantity without pretending it is a policy", () => {
    expect(selectExitPermission({ ...base, qty: 0 }).reason).toContain("greater than zero");
    expect(selectExitPermission({ ...base, qty: -2 }).allowed).toBe(false);
    expect(selectExitPermission({ ...base, qty: Number.NaN }).allowed).toBe(false);
  });
});

describe("§14.6 — adding risk is the thing degradation may withhold", () => {
  it("blocks an opening buy when buying power was never observed", () => {
    const p = selectExitPermission({
      side: "buy",
      qty: 10,
      heldQty: 0,
      accountObserved: false,
    });

    expect(p.allowed).toBe(false);
    expect(p.effect).toBe("INCREASES_RISK");
    expect(p.reason).toContain("Buying power is unknown");
  });

  it("allows the same opening buy once the account is observed", () => {
    const p = selectExitPermission({
      side: "buy",
      qty: 10,
      heldQty: 0,
      accountObserved: true,
    });

    expect(p.allowed).toBe(true);
    expect(p.reason).toBeNull();
  });

  it("names the exit that IS available instead of dead-ending the trader", () => {
    // Held 4 long, asked to sell 10: 4 closes, 6 opens a short. Refused —
    // but a refusal that does not name the available action is a trap with
    // better manners.
    const p = selectExitPermission({
      side: "sell",
      qty: 10,
      heldQty: 4,
      accountObserved: false,
    });

    expect(p.allowed).toBe(false);
    expect(p.effect).toBe("INCREASES_RISK");
    expect(p.riskReducingQty).toBe(4);
    expect(p.reason).toContain("You can still close up to 4.");
  });

  it("treats an order that crosses through flat as adding risk", () => {
    const p = selectExitPermission({
      side: "sell",
      qty: 5,
      heldQty: 4,
      accountObserved: true,
    });

    // Allowed, because the account is known — but it is not an exit, and the
    // effect must not be mislabelled as one.
    expect(p.allowed).toBe(true);
    expect(p.effect).toBe("INCREASES_RISK");
  });

  it("adding to an existing long is adding risk, not reducing it", () => {
    const p = selectExitPermission({
      side: "buy",
      qty: 1,
      heldQty: 4,
      accountObserved: false,
    });

    expect(p.effect).toBe("INCREASES_RISK");
    expect(p.riskReducingQty).toBe(0);
    expect(p.allowed).toBe(false);
  });
});

describe("§14.1 boundary — an unknown book is not a flat book", () => {
  it("does not treat a null position as zero", () => {
    const p = selectExitPermission({ ...base, heldQty: null, accountObserved: true });

    expect(p.effect).toBe("UNKNOWN_EFFECT");
    expect(p.riskReducingQty).toBeNull();
  });

  it("still allows the order, and says plainly that it cannot confirm an exit", () => {
    // Refusing here would trap a trader whose position merely failed to LOAD.
    // Allowing an unfunded entry is caught by the broker; a screen that
    // wrongly blocks has no backstop at all.
    const p = selectExitPermission({
      ...base,
      heldQty: null,
      accountObserved: false,
      degraded: ["Positions"],
    });

    expect(p.allowed).toBe(true);
    expect(p.disclosure).toContain("could not be confirmed");
    expect(p.disclosure).toContain("Positions unavailable");
  });

  it("treats a non-finite held quantity as unknown, never as flat", () => {
    const p = selectExitPermission({ ...base, heldQty: Number.NaN });
    expect(p.effect).toBe("UNKNOWN_EFFECT");
    expect(p.riskReducingQty).toBeNull();
  });

  it("an in-flight submit still outranks an unknown book", () => {
    const p = selectExitPermission({ ...base, heldQty: null, inFlight: true });
    expect(p.allowed).toBe(false);
  });
});

describe("§15 — pure selector, no hidden state", () => {
  it("returns the same permission for the same input", () => {
    const input: ExitPermissionInput = {
      side: "sell",
      qty: 2,
      heldQty: 7,
      accountObserved: false,
      degraded: ["Nectar"],
    };

    expect(selectExitPermission(input)).toEqual(selectExitPermission(input));
  });

  it("never returns both a reason and an allowance", () => {
    const cases: ExitPermissionInput[] = [
      base,
      { ...base, accountObserved: false },
      { ...base, heldQty: null },
      { ...base, qty: 0 },
      { ...base, inFlight: true },
      { side: "buy", qty: 9, heldQty: 0, accountObserved: false },
    ];

    for (const c of cases) {
      const p = selectExitPermission(c);
      expect(p.allowed).toBe(p.reason === null);
      if (!p.allowed) expect(p.disclosure).toBeNull();
    }
  });
});
