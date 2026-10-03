import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CAPABILITY_LABEL, CAPABILITY_LEDGER, type CapabilityId } from "./capabilityLedger";

describe("broker capability ledger (§26 / §86) — granular, earned, never one green word", () => {
  it("every provider answers every capability exactly once", () => {
    const caps = Object.keys(CAPABILITY_LABEL) as CapabilityId[];
    for (const p of ["tastytrade", "Webull"] as const) {
      const rows = CAPABILITY_LEDGER.filter(r => r.provider === p);
      expect(rows.map(r => r.capability).sort()).toEqual([...caps].sort());
    }
  });
  it("every claim names the file that earns it, and the file exists", () => {
    for (const r of CAPABILITY_LEDGER) {
      if (r.state === "UNSUPPORTED" || r.state === "NOT_BUILT") continue;
      expect(r.owner, `${r.provider} ${r.capability}`).toBeTruthy();
      expect(existsSync(join(process.cwd(), r.owner!)), `${r.provider} ${r.capability} → ${r.owner}`).toBe(true);
    }
  });
  it("no execution row claims LIVE — orders are always armed by the human", () => {
    for (const r of CAPABILITY_LEDGER) if (r.capability.startsWith("EXEC_")) expect(r.state).not.toBe("LIVE");
  });
  it("every row says why in words", () => {
    for (const r of CAPABILITY_LEDGER) expect(r.note.length, `${r.provider} ${r.capability}`).toBeGreaterThan(5);
  });
});
