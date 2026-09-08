import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hook = readFileSync(resolve(__dirname, "../hooks/useWebSocket.ts"), "utf8");

describe("Longbridge observed-print consumption", () => {
  it("polls Longbridge after Moomoo and before Webull", () => {
    // Rename-resilient. This used to pin the local body variables — `body`,
    // `longbridgeBody`, `webullBody` — and so it failed when the provider chain
    // was lifted to module scope for cross-instance coalescing, even though the
    // ORDER it exists to protect never changed. The invariant is the priority
    // of the three lanes, not what each lane happens to call its parsed body.
    const moomoo = hook.indexOf("selectFreshMoomooTapeEvents(");
    const longbridge = hook.indexOf("selectFreshLongbridgeObservedEvents(");
    const webull = hook.indexOf("selectFreshWebullObservedEvents(");
    expect(moomoo).toBeGreaterThan(0);
    expect(longbridge).toBeGreaterThan(moomoo);
    expect(webull).toBeGreaterThan(longbridge);

    // And the declared source order must agree with the call order, since it is
    // `selectObservedProviderFallback` that actually walks the lanes.
    expect(hook.match(/source: "(moomoo|longbridge|webull)"/g)?.slice(0, 3))
      .toEqual(['source: "moomoo"', 'source: "longbridge"', 'source: "webull"']);
  });

  it("routes Longbridge only through the unsigned observation boundary", () => {
    expect(hook).toContain('electedSource === "longbridge" || electedSource === "webull"');
    expect(hook).toContain("processUnsignedObservation(inspected.event, electedSource)");
    const unsignedStart = hook.indexOf("const processUnsignedObservation");
    const unsignedEnd = hook.indexOf("}, [getIntervalSec]);", unsignedStart);
    const unsignedBlock = hook.slice(unsignedStart, unsignedEnd);
    expect(unsignedBlock).not.toContain("recentTicks");
    expect(unsignedBlock).not.toContain("tapeSourceRef.current =");
  });
});
