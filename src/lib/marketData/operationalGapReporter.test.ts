import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearOperationalGapReporterForTests,
  closeProviderOperationalGap,
  openProviderOperationalGap,
} from "./operationalGapReporter";

describe("operational gap reporter", () => {
  afterEach(() => {
    clearOperationalGapReporterForTests();
    vi.unstubAllGlobals();
  });

  it("deduplicates open notices and closes after recovery", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", fetchMock);
    openProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_000, 2_000, "rate limited");
    openProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_500, 2_000, "rate limited");
    closeProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_000);
    closeProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: "OPEN", assetClass: "equity", reasonCode: "RATE_LIMIT" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ action: "CLOSE", reasonCode: "RATE_LIMIT" });
  });
});
