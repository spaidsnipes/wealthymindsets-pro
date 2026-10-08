import { describe, expect, it } from "vitest";
import { legendShortWords } from "./legendShortWords";

describe("legendShortWords — narrow legend keeps the scope, drops the length", () => {
  it("bar close and bar-over-bar change keep their scope words", () => {
    expect(legendShortWords("377.78 LAST 5m BAR CLOSE")).toBe("377.78 · 5m CLOSE");
    expect(legendShortWords("-0.14 (-0.04%) vs prior 5m bar")).toBe("-0.14 (-0.04%) /5m bar");
  });
  it("anything else passes through unchanged", () => {
    expect(legendShortWords("31436.50")).toBe("31436.50");
    expect(legendShortWords("+34.25 (+0.11%)")).toBe("+34.25 (+0.11%)");
  });
});
