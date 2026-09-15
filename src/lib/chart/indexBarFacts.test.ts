import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  easternClockFact,
  indexChangeFact,
  indexQuoteFact,
} from "./indexBarFacts";
import { selectTickerChangeDisplay } from "@/lib/marketData/selectTickerChangeDisplay";

describe("easternClockFact — a hardcoded offset is a claim about the calendar", () => {
  it("× THE FIXED OFFSET: the SAME wall clock is -4 in September and -5 in January", () => {
    // 22:03Z. Under DST (EDT, -4) that is 18:03. Under EST (-5) it is 17:03.
    const summer = easternClockFact(new Date("2026-09-15T22:03:00Z"));
    const winter = easternClockFact(new Date("2026-01-15T22:03:00Z"));
    expect(summer.text).toContain("18:03");
    expect(summer.text).toContain("EDT");
    expect(winter.text).toContain("17:03");
    expect(winter.text).toContain("EST");
    // The exact production defect: a literal -5 would have printed 17:03 for BOTH.
    expect(summer.text.slice(0, 12)).not.toBe(winter.text.slice(0, 12));
  });

  it("× THE UNNAMED CLOCK: the reading always says which clock it is", () => {
    const f = easternClockFact(new Date("2026-09-15T22:03:00Z"));
    expect(f.text).toMatch(/E[DS]T$/);
    expect(f.measured).toBe(true);
    expect(f.reason).toMatch(/America\/New_York/);
    expect(f.reason).toMatch(/not.*hardcoded UTC offset/i);
    expect(f.reason).toMatch(/NOT an exchange-stamped time/i);
  });

  it("agrees with Intl for a spread of instants across both DST arms", () => {
    for (const iso of [
      "2026-01-15T22:03:00Z",
      "2026-03-08T05:30:00Z",
      "2026-03-08T08:30:00Z",
      "2026-07-04T16:00:00Z",
      "2026-11-01T04:30:00Z",
      "2026-11-01T07:30:00Z",
      "2026-12-31T23:59:00Z",
    ]) {
      const d = new Date(iso);
      const expected = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d).replace(/^24:/, "00:");
      expect(easternClockFact(d).text).toContain(expected);
    }
  });

  it("× THE ABSENT CLOCK: no reading is stated as absent, never as a time", () => {
    for (const v of [null, undefined, new Date(Number.NaN)]) {
      const f = easternClockFact(v as Date | null | undefined);
      expect(f.measured).toBe(false);
      expect(f.text).not.toMatch(/\d\d:\d\d/);
      expect(f.text).not.toBe("—");
    }
  });
});

describe("indexQuoteFact — a zero-initialised ticker is not a price", () => {
  it("× THE PHANTOM ZERO: price 0 is NOTHING RECEIVED, not a reading", () => {
    for (const v of [0, -1, undefined, null, Number.NaN, "12.5"]) {
      const f = indexQuoteFact(v);
      expect(f.measured).toBe(false);
      expect(f.tone).toBe("NONE");
      expect(f.text).toBe("No quote");
      expect(f.text).not.toBe("—");
    }
    expect(indexQuoteFact(0).reason).toMatch(/NOTHING RECEIVED/);
  });

  it("a real quote prints and refuses to claim freshness", () => {
    const f = indexQuoteFact(5812.25);
    expect(f.text).toBe("5812.25");
    expect(f.measured).toBe(true);
    expect(f.reason).toMatch(/does not claim how stale/i);
  });
});

describe("indexChangeFact — two different gaps must not render as one nothing", () => {
  it("× THE VANISHED CHANGE: no quote SAYS so instead of rendering nothing", () => {
    const f = indexChangeFact(false, selectTickerChangeDisplay(null));
    expect(f.measured).toBe(false);
    expect(f.text.length).toBeGreaterThan(0);
    expect(f.reason).toMatch(/SAME gap as the price cell/i);
    expect(f.reason).toMatch(/empty space a reader cannot question/i);
  });

  it("× THE SEPARATE GAP: a quote with no reference close says the price beside it IS real", () => {
    const f = indexChangeFact(true, selectTickerChangeDisplay({ change: 0, changePct: 0 }));
    expect(f.measured).toBe(false);
    expect(f.tone).toBe("NONE");
    expect(f.text).toBe("no reference close");
    expect(f.reason).toMatch(/the figure beside this one is real/i);
    expect(f.reason).toMatch(/SEPARATE GAP/);
    expect(f.reason).toMatch(/will not paint a green \+0\.00%/i);
  });

  it("a real move keeps its sign, its arrow and its tone", () => {
    const up = indexChangeFact(true, selectTickerChangeDisplay({ change: 12.5, changePct: 0.42 }));
    expect(up.tone).toBe("UP");
    expect(up.text).toBe("▲ +12.50 +0.42%");
    const down = indexChangeFact(true, selectTickerChangeDisplay({ change: -12.5, changePct: -0.42 }));
    expect(down.tone).toBe("DOWN");
    expect(down.text).toBe("▼ -12.50 -0.42%");
  });
});

describe("/charts bottom bar adoption", () => {
  const code = readFileSync(
    join(process.cwd(), "src/components/chart/BottomIndexBar.tsx"),
    "utf8",
  );

  it("× THE FIXED OFFSET ON SCREEN: no hardcoded Eastern offset may remain", () => {
    expect(code).not.toContain("etOffset");
    expect(code).not.toContain("3600 * 1000");
    expect(code).not.toContain("getUTCHours");
    expect(code).toContain("easternClockFact");
  });

  it("× THE BARE GLYPH ON SCREEN: no refusal dash survives in this file", () => {
    expect(code).not.toMatch(/[:?]\s*"—"/);
    expect(code).not.toContain(">—<");
  });

  it("× THE VANISHED CHANGE ON SCREEN: the ternary-to-null that deleted the cell is gone", () => {
    expect(code).not.toContain(") : null}");
    expect(code).toContain("indexChangeFact");
    expect(code).toContain("indexQuoteFact");
  });

  it("× THE UNEARNED EXPOSURE CLAIM: the orphan status is disclosed in the owner", () => {
    // b9aa3d1's message said this bar "sits on every chart screen". It does not:
    // BottomIndexBar has ZERO production mounts. The defect was proven by running
    // its arithmetic live; the EXPOSURE was never proven and must not be implied.
    const owner = readFileSync(
      join(process.cwd(), "src/lib/chart/indexBarFacts.ts"),
      "utf8",
    );
    expect(owner).toMatch(/ZERO PRODUCTION MOUNTS/);
    expect(owner).toMatch(/THE DEFECT IS REAL AND THE FIX IS REAL\. THE EXPOSURE WAS NOT\./);
  });

  it("× THE SILENT REMOUNT: mounting this bar must break this Sentinel by name", () => {
    // If anyone ever renders <BottomIndexBar />, the orphan disclosure above stops
    // being true. This test is the tripwire that forces it to be revisited.
    const mounts = ["src/components/chart/ChartsDashboard.tsx"]
      .map((p) => readFileSync(join(process.cwd(), p), "utf8"))
      .filter((s) => s.includes("<BottomIndexBar"));
    expect(
      mounts,
      "BottomIndexBar is now mounted — revisit the ORPHAN disclosure in indexBarFacts.ts",
    ).toHaveLength(0);
  });

  it("× THE SILENT TOOLTIP: every adopted cell carries its reason", () => {
    for (const name of ["quoteFact", "changeFact", "clockFact"]) {
      expect(code).toMatch(new RegExp(`${name}\\.reason`));
    }
  });
});
