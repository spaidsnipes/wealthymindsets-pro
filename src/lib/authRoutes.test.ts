import { describe, expect, it } from "vitest";
import { safeNextPath, signInPathFor } from "./authRoutes";
import fs from "node:fs";
import path from "node:path";

import {
  APP_ROUTE_ROOTS,
  PUBLIC_AUTH_PATHS,
  isPublicAuthPath,
  isUnknownAppPath,
  selectAuthenticatedRouteState,
} from "./authRoutes";

describe("a guest on an address that is no room reads not-found, not a sign-in door (guest audit 2026-10-25)", () => {
  it("unknown first segments are public for a guest, after the session resolves", () => {
    expect(selectAuthenticatedRouteState("/pricng", null, true)).toBe("CHECKING_SESSION");
    expect(selectAuthenticatedRouteState("/pricng", null, false)).toBe("PUBLIC");
    expect(selectAuthenticatedRouteState("/rooms", null, false)).toBe("PUBLIC");
    expect(isUnknownAppPath("/")).toBe(false);
  });
  it("every real room stays protected exactly as before", () => {
    for (const r of ["/charts", "/journal", "/journal/anything", "/lounge", "/desk", "/"]) {
      expect(isUnknownAppPath(r), r).toBe(false);
      expect(selectAuthenticatedRouteState(r, null, false), r).toBe("SIGN_IN_REQUIRED");
    }
  });
  it("FAIL CLOSED: every page directory under src/app is listed as a room (and every listed room exists)", () => {
    const app = path.join(process.cwd(), "src/app");
    const hasPage = (d: string): boolean => fs.readdirSync(d, { withFileTypes: true }).some(e => (e.isFile() && /^page\.(t|j)sx?$/.test(e.name)) || (e.isDirectory() && hasPage(path.join(d, e.name))));
    const dirs = fs.readdirSync(app, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== "api").map(e => e.name);
    const rooms = dirs.filter(n => hasPage(path.join(app, n)));
    expect(rooms.filter(n => /^[([]/.test(n)), "route groups / dynamic roots need a new rule").toEqual([]);
    expect(rooms.filter(n => !(APP_ROUTE_ROOTS as readonly string[]).includes(n))).toEqual([]);
    expect(APP_ROUTE_ROOTS.filter(n => !dirs.includes(n))).toEqual([]);
  });
});

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


describe("destination survives the sign-in door (2026-10-02 Lounge/Academy entry)", () => {
  it("carries a protected room into /login?next=", () => {
    expect(signInPathFor("/lounge")).toBe("/login?next=%2Flounge");
    expect(signInPathFor("/education", "?lesson=3")).toBe("/login?next=%2Feducation%3Flesson%3D3");
    expect(signInPathFor("/")).toBe("/login");
  });
  it("honours only safe same-origin paths", () => {
    expect(safeNextPath("/lounge")).toBe("/lounge");
    expect(safeNextPath("/education?x=1#top")).toBe("/education?x=1#top");
    for (const bad of [null, "", "//evil.example", "https://evil.example", "/\\evil.example", "lounge", "/login", "/signup?x=1", "/", "/x\u0000"]) {
      expect(safeNextPath(bad as string | null)).toBeNull();
    }
  });
});

import { isPublicInfoPath, PUBLIC_INFO_PATHS } from "./authRoutes";

describe("public information pages (ATHOS order §9 / P0.4)", () => {
  it("pricing and the policy pages are readable signed out, and never bounce a signed-in member", () => {
    expect(PUBLIC_INFO_PATHS).toEqual(["/pricing", "/legal", "/welcome"]);
    for (const p of ["/pricing", "/legal", "/legal/risk", "/legal/market-data", "/welcome"]) {
      expect(isPublicInfoPath(p)).toBe(true);
      expect(selectAuthenticatedRouteState(p, null, false)).toBe("PUBLIC");
      expect(selectAuthenticatedRouteState(p, { profileComplete: true }, false)).toBe("READY");
    }
    expect(isPublicInfoPath("/pricingx")).toBe(false);
    expect(selectAuthenticatedRouteState("/charts", null, false)).toBe("SIGN_IN_REQUIRED");
  });
});
