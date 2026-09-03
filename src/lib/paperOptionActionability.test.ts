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
    // The guard now bails BEFORE any state mutation rather than from inside a
    // setState updater. React requires updaters to be pure and may replay them,
    // so the old shape risked crediting proceeds twice; the readiness guard
    // itself is unchanged and still blocks the close.
    expect(closeHandler).toMatch(/== null\) return;/);
    expect(closeHandler).not.toContain("setCash(c => c + proceeds);\n      setTrades");
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

/**
 * setState updaters must stay pure.
 *
 * closeOption() performed setCash, setTrades and earnWMS from INSIDE the
 * setOptionPositions updater. React requires updaters to be pure and may
 * invoke them more than once — StrictMode does so deliberately, and concurrent
 * rendering can discard and replay a render. A replay would have credited the
 * proceeds twice, duplicated the blotter row and awarded the points again.
 * Relying on single invocation is undefined behaviour, not a guarantee.
 */
describe("paper state updaters are pure", () => {
  const page = paperPage;

  function updaterBody(startMarker: string, endMarker: string): string {
    const a = page.indexOf(startMarker);
    const b = page.indexOf(endMarker, a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return page.slice(a, b);
  }

  it("closeOption performs no state mutation inside the positions updater", () => {
    const body = updaterBody("const closeOption = useCallback", "const cancelOrder");
    const updaterStart = body.indexOf("setOptionPositions(prev =>");
    expect(updaterStart).toBeGreaterThan(-1);
    // The updater is a single pure filter expression.
    const updater = body.slice(updaterStart, body.indexOf(");", updaterStart));
    expect(updater).toContain("prev.filter");
    expect(updater).not.toContain("setCash");
    expect(updater).not.toContain("setTrades");
    expect(updater).not.toContain("earnWMS");
  });

  it("closeOption reads the position from a ref, not from updater state", () => {
    const body = updaterBody("const closeOption = useCallback", "const cancelOrder");
    expect(body).toContain("optionPositionsRef.current.find");
  });
});
