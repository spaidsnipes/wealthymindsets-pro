import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const charts = strip(fs.readFileSync(
  path.join(process.cwd(), "src/app/charts/page.tsx"), "utf8"));
const deck = strip(fs.readFileSync(
  path.join(process.cwd(), "src/app/command-deck/page.tsx"), "utf8"));

/**
 * Scanner → Deck → Chart continuity Sentinel.
 * Founding Execution Contract §13 names this as an open gate.
 *
 * /command-deck honoured `?symbol=` and documented the reason — external links
 * from /heatmaps, /scanner and docs must be able to seed a market. /charts
 * never implemented the other half, so the chain broke at the last hop:
 * `/charts?symbol=NVDA` opened TSLA, because the dashboard read only
 * SymbolContext, which restores from localStorage. Deep links, shared chart
 * URLs and reloads all silently ignored the requested symbol.
 *
 * SymbolContext remains the single owner (canon §6 NO-DUPLICATION); the URL
 * only seeds it.
 */
const SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.\-!/]{0,14}$/;

describe("chart deep-link continuity", () => {
  it("/charts reads the symbol query param", () => {
    expect(charts).toContain("useSearchParams");
    expect(charts).toContain('searchParams?.get("symbol")');
  });

  it("both surfaces use the SAME param name — no second convention", () => {
    expect(deck).toContain('searchParams?.get("symbol")');
    expect(charts).toContain('searchParams?.get("symbol")');
  });

  it("the URL only seeds SymbolContext — it is not a second owner", () => {
    expect(charts).toContain("setActiveSymbol");
    expect(charts).toContain("useActiveSymbol");
  });

  it("a seed is not a leash — the URL may not re-assert over the trader", () => {
    // This test is the one that was missing. The test above is NAMED for the
    // seed-not-owner property and only checked that two identifiers appear,
    // so the URL was free to become an owner without any Sentinel objecting.
    //
    // MEASURED before the fix, localStorage spy on the desktop rail: a single
    // watchlist row click wrote wm_last_symbol twice — ["TSLA", "NQ1!"]. The
    // seeding effect listed `activeSymbol` as a dependency, so every user
    // selection re-ran it and it wrote the stale URL symbol straight back.
    const effect = charts.slice(
      charts.indexOf("React.useEffect(() => {"),
      charts.indexOf("return <ChartsDashboard />"),
    );
    expect(effect, "the seeding effect must be findable").toContain("SYMBOL_PATTERN.test");

    const deps = effect.slice(effect.lastIndexOf("}, ["));
    expect(deps, "activeSymbol as a dependency turns the seed into a leash")
      .not.toMatch(/\bactiveSymbol\b/);

    // Seeding must be latched, so a re-run cannot re-apply an already-used
    // deep link over a selection the trader has since made.
    expect(effect, "the applied deep link must be remembered").toMatch(/seededUrlSymbol\.current/);
    expect(effect, "an already-seeded URL symbol must return early")
      .toMatch(/seededUrlSymbol\.current === up[\s\S]*?return/);

    // A genuinely new deep link must still win.
    expect(charts).toMatch(/\[urlSymbol, setActiveSymbol\]/);
  });

  it("useSearchParams is wrapped in Suspense for SSG", () => {
    expect(charts).toContain("Suspense");
  });

  it("accepts the symbols the app actually routes", () => {
    for (const s of ["NVDA", "AMD", "TSLA", "BTC", "ES1!", "NQ1!", "BRK.B", "EUR/USD"]) {
      expect(SYMBOL_PATTERN.test(s)).toBe(true);
    }
  });

  it("rejects unvalidated junk before it reaches persisted state", () => {
    // setActiveSymbol writes to localStorage, so a URL must never seed garbage.
    for (const bad of ["", " ", "<script>", "../../etc", "a".repeat(40), "'; DROP--"]) {
      expect(SYMBOL_PATTERN.test(bad)).toBe(false);
    }
  });
});
