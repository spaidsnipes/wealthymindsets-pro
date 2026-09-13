import { describe, expect, it } from "vitest";

import {
  birthOnPermissionCrossing,
  classifyPermissionCrossing,
  type PermissionCrossing,
} from "./permissionBirth";
import { isDecisionId } from "./decisionIdentity";
import type { PermissionVerdict } from "./viewModels/selectPermission";

const ALL: readonly PermissionVerdict[] = ["ALLOWED", "ADVISORY", "RESTRICTED", "UNKNOWN"];

describe("classifyPermissionCrossing", () => {
  it("is exhaustive over every prior × next pair — no pair falls through", () => {
    const priors: readonly (PermissionVerdict | null)[] = [null, ...ALL];
    for (const prev of priors) {
      for (const next of ALL) {
        const out: PermissionCrossing = classifyPermissionCrossing(prev, next);
        expect(["NO_PRIOR_READING", "CROSSED_INTO_GRANTED", "NOT_A_CROSSING"]).toContain(out);
      }
    }
  });

  it("names exactly two crossings in the whole matrix: ADVISORY→ALLOWED and RESTRICTED→ALLOWED", () => {
    const priors: readonly (PermissionVerdict | null)[] = [null, ...ALL];
    const crossings: string[] = [];
    for (const prev of priors) {
      for (const next of ALL) {
        if (classifyPermissionCrossing(prev, next) === "CROSSED_INTO_GRANTED") {
          crossings.push(`${prev ?? "null"}->${next}`);
        }
      }
    }
    expect(crossings.sort()).toEqual(["ADVISORY->ALLOWED", "RESTRICTED->ALLOWED"]);
  });

  it("a first evaluable reading is not an event", () => {
    expect(classifyPermissionCrossing(null, "ALLOWED")).toBe("NO_PRIOR_READING");
  });

  it("UNKNOWN is the absence of a prior reading, not a limiting one", () => {
    // The cold-load sequence. If this ever returns CROSSED_INTO_GRANTED a
    // decision is born on every page load and identity becomes a render count.
    expect(classifyPermissionCrossing("UNKNOWN", "ALLOWED")).toBe("NO_PRIOR_READING");
  });

  it("staying ALLOWED across renders is not a repeat birth", () => {
    expect(classifyPermissionCrossing("ALLOWED", "ALLOWED")).toBe("NOT_A_CROSSING");
  });

  it("never births on a verdict that is not ALLOWED, whatever preceded it", () => {
    for (const prev of [null, ...ALL] as readonly (PermissionVerdict | null)[]) {
      for (const next of ["ADVISORY", "RESTRICTED", "UNKNOWN"] as const) {
        expect(classifyPermissionCrossing(prev, next)).toBe("NOT_A_CROSSING");
      }
    }
  });
});

describe("birthOnPermissionCrossing", () => {
  const seed = { deviceId: "dev-1", nowMs: 1_700_000_000_000, nonce: "abc-123" };

  it("mints a lawful DecisionId on a real grant, stamped PERMISSION_GRANTED", () => {
    const out = birthOnPermissionCrossing({ prev: "RESTRICTED", next: "ALLOWED", ...seed });
    expect(out.born).toBe(true);
    if (!out.born) return;
    expect(out.mint.ok).toBe(true);
    if (!out.mint.ok) return;
    expect(out.mint.identity.bornFrom).toBe("PERMISSION_GRANTED");
    expect(isDecisionId(out.mint.identity.decisionId)).toBe(true);
    expect(out.mint.identity.bornAt).toBe(seed.nowMs);
  });

  it("does not mint on a cold load, and says WHICH non-birth it was", () => {
    const out = birthOnPermissionCrossing({ prev: null, next: "ALLOWED", ...seed });
    expect(out.born).toBe(false);
    expect(out.crossing).toBe("NO_PRIOR_READING");
  });

  it("hands the mint's refusal back rather than swallowing it into 'no crossing'", () => {
    // A broker-shaped nonce is refused by the identity owner. The caller must
    // be able to tell "you seeded me wrong" apart from "nothing happened".
    const out = birthOnPermissionCrossing({
      prev: "ADVISORY",
      next: "ALLOWED",
      deviceId: "dev-1",
      nowMs: seed.nowMs,
      nonce: "ord-9912",
    });
    expect(out.born).toBe(true);
    if (!out.born) return;
    expect(out.mint.ok).toBe(false);
    if (out.mint.ok) return;
    expect(out.mint.reason).toMatch(/broker|order|fill/i);
  });

  it("is pure — the same inputs give the same identity twice", () => {
    const a = birthOnPermissionCrossing({ prev: "ADVISORY", next: "ALLOWED", ...seed });
    const b = birthOnPermissionCrossing({ prev: "ADVISORY", next: "ALLOWED", ...seed });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
