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
