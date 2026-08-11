import { describe, expect, it } from "vitest";
import { OPERATIONAL_GAP_SCHEMA_VERSION, parseOperationalGapCommand } from "./operationalGapContract";

describe("operational gap contract", () => {
  it("allow-lists operational metadata and drops provider payload fields", () => {
    const parsed = parseOperationalGapCommand({
      schemaVersion: OPERATIONAL_GAP_SCHEMA_VERSION,
      action: "OPEN",
      instrumentId: "TSLA",
      normalizedSymbol: "tsla",
      providerPath: "alpaca-rest",
      assetClass: "equity",
      channel: "quote",
      reasonCode: "RATE_LIMIT",
      occurredAt: 1_786_400_000_000,
      retryAfterMs: 2_000,
      detail: "Alpaca quote acquisition was rate-limited.",
      price: 330.25,
      size: 100,
      rawPayload: { secret: true },
    });
    expect(parsed).toMatchObject({ normalizedSymbol: "TSLA", assetClass: "equity", reasonCode: "RATE_LIMIT" });
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("size");
    expect(parsed).not.toHaveProperty("rawPayload");
  });

  it("fails closed on invalid timing and unknown reasons", () => {
    const base = {
      schemaVersion: OPERATIONAL_GAP_SCHEMA_VERSION,
      action: "OPEN",
      instrumentId: "TSLA",
      normalizedSymbol: "TSLA",
      providerPath: "alpaca-rest",
      assetClass: "equity",
      channel: "quote",
      reasonCode: "RATE_LIMIT",
      occurredAt: 1_786_400_000_000,
      retryAfterMs: null,
      detail: "Known gap.",
    };
    expect(parseOperationalGapCommand({ ...base, occurredAt: 0 })).toBeNull();
    expect(parseOperationalGapCommand({ ...base, reasonCode: "MAGIC" })).toBeNull();
  });
});
