/**
 * Scene compiler tests — BUILD ORDER §10.
 *
 * These are not coverage tests. Each block locks a law that WM Pro has already
 * broken at least once in production, and the POSITIVE CONTROLS at the top
 * exist because a detector that silently stops detecting reads exactly like a
 * clean bill of health.
 */

import { describe, expect, it } from "vitest";

import {
  SCENES,
  SCENE_COMPILER_VERSION,
  SURFACE_ELEMENTS,
  compileScene,
  type Scene,
  type SceneSignals,
  type SurfaceElement,
} from "./compileScene";

/**
 * A trader who has opened the app and nothing else. Every law below is proved
 * by moving exactly one field off this baseline, so a failure names its cause.
 */
function baseline(): SceneSignals {
  return {
    position: "FLAT",
    positionConfidence: "CONFIRMED",
    intentInFlight: false,
    exposureIncreasingWorkingOrders: 0,
    linkVerified: null,
    sessionOpen: null,
    rightOfWay: null,
    composingIntent: false,
    hadCapitalEvent: false,
    receiptWritten: false,
  };
}

function signals(patch: Partial<SceneSignals>): SceneSignals {
  return { ...baseline(), ...patch };
}

describe("compileScene — positive controls", () => {
  it("the baseline actually compiles to PREGAME (if this drifts, every other test below is meaningless)", () => {
    const out = compileScene(baseline());
    expect(out.scene).toBe("PREGAME");
    expect(out.capitalAtRisk).toBe(false);
    expect(out.degraded).toBe(false);
  });

  it("the baseline is genuinely movable — a single field flips the scene", () => {
    expect(compileScene(signals({ rightOfWay: "ACTION" })).scene).toBe("PERMISSION");
    expect(compileScene(signals({ position: "LONG" })).scene).toBe("MANAGE");
    expect(compileScene(signals({ intentInFlight: true })).scene).toBe("PENDING");
    expect(compileScene(signals({ sessionOpen: false })).scene).toBe("CLOSED");
  });

  it("admission is a real filter, not a list of everything", () => {
    const pregame = compileScene(baseline());
    expect(pregame.admits.length).toBeLessThan(SURFACE_ELEMENTS.length);
    expect(pregame.admits).not.toContain("EXPRESSION_CARD");
    expect(pregame.admits).not.toContain("FLATTEN_CONFIRM");
  });
});

describe("compileScene — the ten scenes are total and reachable", () => {
  it("declares exactly ten scenes with no duplicates", () => {
    expect(SCENES).toHaveLength(10);
    expect(new Set(SCENES).size).toBe(10);
  });

  it("every declared scene is reachable from some real signal combination", () => {
    const reaching: Record<Scene, SceneSignals> = {
      PREGAME: baseline(),
      WAIT: signals({ rightOfWay: "WAIT" }),
      PERMISSION: signals({ rightOfWay: "ACTION" }),
      EXECUTE: signals({ composingIntent: true }),
      PENDING: signals({ intentInFlight: true }),
      MANAGE: signals({ position: "LONG" }),
      DEGRADED: signals({ position: "LONG", linkVerified: false }),
      CLOSED: signals({ sessionOpen: false }),
      RECEIPT: signals({ hadCapitalEvent: true }),
      DONE: signals({ hadCapitalEvent: true, receiptWritten: true }),
    };

    for (const scene of SCENES) {
      expect(compileScene(reaching[scene]).scene).toBe(scene);
    }
  });

  it("admission is defined for every scene and never empty", () => {
    for (const scene of SCENES) {
      const withRisk = compileScene(
        scene === "DEGRADED"
          ? signals({ position: "LONG", linkVerified: false })
          : baseline(),
      );
      expect(withRisk.admits.length).toBeGreaterThan(0);
    }
  });

  it("never admits an element outside the declared vocabulary (§H19: no dead vocabulary)", () => {
    const known = new Set<SurfaceElement>(SURFACE_ELEMENTS);
    const cases: SceneSignals[] = [
      baseline(),
      signals({ rightOfWay: "WAIT" }),
      signals({ rightOfWay: "ACTION" }),
      signals({ composingIntent: true }),
      signals({ intentInFlight: true }),
      signals({ position: "SHORT" }),
      signals({ position: "LONG", linkVerified: false }),
      signals({ sessionOpen: false }),
      signals({ hadCapitalEvent: true }),
      signals({ hadCapitalEvent: true, receiptWritten: true }),
    ];
    for (const s of cases) {
      for (const element of compileScene(s).admits) {
        expect(known.has(element)).toBe(true);
      }
    }
  });

  it("stamps the compiler version so a surface can refuse an unknown contract", () => {
    expect(compileScene(baseline()).version).toBe(SCENE_COMPILER_VERSION);
  });
});

describe("compileScene — §9: a failure may reduce capability, it may not increase certainty", () => {
  it("an unverified link while a position is open compiles to DEGRADED, not MANAGE", () => {
    const out = compileScene(signals({ position: "LONG", linkVerified: false }));
    expect(out.scene).toBe("DEGRADED");
    expect(out.degraded).toBe(true);
  });

  it("an unconfirmed book while capital could be exposed compiles to DEGRADED", () => {
    const out = compileScene(
      signals({ position: "POSITION UNCONFIRMED", positionConfidence: "STALE", hadCapitalEvent: true }),
    );
    expect(out.scene).toBe("DEGRADED");
  });

  it("DEGRADED cannot be masked by a prettier scene that is also true", () => {
    // Every one of these would otherwise select a calmer scene.
    const maskingAttempts: Partial<SceneSignals>[] = [
      { rightOfWay: "ACTION" },
      { rightOfWay: "WAIT" },
      { rightOfWay: "NO TRADE" },
      { composingIntent: true },
      { sessionOpen: false },
      { receiptWritten: true },
    ];
    for (const patch of maskingAttempts) {
      const out = compileScene(signals({ position: "LONG", linkVerified: false, ...patch }));
      expect(out.scene).toBe("DEGRADED");
    }
  });

  it("a broken link with nothing at stake does NOT cry wolf", () => {
    // The trader never connected a broker. Permanent DEGRADED would be noise,
    // and noise trains people to stop reading the label that matters later.
    const out = compileScene(signals({ linkVerified: false }));
    expect(out.scene).not.toBe("DEGRADED");
  });

  it("DEGRADED keeps the way out (§9 / §H6: keep OPEN BROKER)", () => {
    const out = compileScene(signals({ position: "LONG", linkVerified: false }));
    expect(out.admits).toContain("OPEN_BROKER");
    expect(out.admits).toContain("FLATTEN_CONFIRM");
  });

  it("DEGRADED withholds the surfaces that would imply confidence it does not have", () => {
    const out = compileScene(signals({ position: "LONG", linkVerified: false }));
    expect(out.admits).not.toContain("EXPRESSION_CARD");
    expect(out.admits).not.toContain("ONE_STORY");
    expect(out.admits).not.toContain("THESIS_GEOMETRY");
  });

  it("regression — the 2026-09-03 Alpaca shape: a FAILED fetch must not read as flat-and-fine", () => {
    // The panel rendered "No open positions" when the fetch failed. Under this
    // compiler the same inputs cannot reach DONE.
    const out = compileScene(
      signals({
        position: "POSITION UNCONFIRMED",
        positionConfidence: "UNOBSERVED",
        linkVerified: false,
        hadCapitalEvent: true,
      }),
    );
    expect(out.scene).toBe("DEGRADED");
    expect(out.scene).not.toBe("DONE");
  });
});

describe("compileScene — §14.1: FLAT is a finding, never a default", () => {
  it("DONE is unreachable from POSITION UNCONFIRMED", () => {
    for (const confidence of ["CONFIRMED", "STALE", "TIME UNVERIFIED", "UNOBSERVED", "DISPUTED"] as const) {
      const out = compileScene(
        signals({
          position: "POSITION UNCONFIRMED",
          positionConfidence: confidence,
          receiptWritten: true,
          hadCapitalEvent: true,
        }),
      );
      expect(out.scene).not.toBe("DONE");
    }
  });

  it("DONE is unreachable while the book is merely STALE", () => {
    const out = compileScene(
      signals({ positionConfidence: "STALE", hadCapitalEvent: true, receiptWritten: true }),
    );
    expect(out.scene).not.toBe("DONE");
  });

  it("DONE requires flatness that was actually observed", () => {
    const out = compileScene(signals({ hadCapitalEvent: true, receiptWritten: true }));
    expect(out.scene).toBe("DONE");
  });
});

describe("compileScene — §21: the flatten / working-order race", () => {
  it("flat with an exposure-increasing working order is NOT done", () => {
    const out = compileScene(signals({ exposureIncreasingWorkingOrders: 1, receiptWritten: true, hadCapitalEvent: true }));
    expect(out.scene).not.toBe("DONE");
    expect(out.scene).toBe("PENDING");
  });

  it("states the §21 grammar verbatim, including the count", () => {
    const out = compileScene(signals({ exposureIncreasingWorkingOrders: 1 }));
    expect(out.reason).toBe("FLAT POSITION · WORKING BUY 1 · POTENTIAL EXPOSURE 1 · NOT DONE");
  });

  it("carries the real count, not a boolean", () => {
    const out = compileScene(signals({ exposureIncreasingWorkingOrders: 3 }));
    expect(out.reason).toContain("WORKING BUY 3");
    expect(out.reason).toContain("POTENTIAL EXPOSURE 3");
  });

  it("a working order makes capital at-risk even with a flat confirmed book", () => {
    expect(compileScene(signals({ exposureIncreasingWorkingOrders: 1 })).capitalAtRisk).toBe(true);
  });

  it("no working orders and a written receipt does reach DONE", () => {
    const out = compileScene(
      signals({ exposureIncreasingWorkingOrders: 0, hadCapitalEvent: true, receiptWritten: true }),
    );
    expect(out.scene).toBe("DONE");
  });

  it("tolerates fractional or negative garbage without inventing exposure", () => {
    expect(compileScene(signals({ exposureIncreasingWorkingOrders: -2 })).scene).not.toBe("PENDING");
    expect(compileScene(signals({ exposureIncreasingWorkingOrders: 0.4 })).scene).not.toBe("PENDING");
  });
});

describe("compileScene — §5 STEP 6: the broker's silence outranks the app's optimism", () => {
  it("an in-flight intent compiles to PENDING even over an open position", () => {
    expect(compileScene(signals({ position: "LONG", intentInFlight: true })).scene).toBe("PENDING");
  });

  it("PENDING still admits the position controls — nothing is lost by putting the silence first", () => {
    const out = compileScene(signals({ position: "LONG", intentInFlight: true }));
    expect(out.admits).toContain("PROTECTION_GRADE");
    expect(out.admits).toContain("FLATTEN_CONFIRM");
    expect(out.admits).toContain("OPEN_BROKER");
    expect(out.admits).toContain("PENDING_BANNER");
  });
});

describe("compileScene — §5 STEP 10: the receipt is owed before the screen goes quiet", () => {
  it("flat after a capital event with no receipt compiles to RECEIPT", () => {
    const out = compileScene(signals({ hadCapitalEvent: true }));
    expect(out.scene).toBe("RECEIPT");
    expect(out.admits).toContain("RECEIPT_SHEET");
  });

  it("an unwritten receipt after a capital event keeps capital accounted-for", () => {
    expect(compileScene(signals({ hadCapitalEvent: true })).capitalAtRisk).toBe(true);
  });

  it("writing the receipt releases the room", () => {
    const out = compileScene(signals({ hadCapitalEvent: true, receiptWritten: true }));
    expect(out.scene).toBe("DONE");
    expect(out.capitalAtRisk).toBe(false);
  });
});

describe("compileScene — §18: a refused day is also success", () => {
  it("NO TRADE with nothing risked reaches DONE, not WAIT", () => {
    const out = compileScene(signals({ rightOfWay: "NO TRADE" }));
    expect(out.scene).toBe("DONE");
    expect(out.reason).toContain("VALID NO TRADE");
  });

  it("NO TRADE never routes to WAIT — a rejected thesis is answered, not deferred", () => {
    expect(compileScene(signals({ rightOfWay: "NO TRADE" })).scene).not.toBe("WAIT");
    expect(
      compileScene(signals({ rightOfWay: "NO TRADE", positionConfidence: "STALE" })).scene,
    ).not.toBe("WAIT");
  });

  it("NO TRADE cannot claim DONE once real capital has moved", () => {
    const out = compileScene(signals({ rightOfWay: "NO TRADE", hadCapitalEvent: true }));
    expect(out.scene).toBe("RECEIPT");
  });
});

describe("compileScene — §9 INTERRUPTION: only capital truth may take the room", () => {
  it("ambient surfaces are withheld in every scene where capital is at risk", () => {
    const atRiskCases: Partial<SceneSignals>[] = [
      { position: "LONG" },
      { position: "SHORT" },
      { intentInFlight: true },
      { exposureIncreasingWorkingOrders: 1 },
      { hadCapitalEvent: true },
      { position: "LONG", linkVerified: false },
    ];
    for (const patch of atRiskCases) {
      const out = compileScene(signals(patch));
      expect(out.capitalAtRisk).toBe(true);
      expect(out.admitsAmbient).toBe(false);
    }
  });

  it("DEGRADED withholds ambient surfaces even with nothing exposed — it has not earned the right to teach", () => {
    // Reached via an unconfirmed book plus an unreceipted capital event.
    const out = compileScene(signals({ positionConfidence: "DISPUTED", hadCapitalEvent: true }));
    expect(out.scene).toBe("DEGRADED");
    expect(out.admitsAmbient).toBe(false);
  });

  it("the quiet scenes DO admit ambient surfaces — this is where Academy and Nectar live", () => {
    expect(compileScene(baseline()).admitsAmbient).toBe(true);
    expect(compileScene(signals({ rightOfWay: "WAIT" })).admitsAmbient).toBe(true);
    expect(compileScene(signals({ sessionOpen: false })).admitsAmbient).toBe(true);
    expect(compileScene(signals({ rightOfWay: "NO TRADE" })).admitsAmbient).toBe(true);
  });
});

describe("compileScene — locked admission invariants", () => {
  const everyScenePath: { scene: Scene; s: SceneSignals }[] = [
    { scene: "PREGAME", s: baseline() },
    { scene: "WAIT", s: signals({ rightOfWay: "WAIT" }) },
    { scene: "PERMISSION", s: signals({ rightOfWay: "ACTION" }) },
    { scene: "EXECUTE", s: signals({ composingIntent: true }) },
    { scene: "PENDING", s: signals({ intentInFlight: true }) },
    { scene: "MANAGE", s: signals({ position: "LONG" }) },
    { scene: "DEGRADED", s: signals({ position: "LONG", linkVerified: false }) },
    { scene: "CLOSED", s: signals({ sessionOpen: false }) },
    { scene: "RECEIPT", s: signals({ hadCapitalEvent: true }) },
    { scene: "DONE", s: signals({ hadCapitalEvent: true, receiptWritten: true }) },
  ];

  it("OPEN_BROKER is admitted in every scene where capital is at risk", () => {
    for (const { s } of everyScenePath) {
      const out = compileScene(s);
      if (out.capitalAtRisk) {
        expect(out.admits).toContain("OPEN_BROKER");
      }
    }
  });

  it("FLATTEN_CONFIRM is admitted wherever a position can be closed", () => {
    for (const { s } of everyScenePath) {
      const out = compileScene(s);
      const canClose = s.position === "LONG" || s.position === "SHORT" || s.intentInFlight;
      if (canClose) {
        expect(out.admits).toContain("FLATTEN_CONFIRM");
      }
    }
  });

  it("MARKET_CANVAS is sacred — admitted in all ten scenes", () => {
    for (const { s } of everyScenePath) {
      expect(compileScene(s).admits).toContain("MARKET_CANVAS");
    }
  });

  it("the expression shortlist is never admitted without earned permission or live capital", () => {
    for (const { s } of everyScenePath) {
      const out = compileScene(s);
      if (out.admits.includes("EXPRESSION_CARD")) {
        const earned =
          s.rightOfWay === "ACTION" ||
          s.composingIntent ||
          s.position === "LONG" ||
          s.position === "SHORT" ||
          s.intentInFlight;
        expect(earned).toBe(true);
      }
    }
  });

  it("admits no duplicates in any scene", () => {
    for (const { s } of everyScenePath) {
      const admits = compileScene(s).admits;
      expect(new Set(admits).size).toBe(admits.length);
    }
  });

  it("every reason is a sentence naming the cause, not a badge (§9)", () => {
    for (const { s } of everyScenePath) {
      const reason = compileScene(s).reason;
      expect(reason.length).toBeGreaterThan(20);
      expect(reason.trim()).toBe(reason);
      expect(reason).not.toContain("  ");
      expect(reason).not.toContain("undefined");
    }
  });
});

/**
 * §22 ORKIN FINDING, 2026-09-05.
 *
 * A revive-attempt deleted the `working === 0` guard from the DONE branch and
 * the suite stayed GREEN. That is not a hole in the law — it is proof the guard
 * is redundant by construction, because the PENDING branch intercepts
 * `working > 0` upstream and DONE is never reached. The hand-written §21 case
 * above was therefore passing for a different reason than its name claims.
 *
 * The guard stays (defence in depth costs nothing and keeps DONE locally
 * correct if the cascade is ever reordered), but the LAW is pinned here instead
 * — exhaustively, over the whole reachable signal space, so it survives any
 * future reordering that removes either enforcement point.
 */
describe("compileScene — exhaustive invariants over the reachable signal space", () => {
  const positions = ["FLAT", "LONG", "SHORT", "POSITION UNCONFIRMED"] as const;
  const confidences = ["CONFIRMED", "STALE", "TIME UNVERIFIED", "UNOBSERVED", "DISPUTED"] as const;
  const rightsOfWay = [null, "ACTION", "WAIT", "CAUTION", "NO TRADE", "UNKNOWN"] as const;
  const tri = [null, true, false] as const;

  function* everyState(): Generator<SceneSignals> {
    for (const position of positions)
      for (const positionConfidence of confidences)
        for (const rightOfWay of rightsOfWay)
          for (const linkVerified of tri)
            for (const sessionOpen of tri)
              for (const intentInFlight of [false, true])
                for (const exposureIncreasingWorkingOrders of [0, 1, 2])
                  for (const composingIntent of [false, true])
                    for (const hadCapitalEvent of [false, true])
                      for (const receiptWritten of [false, true])
                        yield {
                          position,
                          positionConfidence,
                          rightOfWay,
                          linkVerified,
                          sessionOpen,
                          intentInFlight,
                          exposureIncreasingWorkingOrders,
                          composingIntent,
                          hadCapitalEvent,
                          receiptWritten,
                        };
  }

  it("covers a large state space (positive control — if this collapses, the laws below prove nothing)", () => {
    let n = 0;
    for (const _ of everyState()) n++;
    expect(n).toBeGreaterThan(10_000);
  });

  it("§21 LAW: DONE never coexists with an exposure-increasing working order", () => {
    for (const s of everyState()) {
      if (compileScene(s).scene === "DONE") {
        expect(s.exposureIncreasingWorkingOrders).toBe(0);
      }
    }
  });

  it("§14.1 LAW: DONE never coexists with an unobserved or unconfirmed book", () => {
    for (const s of everyState()) {
      if (compileScene(s).scene === "DONE") {
        expect(s.position).toBe("FLAT");
        expect(s.positionConfidence).toBe("CONFIRMED");
      }
    }
  });

  it("§9 LAW: DONE never coexists with an intent the broker has not answered", () => {
    for (const s of everyState()) {
      if (compileScene(s).scene === "DONE") {
        expect(s.intentInFlight).toBe(false);
      }
    }
  });

  it("§5 STEP 10 LAW: DONE never coexists with an unwritten receipt after a capital event", () => {
    for (const s of everyState()) {
      if (compileScene(s).scene === "DONE") {
        expect(s.hadCapitalEvent && !s.receiptWritten).toBe(false);
      }
    }
  });

  it("§9 LAW: capital at risk always implies ambient surfaces are withheld", () => {
    for (const s of everyState()) {
      const out = compileScene(s);
      if (out.capitalAtRisk) expect(out.admitsAmbient).toBe(false);
    }
  });

  it("§9/§H6 LAW: capital at risk always implies the escape hatch survives", () => {
    for (const s of everyState()) {
      const out = compileScene(s);
      if (out.capitalAtRisk) expect(out.admits).toContain("OPEN_BROKER");
    }
  });

  /**
   * The load-bearing one. The escape-hatch test above can be satisfied by the
   * structural backstop in `build()` even when the SCENE is wrong — an Orkin
   * revive-attempt on 2026-09-05 proved exactly that. Admission being right
   * while the scene lies is still a lie. This pins the semantics.
   */
  it("§9 LAW: a quiet scene is NEVER reached while capital is at risk", () => {
    const quiet: readonly Scene[] = ["PREGAME", "WAIT", "CLOSED", "DONE", "PERMISSION"];
    for (const s of everyState()) {
      const out = compileScene(s);
      if (out.capitalAtRisk) {
        expect(quiet).not.toContain(out.scene);
      }
    }
  });

  it("§9 LAW: capital at risk resolves to exactly one of the four accountable scenes", () => {
    const accountable: readonly Scene[] = ["DEGRADED", "PENDING", "MANAGE", "RECEIPT"];
    for (const s of everyState()) {
      const out = compileScene(s);
      if (out.capitalAtRisk) {
        expect(accountable).toContain(out.scene);
      }
    }
  });

  it("§14.1 LAW: an unreceipted capital event on an unread book is DEGRADED, not a quiet screen", () => {
    for (const positionConfidence of confidences) {
      const out = compileScene(
        signals({
          position: "POSITION UNCONFIRMED",
          positionConfidence,
          hadCapitalEvent: true,
          receiptWritten: false,
          sessionOpen: false,
        }),
      );
      expect(out.scene).toBe("DEGRADED");
    }
  });

  it("§9 LAW: an open position always keeps FLATTEN_CONFIRM and PROTECTION_GRADE reachable", () => {
    for (const s of everyState()) {
      const out = compileScene(s);
      if (s.position === "LONG" || s.position === "SHORT") {
        expect(out.admits).toContain("FLATTEN_CONFIRM");
        expect(out.admits).toContain("PROTECTION_GRADE");
      }
    }
  });

  it("§9 LAW: a failure never increases certainty — DEGRADED withholds the confident surfaces", () => {
    for (const s of everyState()) {
      const out = compileScene(s);
      if (out.degraded) {
        expect(out.admits).not.toContain("EXPRESSION_CARD");
        expect(out.admits).not.toContain("ONE_STORY");
        expect(out.admitsAmbient).toBe(false);
      }
    }
  });

  it("TOTALITY: every state compiles to a declared scene with a sentence and a non-empty admission", () => {
    const known = new Set<Scene>(SCENES);
    for (const s of everyState()) {
      const out = compileScene(s);
      expect(known.has(out.scene)).toBe(true);
      expect(out.admits.length).toBeGreaterThan(0);
      expect(out.reason.length).toBeGreaterThan(20);
      expect(out.admits).toContain("MARKET_CANVAS");
    }
  });

  it("TOTALITY: `degraded` is true exactly when the scene is DEGRADED", () => {
    for (const s of everyState()) {
      const out = compileScene(s);
      expect(out.degraded).toBe(out.scene === "DEGRADED");
    }
  });
});

describe("compileScene — purity", () => {
  it("is deterministic for identical inputs", () => {
    const s = signals({ position: "LONG", linkVerified: false });
    expect(compileScene(s)).toEqual(compileScene(s));
  });

  it("does not mutate its input", () => {
    const s = signals({ position: "LONG", exposureIncreasingWorkingOrders: 2 });
    const before = JSON.stringify(s);
    compileScene(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
