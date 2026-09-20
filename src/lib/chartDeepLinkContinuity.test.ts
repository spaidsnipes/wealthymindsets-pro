import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  marketSurfaceUrlWriteback,
  normalizeMarketSurfaceSymbol,
  normalizeMarketSurfaceTimeframe,
  resolveMarketSymbolSeed,
} from "@/lib/routing/marketSurfaceQuery";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const charts = strip(fs.readFileSync(
  path.join(process.cwd(), "src/app/charts/page.tsx"), "utf8"));
const deck = strip(fs.readFileSync(
  path.join(process.cwd(), "src/app/command-deck/page.tsx"), "utf8"));
const dashboard = strip(fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));

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
describe("chart deep-link continuity", () => {
  it("/charts reads the symbol query param", () => {
    expect(charts).toContain("useSearchParams");
    expect(charts).toContain('searchParams?.get("symbol")');
  });

  it("both surfaces use the SAME param name — no second convention", () => {
    expect(deck).toContain('searchParams?.get("symbol")');
    expect(charts).toContain('searchParams?.get("symbol")');
  });

  it("carries symbol and timeframe across both Founder market surfaces", () => {
    expect(charts).toContain('searchParams?.get("tf")');
    expect(charts).toContain("<ChartsDashboard initialTimeframe={normalizeMarketSurfaceTimeframe(urlTimeframe)}");
    // ── REMAPPED 2026-09-19 · CONTINUITY IS ONE-WAY NOW ──────────────────
    // This used to require the chart to carry a deep link BACK to the deck,
    // which made the round trip symmetrical and the two surfaces peers. The
    // Founder's order for this shift ends the peerage: /charts is HOME and
    // the deck is a legacy room, so the chart no longer advertises it and
    // this Sentinel no longer demands that it does.
    //
    // The direction that still matters is preserved and still asserted below:
    // a trader arriving from the deck (or /scanner, or /heatmaps, or a shared
    // link) must land on the chart with the SAME symbol and timeframe. That
    // is the continuity gate Founding Execution Contract §13 named. The
    // return leg was a second throne wearing a continuity badge.
    expect(dashboard).not.toContain("/command-deck?symbol=");
    expect(deck).toContain('${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}');
  });

  it("treats a URL timeframe as a validated seed, not a second owner", () => {
    expect(dashboard).toContain("normalizeMarketSurfaceTimeframe(initialTimeframe)");
    expect(dashboard).toContain("seededUrlTimeframe.current === requested");
    expect(dashboard).toContain("setTimeframe(requested)");
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
      charts.indexOf("return <ChartsDashboard", charts.indexOf("React.useEffect(() => {")),
    );
    expect(effect, "the seeding effect must be findable").toContain("normalizeMarketSurfaceSymbol");

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
      expect(normalizeMarketSurfaceSymbol(s)).toBe(s);
    }
  });

  it("rejects unvalidated junk before it reaches persisted state", () => {
    // setActiveSymbol writes to localStorage, so a URL must never seed garbage.
    for (const bad of ["", " ", "<script>", "../../etc", "a".repeat(40), "'; DROP--"]) {
      expect(normalizeMarketSurfaceSymbol(bad)).toBeNull();
    }
  });

  it("normalizes legacy timeframe aliases and rejects unsupported input", () => {
    expect(normalizeMarketSurfaceTimeframe("15m")).toBe("15m");
    expect(normalizeMarketSurfaceTimeframe("1d")).toBe("1D");
    for (const bad of ["", "1s", "30s", "7m", "banana"]) {
      expect(normalizeMarketSurfaceTimeframe(bad)).toBeNull();
    }
  });

  it("command-deck consumes only normalized query seeds and does not leash symbol state", () => {
    expect(deck).toContain("normalizeMarketSurfaceSymbol(urlSymbol)");
    expect(deck).toContain("normalizeMarketSurfaceTimeframe(urlTf)");
    expect(deck).toContain("resolveMarketSymbolSeed(requestedSymbol, activeSymbol, seededUrlSymbol.current)");
    expect(deck).toMatch(/\[requestedSymbol, setActiveSymbol\]/);
    expect(deck).not.toMatch(/\[urlSymbol, activeSymbol, setActiveSymbol\]/);
  });

  it("hands a deep-link seed to context once, then yields to trader selection", () => {
    const arrival = resolveMarketSymbolSeed("NQ1!", "TSLA", null);
    expect(arrival).toEqual({
      displaySymbol: "NQ1!",
      nextSeededSymbol: "NQ1!",
      shouldSeedContext: true,
    });

    const settled = resolveMarketSymbolSeed("NQ1!", "NQ1!", arrival.nextSeededSymbol);
    expect(settled.displaySymbol).toBe("NQ1!");
    expect(settled.shouldSeedContext).toBe(false);

    const traderChanged = resolveMarketSymbolSeed("NQ1!", "TSLA", arrival.nextSeededSymbol);
    expect(traderChanged.displaySymbol).toBe("TSLA");
    expect(traderChanged.shouldSeedContext).toBe(false);

    const newLink = resolveMarketSymbolSeed("NVDA", "TSLA", arrival.nextSeededSymbol);
    expect(newLink.displaySymbol).toBe("NVDA");
    expect(newLink.shouldSeedContext).toBe(true);

    const cleared = resolveMarketSymbolSeed(null, "TSLA", arrival.nextSeededSymbol);
    expect(cleared.nextSeededSymbol).toBeNull();
    const sameLinkAgain = resolveMarketSymbolSeed("NQ1!", "TSLA", cleared.nextSeededSymbol);
    expect(sameLinkAgain.displaySymbol).toBe("NQ1!");
    expect(sameLinkAgain.shouldSeedContext).toBe(true);
  });

  /**
   * B-201 · the riser records what was built on it.
   *
   * Continuity was one-way until 2026-09-20: the URL seeded the room and the
   * room never answered. MEASURED consequence — arrive on `?symbol=NVDA`, tap
   * TSLA, switch to 1H, and the address bar still says NVDA. Copy Link then
   * sends a colleague an instrument nobody was looking at, and a reload
   * restores the link instead of the work.
   */
  describe("the URL is stamped AS-BUILT", () => {
    it("writes the room's own symbol and timeframe back into the query", () => {
      expect(marketSurfaceUrlWriteback("?symbol=NVDA", "TSLA", "1h"))
        .toBe("?symbol=TSLA&tf=1h");
    });

    it("is case-forgiving for symbols and case-exact for timeframes", () => {
      // Not a quirk worth hiding. `normalizeMarketSurfaceSymbol` upper-cases
      // (a ticker has one spelling), while `normalizeTFId` matches the canon
      // exactly — "1H" is NOT an alias of "1h" and is refused on both the way
      // in and the way out. Asserted so the writeback can never be the place
      // that quietly invents a second vocabulary.
      expect(marketSurfaceUrlWriteback("", "tsla", "1h")).toBe("?symbol=TSLA&tf=1h");
      expect(normalizeMarketSurfaceTimeframe("1H")).toBeNull();
      expect(marketSurfaceUrlWriteback("", "TSLA", "1H")).toBe("?symbol=TSLA");
    });

    it("stamps a bare URL that was never deep-linked", () => {
      expect(marketSurfaceUrlWriteback("", "TSLA", "5m")).toBe("?symbol=TSLA&tf=5m");
    });

    it("returns null when the URL already tells the truth — no history churn", () => {
      // An effect that rewrote history on every render would fight the
      // seeding latches and could loop. Absence of work must be expressible.
      expect(marketSurfaceUrlWriteback("?symbol=TSLA&tf=5m", "TSLA", "5m")).toBeNull();
      expect(marketSurfaceUrlWriteback("?symbol=TSLA&tf=5m", "tsla", "5m")).toBeNull();
    });

    it("refuses to stamp a value the seed path would reject", () => {
      // Writing back something the READER would refuse is how a round trip
      // silently loses state. Both directions use the same normalizers.
      expect(marketSurfaceUrlWriteback("?symbol=NVDA", "<script>", "banana")).toBeNull();
      expect(marketSurfaceUrlWriteback("?symbol=NVDA", null, undefined)).toBeNull();
      expect(marketSurfaceUrlWriteback("?symbol=NVDA", "AMD", "30s")).toBe("?symbol=AMD");
    });

    it("preserves params this surface does not own", () => {
      const next = marketSurfaceUrlWriteback("?ref=scanner&symbol=NVDA", "TSLA", "1D");
      expect(next).toContain("ref=scanner");
      expect(next).toContain("symbol=TSLA");
      expect(next).toContain("tf=1D");
    });

    it("normalizes on the way out, so the stamp uses one vocabulary", () => {
      // `1d` is a legal alias on the way in; the stamp must spell the canon.
      expect(marketSurfaceUrlWriteback("", "tsla", "1d")).toBe("?symbol=TSLA&tf=1D");
    });

    it("the room writes back with replaceState, never pushState", () => {
      // pushState would make every watchlist tap a history entry, so Back
      // would walk the trader through their own browsing one symbol at a
      // time. One entry per arrival, kept accurate.
      expect(dashboard).toContain("marketSurfaceUrlWriteback(window.location.search, symbol, timeframe)");
      expect(dashboard).toContain("window.history.replaceState(");
      expect(dashboard, "pushState turns the stamp into a stack")
        .not.toContain("window.history.pushState(");
    });
  });

  it("clears route seed latches so remove then re-add of the same value reseeds", () => {
    expect(charts).toMatch(/if \(!up\) \{\s*seededUrlSymbol\.current = null;/);
    expect(deck).toContain("seededUrlSymbol.current = seed.nextSeededSymbol");
    expect(dashboard).toMatch(/if \(!requested\) \{\s*seededUrlTimeframe\.current = null;/);
  });
});
