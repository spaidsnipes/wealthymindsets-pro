import { describe, expect, it } from "vitest";
import { consumeSideRequest, requestTicketSide, sideRequestFor, SIDE_REQUEST_TTL_MS } from "./sideRequest";

describe("side request", () => {
  it("is per symbol, consumed once, and expires", () => {
    requestTicketSide("mnq1!", "SELL", 1000);
    const r = sideRequestFor("MNQ1!", 1001);
    expect(r?.side).toBe("SELL");
    expect(sideRequestFor("ES1!", 1001)).toBeNull();
    expect(sideRequestFor("MNQ1!", 1000 + SIDE_REQUEST_TTL_MS + 1)).toBeNull();
    consumeSideRequest(r!.seq);
    expect(sideRequestFor("MNQ1!", 1002)).toBeNull();
  });
});
