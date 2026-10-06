/**
 * The room's live bars, their identities, barsSettled and the day high/low
 * belong to the symbol (|timeframe) they were read for (truth lane,
 * 2026-10-06). The reset effect ran after the first render of a new symbol,
 * so one frame showed the old bars and barsSettled=true beside the new name.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const D = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");

describe("chart bars are symbol-owned in the room", () => {
  it("bars, identities and barsSettled are keyed by symbol|timeframe, with stable empties", () => {
    expect(D).toContain("const barsOwnerKey = `${symbol}|${timeframe}`;");
    expect(D).toContain("useSymbolOwnedState<LegacyOhlcvTuple[]>(barsOwnerKey, NO_LIVE_BARS);");
    expect(D).toContain("useSymbolOwnedState<readonly CanonicalBarIdentity[]>(barsOwnerKey, NO_LIVE_BAR_IDENTITIES);");
    expect(D).toContain("const [barsSettled, setBarsSettled] = useSymbolOwnedState<boolean>(barsOwnerKey, false);");
    expect(D).toMatch(/^const NO_LIVE_BARS: LegacyOhlcvTuple\[\] = \[\];$/m);
  });
  it("the day high / low never carry one market's extreme into the next", () => {
    expect(D).toContain("const [dayHigh, setDayHigh] = useSymbolOwnedState<number>(symbol, 0);");
    expect(D).toContain("const [dayLow,  setDayLow]  = useSymbolOwnedState<number>(symbol, 0);");
  });
  it("the bars callback is rebuilt with the current key's setters (a stale closure is refused by the owner)", () => {
    expect(D).toContain("}, [setBarsSettled, setChartBars, setChartBarIdentities, setDayHigh, setDayLow]);");
  });
});
