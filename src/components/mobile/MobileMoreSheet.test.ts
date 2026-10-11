import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { moreSections } from "./MobileTabBar";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { WM_DESTINATIONS } from "@/lib/routing/wmDestinations";

/**
 * THE PHONE'S MORE SCREEN (Founder 2026-10-11: "like Webull, moomoo, Robinhood mobile"): every place
 * the product has, read from the one destination registry. It used to press the rooms rail, which
 * listed four "changed-job" rooms and none of News, Academy, Paper Trade or Profile.
 */
describe("More screen", () => {
  const hrefs = moreSections().flatMap(s => s.items.map(d => d.href));

  it("lists every destination except the two the bar already holds", () => {
    const expected = WM_DESTINATIONS.map(d => d.href).filter(h => h !== INSTRUMENT_VIEW_ROUTE && h !== "/journal");
    expect([...hrefs].sort()).toEqual([...expected].sort());
    for (const h of ["/news", "/education", "/paper", "/morning-prep", "/scanner", "/lounge", "/profile"]) expect(hrefs).toContain(h);
    expect(hrefs).not.toContain(INSTRUMENT_VIEW_ROUTE);
    expect(hrefs).not.toContain("/journal");
  });

  it("files Profile under Account", () => {
    const account = moreSections().find(s => s.title === "Account");
    expect(account?.items.map(d => d.href)).toEqual(["/profile"]);
  });

  it("a legacy room says the word; Settings and Close are on the screen; the tab no longer presses the rail", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/mobile/MobileTabBar.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(3_000);
    expect(src).toContain('{d.authority === "legacy" ? <span className="wm-mobile-more-legacy">LEGACY</span> : null}');
    expect(src).toContain('<button type="button" className="wm-mobile-more-row" onClick={() => { onClose(); openSettings(); }}>');
    expect(src).toContain('aria-label="Close More"');
    expect(src).not.toContain('{ id: "more", label: "More", target:');
  });

  it("both shells answer the open-settings event, so More → Settings opens in every room", () => {
    const july = readFileSync(path.join(process.cwd(), "src/components/layout/MainLayout.tsx"), "utf8");
    const os = readFileSync(path.join(process.cwd(), "src/components/layout/ShellAccessChrome.tsx"), "utf8");
    expect(july.length).toBeGreaterThan(10_000);
    expect(july).toContain("window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);");
    expect(os).toContain("window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);");
  });

  it("shell sheets stop at the app bar, and a tab closes the open sheet first", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const src = readFileSync(path.join(process.cwd(), "src/components/mobile/MobileTabBar.tsx"), "utf8");
    expect(css).toContain('body:has(.wm-mobile-tabbar) [data-placement]:has(> [role="dialog"][data-touch-floor]) { bottom: calc(52px + env(safe-area-inset-bottom)) !important; }');
    expect(src).toContain('backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));');
    expect(src).toContain('if (t.id === "watchlist" && closed != null && /watchlist/i.test(closed)) return;');
  });

  it("the sheet stops at the app bar and clears the clock", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(".wm-mobile-more { display: none; }");
    expect(css).toContain("bottom: calc(52px + env(safe-area-inset-bottom)); z-index: 45;");
  });
});
