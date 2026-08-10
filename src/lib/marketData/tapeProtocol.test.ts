import { describe, expect, it } from "vitest";
import { tapeProtocolChannel, WM_TAPE_PROTOCOL_VERSION } from "./tapeProtocol";

describe("cross-tab tape protocol identity", () => {
  it("isolates canonical-event leaders from legacy tick-only leaders", () => {
    expect(tapeProtocolChannel("coinbase:BTC")).toBe(
      `wm-tape:${WM_TAPE_PROTOCOL_VERSION}:coinbase:BTC`,
    );
    expect(tapeProtocolChannel("coinbase:BTC")).not.toBe("wm-tape:coinbase:BTC");
  });

  it("rejects empty feed identities", () => {
    expect(() => tapeProtocolChannel("  ")).toThrow(/feed key/);
  });
});
