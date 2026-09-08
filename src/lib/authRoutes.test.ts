import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

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

describe("public auth routes are reachable by thumb", () => {
  /**
   * MEASURED on production at 375x812, 2026-09-08, via `npm run audit:phone`:
   *
   *   /login                 offenders 0   under-44px taps 0
   *   /login?mode=signup     offenders 0   under-44px taps 0
   *   /reset-password        offenders 0   under-44px taps 1
   *       a.mt-6.inline-block "Return to sign in"   105.5 x 20
   *
   * 20px tall, on the password-recovery page, where it is the ONLY way back to
   * sign-in. `/signup` is a deliberate `router.replace` alias for
   * `/login?mode=signup`, which is why it is audited under that query.
   *
   * HONEST LIMIT: a class name cannot witness geometry — the lesson from the
   * install-prompt defect measured the same day, where a green string-matching
   * Sentinel vouched for a button sitting 100% off screen. The GEOMETRY witness
   * is scripts/audit-phone-parity.mjs, which now audits all three of these
   * routes by default. This rule only holds the floor that the measurement
   * established, and cannot discover a new one.
   */
  const pageFor = (route: string) =>
    path.join(process.cwd(), "src", "app", route.replace(/^\//, ""), "page.tsx");

  it("every standalone link on a public auth page declares a 44px tap floor", () => {
    const offenders: string[] = [];
    for (const route of PUBLIC_AUTH_PATHS) {
      const src = fs.readFileSync(pageFor(route), "utf8");
      for (const tag of src.match(/<(?:Link|a)\s[^>]*>/g) ?? []) {
        const cls = tag.match(/className="([^"]*)"/)?.[1] ?? "";
        // py-3 (0.75rem x2 + line-height) is the other way to clear 44px; both
        // are accepted, an undeclared height is not.
        if (!/\bmin-h-(?:11|12|\[4[4-9]px\])\b/.test(cls) && !/\bpy-[3-9]\b/.test(cls)) {
          offenders.push(`${route}: ${cls.slice(0, 80)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds links at all — the scan must not pass by looking at nothing", () => {
    // Without this, a page rename or a `<Link>` spelled differently would make
    // the rule above vacuously green forever.
    const found = PUBLIC_AUTH_PATHS.flatMap(
      (r) => fs.readFileSync(pageFor(r), "utf8").match(/<(?:Link|a)\s[^>]*>/g) ?? [],
    );
    expect(found.length).toBeGreaterThan(0);
  });
});
