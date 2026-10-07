import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTRUMENT_EDUCATION, INVENTION_EDUCATION, educationFor, educationIdForSelection, educationTruthLines } from "./inventionEducation";
import { PROFILE_FAMILY, selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";
import { FOOTPRINT_TYPES } from "@/components/chart/FootprintControls";

const ALL = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} }).entries;
const FIELDS = ["question", "evidence", "appears", "grammar", "full", "partial", "degraded", "firstTouch", "canon"] as const;

describe("Garden 19 §9 — one education owner, keyed by the menus' own ids", () => {
  it("every catalogue row has a complete education record", () => {
    expect(ALL.length).toBeGreaterThan(30);
    for (const e of ALL) {
      const r = educationFor(e.id);
      expect(r, e.id).not.toBeNull();
      for (const f of FIELDS) expect(r![f].trim().length, `${e.id}.${f}`).toBeGreaterThan(8);
    }
  });

  it("every record maps to a real id — no orphan education", () => {
    const ids = new Set(ALL.map(e => e.id));
    for (const k of Object.keys(INVENTION_EDUCATION)) {
      expect(ids.has(k as never), k).toBe(true);
      expect(PROFILE_FAMILY[k as keyof typeof PROFILE_FAMILY], k).toBeDefined();
    }
    const fp = new Set(FOOTPRINT_TYPES.map(t => `FP_${t.id}`));
    // A non-footprint instrument record must name an instrument the Tool Finder actually lists.
    const src = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    const start = src.indexOf("const toolFinderNode = (");
    const listed = new Set([...src.slice(start, src.indexOf("\n  );", start)).matchAll(/\bid: "([A-Z_]+)"/g)].map(m => m[1]));
    for (const k of Object.keys(INSTRUMENT_EDUCATION)) {
      expect(fp.has(k) || listed.has(k), k).toBe(true);
    }
    for (const id of fp) expect(INSTRUMENT_EDUCATION[id], id).toBeDefined();
  });

  it("the Tool Finder's instruments (ChartsDashboard) each have a record", () => {
    const src = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    const start = src.indexOf("const toolFinderNode = (");
    const block = src.slice(start, src.indexOf("\n  );", start));
    const ids = [...block.matchAll(/\bid: "([A-Z_]+)"/g)].map(m => m[1]);
    expect(ids).toContain("SESSION_BANDS");
    for (const id of ids) expect(educationFor(id), id).not.toBeNull();
    expect(block).toContain("id: `FP_${t.id}`");
  });

  it("is not a second description table — the catalogue owns 'what it is'", () => {
    for (const r of [...Object.values(INVENTION_EDUCATION), ...Object.values(INSTRUMENT_EDUCATION)]) {
      expect(Object.keys(r)).not.toContain("what");
      expect(Object.keys(r)).not.toContain("label");
    }
  });
});

describe("the preview tells the truth for THIS symbol", () => {
  it("spot FX: a volume reader says it needs traded volume, and spot FX has none", () => {
    const fx = selectProfileMenu({ barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: {}, symbol: "EURUSD" });
    const abs = fx.entries.find(e => e.id === "ABSORPTION")!;
    const t = educationTruthLines({ entry: abs, feed: "LIVE" });
    expect(t.verdict).toBe("UNAVAILABLE HERE");
    expect(t.lines.join(" ")).toMatch(/Needs traded volume/);
    expect(t.lines.join(" ")).toMatch(/spot FX/);
    // a price-only tool still reads it
    const tpo = fx.entries.find(e => e.id === "TPO_PROFILE")!;
    expect(educationTruthLines({ entry: tpo }).verdict).toBe("CAN DRAW HERE");
  });

  it("a delayed feed says what is delayed; LIVE adds nothing", () => {
    const e = ALL.find(x => x.id === "MARKET_STRUCTURE")!;
    expect(educationTruthLines({ entry: e, feed: "DELAYED" }).lines.join(" ")).toMatch(/DELAYED — what it draws trails the live market/);
    expect(educationTruthLines({ entry: e, feed: "LIVE" }).lines).toHaveLength(1);
  });

  it("an instrument prints its owner's sentence verbatim", () => {
    const t = educationTruthLines({ instrumentTruth: { ok: false, waiting: true, sentence: "Big Trades has nothing to draw YET." } });
    expect(t.verdict).toBe("WAITING");
    expect(t.lines).toEqual(["Big Trades has nothing to draw YET."]);
  });
});

describe("§10 — a selection on the market finds its own record", () => {
  it("maps every selection kind to a real education record", () => {
    const cases = [
      [{ kind: "OBJECT", objectId: "SWING:abc" }, "MARKET_STRUCTURE"],
      [{ kind: "OBJECT", objectId: "MEMORY:b1:POC" }, "PROFILE_MEMORY"],
      [{ kind: "PRINT", print: { kind: "delta" } }, "FP_delta"],
      [{ kind: "PRINT", print: { kind: "big-trade" } }, "FP_big-trades"],
      [{ kind: "SLICE" }, "LIVING_PROFILE"],
      [{ kind: "ANATOMY", reading: { target: { reading: "EXHAUSTION" } } }, "EXHAUSTION"],
      [{ kind: "ANATOMY", reading: { target: { reading: "ABSORPTION" } } }, "ABSORPTION"],
      [{ kind: "MEMORY_GHOST" }, "MEMORY_GHOST"],
      [{ kind: "PRESSURE_WALL" }, "BRICK_WALLS"],
      [{ kind: "PRESSURE_FRONT" }, "DERIVATIVES_PRESSURE"],
      [{ kind: "WEATHER" }, "LIQUIDITY_WEATHER"],
    ] as const;
    for (const [sel, id] of cases) {
      const got = educationIdForSelection(sel as never);
      expect(got).toBe(id);
      expect(educationFor(got!)).not.toBeNull();
    }
    expect(educationIdForSelection(null)).toBeNull();
  });
});

describe("a row with no owner verdict never claims ready", () => {
  it("Effort → Response on spot FX: needs traded volume", () => {
    const t = educationTruthLines({ id: "EFFORT_RESPONSE", symbol: "EURUSD" });
    expect(t.verdict).toBe("UNAVAILABLE HERE");
    expect(t.lines[0]).toMatch(/Needs traded volume — spot FX/);
  });
  it("elsewhere it says the state is not reported rather than CAN DRAW", () => {
    expect(educationTruthLines({ id: "EFFORT_RESPONSE", symbol: "AAPL" }).verdict).toBe("STATE NOT REPORTED");
  });
});

describe("spot FX says 'needs traded volume' once", () => {
  it("drops the chip's state words when the note already says them", () => {
    const fx = selectProfileMenu({ barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: {}, symbol: "EURUSD" });
    const t = educationTruthLines({ entry: fx.entries.find(e => e.id === "ABSORPTION")!, feed: "LIVE" });
    expect((t.lines.join(" ").match(/needs traded volume/gi) ?? []).length).toBe(1);
  });
});

describe("first touch names the object it touched", () => {
  it("a zone is a zone, a swing is a swing", async () => {
    const { firstTouchFor } = await import("./inventionEducation");
    expect(firstTouchFor("MARKET_STRUCTURE", "ZONE:coinbase:BTC|5m|1")).toMatch(/^Supply \/ demand zone/);
    expect(firstTouchFor("MARKET_STRUCTURE", "SWING:abc")).toMatch(/^Swing level/);
    expect(firstTouchFor("NOT_A_TOOL")).toBeNull();
  });
});
