import { describe, expect, it } from "vitest";
import { isLiveHost } from "./liveHost";

describe("isLiveHost — who may publish into a WM live room", () => {
  const env = { TASTYTRADE_OWNER_USER_ID: "owner-1", LIVEKIT_HOST_USER_IDS: " host-a , host-b " };
  it("the owner and listed hosts may", () => {
    expect(isLiveHost("owner-1", env)).toBe(true);
    expect(isLiveHost("host-b", env)).toBe(true);
  });
  it("any other signed-in user may not", () => {
    expect(isLiveHost("guest-7", env)).toBe(false);
    expect(isLiveHost("", env)).toBe(false);
  });
  it("with no owner and no list, nobody may", () => {
    expect(isLiveHost("anyone", {})).toBe(false);
  });
});
