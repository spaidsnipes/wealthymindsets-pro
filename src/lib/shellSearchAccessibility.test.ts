import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
const layout = source("../components/layout/MainLayout.tsx");
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
    expect(layout).toContain("ref={searchTriggerRef}");
    expect(layout).toContain('aria-haspopup="dialog"');
    expect(layout).toContain("aria-expanded={searchOpen}");
    expect(layout).toContain('aria-controls="wm-symbol-search-dialog"');
    expect(layout).toContain("setNotifsOpen(false)");
    expect(layout).toContain("setSettingsOpen(false)");
    expect(layout).toContain("setProfileOpen(false)");
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
    expect(layout).toContain('router.push("/charts")');
  });
});
