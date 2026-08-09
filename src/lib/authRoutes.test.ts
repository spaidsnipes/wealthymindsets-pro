import { describe, expect, it } from "vitest";

import { PUBLIC_AUTH_PATHS, isPublicAuthPath } from "./authRoutes";

describe("public auth route ownership", () => {
  it("keeps every public auth workflow outside the authenticated shell", () => {
    expect(PUBLIC_AUTH_PATHS).toEqual(["/login", "/signup", "/reset-password"]);
    for (const path of PUBLIC_AUTH_PATHS) {
      expect(isPublicAuthPath(path)).toBe(true);
    }
  });

  it("allows nested auth paths without matching unrelated prefixes", () => {
    expect(isPublicAuthPath("/reset-password/expired")).toBe(true);
    expect(isPublicAuthPath("/login-history")).toBe(false);
    expect(isPublicAuthPath("/charts")).toBe(false);
  });
});
