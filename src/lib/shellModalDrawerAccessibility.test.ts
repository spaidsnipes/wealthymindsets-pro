import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
const drawer = source("../components/layout/ShellModalDrawer.tsx");
const modalFocus = source("../components/layout/useShellModalFocus.ts");
const layout = source("../components/layout/MainLayout.tsx");

describe("shared shell modal drawer accessibility", () => {
  it("escapes chart stacking contexts without accessing document during SSR", () => {
    expect(drawer).toContain('import { createPortal } from "react-dom"');
    expect(drawer).toContain("useSyncExternalStore(subscribeShellModalPortalHost, getShellModalPortalHost, getServerModalPortalHost)");
    expect(drawer).toContain("portalHost ? createPortal(<ShellModalDrawerContent {...props} />, portalHost) : null");
    expect(drawer).toContain("function ShellModalDrawerContent");
  });

  it("owns dialog naming, initial focus, keyboard containment, Escape, and focus restoration", () => {
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain('aria-modal="true"');
    expect(drawer).toContain("aria-labelledby={titleId}");
    expect(drawer).toContain("useShellModalFocus");
    expect(drawer).toContain("initialFocusRef: closeRef");
    expect(modalFocus).toContain("initialFocusRef.current?.focus()");
    expect(modalFocus).toContain('event.key === "Escape"');
    expect(modalFocus).toContain('event.key !== "Tab"');
    expect(modalFocus).toContain("event.shiftKey && active === first");
    expect(modalFocus).toContain("!event.shiftKey && active === last");
    expect(modalFocus).toContain("opener?.isConnected");
    expect(modalFocus).toContain("fallbackTriggerRef.current?.focus()");
    expect(modalFocus).toContain("active !== document.body");
  });

  it("keeps the shared drawer on-screen, independently scrollable, and safe-area aware", () => {
    expect(drawer).toContain("max-w-[100vw]");
    expect(drawer).toContain("width: `min(${width}px, 100vw)`");
    expect(drawer).toContain('paddingBottom: "env(safe-area-inset-bottom)"');
    expect(drawer).toContain("min-h-0 flex-1 overflow-y-auto overscroll-contain");
    expect(drawer).toContain("h-11 w-11");
  });

  it("connects both stable header triggers to exclusive modal drawers", () => {
    expect(layout).toContain('aria-haspopup="dialog"');
    expect(layout).toContain("aria-expanded={notifsOpen}");
    expect(layout).toContain("aria-expanded={settingsOpen}");
    expect(layout).toContain('aria-controls="wm-notifications-drawer"');
    expect(layout).toContain('aria-controls="wm-settings-drawer"');
    expect(layout).toContain("fallbackTriggerRef={notificationsTriggerRef}");
    expect(layout).toContain("fallbackTriggerRef={settingsTriggerRef}");
    expect(layout).toContain('className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-wm-text-muted');
  });

  it("separates notification primary and dismiss actions with truthful names and 44px targets", () => {
    expect(layout).toContain("<article");
    expect(layout).toContain('aria-label={n.read ? `Notification: ${n.title}` : `Mark ${n.title} as read`}');
    expect(layout).toContain('aria-label={`Dismiss notification: ${n.title}`}');
    expect(layout).toContain('className="inline-flex h-11 w-11');
    expect(layout).toContain('<span className="sr-only">{n.read ? "Read" : "Unread"}</span>');
  });

  it("gives settings tabs, panels, switches, fields, and footer actions explicit semantics", () => {
    expect(layout).toContain('role="tablist"');
    expect(layout).toContain('type="button" role="tab"');
    expect(layout).toContain("aria-selected={tab === t.id}");
    expect(layout).toContain('event.key === "ArrowRight"');
    expect(layout).toContain('role="tabpanel"');
    expect(layout).toContain('role="switch"');
    expect(layout).toContain("aria-checked={on}");
    expect(layout).toContain("aria-label={label}");
    expect(layout.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(10);
    expect(layout).toContain("Save Settings");
    expect(layout).toContain("Sign Out");
  });

  it("preserves existing settings, export, cache, notification, and sign-out handlers", () => {
    expect(layout).toContain('localStorage.setItem("wm_settings"');
    expect(layout).toContain('window.dispatchEvent(new CustomEvent("wm-settings-changed"))');
    expect(layout).toContain('a.download = "wealthymindsets-export.json"');
    expect(layout).toContain("window.location.reload()");
    expect(layout).toContain("onClick={() => markOne(n.id)}");
    expect(layout).toContain("onClick={() => remove(n.id)}");
    expect(layout).toContain("await signOut()");
  });
});
