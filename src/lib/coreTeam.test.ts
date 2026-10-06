import { describe, expect, it } from "vitest";
import { CORE_TEAM_EMAILS, CORE_TEAM_HANDLES, isCoreTeam } from "./coreTeam";

describe("core team is proven by verified email, never by a claimable handle (ATHOS P0.1)", () => {
  it("a core-team HANDLE on a stranger's account grants nothing", () => {
    for (const h of CORE_TEAM_HANDLES) expect(isCoreTeam(h, "stranger@example.com"), h).toBe(false);
    expect(isCoreTeam("@petey", null)).toBe(false);
  });
  it("a listed email is core team regardless of handle or case", () => {
    const [email] = [...CORE_TEAM_EMAILS];
    expect(isCoreTeam(null, email.toUpperCase())).toBe(true);
    expect(isCoreTeam("anything", email)).toBe(true);
  });
});
