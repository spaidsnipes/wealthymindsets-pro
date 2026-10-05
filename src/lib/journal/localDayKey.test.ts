import { describe, expect, it } from "vitest";
import { localDayKey } from "./localDayKey";

describe("localDayKey", () => {
  it("reads the local calendar day, not the UTC one", () => {
    const d = new Date(2026, 9, 3, 23, 30); // 3 Oct, 11:30 PM local
    expect(localDayKey(d)).toBe("2026-10-03");
  });
  it("pads month and day", () => {
    expect(localDayKey(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
  });
});

import { marketDayKey } from "./localDayKey";

describe("marketDayKey — the journal's today is the New York day (Founder ruling 2026-10-05)", () => {
  it("23:30 CDT is already the next ET day", () => {
    expect(marketDayKey(new Date("2026-10-06T04:30:00Z"))).toBe("2026-10-06"); // 23:30 CDT Oct 5 = 00:30 EDT Oct 6
  });
  it("a Tokyo late-night session stays on one ET day", () => {
    // 22:30 and 01:00 JST bracket Tokyo midnight; both are Oct 5 in New York.
    expect(marketDayKey(new Date("2026-10-05T13:30:00Z"))).toBe("2026-10-05");
    expect(marketDayKey(new Date("2026-10-05T16:00:00Z"))).toBe("2026-10-05");
  });
});
