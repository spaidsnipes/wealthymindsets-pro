/**
 * NO MEMBER, NO LEDGER (guest walk, serving 32c95db, 2026-10-10).
 *
 * Signed out, every room (/charts, /journal, /desk, …) called
 * /api/market-memory/coverage and was answered 401 in the instant before the
 * shell redirected to /login. The path test could not see it — the path is a
 * room. The ledger is the member's, so it is read and written only once the
 * auth owner (managementOwner, set by AuthContext) names a member.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.join(process.cwd(), "src/lib/marketData/sessionNectar.ts"), "utf8");
const calls = [...src.matchAll(/fetch\("\/api\/market-memory\/coverage"/g)];

describe("the coverage ledger is never asked without a member", () => {
  it("ANTI-VACUITY: the module and both ledger calls were read", () => {
    expect(src.length).toBeGreaterThan(5000);
    expect(calls.length).toBe(2);
  });

  it("the gate is the auth owner's member, not the path", () => {
    expect(src).toContain('import { currentManagementOwner, MANAGEMENT_OWNER_EVENT } from "@/lib/journal/managementOwner";');
    expect(src).toContain('const noMember = () => typeof currentManagementOwner() !== "string";');
    expect(src).toContain("const noLedger = () => atSignedOutDoor() || noMember();");
  });

  it("every path to a ledger call passes the gate", () => {
    // persistRemote (the write) returns before its fetch…
    const write = src.slice(src.indexOf("const persistRemote = () => {"), src.indexOf("method: \"POST\""));
    expect(write).toContain("if (noLedger()) return;");
    // …and hydrateRemote (the read) is only ever called behind it.
    const callers = [...src.matchAll(/hydrateRemote\(\);/g)].map(m => src.slice(Math.max(0, m.index! - 60), m.index!));
    expect(callers.length).toBe(3);
    for (const c of callers) expect(c).toContain("!noLedger()");
    expect(src).not.toMatch(/!atSignedOutDoor\(\)\) hydrateRemote/);
  });

  it("a member named after load reads the ledger then", () => {
    expect(src).toContain("window.addEventListener(MANAGEMENT_OWNER_EVENT, () => {");
  });
});
