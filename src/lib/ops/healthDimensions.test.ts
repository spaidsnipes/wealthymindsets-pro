/**
 * The Garden Pass's health-dimension Sentinel, exercised.
 *
 * Every case below DRIVES the owner's own `HEALTH_DIMENSIONS` table
 * rather than retyping the six names. Retyping them here would install
 * the exact defect the module exists to prevent — a second copy of a
 * list that cannot notice when the first one changes — and would make
 * this file go green over a seventh dimension nobody had implemented.
 *
 * The first test is a positive control and it is not decoration. Nearly
 * every assertion afterwards is built by mapping over the owner's table,
 * so an EMPTY table would make `allNormal()` the empty object, which
 * `assessHealthDimensions` would then correctly report as "nothing was
 * measured" — and several tests would pass for a reason unrelated to
 * what they claim to check.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_FAILURE_STATES,
  type CanonicalFailureState,
} from "@/lib/systemHealth/failureStateGrammar";
import {
  DIMENSION_QUESTION,
  HEALTH_DIMENSIONS,
  assessHealthDimensions,
  refuseBooleanHealth,
  type DimensionReadings,
  type HealthDimension,
} from "@/lib/ops/healthDimensions";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const OWNER = "src/lib/ops/healthDimensions.ts";

/** Every dimension reading NORMAL — the only shape that may be green. */
function allNormal(): DimensionReadings {
  const r: Record<string, CanonicalFailureState> = {};
  for (const d of HEALTH_DIMENSIONS) r[d] = "NORMAL";
  return r as DimensionReadings;
}

describe("health dimensions — the table is real", () => {
  it("carries the canon's six dimensions and no seventh", () => {
    // POSITIVE CONTROL. An empty or truncated table makes most of the
    // cases below vacuous, so this stands in front of them.
    expect(HEALTH_DIMENSIONS.length).toBe(6);
    expect([...HEALTH_DIMENSIONS]).toEqual([
      "AVAILABLE",
      "ENTITLED",
      "FRESH",
      "AUTHORIZED",
      "EXECUTABLE",
      "RECOVERABLE",
    ]);
    expect(Object.keys(allNormal())).toHaveLength(6);
  });

  it("glosses every dimension, so no surface has to invent one", () => {
    for (const d of HEALTH_DIMENSIONS) {
      expect(DIMENSION_QUESTION[d], `${d} has no question`).toMatch(/\?$/);
    }
  });

  it("ranks every state the STATE owner defines", () => {
    // The severity map is keyed by the imported union. If the grammar
    // grows a seventh state, an unranked state would sort as healthiest.
    // TypeScript catches that; this catches it without running tsc.
    for (const s of CANONICAL_FAILURE_STATES) {
      const readings = { ...allNormal(), AVAILABLE: s } as DimensionReadings;
      const v = assessHealthDimensions(readings);
      if (s === "NORMAL") {
        expect(v.worst, `${s} should leave the verdict NORMAL`).toBe("NORMAL");
      } else {
        expect(v.worst, `${s} was not ranked above NORMAL`).toBe(s);
      }
    }
  });
});

describe("a single green must be earned by all six", () => {
  it("admits green only when all six were read and all six read NORMAL", () => {
    const v = assessHealthDimensions(allNormal());
    expect(v.greenAdmissible).toBe(true);
    expect(v.failureClass).toBeNull();
    expect(v.dissenting).toEqual([]);
    expect(v.unread).toEqual([]);
  });

  it("refuses the green when ANY ONE dimension dissents — each in turn", () => {
    // Driven off the owner's table, so a seventh dimension is covered the
    // day it is added rather than the day someone remembers to add a case.
    for (const d of HEALTH_DIMENSIONS) {
      const readings = { ...allNormal(), [d]: "BLOCKED" } as DimensionReadings;
      const v = assessHealthDimensions(readings);
      expect(v.greenAdmissible, `${d} BLOCKED still produced a green`).toBe(false);
      expect(v.failureClass).toBe("FALSE_RIPENESS");
      expect(v.dissenting).toEqual([{ dimension: d, state: "BLOCKED" }]);
      expect(v.reason, `${d} dissented but is not named in the sentence`).toContain(d);
    }
  });

  it("refuses the green when ANY ONE dimension was never measured", () => {
    for (const d of HEALTH_DIMENSIONS) {
      const readings = { ...allNormal() } as Record<string, CanonicalFailureState>;
      delete readings[d];
      const v = assessHealthDimensions(readings as DimensionReadings);
      expect(v.greenAdmissible, `${d} unmeasured still produced a green`).toBe(false);
      expect(v.failureClass).toBe("UNREAD_DIMENSION");
      expect(v.unread).toEqual([d]);
      expect(v.reason).toContain(d);
    }
  });

  it("treats an explicit UNKNOWN exactly like never having looked", () => {
    // UNKNOWN is a canon state, but it is not a claim. A dimension that
    // answered "I don't know" cannot support a green any more than a
    // dimension nobody asked.
    for (const d of HEALTH_DIMENSIONS) {
      const v = assessHealthDimensions({ ...allNormal(), [d]: "UNKNOWN" } as DimensionReadings);
      expect(v.greenAdmissible).toBe(false);
      expect(v.failureClass).toBe("UNREAD_DIMENSION");
      expect(v.unread).toEqual([d]);
      expect(v.dissenting, "UNKNOWN is not a proven failure").toEqual([]);
    }
  });

  it("refuses an empty reading set rather than defaulting to healthy", () => {
    const v = assessHealthDimensions({});
    expect(v.greenAdmissible).toBe(false);
    expect(v.failureClass).toBe("UNREAD_DIMENSION");
    expect(v.unread).toEqual([...HEALTH_DIMENSIONS]);
    expect(v.worst).toBe("UNKNOWN");
  });
});

describe("the measured provider cases the canon cited", () => {
  it("Longbridge: answered the underlying, denied the option quote (301604)", () => {
    // AVAILABLE true, ENTITLED false. One boolean cannot say this, which
    // is the entire empirical argument for the dimension split.
    const v = assessHealthDimensions({
      ...allNormal(),
      ENTITLED: "BLOCKED",
    });
    expect(v.greenAdmissible).toBe(false);
    expect(v.failureClass).toBe("FALSE_RIPENESS");
    expect(v.reason).toContain("ENTITLED is BLOCKED");
    // The thing that DID work must not be erased by the thing that did not.
    expect(v.dissenting.map((d) => d.dimension)).not.toContain("AVAILABLE");
  });

  it("Alpaca: INDICATIVE fresh, OPRA an explicit subscription denial", () => {
    const indicative = assessHealthDimensions(allNormal());
    const opra = assessHealthDimensions({ ...allNormal(), ENTITLED: "UNAVAILABLE" });
    expect(indicative.greenAdmissible).toBe(true);
    expect(opra.greenAdmissible).toBe(false);
    expect(opra.worst).toBe("UNAVAILABLE");
  });

  it("names BOTH a proven dissent and an unmeasured gap, but classes the dissent", () => {
    const readings = { ...allNormal() } as Record<string, CanonicalFailureState>;
    readings.ENTITLED = "DEGRADED";
    delete readings.RECOVERABLE;
    const v = assessHealthDimensions(readings as DimensionReadings);
    expect(v.failureClass, "a proven dissent outranks an unmeasured gap").toBe(
      "FALSE_RIPENESS",
    );
    expect(v.unread).toEqual(["RECOVERABLE"]);
    expect(v.reason).toContain("ENTITLED is DEGRADED");
    expect(v.reason).toContain("RECOVERABLE");
  });
});

describe("refuseBooleanHealth can only ever subtract", () => {
  it("leaves a claimed-healthy boolean alone when all six agree", () => {
    expect(refuseBooleanHealth(true, allNormal()).healthy).toBe(true);
  });

  it("pulls a claimed-healthy boolean down when a dimension dissents", () => {
    for (const d of HEALTH_DIMENSIONS) {
      const out = refuseBooleanHealth(true, {
        ...allNormal(),
        [d]: "DEGRADED",
      } as DimensionReadings);
      expect(out.healthy, `${d} DEGRADED did not pull the boolean down`).toBe(false);
      expect(out.verdict.reason).toContain(d);
    }
  });

  it("NEVER upgrades a false claim, even when every dimension is NORMAL", () => {
    // The one-way property. If this ever inverts, a surface could use the
    // guard to manufacture a green it never claimed, and the guard becomes
    // the defect it was written to prevent.
    expect(refuseBooleanHealth(false, allNormal()).healthy).toBe(false);
  });
});

describe("the owner derives its vocabulary instead of retyping it", () => {
  const code = readFileSync(join(REPO_ROOT, OWNER), "utf8");

  it("imports the state vocabulary from the module that owns it", () => {
    // Garden gate G2: exactly one canonical owner, consumers import. A
    // second hand-typed copy of NORMAL/DEGRADED/BLOCKED/... here would be
    // correct today and unable to notice the day the grammar changes.
    expect(code).toMatch(/from "@\/lib\/systemHealth\/failureStateGrammar"/);
    expect(
      code,
      "the state list must not be re-declared here — import it",
    ).not.toMatch(/const\s+CANONICAL_FAILURE_STATES\s*=/);
  });

  it("keeps the one-way enforcement expression, not merely the identifier", () => {
    // A declaration is not an enforcement: `greenAdmissible` would still
    // appear all over this file if the `&&` that actually gates the
    // boolean were deleted.
    expect(
      code,
      "refuseBooleanHealth no longer gates the claim on the verdict, so it " +
        "can hand back a green the caller did not earn",
    ).toContain("claimedHealthy && verdict.greenAdmissible");
  });
});
