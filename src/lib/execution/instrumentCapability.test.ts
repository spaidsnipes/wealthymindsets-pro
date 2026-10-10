import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DOOR_OWNER, chartFamily, familyCell, familyVerdict, PAPER_RAIL_OWNER, TRADE_FAMILIES, type RailConnections } from "./instrumentCapability";

const ALL = (c: RailConnections["tastytrade"]): RailConnections => ({ tastytrade: c, Webull: c, "Alpaca paper": c });

describe("family × broker matrix — the ticket never fakes support", () => {
  it("connected today: stocks, futures, crypto, both options families EXECUTABLE; forex CHART ONLY", () => {
    const v = Object.fromEntries(TRADE_FAMILIES.map(f => [f, familyVerdict(f, ALL("CONNECTED")).state]));
    expect(v).toEqual({ STOCK: "EXECUTABLE", EQUITY_OPTION: "EXECUTABLE", FUTURE: "EXECUTABLE", FUTURE_OPTION: "EXECUTABLE", FX: "CHART_ONLY", CRYPTO: "EXECUTABLE" });
  });
  it("spot forex is never executable on any rail, in any connection state, and says why", () => {
    for (const c of ["CONNECTED", "NOT_CONNECTED", "CHECKING"] as const) {
      const v = familyVerdict("FX", ALL(c));
      expect(v.state).toBe("CHART_ONLY");
      expect(v.reason).toMatch(/spot-forex/);
      expect(v.reason).toMatch(/6E/);
    }
  });
  it("tastytrade down + paper up: stocks and crypto fall to PAPER ONLY; futures say NOT CONNECTED", () => {
    const c: RailConnections = { tastytrade: "NOT_CONNECTED", Webull: "NOT_CONNECTED", "Alpaca paper": "CONNECTED" };
    expect(familyVerdict("STOCK", c).state).toBe("PAPER_ONLY");
    expect(familyVerdict("CRYPTO", c).state).toBe("PAPER_ONLY");
    expect(familyVerdict("FUTURE", c).state).toBe("NOT_CONNECTED");
    expect(familyVerdict("FUTURE_OPTION", c).state).toBe("NOT_CONNECTED");
  });
  it("a guest sees NOT CONNECTED (not on your account), never EXECUTABLE", () => {
    for (const f of TRADE_FAMILIES) expect(familyVerdict(f, ALL("NOT_YOURS")).state).not.toBe("EXECUTABLE");
    expect(familyVerdict("STOCK", ALL("NOT_YOURS")).reason).toMatch(/not on your account/);
  });
  it("Webull's built stock route with no sending screen is CHART ONLY for Webull — not claimed", () => {
    const c = familyCell("STOCK", "Webull", "CONNECTED");
    expect(c.state).toBe("CHART_ONLY");
    expect(c.reason).toMatch(/no WM screen sends/);
    expect(familyCell("FUTURE_OPTION", "Webull", "CONNECTED").state).toBe("CHART_ONLY");
    expect(familyCell("FUTURE", "Alpaca paper", "CONNECTED").state).toBe("CHART_ONLY");
  });
  it("every door names a screen that exists and renders a send block; the paper rail's route exists", () => {
    const sendBlock: Record<string, RegExp> = {
      TICKET: /<TastytradeLiveOrder/, CHAIN: /<TastytradeLiveOrder/, EXPRESSION: /<WebullLiveOrder/, PAPER: /\/api\/alpaca-trading/,
    };
    for (const [door, file] of Object.entries(DOOR_OWNER)) {
      expect(existsSync(join(process.cwd(), file)), file).toBe(true);
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src.length).toBeGreaterThan(1000);
      expect(src, `${door} → ${file}`).toMatch(sendBlock[door]!);
    }
    expect(existsSync(join(process.cwd(), PAPER_RAIL_OWNER))).toBe(true);
  });
  it("the chart's instrument picks the family the ticket opens on", () => {
    expect(chartFamily("AAPL")).toBe("STOCK");
    expect(chartFamily("MES1!")).toBe("FUTURE");
    expect(chartFamily("/MNQZ6")).toBe("FUTURE");
    expect(chartFamily("EUR/USD")).toBe("FX");
    expect(chartFamily("BTC")).toBe("CRYPTO");
    expect(chartFamily("BTC/USD")).toBe("CRYPTO");
  });
});
