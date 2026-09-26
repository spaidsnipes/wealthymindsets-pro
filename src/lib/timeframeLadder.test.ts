import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CANON_LADDER, CANON_LADDER_GROUPS, CHART_TF_SHIPPED, TF_IDS, canonRungSpokenName, getTimeframe,
  isTFId, liveBarBucketSec, timeframeSpokenName, type CanonRung,
} from "./timeframes";
import { resolveYahooTimeframe } from "./yahooTimeframes";
import { EXCHANGE_TIMEFRAME_SECONDS } from "./marketData/exchangeTimeframes";

/**
 * THE CANONICAL LADDER — Garden 16 §21 ("Recover the actual registry. DO NOT
 * GUESS THE MIDDLE"), §22 (one registry, many consumers), §23 (never fabricate
 * unavailable precision), §24 (UX compression is not feature deletion).
 *
 * The first case is the Founder's list, quoted from Drive (2026-09-21 "CURRENT
 * WM PRO TIMEFRAME FAMILY"). It is typed here deliberately, once, as the
 * oracle: the registry has to agree with the canon, and a test that derived
 * its expectation from the registry would agree with anything.
 */
const CANON_FAMILY_QUOTED =
  "TICK / 1s / 5s / 10s / 15s / 30s / 1m / 2m / 3m / 5m / 10m / 15m / 20m / 30m / 1h / 2h / 4h / 1D / 1W / 1M / 1Q / 6M / 1Y";

const SRC = (rel: string) => readFileSync(join(process.cwd(), "src", rel), "utf8");

/**
 * The chart's first equity bar route, read from source. Next route files may
 * only export handlers, so the table cannot be imported; parsing it is how the
 * registry's NATIVE claims stay pinned to the route that makes them true.
 */
function alpacaTfMap(): Record<string, string> {
  const src = SRC("app/api/alpaca/route.ts");
  const start = src.indexOf("const ALPACA_TF_MAP");
  const end = src.indexOf("};", start);
  expect(start, "ALPACA_TF_MAP moved or was renamed").toBeGreaterThan(-1);
  const out: Record<string, string> = {};
  for (const m of src.slice(start, end).matchAll(/"([^"]+)":\s*\{\s*timeframe:\s*"([^"]+)"/g)) out[m[1]] = m[2];
  expect(Object.keys(out).length, "parsed no ALPACA_TF_MAP entries").toBeGreaterThan(10);
  return out;
}

function finnhubResKeys(): string[] {
  const src = SRC("app/api/finnhub/route.ts");
  const start = src.indexOf("const FH_NATIVE_RES");
  expect(start).toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf("};", start));
  return [...block.matchAll(/"([^"]+)":\s*"/g)].map(m => m[1]);
}

/** Alpaca's bucket name for a bucket of exactly this size. */
function exactAlpacaBucket(r: CanonRung): string | null {
  const unit = { minute: "Min", hour: "Hour", day: "Day", week: "Week", month: "Month" } as Record<string, string>;
  return r.n !== null && unit[r.unit] ? `${r.n}${unit[r.unit]}` : null;
}

const ids = (rungs: readonly CanonRung[]) => rungs.map(r => r.id);
const avail = (id: string) => CANON_LADDER.find(r => r.id === id)!;

describe("the ladder is the canon's list — recovered, not guessed", () => {
  it("carries exactly the quoted family, in the quoted order", () => {
    expect(ids(CANON_LADDER).join(" / ")).toBe(CANON_FAMILY_QUOTED);
  });

  it("is TWENTY-THREE rungs: the quoted list, not the '26' the research note counted", () => {
    // The note said "26-rung ladder" and then listed these 23. The list is the
    // evidence; padding the registry to 26 would be inventing three rungs.
    expect(CANON_LADDER).toHaveLength(23);
    expect(new Set(ids(CANON_LADDER)).size).toBe(23);
  });

  it("does not carry 45m, which the current family dropped (an open question, not a rung)", () => {
    expect(ids(CANON_LADDER)).not.toContain("45m");
  });

  it("groups in canon order: tick & seconds, minutes, hours, days & longer", () => {
    expect(CANON_LADDER_GROUPS.map(g => g.label)).toEqual(["Tick & seconds", "Minutes", "Hours", "Days & longer"]);
    const order = CANON_LADDER_GROUPS.map(g => g.id);
    const seen = CANON_LADDER.map(r => order.indexOf(r.group));
    expect(seen.every(i => i >= 0)).toBe(true);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});

describe("the availability table — what the chart's bar path can do with each rung today", () => {
  it("is exactly this table", () => {
    const table = CANON_LADDER.map(r => `${r.id}:${r.availability === "NATIVE_PROVIDER" ? "N" : r.availability === "DERIVED_CANONICAL" ? "D" : "U"}`);
    expect(table.join(" ")).toBe(
      "TICK:U 1s:U 5s:U 10s:U 15s:U 30s:U " +
      "1m:N 2m:N 3m:N 5m:N 10m:N 15m:N 20m:U 30m:N " +
      "1h:N 2h:N 4h:N " +
      "1D:N 1W:N 1M:N 1Q:U 6M:U 1Y:U",
    );
  });

  it("every NATIVE rung maps, on /api/alpaca, to a bucket of EXACTLY its size", () => {
    const alpaca = alpacaTfMap();
    const natives = CANON_LADDER.filter(r => r.availability === "NATIVE_PROVIDER");
    expect(natives.length).toBe(13);
    for (const r of natives) {
      if (r.availability === "UNAVAILABLE") throw new Error("unreachable");
      expect(alpaca[r.chartTf], `${r.id}: /api/alpaca has no entry for "${r.chartTf}"`).toBe(exactAlpacaBucket(r));
    }
  });

  it("every NATIVE rung switches the chart to a registry id of the same size", () => {
    for (const r of CANON_LADDER) {
      if (r.availability === "UNAVAILABLE") continue;
      expect(isTFId(r.chartTf)).toBe(true);
      const sec = getTimeframe(r.chartTf).candleIntervalSec;
      const perUnit = { second: 1, minute: 60, hour: 3600, day: 86_400, week: 604_800 } as Record<string, number>;
      if (perUnit[r.unit]) expect(sec, r.id).toBe(r.n! * perUnit[r.unit]);
      // The month is a calendar unit (Alpaca 1Month); the registry stores 30
      // days only because a fetch needs seconds. The spoken name is the claim.
      else expect(timeframeSpokenName(r.chartTf), r.id).toBe("1 month bars");
    }
  });

  it("claims DERIVED_CANONICAL for no rung: no aggregation owner feeds the chart for any", () => {
    // dxlinkProtocol.aggregateCandles (15s windows) is the one tape→bar builder
    // and it has no production importer. When one is wired, this is the case
    // that should change, with the owner named.
    expect(CANON_LADDER.filter(r => r.availability === "DERIVED_CANONICAL")).toEqual([]);
  });

  it("TICK and every seconds rung: no certified trade tape on this path — and no route serves them", () => {
    const alpaca = alpacaTfMap();
    const fh = finnhubResKeys();
    for (const id of ["TICK", "1s", "5s", "10s", "15s", "30s"]) {
      const r = avail(id);
      expect(r.availability, id).toBe("UNAVAILABLE");
      if (r.availability !== "UNAVAILABLE") continue;
      expect(r.reason).toBe("Needs a certified trade tape — none on this path.");
      expect(isTFId(id), `${id} became a chart id; its availability must be re-measured`).toBe(false);
      expect(alpaca[id]).toBeUndefined();
      expect(fh).not.toContain(id);
      expect(resolveYahooTimeframe(id)).toBeNull();
      expect(Object.keys(EXCHANGE_TIMEFRAME_SECONDS)).not.toContain(id);
    }
  });

  it("20m and 1Q: not built yet — and it is true, no route serves either", () => {
    const alpaca = alpacaTfMap();
    const fh = finnhubResKeys();
    for (const id of ["20m", "1Q"]) {
      const r = avail(id);
      if (r.availability !== "UNAVAILABLE") throw new Error(`${id} is no longer UNAVAILABLE`);
      expect(r.reason.startsWith("Not built yet")).toBe(true);
      expect(isTFId(id)).toBe(false);
      expect(alpaca[id], `/api/alpaca now serves ${id}: re-measure the rung`).toBeUndefined();
      expect(fh).not.toContain(id);
      expect(resolveYahooTimeframe(id)).toBeNull();
      expect(Object.keys(EXCHANGE_TIMEFRAME_SECONDS)).not.toContain(id);
    }
  });

  it("6M and 1Y: the routes do NOT serve a bucket of their canon size, and the reason names the open decision", () => {
    const alpaca = alpacaTfMap();
    for (const [id, words] of [["6M", /half-year candle.*six months of daily bars/], ["1Y", /yearly candle.*one year of daily bars/]] as const) {
      const r = avail(id);
      if (r.availability !== "UNAVAILABLE") throw new Error(`${id} is no longer UNAVAILABLE`);
      expect(r.reason).toMatch(/^Open decision/);
      expect(r.reason).toMatch(words);
      // The chart id of the same spelling exists, and its first route answers
      // with MONTHLY bars — not a half-year or a year. That is why it is not
      // NATIVE, whatever a later edit to this table might wish.
      expect(isTFId(id)).toBe(true);
      expect(alpaca[id]).toBe("1Month");
      expect(alpaca[id]).not.toBe(exactAlpacaBucket(r));
    }
  });

  it("no reason is empty, and no servable rung carries one", () => {
    for (const r of CANON_LADDER) {
      if (r.availability === "UNAVAILABLE") expect(r.reason.trim().length, r.id).toBeGreaterThan(10);
      else expect("reason" in r, r.id).toBe(false);
    }
  });
});

describe("the primary strip is a calm subset of the ladder, not a second list", () => {
  it("CHART_TF_SHIPPED is still the nine", () => {
    expect([...CHART_TF_SHIPPED]).toEqual(["1m", "2m", "5m", "15m", "30m", "1h", "1D", "1W", "1M"]);
  });

  it("every strip id is a NATIVE rung of the ladder", () => {
    const native = new Set(CANON_LADDER.flatMap(r => (r.availability === "UNAVAILABLE" ? [] : [r.chartTf])));
    for (const id of CHART_TF_SHIPPED) expect(native.has(id), id).toBe(true);
  });
});

describe("spoken names — one phrase builder for the strip and the ladder", () => {
  it("a servable rung is announced exactly as the strip announces its chart id", () => {
    for (const r of CANON_LADDER) {
      if (r.availability !== "UNAVAILABLE") expect(canonRungSpokenName(r)).toBe(timeframeSpokenName(r.chartTf));
    }
  });

  it("every rung has a distinct name — 1m and 1M, 6M and 1M, never collide", () => {
    const names = CANON_LADDER.map(canonRungSpokenName);
    expect(new Set(names).size, names.join(" | ")).toBe(names.length);
  });

  it("names the rungs that have no chart id from their own size", () => {
    expect(canonRungSpokenName(avail("1s"))).toBe("1 second bars");
    expect(canonRungSpokenName(avail("20m"))).toBe("20 minutes bars");
    expect(canonRungSpokenName(avail("1Q"))).toBe("1 quarter bars");
    expect(canonRungSpokenName(avail("6M"))).toBe("6 months bars");
    expect(canonRungSpokenName(avail("1Y"))).toBe("1 year bars");
  });

  it("TICK says its trade count is not chosen, rather than inventing one", () => {
    expect(avail("TICK").n).toBeNull();
    expect(canonRungSpokenName(avail("TICK"))).toBe("tick bars, trade count not yet chosen");
  });
});

describe("liveBarBucketSec — the live forming bar's clock, fail closed", () => {
  /**
   * THE ORACLE: useWebSocket's private table as it stood before 2026-09-26,
   * copied here verbatim with its `?? 60`. Every TFId must answer exactly as
   * it did — behaviour for real ids is not this lane's to change.
   */
  const OLD: Record<string, number> = {
    "1t": 1, "5t": 5, "30t": 30,
    "1m": 60, "2m": 120, "3m": 180, "5m": 300, "10m": 600,
    "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200,
    "4h": 14400, "1D": 86400, "1W": 604800, "1M": 2592000,
  };
  const oldClock = (tf: string) => OLD[tf] ?? 60;

  it("answers every one of the 19 TFIds exactly as the hook's old table did", () => {
    expect(TF_IDS).toHaveLength(19);
    for (const id of TF_IDS) expect(liveBarBucketSec(id), id).toBe(oldClock(id));
  });

  it("is the registry's own candle for every id outside the six pending a decision", () => {
    const pending = new Set(["45m", "3M", "6M", "1Y", "2Y", "5Y"]);
    for (const id of TF_IDS) {
      if (!pending.has(id)) expect(liveBarBucketSec(id), id).toBe(getTimeframe(id).candleIntervalSec);
    }
  });

  it("answers null — no clock, no forming bar — for the retired 1t/5t/30t and every non-clock id", () => {
    for (const raw of ["1t", "5t", "30t", "100T", "TICK", "15s", "1s", "20m", "1Q", "3Y", "D", "", "banana"]) {
      expect(liveBarBucketSec(raw), `"${raw}"`).toBeNull();
    }
  });
});
