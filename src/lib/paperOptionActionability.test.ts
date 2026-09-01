import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paperPage = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
const paperStyles = readFileSync(resolve(__dirname, "../app/paper/paper.module.css"), "utf8");

describe("Paper options actionability enforcement", () => {
  it("renders an explicit fail-closed state instead of a synthetic chain", () => {
    expect(paperPage).toContain("OPTIONS NOT ACTIONABLE");
    expect(paperPage).toContain("No strikes, modeled premiums, Greeks, marks, or option actions");
    expect(paperPage).toContain("MARK UNAVAILABLE · NOT ACTIONABLE");
  });

  it("keeps Paper quote copy aligned with the canonical degraded label", () => {
    expect(paperPage).toContain("chart chrome flags as ACTIVE DEGRADED");
    expect(paperPage).not.toContain("chart chrome flags as DELAYED");
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
    expect(paperPage).toContain('import styles from "./paper.module.css"');
    for (const className of ["page", "header", "accountStats", "body", "ticket", "center", "market"]) {
      expect(paperPage).toContain(`styles.${className}`);
      expect(paperStyles).toContain(`.${className}`);
    }
    expect(paperStyles).toContain("@media (max-width: 767px)");
    expect(paperStyles).toContain("flex-direction: column");
    expect(paperStyles).toContain("min-height: 44px");
  });
});
