import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
// The search dialog moved out of MainLayout into `shellPanels`, so that the OS
// shell can mount the same one the July shell always had. This scan follows it;
// aimed at the old file it would match nothing and pass forever.
const layout = source("../components/layout/shellPanels.tsx");
// The TRIGGER stays in the shell; only the dialog moved.
const shell = source("../components/layout/MainLayout.tsx");
const drawer = source("../components/layout/ShellModalDrawer.tsx");
const focusOwner = source("../components/layout/useShellModalFocus.ts");

describe("global symbol search accessibility", () => {
  it("uses the same canonical modal focus owner as shell drawers", () => {
    expect(layout).toContain("useShellModalFocus");
    expect(drawer).toContain("useShellModalFocus");
    expect(focusOwner).toContain('event.key === "Escape"');
    expect(focusOwner).toContain('event.key !== "Tab"');
    expect(focusOwner).toContain("opener?.isConnected");
  });

  it("exposes a named modal and a persistently labelled input", () => {
    expect(layout).toContain('id="wm-symbol-search-dialog"');
    expect(layout).toContain('role="dialog"');
    expect(layout).toContain('aria-modal="true"');
    expect(layout).toContain('aria-labelledby="wm-symbol-search-title"');
    expect(layout).toContain('htmlFor="wm-symbol-search-input"');
    expect(layout).toContain('role="status" aria-live="polite"');
  });

  it("connects the stable trigger and opens search exclusively", () => {
    expect(shell).toContain("ref={searchTriggerRef}");
    expect(shell).toContain('aria-haspopup="dialog"');
    expect(shell).toContain("aria-expanded={searchOpen}");
    // REMAPPED 2026-09-19. This pinned the UNCONDITIONAL literal, which is the
    // one shape that cannot tell open from closed. MEASURED that day on live
    // /charts at 1920: the trigger reported the reference while
    // `getElementById` returned null, because the dialog is mounted only while
    // `searchOpen`. A dangling `aria-controls` is FOLLOWED, not ignored. The
    // relationship this test is about is still asserted — it is simply only
    // claimed in the frames where it is true.
    expect(shell).toContain('aria-controls={searchOpen ? "wm-symbol-search-dialog" : undefined}');
    expect(shell).toContain("setNotifsOpen(false)");
    expect(shell).toContain("setSettingsOpen(false)");
    expect(shell).toContain("setProfileOpen(false)");
  });

  it("names and sizes search, result, and quick-access controls", () => {
    expect(layout).toContain('aria-label="Clear symbol search"');
    expect(layout).toContain("aria-label={`Open ${s.sym}, ${s.label}, ${s.cat}`}");
    expect(layout).toContain('aria-label="Quick access symbol"');
    expect(layout).toContain('aria-label="Add quick access symbol"');
    expect(layout.match(/min-h-11|h-11/g)?.length).toBeGreaterThanOrEqual(12);
  });

  it("preserves quick symbols, provider search, and chart selection behavior", () => {
    expect(layout).toContain('localStorage.setItem("wm_quick_syms"');
    expect(layout).toContain('/api/finnhub?q=${encodeURIComponent(query)}&type=search');
    expect(layout).toContain("setActiveSymbol(sym.toUpperCase())");
    // Asserts the NAVIGATION, not the string. Picking a symbol is a NAMED
    // destination, so it must derive from INSTRUMENT_VIEW_ROUTE — pinning the
    // literal here is what let six files each keep their own copy of it.
    expect(layout).toContain("router.push(INSTRUMENT_VIEW_ROUTE)");
  });
});
