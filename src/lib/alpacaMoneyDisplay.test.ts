import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/broker/AlpacaTradingPanel.tsx"), "utf8");
const start = source.indexOf("const displayNumber =");
const end = source.indexOf("const fmtTime =", start);
if (start < 0 || end < start) throw new Error("Actual account-display helper boundaries changed");
// Run the exact private display helpers, not a duplicate formatter in the test.
const js = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const { money, percent } = new Function(`${js}; return {money: fmt$, percent: fmtPct};`)() as {
  money: (value: unknown) => string;
  percent: (value: unknown) => string;
};

describe("broker account money display", () => {
  it("preserves negative cash, market value and loss signs", () => {
    expect(money("-1200.25")).toBe("−$1,200.25");
    expect(money(-0.25)).toBe("−$0.25");
    expect(percent("-0.0125")).toBe("-1.25%");
  });

  it("preserves observed zero instead of confusing it with missing data", () => {
    expect(money("0")).toBe("$0.00");
    expect(percent("0")).toBe("+0.00%");
    expect(money("1200.25")).toBe("$1,200.25");
  });

  it.each([null, undefined, "", " ", NaN, Infinity, -Infinity, "Infinity", "12bad", "0x10", false, {}, []])(
    "does not invent zero or a partial number from %j", value => {
      expect(money(value)).toBe("UNKNOWN");
      expect(percent(value)).toBe("UNKNOWN");
    },
  );

  it("marks retained failed-refresh values as last observed, not current", () => {
    expect(source).toContain('positionsLoad === "failed" ? "Last observed P&L" : "Observed P&L"');
    expect(source).toContain('positionsLoad === "failed" ? "Last observed mark" : "Broker mark"');
    expect(source).not.toContain("<span>Cur:");
    expect(source).toContain('pl !== null && pl >= 0 ? "+" : ""');
  });
});
