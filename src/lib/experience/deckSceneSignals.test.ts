/**
 * deckSceneSignals tests.
 *
 * The compiler is pure and well-tested; the wiring is where a lie would enter.
 * These tests exist to make one specific failure impossible: the adapter
 * quietly claiming the deck knows something about the trader's capital.
 */

import { describe, expect, it } from "vitest";

import { compileScene } from "./compileScene";
import {
  SIGNAL_GROUPS,
  deckSceneSignals,
  rightOfWayFrom,
  sessionOpenFrom,
} from "./deckSceneSignals";

describe("sessionOpenFrom", () => {
  it("maps a closed session to false", () => {
    expect(sessionOpenFrom("CLOSED")).toBe(false);
    expect(sessionOpenFrom("closed")).toBe(false);
    expect(sessionOpenFrom("  Closed  ")).toBe(false);
  });

  it("maps the open sessions to true", () => {
    for (const s of ["RTH", "ETH", "OVERNIGHT", "PREMARKET", "AFTERHOURS"]) {
      expect(sessionOpenFrom(s)).toBe(true);
      expect(sessionOpenFrom(s.toLowerCase())).toBe(true);
    }
  });

  it("§8 LAW: never infers an open session from an unknown value", () => {
    for (const s of ["UNKNOWN", "", "   ", "GARBAGE", "OPEN?", null, undefined]) {
      expect(sessionOpenFrom(s as string | null | undefined)).toBe(null);
    }
  });

  it("never throws on a non-string", () => {
    expect(sessionOpenFrom(42 as unknown as string)).toBe(null);
    expect(sessionOpenFrom({} as unknown as string)).toBe(null);
  });
});

describe("rightOfWayFrom", () => {
  it("passes real verdicts through unchanged", () => {
    for (const v of ["ACTION", "WAIT", "CAUTION", "NO TRADE"] as const) {
      expect(rightOfWayFrom(v)).toBe(v);
    }
  });

  it("collapses UNKNOWN to null — an unknown verdict is not a decision", () => {
    expect(rightOfWayFrom("UNKNOWN")).toBe(null);
    expect(rightOfWayFrom(null)).toBe(null);
    expect(rightOfWayFrom(undefined)).toBe(null);
  });
});

describe("deckSceneSignals — the capital column is never invented", () => {
  it("§14.1 LAW: never reports FLAT for a book it has not read", () => {
    const inputs = [
      { session: "RTH", rightOfWay: "ACTION" as const },
      { session: "CLOSED", rightOfWay: "NO TRADE" as const },
      { session: "UNKNOWN", rightOfWay: null },
      { session: null, rightOfWay: undefined },
    ];
    for (const input of inputs) {
      const { signals } = deckSceneSignals(input);
      expect(signals.position).toBe("POSITION UNCONFIRMED");
      expect(signals.positionConfidence).toBe("UNOBSERVED");
    }
  });

  it("§14.1 LAW: the deck can never compile DONE — it has not read a book", () => {
    for (const session of ["RTH", "ETH", "CLOSED", "UNKNOWN", "OVERNIGHT"]) {
      for (const rightOfWay of ["ACTION", "WAIT", "CAUTION", "NO TRADE", "UNKNOWN"] as const) {
        const { signals } = deckSceneSignals({ session, rightOfWay });
        expect(compileScene(signals).scene).not.toBe("DONE");
      }
    }
  });

  it("reports the capital column as UNOBSERVED in the provenance record", () => {
    const { provenance } = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(provenance.POSITION).toBe("UNOBSERVED");
    expect(provenance.ORDERS).toBe("UNOBSERVED");
    expect(provenance.LINK).toBe("UNOBSERVED");
  });

  it("never claims capital is at risk on a route with no broker", () => {
    for (const session of ["RTH", "CLOSED", "UNKNOWN"]) {
      const { signals } = deckSceneSignals({ session, rightOfWay: "ACTION" });
      expect(compileScene(signals).capitalAtRisk).toBe(false);
    }
  });
});

describe("deckSceneSignals — provenance is honest in both directions", () => {
  it("marks the observed signals OBSERVED when they are real", () => {
    const out = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(out.provenance.SESSION).toBe("OBSERVED");
    expect(out.provenance.DECISION).toBe("OBSERVED");
    expect(out.observedCount).toBe(2);
    expect(out.totalCount).toBe(SIGNAL_GROUPS.length);
  });

  it("marks an unknown session UNOBSERVED rather than guessing", () => {
    const out = deckSceneSignals({ session: "UNKNOWN", rightOfWay: "ACTION" });
    expect(out.provenance.SESSION).toBe("UNOBSERVED");
    expect(out.observedCount).toBe(1);
  });

  it("marks an unknown right-of-way UNOBSERVED rather than guessing", () => {
    const out = deckSceneSignals({ session: "RTH", rightOfWay: "UNKNOWN" });
    expect(out.provenance.DECISION).toBe("UNOBSERVED");
    expect(out.observedCount).toBe(1);
  });

  it("reports zero observed when nothing is known", () => {
    const out = deckSceneSignals({ session: null, rightOfWay: null });
    expect(out.observedCount).toBe(0);
  });

  it("observedCount always equals the number of OBSERVED groups (positive control)", () => {
    const cases = [
      { session: "RTH", rightOfWay: "ACTION" as const },
      { session: "UNKNOWN", rightOfWay: "WAIT" as const },
      { session: "CLOSED", rightOfWay: "UNKNOWN" as const },
      { session: null, rightOfWay: null },
    ];
    for (const input of cases) {
      const out = deckSceneSignals(input);
      const counted = SIGNAL_GROUPS.filter((g) => out.provenance[g] === "OBSERVED").length;
      expect(out.observedCount).toBe(counted);
    }
  });
});

describe("deckSceneSignals — the scenes the deck can actually reach", () => {
  it("an earned right-of-way in an open session compiles to PERMISSION", () => {
    const { signals } = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(compileScene(signals).scene).toBe("PERMISSION");
  });

  it("a withheld right-of-way compiles to WAIT", () => {
    for (const row of ["WAIT", "CAUTION"] as const) {
      const { signals } = deckSceneSignals({ session: "RTH", rightOfWay: row });
      expect(compileScene(signals).scene).toBe("WAIT");
    }
  });

  it("a closed session with nothing pending compiles to CLOSED", () => {
    const { signals } = deckSceneSignals({ session: "CLOSED", rightOfWay: null });
    expect(compileScene(signals).scene).toBe("CLOSED");
  });

  it("nothing resolved compiles to PREGAME", () => {
    const { signals } = deckSceneSignals({ session: "UNKNOWN", rightOfWay: "UNKNOWN" });
    expect(compileScene(signals).scene).toBe("PREGAME");
  });

  it("the scene genuinely varies with the inputs (positive control — no constant output)", () => {
    const scenes = new Set(
      [
        { session: "RTH", rightOfWay: "ACTION" as const },
        { session: "RTH", rightOfWay: "WAIT" as const },
        { session: "CLOSED", rightOfWay: null },
        { session: "UNKNOWN", rightOfWay: "UNKNOWN" as const },
      ].map((i) => compileScene(deckSceneSignals(i).signals).scene),
    );
    expect(scenes.size).toBeGreaterThanOrEqual(4);
  });

  it("§10 ADMISSION: a WAIT scene genuinely withholds the expression shortlist", () => {
    const wait = compileScene(deckSceneSignals({ session: "RTH", rightOfWay: "WAIT" }).signals);
    const permission = compileScene(
      deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" }).signals,
    );
    expect(wait.admits).not.toContain("EXPRESSION_CARD");
    expect(permission.admits).toContain("EXPRESSION_CARD");
  });

  it("§9 CLOSED: a closed session withholds the thesis and the story", () => {
    const closed = compileScene(deckSceneSignals({ session: "CLOSED", rightOfWay: null }).signals);
    expect(closed.admits).not.toContain("THESIS_GEOMETRY");
    expect(closed.admits).not.toContain("ONE_STORY");
    expect(closed.admits).toContain("MARKET_CANVAS");
  });
});
