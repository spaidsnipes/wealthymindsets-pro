import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { YahooCandleConsumer, YAHOO_CANDLE_CAPABILITIES_URL } from "@/lib/yahooCandleConsumer";

describe("/api/timeframes/capabilities", () => {
  it("answers 200 so the scanner's capability probe is not a 404 on every load", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ candleEnvelopeVersion: 0 });
  });

  it("keeps the consumer legacy-compatible while /api/yahoo emits no typed envelope", async () => {
    const consumer = new YahooCandleConsumer({
      fetcher: async (url) => {
        expect(String(url)).toBe(YAHOO_CANDLE_CAPABILITIES_URL);
        return GET();
      },
    });
    expect(await consumer.initialize()).toBe("legacy-compatible");
  });
});
