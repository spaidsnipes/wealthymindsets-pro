import { describe, expect, it } from "vitest";
import { WOW_DOCK_SRC, loadWowDock, openWowDock, shouldLoadWowDock } from "./wowDock";

describe("WOW dock on WM Pro", () => {
  it("is WOW OS's one dock, never a WM Pro copy", () => {
    expect(WOW_DOCK_SRC).toBe("https://thewow.online/wow-dock.js");
  });
  it("loads for signed-in members only, after the session check", () => {
    expect(shouldLoadWowDock({ signedIn: true, checking: false })).toBe(true);
    expect(shouldLoadWowDock({ signedIn: true, checking: true })).toBe(false);
    expect(shouldLoadWowDock({ signedIn: false, checking: false })).toBe(false);
  });
  it("adds the script once, no floating button, left side above the bottom bars", () => {
    const added: Array<Record<string, string>> = [];
    let present = false;
    const env = {
      window: {},
      document: {
        createElement: () => { const a: Record<string, string> = {}; return { src: "", defer: false, setAttribute: (k: string, v: string) => { a[k] = v; }, a } as never; },
        querySelector: () => (present ? {} : null),
        head: { appendChild: (n: { a: Record<string, string>; src: string }) => { added.push({ ...n.a, src: n.src }); present = true; } },
      },
    };
    expect(loadWowDock(env as never)).toBe(true);
    expect(loadWowDock(env as never)).toBe(false);
    expect(added).toEqual([{ "data-app": "WM Pro", "data-launcher": "none", "data-side": "left", "data-bottom": "64", "data-wow-dock-loader": "", src: "https://thewow.online/wow-dock.js" }]);
  });
  it("opens the dock from WM Pro's own menus, or says it could not", () => {
    const opened: string[] = [];
    expect(openWowDock("lounge", { WOWDock: { open: (r: string) => opened.push(r) } })).toBe(true);
    expect(opened).toEqual(["lounge"]);
    expect(openWowDock("lounge", {})).toBe(false);
    expect(openWowDock("lounge", undefined)).toBe(false);
  });
});
