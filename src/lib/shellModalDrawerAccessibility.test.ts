import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
const drawer = source("../components/layout/ShellModalDrawer.tsx");
const modalFocus = source("../components/layout/useShellModalFocus.ts");
const layout = source("../components/layout/MainLayout.tsx");
/**
 * The TRIGGERS live in the shell (MainLayout). The PANELS they open no longer
 * do — they were file-private functions there, which is why only the July shell
 * could mount them and a trader in an OS room could not reach settings or sign
 * out at all. They now live in `shellPanels`, and this suite reads each claim
 * from whichever file makes it, rather than from the file that used to.
 */
const panels = source("../components/layout/shellPanels.tsx");

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
    // REMAPPED 2026-09-19 — these pinned the UNCONDITIONAL literal, the one
    // shape that cannot tell an open drawer from a closed one. Both drawers are
    // mounted only while their own state is true, so the old form promised a
    // node that did not exist for the whole time the trigger was shut, and a
    // dangling `aria-controls` is FOLLOWED rather than ignored. Gated per
    // BUTTON, not per shell: the two share a masthead but not a target.
    expect(layout).toContain('aria-controls={notifsOpen ? "wm-notifications-drawer" : undefined}');
    expect(layout).toContain('aria-controls={settingsOpen ? "wm-settings-drawer" : undefined}');
    expect(layout).toContain("fallbackTriggerRef={notificationsTriggerRef}");
    expect(layout).toContain("fallbackTriggerRef={settingsTriggerRef}");
    expect(layout).toContain('className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-wm-text-muted');
  });

  it("separates notification primary and dismiss actions with truthful names and 44px targets", () => {
    expect(panels).toContain("<article");
    expect(panels).toContain('aria-label={n.read ? `Notification: ${n.title}` : `Mark ${n.title} as read`}');
    expect(panels).toContain('aria-label={`Dismiss notification: ${n.title}`}');
    expect(panels).toContain('className="inline-flex h-11 w-11');
    expect(panels).toContain('<span className="sr-only">{n.read ? "Read" : "Unread"}</span>');
  });

  it("gives settings tabs, panels, switches, fields, and footer actions explicit semantics", () => {
    expect(panels).toContain('role="tablist"');
    expect(panels).toContain('type="button" role="tab"');
    expect(panels).toContain("aria-selected={tab === t.id}");
    expect(panels).toContain('event.key === "ArrowRight"');
    expect(panels).toContain('role="tabpanel"');
    expect(panels).toContain('role="switch"');
    expect(panels).toContain("aria-checked={on}");
    expect(panels).toContain("aria-label={label}");
    expect(panels.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(10);
    expect(panels).toContain("Save Settings");
    expect(panels).toContain("Sign Out");
  });

  it("preserves existing settings, export, cache, notification, and sign-out handlers", () => {
    expect(panels).toContain('localStorage.setItem("wm_settings"');
    expect(panels).toContain('window.dispatchEvent(new CustomEvent("wm-settings-changed"))');
    expect(panels).toContain('a.download = "wealthymindsets-export.json"');
    expect(panels).toContain("window.location.reload()");
    expect(panels).toContain("onClick={() => markOne(n.id)}");
    expect(panels).toContain("onClick={() => remove(n.id)}");
    expect(panels).toContain("await signOut()");
  });
});
