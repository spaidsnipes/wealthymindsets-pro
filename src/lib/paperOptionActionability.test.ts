import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paperPage = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
const globalStyles = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");

describe("Paper options actionability enforcement", () => {
  it("renders an explicit fail-closed state instead of a synthetic chain", () => {
    expect(paperPage).toContain("OPTIONS NOT ACTIONABLE");
    expect(paperPage).toContain("No strikes, modeled premiums, Greeks, marks, or option actions");
    expect(paperPage).toContain("MARK UNAVAILABLE · NOT ACTIONABLE");
  });

  it("contains no hard-coded underlying fallback in the Paper options path", () => {
    expect(paperPage).not.toMatch(/prices\[sym\]\s*\?\?\s*UNIVERSE\[sym\]/);
    expect(paperPage).not.toContain("UNIVERSE[p.underlying]?.base");
    expect(paperPage).not.toContain("UNIVERSE[op.underlying]?.base");
    expect(paperPage).not.toContain("?? p.strike");
  });

  it("guards direct open and close mutations with the canonical readiness owner", () => {
    const openStart = paperPage.indexOf("const openOption = useCallback");
    const closeStart = paperPage.indexOf("const closeOption = useCallback");
    const cancelStart = paperPage.indexOf("const cancelOrder", closeStart);
    expect(openStart).toBeGreaterThan(-1);
    expect(closeStart).toBeGreaterThan(openStart);
    expect(cancelStart).toBeGreaterThan(closeStart);

    const openHandler = paperPage.slice(openStart, closeStart);
    const closeHandler = paperPage.slice(closeStart, cancelStart);
    expect(openHandler).toContain("actionablePaperQuotePrice(quoteReadiness[p.underlying])");
    expect(openHandler).toContain("if (uPx == null) return");
    expect(closeHandler).toContain("actionablePaperQuotePrice(quoteReadiness[op.underlying])");
    expect(closeHandler).toContain("return prev");
  });

  it("withholds current equity and leaderboard return when any option is unmarked", () => {
    expect(paperPage).toContain("PARTIAL COST BASIS ONLY · current option mark and portfolio return are not available");
    expect(paperPage).toContain("Portfolio valuation unavailable");
    expect(paperPage).toContain("RETURN AND RANK UNKNOWN");
    expect(paperPage).toContain("hasUnmarkedOptions ? \"UNKNOWN\"");
    expect(paperPage).toContain("if (hasUnmarkedOptions) return");
  });

  it("keeps the same truth controls usable in the single-column phone layout", () => {
    for (const className of ["wm-paper-page", "wm-paper-header", "wm-paper-account-stats", "wm-paper-body", "wm-paper-ticket", "wm-paper-center", "wm-paper-market"]) {
      expect(paperPage).toContain(className);
      expect(globalStyles).toContain(`.${className}`);
    }
    expect(globalStyles).toContain("@media (max-width: 767px)");
    expect(globalStyles).toContain("flex-direction: column");
    expect(globalStyles).toContain("min-height: 44px");
  });
});
