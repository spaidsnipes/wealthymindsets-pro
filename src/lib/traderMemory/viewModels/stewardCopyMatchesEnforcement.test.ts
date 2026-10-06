/**
 * Garden 18 §4 finding 4 (2026-10-06): the Steward's "override" wording must
 * agree with what the system actually enforces.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultFounderRules, selectPermission } from "./selectPermission";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");

describe("Steward override copy matches enforcement", () => {
  const vm = selectPermission({ ownerId: "u", sessionIdentity: "s", nowMs: 1, rules: defaultFounderRules(), sessionDecisions: [] });
  it("a hard rule engaged reads RESTRICTED and never promises an acknowledge step that does not exist", () => {
    expect(vm.verdict).toBe("RESTRICTED");
    expect(vm.reason).toMatch(/override capacity/);
    expect(vm.reason).toMatch(/does not block the order/);
    expect(vm.reason).not.toMatch(/Consider acknowledging the override/);
  });
  it("…because no surface sets overrideHardRule and the order routes do not read Steward rules", () => {
    for (const r of ["app/api/broker/tastytrade/order-submit/route.ts", "app/api/broker/webull/order-submit/route.ts"]) {
      const src = read(r);
      expect(src).not.toContain("overrideHardRule");
      expect(src).not.toContain("selectPermission");
    }
  });
});
