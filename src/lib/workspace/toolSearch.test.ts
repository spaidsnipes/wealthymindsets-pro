import { describe, expect, it } from "vitest";
import { searchTools } from "./toolSearch";
import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";

describe("Options Flow is found under Brick Walls (ATHOS §6 · P-03)", () => {
  it("'options flow', 'unusual options' and 'open interest' land on Brick Walls", () => {
    const vm = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} as never });
    for (const q of ["options flow", "unusual options", "open interest"]) {
      expect(searchTools(vm.entries, q).map(e => e.id)).toContain("BRICK_WALLS");
    }
  });
});
