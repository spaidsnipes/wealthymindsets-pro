import { describe, expect, it } from "vitest";
import { provenSessionClosure } from "./canonicalIdentity";

describe("Sunday CME Globex reopen is 18:00 ET (one rule with the market clock)", () => {
  it("futures are proven closed at 17:25 ET Sunday, and not at 18:05", () => {
    expect(provenSessionClosure("NQ1!", new Date("2026-10-18T21:25:00Z"))).toBe(false); // 17:25 EDT
    expect(provenSessionClosure("NQ1!", new Date("2026-10-18T22:05:00Z"))).toBe(null);  // 18:05 EDT
  });
});
