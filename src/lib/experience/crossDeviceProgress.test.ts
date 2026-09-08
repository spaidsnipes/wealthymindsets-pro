/**
 * selectCrossDeviceProgress — the second sentence, under test.
 *
 * The dangerous mistake this file exists to prevent has one shape: an
 * OBSERVED authority quietly becoming a claim of PARITY. The table answering
 * proves a shared record exists. It does not prove this book is written to it,
 * and every assertion below that matters is a variation on that sentence.
 */

import { describe, expect, it } from "vitest";
import {
  selectCapitalReach,
  selectCrossDeviceProgress,
  type CapitalStoreFacts,
  type SharedAuthorityObservation,
} from "./capitalReach";

const LOCAL: CapitalStoreFacts = {
  medium: "BROWSER_LOCAL",
  crossTabInvalidation: true,
  serverAuthority: null,
};

const SHARED: CapitalStoreFacts = {
  medium: "SERVER_SHARED",
  crossTabInvalidation: true,
  serverAuthority: "wm_decision_positions",
};

const UNOBSERVED: SharedAuthorityObservation = {
  status: "UNOBSERVED", authority: null, note: null,
};
const ANSWERED: SharedAuthorityObservation = {
  status: "OBSERVED", authority: "wm_decision_positions", note: null,
};
const ABSENT: SharedAuthorityObservation = {
  status: "OBSERVED",
  authority: null,
  note: "The shared position table has not been created on this database yet.",
};
const SIGNED_OUT: SharedAuthorityObservation = {
  status: "SIGNED_OUT", authority: null, note: null,
};

function progress(facts: CapitalStoreFacts, obs: SharedAuthorityObservation) {
  return selectCrossDeviceProgress(selectCapitalReach(facts), obs);
}

describe("THE ONE THAT MATTERS — a reachable table is not parity", () => {
  it("a live authority does NOT mark the paper book as shared", () => {
    // This is the whole trap. The table exists; the localStorage book is not
    // written to it. If step 2 flipped here, /paper would tell the founder his
    // phone can see a position that is nowhere near a server.
    const p = progress(LOCAL, ANSWERED);
    expect(p.steps[0].state).toBe("DONE");
    expect(p.steps[1].state).toBe("NOT_YET");
  });

  it("says so in words the trader can act on", () => {
    const p = progress(LOCAL, ANSWERED);
    expect(p.nextDependency).toContain("not written to it");
  });

  it("only a store that actually reaches all devices marks step 2 done", () => {
    const p = progress(SHARED, ANSWERED);
    expect(p.steps[1].state).toBe("DONE");
    expect(p.nextDependency).toBeNull();
  });

  it("step 2 ignores the observation entirely — it reads the reach verdict", () => {
    // Same store, three different observations, same step-2 answer.
    for (const obs of [UNOBSERVED, ANSWERED, ABSENT, SIGNED_OUT]) {
      expect(progress(LOCAL, obs).steps[1].state).toBe("NOT_YET");
    }
  });
});

describe("UNOBSERVED is not NO — §14.1", () => {
  it("before the probe returns, nothing is claimed either way", () => {
    const p = progress(LOCAL, UNOBSERVED);
    expect(p.steps[0].state).toBe("UNOBSERVED");
  });

  it("offers no next dependency it has not established", () => {
    // Naming a migration WM has not checked for would send the founder to a
    // dashboard on a guess.
    expect(progress(LOCAL, UNOBSERVED).nextDependency).toBeNull();
  });

  it("only a probe that has never asked gets to say 'has not asked'", () => {
    // §8. UNOBSERVED is three silences wearing one word: never asked, cannot
    // re-check, could not read the reply. The probe distinguishes them with
    // `note`; if this selector ignores it, all three read as "has not asked
    // yet" — which is false for two of them and hides that WM tried.
    const RECHECKING: SharedAuthorityObservation = {
      status: "UNOBSERVED",
      authority: null,
      note: "WM cannot re-check the shared record from a device that is offline.",
    };
    expect(progress(LOCAL, RECHECKING).steps[0].detail).toBe(RECHECKING.note);
    expect(progress(LOCAL, RECHECKING).steps[0].detail).not.toContain("has not asked");
    // The never-asked case keeps its own sentence.
    expect(progress(LOCAL, UNOBSERVED).steps[0].detail).toContain("has not asked");
  });

  it("a signed-out device reports UNOBSERVED, not ABSENT", () => {
    const p = progress(LOCAL, SIGNED_OUT);
    expect(p.steps[0].state).toBe("UNOBSERVED");
    expect(p.nextDependency).toBeNull();
  });

  it("and explains that the answer is per-trader rather than going quiet", () => {
    expect(progress(LOCAL, SIGNED_OUT).steps[0].detail).toContain("signed-in");
  });
});

describe("the dead end becomes an instruction", () => {
  it("an unavailable authority does not guess the cause or promise migration alone gives parity", () => {
    const p = progress(LOCAL, ABSENT);
    expect(p.steps[0].state).toBe("NOT_YET");
    expect(p.nextDependency).toContain("migration");
    expect(p.nextDependency).toContain("does not establish");
    expect(p.nextDependency).toContain("book must also be written");
    expect(p.nextDependency).not.toContain("has not been created");
  });

  it("passes the route's own sentence through instead of rewriting it", () => {
    // Two descriptions of the same condition is how the first one stops being
    // true. The route knows why; this selector repeats it.
    expect(progress(LOCAL, ABSENT).steps[0].detail).toBe(ABSENT.note);
  });

  it("does not turn an inconclusive transport receipt into a missing-table diagnosis", () => {
    const note = "The shared position store did not answer this check. Its availability is unverified.";
    const p = progress(LOCAL, { status: "OBSERVED", authority: null, note });
    expect(p.steps[0].detail).toBe(note);
    expect(p.nextDependency).not.toMatch(/has not been created|only thing standing/);
    expect(p.nextDependency).toContain("Verify shared position access");
  });

  it("still says something when the route gave no reason", () => {
    const p = progress(LOCAL, { status: "OBSERVED", authority: null, note: null });
    expect(p.steps[0].detail.length).toBeGreaterThan(10);
  });

  it("a blank authority string is not an authority", () => {
    const p = progress(LOCAL, { status: "OBSERVED", authority: "   ", note: null });
    expect(p.steps[0].state).toBe("NOT_YET");
  });

  it("names the authority it saw, so the founder can check the right table", () => {
    expect(progress(LOCAL, ANSWERED).steps[0].detail).toContain("wm_decision_positions");
  });
});

describe("§8 — every sentence here is a designed boundary, not a crash", () => {
  const all = [
    progress(LOCAL, UNOBSERVED), progress(LOCAL, ANSWERED),
    progress(LOCAL, ABSENT), progress(LOCAL, SIGNED_OUT),
    progress(SHARED, ANSWERED),
  ];

  for (const word of ["ERROR", "FATAL", "CRITICAL", "INVALID", "FAILED", "COMING SOON", "NEEDS WIRING"]) {
    it(`never says ${word}`, () => {
      for (const p of all) {
        const text = [...p.steps.map(s => `${s.label} ${s.detail}`), p.nextDependency ?? ""].join(" ");
        expect(text.toUpperCase()).not.toContain(word);
      }
    });
  }

  it("every step has a label and a detail — a state with no sentence is a code", () => {
    for (const p of all) {
      for (const s of p.steps) {
        expect(s.label.trim().length).toBeGreaterThan(5);
        expect(s.detail.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it("the step order is the build order and never varies", () => {
    for (const p of all) {
      expect(p.steps.map(s => s.label)).toEqual([
        "A shared record every device can read",
        "This book written to that record",
      ]);
    }
  });
});

describe("PURITY", () => {
  it("same inputs, same output, no clock", () => {
    expect(progress(LOCAL, ANSWERED)).toEqual(progress(LOCAL, ANSWERED));
  });
});
