import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { webullOwnerGate, webullOwnerRefusal } from "./webullOwner";

const OWNER = "0000-owner";
const env = { WEBULL_OWNER_USER_ID: OWNER };
const ROUTES = path.join(process.cwd(), "src/app/api/broker/webull");

describe("GP12 §15 / Garden 16 §35 — User A never inherits User B's Webull accounts", () => {
  it("admits the named owner", () => {
    expect(webullOwnerGate(OWNER, env)).toEqual({ allowed: true, state: "OWNER" });
  });

  it("refuses anyone else once an owner is named", () => {
    expect(webullOwnerGate("someone-else", env)).toEqual({ allowed: false, state: "NOT_OWNER" });
  });

  it("FAILS CLOSED while no owner is named — for everyone, the would-be owner included", () => {
    // §35: "Unknown broker/account owner: FAIL CLOSED." There is no posture
    // that lets a signed-in stranger read positions while the owner is unset.
    expect(webullOwnerGate(OWNER, {})).toEqual({ allowed: false, state: "NOT_CONFIGURED" });
    expect(webullOwnerGate("anyone", {})).toEqual({ allowed: false, state: "NOT_CONFIGURED" });
    expect(webullOwnerGate(OWNER, { WEBULL_OWNER_USER_ID: "  " }).allowed).toBe(false);
  });

  it("names the refusal by its cause", () => {
    expect(webullOwnerRefusal({ allowed: false, state: "NOT_OWNER" }).code).toBe("BROKER_ACCOUNT_NOT_AUTHORIZED");
    expect(webullOwnerRefusal({ allowed: false, state: "NOT_CONFIGURED" }).code).toBe("BROKER_OWNER_NOT_CONFIGURED");
  });

  it("every Webull broker route that reads or acts on the platform's accounts asks the one gate", () => {
    const route = (p: string) => readFileSync(path.join(ROUTES, p, "route.ts"), "utf8");
    for (const r of ["order-preview", "positions", "status", "session"]) {
      expect(route(r), r).toMatch(/const owner = webullOwnerGate\(auth\.user\.sub, process\.env\);\n\s*if \(!owner\.allowed\) return NextResponse\.json\(webullOwnerRefusal\(owner\), \{ status: 403 \}\);/);
    }
    // A new route under /api/broker/webull joins this list or fails here.
    expect(readdirSync(ROUTES).sort()).toEqual(["order-preview", "positions", "session", "status"]);
    // The preview route cannot reach the place path at all.
    expect(route("order-preview")).not.toMatch(/submitWebullOrderOnce/);
  });

  it("no hard-coded owner identity anywhere in source", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/broker/webullOwner.ts"), "utf8");
    expect(src).not.toMatch(/WEBULL_OWNER_USER_ID\s*\?\?|\|\|\s*["'`]/);
  });
});
