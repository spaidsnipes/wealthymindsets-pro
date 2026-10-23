import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loungeTarget } from "./LoungeForward";

describe("one Lounge: WM Pro's Lounge door opens the WOW OS Lounge", () => {
  it("keeps a shared live-room link and drops anything unsafe", () => {
    expect(loungeTarget("")).toBe("/lounge");
    expect(loungeTarget("?room=wm-nq-morning")).toBe("/lounge?room=wm-nq-morning");
    expect(loungeTarget("?room=//evil.example")).toBe("/lounge");
  });
  it("the /lounge route serves the forward, not a second Lounge page", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/lounge/layout.tsx"), "utf8");
    expect(layout).toMatch(/return <LoungeForward \/>/);
    expect(layout).not.toMatch(/return children/);
  });
  it("the forward carries the Passport through the same-site POST door, with no confirmation step", () => {
    const src = readFileSync(join(process.cwd(), "src/components/lounge/LoungeForward.tsx"), "utf8");
    expect(src).toMatch(/form\.action = WOW_DOOR_ACTION/);
    expect(src).toMatch(/form\.submit\(\)/);
    expect(src).not.toMatch(/confirm\(|wmConfirm/);
  });
});
