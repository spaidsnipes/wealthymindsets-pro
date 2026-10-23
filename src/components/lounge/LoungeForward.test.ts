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

import { wowTarget } from "./LoungeForward";
describe("one destination for every shared room opened from WM Pro", () => {
  it("TV, Radio, Shop and Academy open their WOW rooms", () => {
    expect(wowTarget("tv", "")).toBe("/wow-tv");
    expect(wowTarget("radio", "")).toBe("/wow-radio");
    expect(wowTarget("shop", "")).toBe("/marketplace");
    expect(wowTarget("academy", "")).toBe("/academy");
  });
  it("an old Academy lesson link lands on the WOW lesson that teaches it", () => {
    expect(wowTarget("academy", "?lesson=fp-1")).toBe("/academy/a-plus/glass/footprint");
    expect(wowTarget("academy", "?lesson=fvg-3")).toBe("/academy/a-plus/fvg/3");
  });
  it("each room layout serves the forward (Radio keeps only its upload studio)", () => {
    for (const [dir, room] of [["tv", "tv"], ["shop", "shop"], ["education", "academy"]] as const) {
      const src = readFileSync(join(process.cwd(), `src/app/${dir}/layout.tsx`), "utf8");
      expect(src).toContain(`<WowRoomForward room="${room}" />`);
    }
    const radio = readFileSync(join(process.cwd(), "src/components/os/RadioRoomGate.tsx"), "utf8");
    expect(radio).toMatch(/studio"\) === "1"/);
    expect(radio).toContain('<WowRoomForward room="radio" />');
  });
});
