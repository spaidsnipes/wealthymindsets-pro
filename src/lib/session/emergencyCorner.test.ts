import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pressEmergency, readEmergencyLog, toggleRecovery } from "./emergencyCorner";
import { emptySessionDay, readSessionDay, storedSessionDay } from "./sessionDay";

describe("emergency corner log", () => {
  it("time-stamps each press and keeps today's recovery picks", () => {
    let log = pressEmergency([], "LOSS_TILT", 100);
    log = toggleRecovery(log, "Walk outside");
    log = toggleRecovery(log, "Pray");
    log = toggleRecovery(log, "Walk outside");
    expect(log).toEqual([{ kind: "LOSS_TILT", atMs: 100, recovered: ["Pray"] }]);
  });
  it("drops anything that is not a known button or menu item", () => {
    expect(readEmergencyLog([{ kind: "NOPE", atMs: 1 }, { kind: "TOO_LOUD", atMs: 2, recovered: ["Pray", "rm -rf"] }])).toEqual([{ kind: "TOO_LOUD", atMs: 2, recovered: ["Pray"] }]);
  });
  it("rides the session day and resets on a new market day", () => {
    const d = { ...emptySessionDay("2026-11-12"), emergencies: pressEmergency([], "WIN_PROTECTION", 5) };
    expect(readSessionDay(storedSessionDay(d), "2026-11-12").emergencies).toHaveLength(1);
    expect(readSessionDay(storedSessionDay(d), "2026-11-13").emergencies).toHaveLength(0);
  });
});

describe("the corner sends no orders and never acts on load", () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
  const corner = read("src/components/session/EmergencyCorner.tsx");
  const desk = read("src/app/session/page.tsx");
  const room = read("src/components/chart/ChartsDashboard.tsx");
  it("no order route or submit helper is reachable from the corner or the desk", () => {
    expect(corner.length).toBeGreaterThan(500);
    for (const src of [corner, desk]) {
      expect(src).not.toMatch(/order-submit|order-preview|submitOrder|placeOrder|\/api\/broker/);
    }
  });
  it("the chart's flatten door loads FLATTEN only inside a tap handler", () => {
    const at = room.indexOf('data-testid="flatten-ask-load"');
    expect(at).toBeGreaterThan(-1);
    expect(room.slice(at, at + 200)).toMatch(/onClick=\{\(\) => \{ requestClose\(symbol\);/);
    // requestClose appears nowhere else in the room (the strip's own CLOSE lives in ChartBookStrip).
    expect(room.match(/requestClose\(/g)?.length).toBe(1);
    // Arriving only RAISES the card.
    expect(room).toMatch(/setFlattenAsk\(true\);/);
  });
});
