/**
 * The FVG strip says WHICH list it reads and when it was chosen, and offers the
 * trader's own stored watchlist — read-only, through the one watchlist owner.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readStoredActiveWatchlist, WATCHLISTS_KEY, ACTIVE_WATCHLIST_KEY } from "@/lib/watchlist/activeWatchlist";
import { FVG_SCAN_FIXED_LIST_CHOSEN, FVG_SCAN_UNIVERSE_MAX, fixedFvgScanUniverse, fvgScanUniverses, watchlistFvgScanUniverse } from "./fvgScanUniverse";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const FIXED = Array.from({ length: 30 }, (_, i) => `S${i}`);

function store(init: Record<string, string>) {
  const writes: string[] = [];
  const m = new Map(Object.entries(init));
  return { writes, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string) => { writes.push(k); } };
}

describe("the fixed list is named, counted and dated", () => {
  it("says whose list, how many, when chosen, and that it is not the whole market", () => {
    const u = fixedFvgScanUniverse(FIXED);
    expect(u.line).toBe("WM's fixed scanner list — 30 symbols, chosen by WM on Jun 21, 2026. Not the whole market: a symbol that is not on it was not read.");
    expect(u.symbols).toBe(FIXED);
  });

  it("the date is the list's: the scanner's symbols are pinned — change the list, change FVG_SCAN_FIXED_LIST_CHOSEN", () => {
    const page = read("src/app/scanner/page.tsx");
    const block = /const SYMS: \[string,string\]\[\] = \[([\s\S]*?)\n\];/.exec(page)?.[1] ?? "";
    const syms = [...block.matchAll(/\["([^"]+)","[^"]+"\]/g)].map(m => m[1]);
    expect(syms).toHaveLength(30);
    expect(syms.join(" ")).toBe("NQ1! ES1! NVDA TSLA AAPL META AMZN MSFT GOOG AMD PLTR MSTR COIN SMCI ARM RIVN SOFI LCID GME AMC SOUN AI IONQ QBTS RGTI SPY QQQ IWM GLD TLT");
    expect(FVG_SCAN_FIXED_LIST_CHOSEN).toBe("2026-06-21");
  });
});

describe("the trader's own watchlist as the universe", () => {
  it("offered only when he stored one — never WM's default seed under his name", () => {
    expect(readStoredActiveWatchlist(store({}))).toBeNull();
    expect(readStoredActiveWatchlist(store({ [WATCHLISTS_KEY]: "not json" }))).toBeNull();
    expect(readStoredActiveWatchlist(store({ [WATCHLISTS_KEY]: JSON.stringify({ Mine: [42, {}] }) }))).toBeNull();
    expect(fvgScanUniverses({ fixed: FIXED, watchlist: null, want: "WATCHLIST" })).toMatchObject({ options: [{ id: "FIXED" }], active: { id: "FIXED" } });
  });

  it("reads the ACTIVE stored list by the owner's rule, in his order, and writes nothing", () => {
    const s = store({ [WATCHLISTS_KEY]: JSON.stringify({ Swing: ["aapl", 7, "NVDA", "AAPL"], Futures: ["ES1!", "NQ1!"] }), [ACTIVE_WATCHLIST_KEY]: "Futures" });
    const wl = readStoredActiveWatchlist(s);
    expect(wl).toEqual({ name: "Futures", symbols: ["ES1!", "NQ1!"] });
    expect(s.writes).toEqual([]);
    const { options, active } = fvgScanUniverses({ fixed: FIXED, watchlist: wl, want: "WATCHLIST" });
    expect(options.map(o => o.id)).toEqual(["FIXED", "WATCHLIST"]);
    expect(active.symbols).toEqual(["ES1!", "NQ1!"]);
    expect(active.line).toBe("Your watchlist “Futures” — 2 symbols, chosen by you, as it is saved on this device now. A symbol that is not on it was not read.");
  });

  it("a long list is read up to the cap, and the line says so with its denominator", () => {
    const symbols = Array.from({ length: FVG_SCAN_UNIVERSE_MAX + 5 }, (_, i) => `W${i}`);
    const u = watchlistFvgScanUniverse({ name: "Big", symbols })!;
    expect(u.symbols).toHaveLength(FVG_SCAN_UNIVERSE_MAX);
    expect(u.line).toContain(`The first ${FVG_SCAN_UNIVERSE_MAX} of its ${symbols.length} are read.`);
    expect(watchlistFvgScanUniverse({ name: "Empty", symbols: [] })).toBeNull();
  });
});

describe("the strip is wired to the owners", () => {
  const strip = read("src/components/scanner/FvgScanStrip.tsx");
  it("names the list on screen, reads the watchlist through its owner only, and clears results when the list changes", () => {
    expect(strip.length).toBeGreaterThan(1000);
    expect(strip).toContain('data-testid="scanner-fvg-universe"');
    expect(strip).toContain("{universe.line}");
    expect(strip).toContain("readStoredActiveWatchlist(window.localStorage)");
    expect(strip).not.toMatch(/wm_watchlists|setItem|toggleOnActiveWatchlist/);
    expect(strip).toMatch(/const chooseUniverse[\s\S]{0,200}abortRef\.current\?\.abort\(\);[\s\S]{0,80}setReadings\(\[\]\);/);
    expect(read("src/app/scanner/page.tsx")).toContain("<FvgScanStrip symbols={FVG_SCAN_UNIVERSE}");
  });
});
