import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hook = readFileSync(resolve(__dirname, "../hooks/useWebSocket.ts"), "utf8");

describe("Webull unknown-side consumption boundary", () => {
  it("routes observed Webull prints through price/volume admission", () => {
    expect(hook).toContain("selectFreshWebullObservedEvents(webullBody");
    expect(hook).toContain('electedSource === "longbridge" || electedSource === "webull"');
    expect(hook).toContain("processUnsignedObservation(inspected.event, electedSource)");
    expect(hook).toContain("ticker: { ...previous.ticker, price, volume: previous.ticker.volume + size }");
  });

  it("does not elect unknown-side prints as tape or feed signed flow", () => {
    const unsignedStart = hook.indexOf("const processUnsignedObservation");
    const unsignedEnd = hook.indexOf("}, [getIntervalSec]);", unsignedStart);
    const unsignedBlock = hook.slice(unsignedStart, unsignedEnd);
    expect(unsignedBlock).not.toContain("recentTicks");
    expect(unsignedBlock).not.toContain("tapeSourceRef.current =");
    expect(hook).toContain('aggressorSide !== "BUY" && inspected.event.aggressorSide !== "SELL"');
  });

  it("preserves the canonical event even when signed consumers reject its side", () => {
    const ingest = hook.indexOf("ingestSessionNectarEvent(inspected.event)", hook.indexOf("selectFreshWebullObservedEvents"));
    const sideGate = hook.indexOf('aggressorSide !== "BUY"', ingest);
    expect(ingest).toBeGreaterThan(0);
    expect(sideGate).toBeGreaterThan(ingest);
  });
});
