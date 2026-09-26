import { describe, expect, it } from "vitest";
import { absorptionRailRead, type AbsorptionAnatomyVM } from "./selectAbsorptionAnatomy";

const vm = (over: Partial<AbsorptionAnatomyVM>): AbsorptionAnatomyVM =>
  ({ basis: "VOLUME", measured: true, bars: [], zones: [], windowBars: 60, ...over } as unknown as AbsorptionAnatomyVM);
const zone = (endTime: number) => ({ startTime: endTime - 600, endTime, priceLo: 100, priceHi: 101, strength: "STRONG" }) as never;

describe("F06A rail absorption row — a projection of the chart's reading", () => {
  it("FORMING while the newest zone reaches the newest bar; ON_RECORD once closed", () => {
    expect(absorptionRailRead(vm({ zones: [zone(1000)] }), 1000, 300).state).toBe("FORMING");
    expect(absorptionRailRead(vm({ zones: [zone(700)] }), 1000, 300).state).toBe("FORMING");
    expect(absorptionRailRead(vm({ zones: [zone(600)] }), 1000, 300)).toMatchObject({ state: "ON_RECORD", strength: "STRONG", priceLo: 100, priceHi: 101 });
  });
  it("NONE with no zone; UNMEASURED when nothing observable backs the field", () => {
    expect(absorptionRailRead(vm({}), 1000, 300).state).toBe("NONE");
    expect(absorptionRailRead(vm({ measured: false, zones: [zone(1000)] }), 1000, 300).state).toBe("UNMEASURED");
  });
});
