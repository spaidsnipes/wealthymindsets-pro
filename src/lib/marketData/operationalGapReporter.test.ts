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
    await Promise.all([
      openProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_000, 2_000, "rate limited"),
      openProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_500, 2_000, "rate limited"),
    ]);
    await closeProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_000);
    await closeProviderOperationalGap("TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: "OPEN", assetClass: "equity", reasonCode: "RATE_LIMIT" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ action: "CLOSE", reasonCode: "RATE_LIMIT" });
  });

  it("retries OPEN and CLOSE receipts after non-2xx persistence failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(openProviderOperationalGap(
      "TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_000, 2_000, "rate limited",
    )).resolves.toBe(false);
    await expect(openProviderOperationalGap(
      "TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 10_500, 2_000, "rate limited",
    )).resolves.toBe(true);
    await expect(closeProviderOperationalGap(
      "TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_000,
    )).resolves.toBe(false);
    await expect(closeProviderOperationalGap(
      "TSLA", "alpaca-rest", "equity", "quote", "RATE_LIMIT", 12_500,
    )).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
