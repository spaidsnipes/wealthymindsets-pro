"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Bell, Search, Settings, User } from "lucide-react";

import { WM } from "@/lib/design/wmTokens";
import { useAuth } from "@/contexts/AuthContext";
import {
  SearchPanel,
  NotificationsPanel,
  SettingsPanel,
  initialUnreadNotificationCount,
} from "@/components/layout/shellPanels";
import { HeaderPnL } from "@/components/layout/HeaderPnL";
import { WMSBar } from "@/components/wms/WMSBar";
import { useWMSAvailable } from "@/contexts/WMSContext";

/**
 * WHAT A TRADER MUST BE ABLE TO REACH FROM ANY ROOM.
 *
 * This said "THE FOUR THINGS" and named search, notifications, settings and
 * sign-out. It is now six: the trader's realized paper P&L and their WM points
 * balance joined them, for the same reason and by a subtler mechanism — see
 * the block above the P&L mount below. The count is out of the title, because
 * a title with a number in it is a fact maintained in two places, and this one
 * had already stopped being true before anyone noticed.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 *
 * `MainLayout` has two post-auth return branches: the OS-framed rooms get
 * `WMExperienceShell`, and every other route gets the July `wm-universe`
 * markup. Search, notifications, settings and sign-out were drawn ONLY in the
 * July branch. Read plainly, that meant:
 *
 *   A trader standing in /command-deck — the room the product opens on —
 *   could not search for a symbol, could not open their settings, and could
 *   not sign out, without first walking to a room that still wore July.
 *
 * That is not two shells that look different. That is one shell holding
 * capabilities the other one needs. The mockup canon shows a single persistent
 * masthead; a masthead that cannot sign you out is not that masthead.
 *
 * ── Why this is a component and not more JSX in the frame ───────────────────
 *
 * `WMOperatingSystem` draws the SILHOUETTE and knows nothing about auth,
 * symbols or localStorage — that separation is the reason the frame is testable
 * and reusable. Putting an auth-aware dropdown inside it would spend that. So
 * the frame keeps its `mastheadActions` slot, and this is what goes in it.
 *
 * The PANELS are imported, not reimplemented. They are the same modules the
 * July header mounts. Redrawing them here in the OS palette would have created
 * a second settings dialog with its own drift schedule — the exact defect class
 * this shift exists to end.
 */

const ICON_BUTTON: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  flexShrink: 0,
  borderRadius: WM.radius.md,
  border: `1px solid ${WM.border.hair}`,
  background: "transparent",
  color: WM.text.muted,
  cursor: "pointer",
};

const MENU_ITEM: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minHeight: 44,
  padding: "0 12px",
  border: "none",
  background: "transparent",
  color: WM.text.body,
  font: "inherit",
  fontSize: 12,
  textAlign: "left",
  cursor: "pointer",
};

export interface ShellAccessChromeProps {
  /**
   * Whether the points balance may paint in this masthead.
   *
   * WHY THIS IS A PROP AND NOT A `usePathname()` READ. This component is
   * rendered into trees that have no router — `renderToStaticMarkup` with no
   * providers at all, which is exactly how `ShellAccessParity.test.tsx` builds
   * its HTML. A hook that needs a router here would take the whole shell down
   * in those trees, which is the same failure `useWMSAvailable` already exists
   * to prevent one field over. The shell knows the route; this component knows
   * the chrome. Each says only what it knows.
   *
   * Defaults to `true`, so every existing call site is unchanged and the
   * capability can only go missing where someone WROTE that it should.
   */
  readonly showPoints?: boolean;
  /** Fuse the market HOME utilities into one restrained control horizon. */
  readonly compact?: boolean;
}

/**
 * ── THE POINTS BALANCE DOES NOT STAND OVER A LIVE MARKET ────────────────────
 *
 * Canon F24 draws the instrument view's top band with the two brass plates and
 * one fidelity chip. Measured live at 1440, this build's band read
 *
 *     "Workspace Tools Instrument View OBSERVE▾ 0 WM pts ACTIVE DEGRADED"
 *
 * `0 WM pts` is a gamification counter — this file's own neighbour calls them
 * "local app points, not cryptocurrency" (WMSBar.tsx:2-4). It is not a market
 * reading, it does not change what a trader does with a position, and on
 * /charts it sits between the equipment and the fidelity chip, which IS a
 * market reading.
 *
 * NOT DELETED. Every other room keeps it, because everywhere else the band is
 * not standing over price. `ShellAccessParity` guards that both shells mount
 * the same points component rather than growing a second copy with its own
 * drift schedule — that invariant is untouched and is now guarded on both
 * sides: same component everywhere it appears, AND absent where canon says the
 * band is reserved.
 */
export function ShellAccessChrome({ showPoints = true, compact = false }: ShellAccessChromeProps = {}) {
  const { user, signOut, signOutAllDevices } = useAuth();

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifsOpen, setNotifsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const searchTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const notificationsTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const settingsTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const profileTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const unreadCount = initialUnreadNotificationCount();

  /* Ask, don't assume. `useWMS` throws when no provider is above it — correct
     for a page, fatal for chrome. See useWMSAvailable in WMSContext.tsx. */
  const wmsAvailable = useWMSAvailable();

  const actionButtonStyle: React.CSSProperties = compact
    ? { ...ICON_BUTTON, border: "none", borderRadius: 0 }
    : ICON_BUTTON;

  /**
   * EXCLUSIVE OPEN. Two modal drawers on screen at once is two dialogs
   * competing for one focus trap, and the second one to mount wins silently.
   * Every opener closes the others through this one function rather than each
   * remembering to — which is how the July header acquired the bug where the
   * profile menu stayed open behind the settings drawer.
   */
  const open = React.useCallback((which: "search" | "notifs" | "settings" | "profile" | null) => {
    setSearchOpen(which === "search");
    setNotifsOpen(which === "notifs");
    setSettingsOpen(which === "settings");
    setProfileOpen(which === "profile");
  }, []);

  // ⌘K / Ctrl-K. The July shell owned this shortcut, so it did nothing in an
  // OS room — the keystroke was swallowed by a listener whose state only the
  // other branch rendered.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className={compact ? "wm-shell-access wm-shell-access--compact" : "wm-shell-access"}
      data-presentation={compact ? "compact-strip" : "separate-actions"}
      aria-label={compact ? "Market utilities" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        flexShrink: 0,
        border: compact ? `1px solid ${WM.border.hair}` : undefined,
        borderRadius: compact ? WM.radius.md : undefined,
        background: compact ? "rgba(7,9,15,0.28)" : undefined,
      }}
    >
      {/* ── THE TRADER'S OWN NUMBERS ──────────────────────────────────────
          Realized paper P&L and the WM points balance are facts ABOUT THE
          PERSON, not about the market — and they were drawn only in July's
          header. So a trader in an OS room could not see either one.

          These are mounted here and not in WMOperatingSystem for the same
          reason the buttons below are: the frame draws a silhouette and
          knows nothing about auth, storage or points. This component is the
          thing that knows.

          They are the SAME two components July mounts, imported, not
          restyled copies. A second P&L badge in the OS palette would be a
          second answer to "what is my P&L" with its own drift schedule —
          and the first time the two disagreed, the trader would have no way
          to tell which one was lying. One component, two shells.

          Both carry `wm-mobile-hide`, so on a phone they yield rather than
          crowding a masthead that is already carrying the wordmark, the
          feed badge and four controls. */}
      <HeaderPnL />
      {showPoints && wmsAvailable && (
        <div className="wm-mobile-hide">
          <WMSBar />
        </div>
      )}

      <button
        type="button"
        ref={searchTriggerRef}
        onClick={() => open("search")}
        aria-label="Search symbols"
        aria-haspopup="dialog"
        aria-expanded={searchOpen}
        // MEASURED 2026-09-19 on live /charts at 1920: this button reported
        // `aria-controls="wm-symbol-search-dialog"` while `getElementById`
        // returned null. This file is the OS-shell twin of the July header in
        // MainLayout and carried the identical defect; the dialog is mounted only
        // while `searchOpen` (see the AnimatePresence block below), so the
        // reference dangled for the whole time the control was shut. A dangling
        // `aria-controls` is FOLLOWED, not ignored. `aria-expanded` alone carries
        // the whole disclosure claim, so dropping the reference silences nothing.
        aria-controls={searchOpen ? "wm-symbol-search-dialog" : undefined}
        style={actionButtonStyle}
      >
        <Search size={14} aria-hidden="true" />
      </button>

      <button
        type="button"
        ref={notificationsTriggerRef}
        onClick={() => open("notifs")}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
        aria-haspopup="dialog"
        aria-expanded={notifsOpen}
        // Same defect, same repair as Search above.
        aria-controls={notifsOpen ? "wm-notifications-drawer" : undefined}
        style={{ ...actionButtonStyle, position: "relative" }}
      >
        <Bell size={14} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 5,
              height: 5,
              borderRadius: 999,
              background: WM.state.warn,
            }}
          />
        )}
      </button>

      <button
        type="button"
        ref={settingsTriggerRef}
        onClick={() => open("settings")}
        aria-label="Open settings"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        // Same defect, same repair. Per-button, not per-shell: `open()` here is a
        // single-slot switch, so a shared gate would have every control claiming
        // whichever panel happened to be up.
        aria-controls={settingsOpen ? "wm-settings-drawer" : undefined}
        style={actionButtonStyle}
      >
        <Settings size={14} aria-hidden="true" />
      </button>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          ref={profileTriggerRef}
          onClick={() => open(profileOpen ? null : "profile")}
          aria-label={profileOpen ? "Close profile menu" : "Open profile menu"}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          style={{
            ...actionButtonStyle,
            borderRadius: compact ? 0 : 999,
            borderColor: compact ? "transparent" : (profileOpen ? WM.border.strong : WM.border.line),
            color: WM.text.hero,
          }}
        >
          <User size={14} aria-hidden="true" />
        </button>

        {profileOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => setProfileOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 149 }}
            />
            <div
              role="menu"
              aria-label="Profile"
              style={{
                position: "absolute",
                right: 0,
                top: 38,
                zIndex: 150,
                width: 216,
                overflow: "hidden",
                borderRadius: WM.radius.lg,
                border: `1px solid ${WM.border.line}`,
                background: WM.surface.deep,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${WM.border.hair}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: WM.text.hero }}>
                  {user?.displayName ?? "Guest"}
                </div>
                <div style={{ fontSize: 10, color: WM.text.muted }}>{user?.email ?? ""}</div>
              </div>

              {/* An ANCHOR, not a button with `router.push`. Two reasons, and
                  the second is the load-bearing one:
                  1. A destination the trader can open in a new tab, copy, or
                     reach with a screen-reader's link list. `router.push` in an
                     onClick throws all three away for no gain.
                  2. `useRouter` THROWS when no app router is mounted. The shell
                     is rendered by `renderToStaticMarkup` in the founder-route
                     gates, which mount no router — so calling that hook here
                     would take the masthead down in every one of them. */}
              <Link
                href="/profile"
                role="menuitem"
                style={{ ...MENU_ITEM, textDecoration: "none" }}
                onClick={() => setProfileOpen(false)}
              >
                My Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                style={MENU_ITEM}
                onClick={() => open("settings")}
              >
                Settings
              </button>

              <div style={{ borderTop: `1px solid ${WM.border.hair}` }}>
                <button
                  type="button"
                  role="menuitem"
                  style={{ ...MENU_ITEM, color: WM.state.warn, fontWeight: 700 }}
                  onClick={async () => { setProfileOpen(false); await signOut(); }}
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={{ ...MENU_ITEM, fontSize: 11, color: WM.text.muted }}
                  onClick={async () => {
                    // Named consequence before an irreversible, multi-device act.
                    if (!window.confirm("Log out of WealthyMindsets Pro on ALL devices? Every other signed-in device will be signed out at its next check.")) return;
                    setProfileOpen(false);
                    await signOutAllDevices();
                  }}
                >
                  Log out all devices
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {searchOpen && (
          <SearchPanel key="search" onClose={() => setSearchOpen(false)} fallbackTriggerRef={searchTriggerRef} />
        )}
      </AnimatePresence>
      {notifsOpen && (
        <NotificationsPanel onClose={() => setNotifsOpen(false)} fallbackTriggerRef={notificationsTriggerRef} />
      )}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} fallbackTriggerRef={settingsTriggerRef} />
      )}
    </div>
  );
}

export default ShellAccessChrome;
