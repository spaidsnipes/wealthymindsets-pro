import { describe, expect, it } from "vitest";
import { isOwnerRefusal, plainBrokerAnswer } from "./ownerRefusal";

describe("isOwnerRefusal (guest audit 2026-10-04)", () => {
  it("recognises both owner-gate codes on a 403", () => {
    expect(isOwnerRefusal({ code: "BROKER_ACCOUNT_NOT_AUTHORIZED" }, 403)).toBe(true);
    expect(isOwnerRefusal({ code: "BROKER_OWNER_NOT_CONFIGURED" }, 403)).toBe(true);
    expect(isOwnerRefusal({ code: "BROKER_OWNER_NOT_CONFIGURED" })).toBe(true);
  });
  it("does not swallow other failures", () => {
    expect(isOwnerRefusal({ code: "BROKER_ACCOUNT_NOT_AUTHORIZED" }, 500)).toBe(false);
    expect(isOwnerRefusal({ error: "x" }, 403)).toBe(false);
    expect(isOwnerRefusal(null, 403)).toBe(false);
  });
});

describe("plainBrokerAnswer (guest audit 2026-10-04)", () => {
  it("never prints a raw enum", () => {
    expect(plainBrokerAnswer("NO_SUCH_ACCOUNT")).toBe("That account isn't on this broker connection — choose another.");
    expect(plainBrokerAnswer("SOME_NEW_STATE")).toBe("Some new state.");
    expect(plainBrokerAnswer("")).toBe("No answer came back.");
  });
});
