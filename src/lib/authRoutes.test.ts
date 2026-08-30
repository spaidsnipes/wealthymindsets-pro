import { describe, expect, it } from "vitest";

import {
  PUBLIC_AUTH_PATHS,
  isPublicAuthPath,
  selectAuthenticatedRouteState,
} from "./authRoutes";

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

describe("authenticated route render readiness", () => {
  const completeUser = { profileComplete: true };
  const legacyCompleteUser = { profileComplete: false, displayName: "Founder" };
  const incompleteUser = { profileComplete: false };

  it("keeps public auth workflows renderable during session hydration", () => {
    expect(selectAuthenticatedRouteState("/login", null, true)).toBe("PUBLIC");
  });

  it("fails protected routes closed until the session resolves", () => {
    expect(selectAuthenticatedRouteState("/charts", null, true)).toBe("CHECKING_SESSION");
    expect(selectAuthenticatedRouteState("/charts", null, false)).toBe("SIGN_IN_REQUIRED");
  });

  it("uses the canonical profile-completeness compatibility rule", () => {
    expect(selectAuthenticatedRouteState("/charts", incompleteUser, false)).toBe("PROFILE_SETUP_REQUIRED");
    expect(selectAuthenticatedRouteState("/profile", incompleteUser, false)).toBe("READY");
    expect(selectAuthenticatedRouteState("/charts", completeUser, false)).toBe("READY");
    expect(selectAuthenticatedRouteState("/charts", legacyCompleteUser, false)).toBe("READY");
  });
});
