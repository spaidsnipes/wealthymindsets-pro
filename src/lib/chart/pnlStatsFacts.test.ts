/**
 * Sentinel — the chart P&L Stats strip.
 *
 * PINNED TO MEANING. Each assertion fails when WM either paints an absence as
 * a result, drops a corrupt row without saying so, or formats a refusal to
 * look exactly like a measurement.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compilePnlStats, PNL_SCOPE, type PnlStat } from "./pnlStatsFacts";

const J = (rows: unknown[]) => JSON.stringify(rows);
const byLabel = (raw: string | null, label: string): PnlStat => {
  const s = compilePnlStats(raw).stats.find(x => x.label === label);
  if (!s) throw new Error(`no stat labelled ${label}`);
  return s;
};

describe("compilePnlStats — the empty record", () => {
  it("× THE DEFECT: an empty journal must not render a coloured $0.00", () => {
    const r = compilePnlStats(J([]));
    expect(r.counted).toBe(0);
    for (const s of r.stats) {
      if (s.label === "Total Trades") continue; // a count of 0 IS a reading
      expect(s.state).toBe("NO_TRADES");
      expect(s.tone).toBe("REFUSED");
      expect(s.text).not.toMatch(/\$0\.00|^0\.0%$/);
    }
  });

  it("× THE ACCUSATION: an empty journal must not report a 0.0% win rate", () => {
    const wr = byLabel(J([]), "Win Rate");
    expect(wr.text).not.toContain("0.0%");
    expect(wr.tone).not.toBe("NEGATIVE");
  });

  it("the trade count is still a real measurement at zero", () => {
    const tc = byLabel(J([]), "Total Trades");
    expect(tc.state).toBe("MEASURED");
    expect(tc.text).toBe("0");
  });

  it("null and blank storage are the empty record, not a read failure", () => {
    expect(compilePnlStats(null).stats[0].state).toBe("NO_TRADES");
    expect(compilePnlStats("   ").stats[0].state).toBe("NO_TRADES");
  });
});

describe("compilePnlStats — the unreadable record", () => {
  it("× THE DEFECT: `catch {}` must not render as a measurement of zero", () => {
    for (const bad of ["{not json", '{"a":1}', "42", '"str"']) {
      const r = compilePnlStats(bad);
      for (const s of r.stats) {
        expect(s.state).toBe("RECORD_UNREADABLE");
        expect(s.tone).toBe("REFUSED");
        expect(s.text).not.toMatch(/\$|%|\d/);
      }
    }
  });

  it("an unreadable record and an empty one are DIFFERENT facts", () => {
    const empty = byLabel(J([]), "Net P&L");
    const broken = byLabel("{not json", "Net P&L");
    expect(empty.state).not.toBe(broken.state);
    expect(empty.text).not.toBe(broken.text);
    expect(empty.reason).not.toBe(broken.reason);
  });
});

describe("compilePnlStats — corrupt rows", () => {
  const rows = [{ pnl: 100 }, { pnl: -50 }, { pnl: Number.NaN }, { pnl: "80" }, {}, null];

  it("× THE DEFECT: one NaN row must not make Net P&L read $NaN", () => {
    const net = byLabel(J(rows), "Net P&L");
    expect(net.text).not.toMatch(/NaN|Infinity/);
    expect(net.text).toBe("+$50.00");
    expect(net.state).toBe("MEASURED");
  });

  it("× THE SILENT DILUTION: corrupt rows must not sit in the win-rate denominator", () => {
    const r = compilePnlStats(J(rows));
    expect(r.counted).toBe(2);
    expect(r.skipped).toBe(4);
    // 1 win of 2 usable rows — NOT 1 of 6.
    expect(byLabel(J(rows), "Win Rate").text).toBe("50.0%");
  });

  it("× THE QUIET DROP: every affected figure must disclose the skipped count", () => {
    for (const label of ["Net P&L", "Total Trades", "Win Rate"]) {
      expect(byLabel(J(rows), label).reason).toMatch(/4 stored rows carried no usable P&L/);
    }
  });

  it("a clean record says nothing about skipped rows", () => {
    expect(byLabel(J([{ pnl: 10 }]), "Net P&L").reason).not.toMatch(/carried no usable P&L/);
  });
});

describe("compilePnlStats — the missing denominator", () => {
  const winsOnly = J([{ pnl: 100 }, { pnl: 40 }]);

  it("× THE DEFECT: '—R' must never reach the screen in measurement gold", () => {
    const r = byLabel(winsOnly, "R-Multiple");
    expect(r.text).not.toContain("—");
    expect(r.text).not.toMatch(/^—?R$/);
    expect(r.state).toBe("NO_LOSSES_YET");
    expect(r.tone).toBe("REFUSED");
  });

  it("× THE INVENTED EDGE: no losing trade must not become an infinite R", () => {
    for (const label of ["R-Multiple", "Profit Factor"]) {
      const s = byLabel(winsOnly, label);
      expect(s.text).not.toMatch(/∞|Infinity|999/);
      expect(s.reason).toMatch(/not calling|is also NOT calling|not .*infinite/i);
    }
  });

  it("no losses and no wins are different refusals", () => {
    const lossesOnly = J([{ pnl: -30 }]);
    expect(byLabel(winsOnly, "Avg Loss").state).toBe("NO_LOSSES_YET");
    expect(byLabel(lossesOnly, "Avg Win").state).toBe("NO_WINS_YET");
    expect(byLabel(winsOnly, "Avg Loss").text).not.toBe(byLabel(lossesOnly, "Avg Win").text);
  });

  it("× THE FABRICATED ZERO: an absent average must not print $0", () => {
    expect(byLabel(winsOnly, "Avg Loss").text).not.toMatch(/\$0\b/);
    expect(byLabel(J([{ pnl: -30 }]), "Avg Win").text).not.toMatch(/\$0\b/);
  });
});

describe("compilePnlStats — real readings", () => {
  const mixed = J([{ pnl: 300 }, { pnl: 100 }, { pnl: -100 }, { pnl: 0 }]);

  it("computes the strip from recorded values", () => {
    expect(byLabel(mixed, "Net P&L").text).toBe("+$300.00");
    expect(byLabel(mixed, "Total Trades").text).toBe("4");
    expect(byLabel(mixed, "Win Rate").text).toBe("50.0%");
    expect(byLabel(mixed, "Avg Win").text).toBe("$200");
    expect(byLabel(mixed, "Avg Loss").text).toBe("$100");
    expect(byLabel(mixed, "R-Multiple").text).toBe("2.00R");
    expect(byLabel(mixed, "Profit Factor").text).toBe("4.00");
  });

  it("× THE BINARY OVER THREE STATES: a net of exactly zero is not a win", () => {
    const scratch = byLabel(J([{ pnl: 50 }, { pnl: -50 }]), "Net P&L");
    expect(scratch.state).toBe("MEASURED");
    expect(scratch.tone).toBe("NEUTRAL");
    expect(scratch.text).toBe("+$0.00");
  });

  it("a scratch trade counts as neither a win nor a loss, and the reason says so", () => {
    expect(byLabel(mixed, "Win Rate").reason).toMatch(/neither a win nor a loss/i);
  });

  it("the headline IS the Net P&L fact, not a second computation of it", () => {
    const r = compilePnlStats(mixed);
    expect(r.headline).toBe(r.stats[0]);
  });
});

describe("every stat is honest about itself", () => {
  const records = [J([]), "{not json", J([{ pnl: 100 }]), J([{ pnl: -100 }]),
    J([{ pnl: 300 }, { pnl: -100 }, { pnl: Number.NaN }])];

  it("× THE UNSTATED SCOPE: every measurement names the window it covers", () => {
    for (const rec of records) {
      for (const s of compilePnlStats(rec).stats) {
        if (s.state !== "MEASURED") continue;
        expect(s.reason).toContain(PNL_SCOPE);
      }
    }
  });

  it("no cell is a bare glyph and every cell carries a reason", () => {
    for (const rec of records) {
      for (const s of compilePnlStats(rec).stats) {
        expect(s.text.trim()).not.toBe("—");
        expect(s.text.trim()).not.toBe("-");
        expect(s.text.trim().length).toBeGreaterThan(0);
        expect(s.reason.length).toBeGreaterThan(60);
      }
    }
  });

  it("× COLOUR IS A CLAIM: a refusal is never toned as a result", () => {
    for (const rec of records) {
      for (const s of compilePnlStats(rec).stats) {
        if (s.state === "MEASURED") continue;
        expect(s.tone).toBe("REFUSED");
      }
    }
  });
});

describe("PnLStatsPanel", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/chart/PnLStatsPanel.tsx"),
    "utf8",
  );
  /* Comments are prose ABOUT the code and are never rendered, so they are
     stripped before the phrase checks — a Sentinel that fires on the file's own
     documentation of the defect is pinned to a spelling, not to a meaning.
     Inline trailing `//` is deliberately NOT stripped: that would truncate any
     string containing `://`. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(line => !/^\s*\/\//.test(line))
    .join("\n");

  it("× THE DEFECT: the R-Multiple cell must not template a glyph into a unit", () => {
    expect(code).not.toMatch(/avgLoss\s*>\s*0\s*\?[^:]*:\s*"—"/);
    expect(code).not.toMatch(/\$\{rMultiple\}R/);
  });

  it("× THE DEFECT: the stats must not be zero-initialised useState numbers", () => {
    expect(code).not.toMatch(/useState\(0\)/);
  });

  it("× THE DEFECT: the loader must not swallow its error", () => {
    expect(code).not.toMatch(/catch\s*\{\s*\}/);
  });

  it("the strip routes every figure through the owner", () => {
    expect(code).toContain("compilePnlStats");
    expect(code).toMatch(/\.reason/);
  });

  it("× THE BINARY OVER THREE STATES: direction must come from the fact's tone", () => {
    expect(code).not.toMatch(/netPnl\s*>=\s*0/);
    expect(code).toMatch(/tone/);
  });
});
