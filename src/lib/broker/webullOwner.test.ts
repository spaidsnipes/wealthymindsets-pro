import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { webullOwnerGate, webullOwnerRefusal } from "./webullOwner";

const OWNER = "0000-owner";
const env = { WEBULL_OWNER_USER_ID: OWNER };

describe("GP12 §15 — User A never inherits User B's Webull accounts", () => {
  it("admits the named owner in both postures", () => {
    expect(webullOwnerGate(OWNER, env, "STRICT")).toEqual({ allowed: true, state: "OWNER" });
    expect(webullOwnerGate(OWNER, env, "TRANSITIONAL")).toEqual({ allowed: true, state: "OWNER" });
  });

  it("refuses anyone else in both postures once an owner is named", () => {
    expect(webullOwnerGate("someone-else", env, "STRICT").allowed).toBe(false);
    expect(webullOwnerGate("someone-else", env, "TRANSITIONAL").allowed).toBe(false);
  });

  it("STRICT (order paths) fails closed while no owner is named", () => {
    expect(webullOwnerGate(OWNER, {}, "STRICT")).toEqual({ allowed: false, state: "NOT_CONFIGURED" });
    expect(webullOwnerGate(OWNER, { WEBULL_OWNER_USER_ID: "  " }, "STRICT").allowed).toBe(false);
  });

  it("TRANSITIONAL (pre-existing reads) says NOT_CONFIGURED out loud instead of passing silently", () => {
    expect(webullOwnerGate("anyone", {}, "TRANSITIONAL")).toEqual({ allowed: true, state: "NOT_CONFIGURED" });
  });

  it("names the refusal by its cause", () => {
    expect(webullOwnerRefusal({ allowed: false, state: "NOT_OWNER" }).code).toBe("BROKER_ACCOUNT_NOT_AUTHORIZED");
    expect(webullOwnerRefusal({ allowed: false, state: "NOT_CONFIGURED" }).code).toBe("BROKER_OWNER_NOT_CONFIGURED");
  });

  it("every route that reads the platform's Webull accounts asks the gate", () => {
    const route = (p: string) => readFileSync(path.join(process.cwd(), "src/app/api/broker/webull", p, "route.ts"), "utf8");
    expect(route("order-preview")).toMatch(/webullOwnerGate\(auth\.user\.sub, process\.env, "STRICT"\)/);
    expect(route("positions")).toMatch(/webullOwnerGate\(auth\.user\.sub, process\.env, "TRANSITIONAL"\)/);
    expect(route("status")).toMatch(/webullOwnerGate\(auth\.user\.sub, process\.env, "TRANSITIONAL"\)/);
    // The preview route cannot reach the place path at all.
    expect(route("order-preview")).not.toMatch(/submitWebullOrderOnce/);
  });
});
