import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("/charts?desk= — a Workspace desk is addressable (GP12 §69)", () => {
  it("maps the four desk words and nothing else", async () => {
    const { deskFromUrlParam } = await import("./ChartsDashboard");
    expect(deskFromUrlParam("order-flow")).toBe("ORDER_FLOW");
    expect(deskFromUrlParam("ORDER_FLOW")).toBe("ORDER_FLOW");
    expect(deskFromUrlParam("regime")).toBe("REGIME");
    expect(deskFromUrlParam("review")).toBe("REVIEW");
    expect(deskFromUrlParam("clean")).toBe("CLEAN");
    expect(deskFromUrlParam("smart-money")).toBeNull();
    expect(deskFromUrlParam(null)).toBeNull();
  });

  it("applies once, after bars, through the same desk door as the Workspace tile", () => {
    const at = src.indexOf("const deskFromUrlDoneRef");
    const block = src.slice(at, at + 900);
    expect(block).toContain("arrangementDeskRef.current(desk)");
    expect(block).toContain("!deskBarsReady");
    expect(block).toContain("deskFromUrlDoneRef.current = true");
  });
});
