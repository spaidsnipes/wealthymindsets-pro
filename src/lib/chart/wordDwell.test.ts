import { describe, expect, it } from "vitest";
import { stepDwell } from "./wordDwell";

describe("a shown word holds until the new reading stands", () => {
  it("first reading shows at once; a flip-flop never shows", () => {
    let s = stepDwell(null, "BALANCE", 0, 20000);
    expect(s.shown).toBe("BALANCE");
    s = stepDwell(s, "TREND", 1000, 20000); expect(s.shown).toBe("BALANCE");
    s = stepDwell(s, "BALANCE", 4000, 20000); expect(s.shown).toBe("BALANCE");
    s = stepDwell(s, "TREND", 9000, 20000); expect(s.shown).toBe("BALANCE");
    s = stepDwell(s, "TREND", 20000, 20000); expect(s.shown).toBe("BALANCE");
    s = stepDwell(s, "TREND", 29000, 20000); expect(s.shown).toBe("TREND");
  });
});
