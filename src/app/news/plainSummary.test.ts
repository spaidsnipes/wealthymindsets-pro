import { describe, expect, it } from "vitest";
import { plainSummary } from "./plainSummary";

describe("wire summaries reach the glass as plain words", () => {
  it("drops a publisher's paragraph tags (Forexlive via Finnhub, 2026-10-07)", () => {
    expect(plainSummary("<p>The USDCAD has been on a steady climb</p><p>since 1.3750</p>")).toBe("The USDCAD has been on a steady climb since 1.3750");
  });
  it("decodes the common entities once", () => {
    expect(plainSummary("S&amp;P &quot;up&quot; &amp;lt;")).toBe("S&P \"up\" &lt;");
  });
  it("empty stays empty", () => {
    expect(plainSummary(undefined)).toBe("");
  });
});
