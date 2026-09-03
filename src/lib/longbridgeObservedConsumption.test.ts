import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hook = readFileSync(resolve(__dirname, "../hooks/useWebSocket.ts"), "utf8");

describe("Longbridge observed-print consumption", () => {
  it("polls Longbridge after Moomoo and before Webull", () => {
    const moomoo = hook.indexOf("selectFreshMoomooTapeEvents(body");
    const longbridge = hook.indexOf("selectFreshLongbridgeObservedEvents(longbridgeBody");
    const webull = hook.indexOf("selectFreshWebullObservedEvents(webullBody");
    expect(moomoo).toBeGreaterThan(0);
    expect(longbridge).toBeGreaterThan(moomoo);
    expect(webull).toBeGreaterThan(longbridge);
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
