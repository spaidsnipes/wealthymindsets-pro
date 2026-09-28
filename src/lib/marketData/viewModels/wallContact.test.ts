import { describe, expect, it } from "vitest";
import { wallContact } from "./wallContact";

// A wall at 85,000 above price; the face (band edge toward price) at 84,980.
const W = { strike: 85_000, facePrice: 84_980 };

describe("wall contact — the forming bar against the wall, decided on prices (§23 fixture proof)", () => {
  it("CLEAR: the extreme is farther than 0.4% of price", () => {
    expect(wallContact({ ...W, high: 84_000, low: 83_800, close: 83_900 }).state).toBe("CLEAR");
  });
  it("PRESSURE: within reach, below the face — proximity rises as it nears", () => {
    const a = wallContact({ ...W, high: 84_700, low: 84_500, close: 84_600 });
    const b = wallContact({ ...W, high: 84_950, low: 84_800, close: 84_900 });
    expect(a.state).toBe("PRESSURE");
    expect(b.state).toBe("PRESSURE");
    expect(b.proximity).toBeGreaterThan(a.proximity);
  });
  it("CONTACT: the wick reached the face and the bar closed near it", () => {
    expect(wallContact({ ...W, high: 84_990, low: 84_900, close: 84_985 }).state).toBe("CONTACT");
  });
  it("HELD: contact, then pulled back at least a quarter of the bar's range", () => {
    expect(wallContact({ ...W, high: 84_995, low: 84_800, close: 84_820 }).state).toBe("HELD");
  });
  it("a wall BELOW price mirrors every state", () => {
    const B = { strike: 83_000, facePrice: 83_020 };
    expect(wallContact({ ...B, high: 83_200, low: 83_010, close: 83_150 }).state).toBe("HELD");
    expect(wallContact({ ...B, high: 83_300, low: 83_100, close: 83_200 }).side).toBe("WALL_BELOW");
  });
});
