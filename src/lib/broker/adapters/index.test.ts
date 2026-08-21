import { describe, it, expect } from "vitest";
import { getAdapter, listAdapters, hasAdapter } from "./index";

describe("broker adapter registry", () => {
  it("getAdapter('webull') returns the webull stub adapter", () => {
    const a = getAdapter("webull");
    expect(a).not.toBeNull();
    expect(a?.id).toBe("webull");
  });

  it("getAdapter for an unregistered provider returns null (never fabricates)", () => {
    // tradier is a declared BrokerId but has no shipped adapter yet.
    expect(getAdapter("tradier")).toBeNull();
    expect(getAdapter("ibkr")).toBeNull();
  });

  it("hasAdapter mirrors getAdapter presence", () => {
    expect(hasAdapter("webull")).toBe(true);
    expect(hasAdapter("tradier")).toBe(false);
  });

  it("listAdapters returns only shipped adapters (currently just webull)", () => {
    const all = listAdapters();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some(a => a.id === "webull")).toBe(true);
  });
});
