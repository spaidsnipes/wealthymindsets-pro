/**
 * DESK LINKING (2026-10-07) — Constitution OPEN item "Desk has no linked
 * symbol/crosshair, no drag from Watchlist and no second-window support".
 * Pure link rules, the time-sync mapping, the window bus, and the sentinels
 * that keep each piece wired.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyGroupChange, cycleLink, decodeDeskWindow, encodeDeskWindow, linkChipLabel, readDesk, readDeskLink,
  setLinkedSymbol, setLinkedTimeframe, DESK_LINK_INK, DESK_LINKS, type Desk,
} from "./desks";
import { barTimeContaining, createDeskLinkBus, type DeskLinkMessage } from "./deskLinkBus";

const desk = (): Desk => ({ name: "T", layout: 4, screens: [
  { symbol: "TSLA", timeframe: "1m", link: 1 }, { symbol: "NQ1!", timeframe: "5m", link: 2 },
  { symbol: "SPY", timeframe: "1h", link: 1 }, { symbol: "BTC", timeframe: "5m" },
] });

describe("link groups", () => {
  it("are numbered 1–4, each with its own ink, and the chip always prints the number", () => {
    expect(DESK_LINKS).toEqual([1, 2, 3, 4]);
    expect(new Set(DESK_LINKS.map(g => DESK_LINK_INK[g])).size).toBe(4);
    expect(DESK_LINKS.map(linkChipLabel)).toEqual(["●1", "●2", "●3", "●4"]);
    expect(linkChipLabel(undefined)).toBe("unlinked");
  });

  it("legacy A/B desks read back as groups 1/2; junk is unlinked", () => {
    expect(readDeskLink("A")).toBe(1);
    expect(readDeskLink("B")).toBe(2);
    expect(readDeskLink(3)).toBe(3);
    expect(readDeskLink("4")).toBe(4);
    expect(readDeskLink(5)).toBeUndefined();
    expect(readDeskLink("C")).toBeUndefined();
    const d = readDesk({ name: "Old", layout: 2, screens: [{ symbol: "TSLA", timeframe: "5m", link: "A" }, { symbol: "SPY", timeframe: "5m", link: "B" }] });
    expect(d?.screens.map(s => s.link)).toEqual([1, 2]);
  });

  it("cycle: unlinked → 1 → 2 → 3 → 4 → unlinked", () => {
    let d: Desk = { name: "C", layout: 1, screens: [{ symbol: "TSLA", timeframe: "5m" }] };
    const seen: (number | undefined)[] = [];
    for (let k = 0; k < 5; k++) { d = cycleLink(d, 0); seen.push(d.screens[0].link); }
    expect(seen).toEqual([1, 2, 3, 4, undefined]);
  });

  it("a market moves its whole group only; timeframes stay unless the desk links them", () => {
    const out = setLinkedSymbol(desk(), 0, "aapl");
    expect(out.screens.map(s => s.symbol)).toEqual(["AAPL", "NQ1!", "AAPL", "BTC"]);
    expect(setLinkedTimeframe(desk(), 0, "15m").screens.map(s => s.timeframe)).toEqual(["15m", "5m", "1h", "5m"]);
    const tfLinked = { ...desk(), linkTimeframe: true };
    expect(setLinkedTimeframe(tfLinked, 0, "15m").screens.map(s => s.timeframe)).toEqual(["15m", "5m", "15m", "5m"]);
    expect(setLinkedTimeframe(tfLinked, 3, "1h").screens.map(s => s.timeframe)).toEqual(["1m", "5m", "1h", "1h"]);
    expect(setLinkedTimeframe(desk(), 0, "nonsense")).toEqual(desk());
  });

  it("linkTimeframe survives save/reload; absent when off", () => {
    expect(readDesk(JSON.parse(JSON.stringify({ ...desk(), linkTimeframe: true })))?.linkTimeframe).toBe(true);
    expect("linkTimeframe" in (readDesk(JSON.parse(JSON.stringify(desk()))) ?? {})).toBe(false);
  });

  it("a group change from another window moves only that group, and is a no-op when nothing changes", () => {
    const d = desk();
    expect(applyGroupChange(d, 1, { symbol: "ES1!" }).screens.map(s => s.symbol)).toEqual(["ES1!", "NQ1!", "ES1!", "BTC"]);
    expect(applyGroupChange(d, 3, { symbol: "ES1!" })).toBe(d);
    const once = applyGroupChange(d, 1, { symbol: "ES1!" });
    expect(applyGroupChange(once, 1, { symbol: "ES1!" })).toBe(once);
    expect(applyGroupChange(d, 1, { symbol: "!!bad" })).toBe(d);
    // Timeframes from another window apply only when THIS desk links them.
    expect(applyGroupChange(d, 1, { timeframe: "15m" })).toBe(d);
    expect(applyGroupChange({ ...d, linkTimeframe: true }, 1, { timeframe: "15m" }).screens.map(s => s.timeframe)).toEqual(["15m", "5m", "15m", "5m"]);
  });
});

describe("linked crosshair maps by TIME, not index", () => {
  const times = [1000, 1060, 1120, 1180]; // 1m bars
  const at = (i: number) => times[i];
  it("finds the bar containing the time", () => {
    expect(barTimeContaining(4, at, 1000, 60)).toBe(1000);
    expect(barTimeContaining(4, at, 1119, 60)).toBe(1060);
    expect(barTimeContaining(4, at, 1120, 60)).toBe(1120);
    expect(barTimeContaining(4, at, 1239, 60)).toBe(1180);
  });
  it("nothing outside the pane's range or in a gap", () => {
    expect(barTimeContaining(4, at, 999, 60)).toBeNull();
    expect(barTimeContaining(4, at, 1240, 60)).toBeNull();
    const gap = [0, 60, 3600]; // overnight hole between 120 and 3600
    expect(barTimeContaining(3, i => gap[i], 200, 60)).toBeNull();
    expect(barTimeContaining(0, at, 1000, 60)).toBeNull();
    expect(barTimeContaining(4, at, NaN, 60)).toBeNull();
  });
  it("a 1m hover lands on the 1h bar that contains it (different bar counts, same time)", () => {
    const hourly = [0, 3600, 7200];
    expect(barTimeContaining(3, i => hourly[i], 3600 + 17 * 60, 3600)).toBe(3600);
    // index 1 of the 1m pane is NOT index 1 of the hourly pane — time decides.
    expect(barTimeContaining(3, i => hourly[i], 60, 3600)).toBe(0);
  });
});

describe("second window", () => {
  it("carries the desk (or one screen) by URL and re-validates it", () => {
    const d = { ...desk(), linkTimeframe: true };
    const all = decodeDeskWindow(encodeDeskWindow(d));
    expect(all?.label).toBe("desk");
    expect(all?.desk.screens).toEqual(d.screens);
    expect(all?.desk.layout).toBe(4);
    expect(all?.desk.linkTimeframe).toBe(true);
    const one = decodeDeskWindow(encodeDeskWindow(d, 2));
    expect(one?.label).toBe("screen-3");
    expect(one?.desk.layout).toBe(1);
    expect(one?.desk.screens).toEqual([{ symbol: "SPY", timeframe: "1h", link: 1 }]);
    expect(decodeDeskWindow("")).toBeNull();
    expect(decodeDeskWindow("window=evil&screens=TSLA~5m")).toBeNull();
    expect(decodeDeskWindow("window=desk&screens=%3Cscript%3E~5m")).toBeNull();
  });

  it("the bus: same-window listeners hear it synchronously; other windows hear it over one channel; no echo", () => {
    const peers = new Set<{ onmessage: ((e: { data: unknown }) => void) | null }>();
    class FakeChannel {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      constructor() { peers.add(this); }
      postMessage(m: unknown) { peers.forEach(p => { if (p !== this) p.onmessage?.({ data: structuredClone(m) }); }); }
      close() { peers.delete(this); }
    }
    const a = createDeskLinkBus(FakeChannel, "a");
    const b = createDeskLinkBus(FakeChannel, "b");
    const gotA: [DeskLinkMessage, boolean][] = [];
    const gotB: [DeskLinkMessage, boolean][] = [];
    a.subscribe((m, r) => gotA.push([m, r]));
    b.subscribe((m, r) => gotB.push([m, r]));
    a.publish({ k: "sym", group: 1, symbol: "AAPL", from: "a:0" });
    expect(gotA).toEqual([[{ k: "sym", group: 1, symbol: "AAPL", from: "a:0" }, false]]);
    expect(gotB).toEqual([[{ k: "sym", group: 1, symbol: "AAPL", from: "a:0" }, true]]);
    expect(a.crossWindow && b.crossWindow).toBe(true);
    // Malformed traffic on the channel is ignored.
    for (const p of peers) p.onmessage?.({ data: { k: "sym", group: 9, symbol: "X", from: "z" } });
    expect(gotB).toHaveLength(1);
    a.dispose(); b.dispose();
  });

  it("window-local fallback when BroadcastChannel is missing", () => {
    const bus = createDeskLinkBus(null, "solo");
    const got: DeskLinkMessage[] = [];
    bus.subscribe(m => got.push(m));
    bus.publish({ k: "x", group: 2, time: 1234, from: "solo:1" });
    expect(bus.crossWindow).toBe(false);
    expect(got).toHaveLength(1);
  });
});

describe("sentinels — the linking stays wired", () => {
  const shell = readFileSync("src/components/desk/DeskShell.tsx", "utf8");
  const chart = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  const row = readFileSync("src/components/chart/WatchlistRow.tsx", "utf8");
  it("the chip prints the group number, not colour alone", () => {
    expect(shell).toContain("{linkChipLabel(link)}");
  });
  it("every market/timeframe change goes through the one owner", () => {
    expect(shell).toContain("onSymbol={v => changeSymbol(i, v)}");
    expect(shell).toContain("onTimeframe={v => changeTimeframe(i, v)}");
    expect(shell).toContain("if (sym) { changeSymbol(i, sym); setFocused(i); }");
    expect(shell).not.toMatch(/setWorking\(w => setLinkedSymbol/);
  });
  it("the hairline never enters React state or the candle paint loop", () => {
    expect(shell).toContain("if (!raf) raf = requestAnimationFrame(paint);");
    expect(shell).toContain('el.style.transform = `translate3d(');
    expect(chart).toContain('onCrosshairTimeRef.current?.(param?.point && typeof param?.time === "number" ? param.time : null);');
  });
  it("Watchlist rows drag AND offer a Send-to-screen menu", () => {
    expect(row).toContain("e.dataTransfer.setData(DESK_SYMBOL_DRAG_TYPE, sym)");
    expect(row).toContain("aria-label={`Send ${sym} to a desk screen`}");
    expect(shell).toContain("sendTo={{ labels:");
  });
  it("a popped window stays linked and never writes the stored desks", () => {
    expect(shell).toContain("if (popout) return; // a popped window never writes the stored desks");
    expect(shell).toContain("window.open(`/desk?${q}`");
  });
});

describe("Garden 19 §22 — the Desk as a touch station", () => {
  it("tablet portrait: two screens stacked per view, the rest scroll", async () => {
    const { tabletPortraitGridFor } = await import("./desks");
    expect(tabletPortraitGridFor(4)).toEqual({ columns: "1fr", rows: "repeat(4, calc(50% - 2px))", areas: ["1 / 1 / 2 / 2", "2 / 1 / 3 / 2", "3 / 1 / 4 / 2", "4 / 1 / 5 / 2"] });
    expect(tabletPortraitGridFor(1).rows).toBe("1fr");
  });
  it("touch chrome is 44px; phone shows one focused screen with a switcher", async () => {
    const { DESK_TOUCH_CSS, DESK_TOUCH_QUERY, DESK_TABLET_PORTRAIT_QUERY } = await import("./desks");
    expect(DESK_TOUCH_CSS).toContain("min-height: 44px !important; min-width: 44px !important");
    expect(DESK_TOUCH_QUERY).toContain("(pointer: coarse)");
    expect(DESK_TABLET_PORTRAIT_QUERY).toContain("(orientation: portrait)");
    const shell = readFileSync("src/components/desk/DeskShell.tsx", "utf8");
    expect(shell).toContain("phone ? [Math.min(focused, screens.length - 1)]");
    expect(shell).toContain('data-testid="desk-switcher"');
    expect(shell).toContain("{touch ? <style>{DESK_TOUCH_CSS}</style> : null}");
    expect(readFileSync("src/components/chart/WatchlistRow.tsx", "utf8")).toContain("minWidth: 44, minHeight: 44");
  });
});

describe("phone Desk ⋯ menu (Founder ruling 2026-10-07)", () => {
  it("folds Save / Save as / Rename / Delete into one keyboard-operable menu on phone only", () => {
    const shell = readFileSync("src/components/desk/DeskShell.tsx", "utf8");
    expect(shell).toContain('<DeskMenu dirty={dirty} items={[["Save", save], ["Save as…", saveAs], ["Rename", rename], ["Delete", remove]]} />');
    expect(shell).toContain('aria-haspopup="menu" aria-expanded={open}');
    expect(shell).toContain('if (e.key === "Escape") { e.preventDefault(); close(); }');
    expect(shell).toContain("minHeight: 44, textAlign: \"left\"");
  });
});
