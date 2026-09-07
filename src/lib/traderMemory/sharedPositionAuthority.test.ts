/**
 * THE RECONCILIATION LAW — owner tests.
 *
 * These are not "does the function return a string" tests. Each case is one
 * sentence of canon, executed:
 *
 *   H16  "stale client cannot overwrite newer reconVersion"
 *   §11  "Only the reconciliation worker writes quantity and working-order
 *         truth. Everyone else writes intent."
 *   §14  "the UI never says FLAT while broker quantity is above zero"
 *   §8   a designed boundary is never ERROR / INVALID / FAILED
 */

import { describe, expect, it } from "vitest";
import {
  decideWrite,
  RECON_LAW_VERSION,
  SHARED_POSITION_AUTHORITY,
  type ClientIntentWrite,
  type ReconciliationWrite,
} from "./sharedPositionAuthority";

function intent(overrides: Partial<ClientIntentWrite> = {}): ClientIntentWrite {
  return {
    role: "CLIENT_INTENT",
    decisionId: "d-1",
    baseReconVersion: 7,
    intent: "Take the retest if it holds",
    deviceId: "iphone-founder",
    ...overrides,
  };
}

function recon(overrides: Partial<ReconciliationWrite> = {}): ReconciliationWrite {
  return {
    role: "RECONCILIATION",
    decisionId: "d-1",
    baseReconVersion: 7,
    quantityFilled: 3,
    quantityProtected: 3,
    executionState: "FILLED",
    protectionState: "PROTECTED",
    ...overrides,
  };
}

describe("H16 — THE STALE OVERWRITE, the defect this module exists to stop", () => {
  it("the sleeping phone cannot write FLAT over three live contracts", () => {
    // The founder opened on the iPad; the record moved 7 -> 9. The phone woke
    // holding version 7 and believes quantity is 0.
    const verdict = decideWrite(9, intent({ baseReconVersion: 7 }));

    expect(verdict.verdict).toBe("REJECT_STALE");
    expect(verdict.nextReconVersion).toBeNull();
  });

  it("names both versions, so the trader can tell WHICH device is behind", () => {
    const verdict = decideWrite(9, intent({ baseReconVersion: 7 }));
    expect(verdict.note).toContain("7");
    expect(verdict.note).toContain("9");
  });

  it("says nothing was lost — a stale phone is behind, not broken", () => {
    const verdict = decideWrite(9, intent({ baseReconVersion: 7 }));
    expect(verdict.note.toLowerCase()).toContain("nothing was lost");
  });

  it("rejects a RECONCILIATION write that is stale too — the worker is not exempt", () => {
    // A second worker instance replaying an old broker snapshot is the same
    // defect wearing a badge. Role does not buy ordering.
    expect(decideWrite(9, recon({ baseReconVersion: 7 })).verdict).toBe("REJECT_STALE");
  });
});

describe("THE INVENTED VERSION — a writer AHEAD of the authority", () => {
  it("is rejected, not waved through as 'newer'", () => {
    // This is the shape a replayed or forged write takes. Accepting it would
    // let a client choose its own ordering.
    const verdict = decideWrite(4, intent({ baseReconVersion: 11 }));
    expect(verdict.verdict).toBe("REJECT_STALE");
    expect(verdict.nextReconVersion).toBeNull();
  });

  it("does not accuse the device of lying — it states the version mismatch", () => {
    const verdict = decideWrite(4, intent({ baseReconVersion: 11 }));
    expect(verdict.note).toContain("11");
    expect(verdict.note).toContain("4");
  });
});

describe("§11 — the client that writes broker truth", () => {
  const SETTLED = [
    "quantityFilled",
    "quantityProtected",
    "quantityRequested",
    "executionState",
    "protectionState",
    "brokerOrderIds",
  ];

  for (const key of SETTLED) {
    it(`a CLIENT_INTENT write carrying ${key} is refused`, () => {
      // Over the wire the compiler was never present: this arrives as parsed
      // JSON with an extra key. The type says it cannot happen; the runtime
      // is what actually stops it.
      const wire = { ...intent(), [key]: 1 } as unknown as ClientIntentWrite;
      const verdict = decideWrite(7, wire);

      expect(verdict.verdict).toBe("REJECT_ROLE");
      expect(verdict.nextReconVersion).toBeNull();
      expect(verdict.note).toContain(key);
    });
  }

  it("names EVERY trespassing field, not just the first", () => {
    const wire = {
      ...intent(),
      quantityFilled: 3,
      protectionState: "PROTECTED",
    } as unknown as ClientIntentWrite;

    const note = decideWrite(7, wire).note;
    expect(note).toContain("quantityFilled");
    expect(note).toContain("protectionState");
  });

  it("discards the intent too, and says so — a half-applied write is worse", () => {
    const wire = { ...intent(), quantityFilled: 3 } as unknown as ClientIntentWrite;
    expect(decideWrite(7, wire).note.toLowerCase()).toContain("was not recorded");
  });

  it("STALE beats ROLE: a phone that is behind AND overreaching is told to refresh", () => {
    // Naming the role problem would send the trader to fix the wrong thing.
    // Refreshing is the action that actually resolves this write.
    const wire = {
      ...intent({ baseReconVersion: 2 }),
      quantityFilled: 3,
    } as unknown as ClientIntentWrite;

    expect(decideWrite(9, wire).verdict).toBe("REJECT_STALE");
  });

  it("the RECONCILIATION worker may say all of it — that is the whole point", () => {
    expect(decideWrite(7, recon()).verdict).toBe("ACCEPT");
  });
});

describe("ACCEPT — the version is minted by the authority, never by the writer", () => {
  it("a clean intent lands at current + 1", () => {
    const verdict = decideWrite(7, intent({ baseReconVersion: 7 }));
    expect(verdict.verdict).toBe("ACCEPT");
    expect(verdict.nextReconVersion).toBe(8);
  });

  it("a clean reconciliation lands at current + 1", () => {
    expect(decideWrite(7, recon()).nextReconVersion).toBe(8);
  });

  it("works from a fresh record at version 0", () => {
    expect(decideWrite(0, intent({ baseReconVersion: 0 })).nextReconVersion).toBe(1);
  });

  it("distinguishes the two accepted writes in words — §5 STEP 5 intent is not a fill", () => {
    expect(decideWrite(7, recon()).note.toLowerCase()).toContain("reconciliation");
    expect(decideWrite(7, intent()).note.toLowerCase()).toContain("intent");
  });

  it("never reports a next version on a rejection", () => {
    expect(decideWrite(9, intent({ baseReconVersion: 7 })).nextReconVersion).toBeNull();
    expect(decideWrite(4, intent({ baseReconVersion: 11 })).nextReconVersion).toBeNull();
  });
});

describe("§8 — a designed boundary is not a crash", () => {
  const FORBIDDEN = ["ERROR", "FATAL", "CRITICAL", "INVALID", "FAILED", "ILLEGAL"];

  const everyVerdict = [
    decideWrite(9, intent({ baseReconVersion: 7 })),
    decideWrite(4, intent({ baseReconVersion: 11 })),
    decideWrite(7, { ...intent(), quantityFilled: 3 } as unknown as ClientIntentWrite),
    decideWrite(7, intent()),
    decideWrite(7, recon()),
  ];

  for (const word of FORBIDDEN) {
    it(`no note says ${word}`, () => {
      for (const v of everyVerdict) {
        expect(v.note.toUpperCase()).not.toContain(word);
      }
    });
  }

  it("every note is a whole sentence a surface may show, not a code", () => {
    for (const v of everyVerdict) {
      expect(v.note.length).toBeGreaterThan(20);
      expect(v.note.trim()).toMatch(/[.!]$/);
    }
  });

  it("every decision carries the law version that produced it", () => {
    for (const v of everyVerdict) {
      expect(v.version).toBe(RECON_LAW_VERSION);
    }
  });
});

describe("the authority name is exported beside the law, not typed into the UI", () => {
  it("is the string selectCapitalReach demands before it will say ALL_DEVICES", () => {
    expect(SHARED_POSITION_AUTHORITY).toBe("wm_decision_positions");
    expect(SHARED_POSITION_AUTHORITY.trim()).not.toBe("");
  });
});

describe("PURITY — the law can be tested without a database", () => {
  it("the same inputs give the same verdict, twice, with no clock involved", () => {
    const a = decideWrite(7, intent());
    const b = decideWrite(7, intent());
    expect(a).toEqual(b);
  });

  it("does not mutate the write it was handed", () => {
    const w = intent();
    const before = JSON.stringify(w);
    decideWrite(7, w);
    expect(JSON.stringify(w)).toBe(before);
  });
});
