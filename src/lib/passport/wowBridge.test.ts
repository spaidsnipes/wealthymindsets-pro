import { describe, expect, it } from "vitest";

import { isWowOrigin, safePath, WOW_ORIGIN, wmClaimsFor, wowCallbackUrl } from "./wowBridge";

describe("WOW ↔ WM Pro Passport bridge", () => {
  it("lands only on same-site paths", () => {
    expect(safePath("/charts?symbol=TSLA", "/x")).toBe("/charts?symbol=TSLA");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "charts", "", null, "/a\nb"]) expect(safePath(bad, "/x")).toBe("/x");
  });

  it("maps a Supabase user to WM claims, and refuses one without id or email", () => {
    expect(wmClaimsFor({ id: "u1", email: "a@b.c", user_metadata: { displayName: "Dave", handle: "d" } })).toMatchObject({ sub: "u1", email: "a@b.c", displayName: "Dave", handle: "d", profileComplete: true });
    expect(wmClaimsFor({ id: "u1" })).toBeNull();
    expect(wmClaimsFor(null)).toBeNull();
  });

  it("WOW's callback carries the next path, on WOW's own origin", () => {
    expect(wowCallbackUrl("/realms")).toBe(`${WOW_ORIGIN}/passport/callback?to=%2Frealms`);
    expect(wowCallbackUrl("//evil")).toBe(`${WOW_ORIGIN}/passport/callback`);
  });
});

describe("which addresses count as WOW", () => {
  it("accepts the canonical domain, its www form and the original workers.dev address", () => {
    expect(WOW_ORIGIN).toBe("https://thewow.online");
    for (const o of ["https://thewow.online", "https://www.thewow.online", "https://wow-world-os.dhill5711.workers.dev"]) expect(isWowOrigin(o)).toBe(true);
  });
  it("refuses everything else, including look-alikes, http and a missing Origin", () => {
    for (const o of [null, "", "http://thewow.online", "https://thewow.online.evil.com", "https://evil.com", "https://thewow.online/", "null"]) expect(isWowOrigin(o as string | null)).toBe(false);
  });
});
