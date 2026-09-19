"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
// Only what this file still DRAWS. The nav icons left with the nav arrays —
// they belong to `wmDestinations` now, beside the rooms they label. The
// remainder of the old list (Moon, VolumeX, Eye, Palette, Trophy, Heart,
// ChevronLeft/Right…) was already dead before that move and went with it: an
// import nothing renders is a claim about this file that no pixel keeps.
import {
  BarChart2, User, Bell, Settings, Search, Zap,
  X, Monitor, Shield, Trash2, Menu,
} from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import WmWordmark from "@/components/brand/WmWordmark";
import MobileSessionPill from "@/components/layout/MobileSessionPill";
import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";
import { useShellModalFocus } from "@/components/layout/useShellModalFocus";
import { TickerTape } from "@/components/layout/TickerTape";
import { ShellCompanions } from "@/components/layout/ShellCompanions";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { clsx } from "clsx";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WMSBar } from "@/components/wms/WMSBar";
import { HeaderPnL } from "@/components/layout/HeaderPnL";
import { isPublicAuthPath } from "@/lib/authRoutes";
import { useCapitalObservation, useCapitalReach } from "@/lib/experience/useActiveScene";
import { WMExperienceShell } from "@/components/experience/WMExperienceShell";
import { isFounderRoomRoute } from "@/lib/routing/founderRoomRoutes";
import { destinationsInGroup, phoneNavDestinations } from "@/lib/routing/wmDestinations";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { selectNavEmphasis } from "@/lib/experience/selectNavEmphasis";
import { matchCuratedSymbols } from "@/lib/marketData/curatedSymbolCatalog";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * The shell PANELS — search, notifications, settings, sign-out — are no longer
 * declared in this file. They were file-private here, which meant the July
 * branch below could mount them and the OS branch above could not: a trader
 * standing in /command-deck had no way to search, reach settings, or sign out.
 * They now live in `shellPanels` so BOTH shells mount the same ones.
 */
import {
  SearchPanel,
  NotificationsPanel,
  SettingsPanel,
  initialUnreadNotificationCount,
} from "@/components/layout/shellPanels";

/* ── Nav items ──────────────────────────────────────────────
   THESE ARE NO LONGER TYPED HERE.

   `NAV_CORE` / `NAV_WORKBENCH` / `NAV_BOTTOM` / `MOBILE_NAV_ITEMS` were four
   hand-maintained lists of where the product's rooms are — and they were not
   the only four. `OS_ROOMS` in WMOperatingSystem and `FOUNDER_ROOM_ROUTES` in
   the routing registry answered the same question, in different words, and the
   set had drifted: `/command-deck` was "Command Deck" in this rail and
   "Question-Driven" in the OS rail; `/charts` was "Charts" here and "Chart"
   there. The trader crossing between the two shells was told the same room had
   two names.

   `src/lib/routing/wmDestinations.ts` is the one owner now. The groups below
   are VIEWS of it, and the canon-loop ordering the deleted comment described
   lives there, stated once.

   What moved, and why it is a repair rather than a reshuffle: the rail now
   carries the ROOM group — the decision family that wears the OS frame — so
   `/heatmaps`, `/nectar` and `/paper` are in the always-visible rail they were
   already framed by, and `/education` sits with the other tools it belongs
   with. No destination was removed from the product; every one of them is in
   the Workspace drawer or the rail, exactly as before. */
const NAV_CORE = destinationsInGroup("ROOM");
const NAV_WORKBENCH = destinationsInGroup("TOOL");
const NAV_BOTTOM = destinationsInGroup("COMMUNITY");

// Mobile primary nav — a SLICE of the one registry, named by href so a label
// or icon change lands here too; typing them out again is what let the phone
// bar call /paper "Paper" while every other surface called it "Paper Trade".
// This comment used to enumerate FIVE slots ending in "DECIDE (Command
// Deck)" — the M3 cut (2026-09-19) removed that slot, and the count and the
// order now live where they are owned: `PHONE_SLOT_HREFS` in wmDestinations,
// pinned by ShellAccessParity.test.tsx. A comment restating them here would
// be the next thing to rot.
/* The phone slot list moved to `wmDestinations` — the destination owner — so
   the OS frame can draw the same five. It was private to this file, and the
   measured consequence was that an OS room on a phone had NO navigation at
   all: the rail is display:none under 900px and nothing replaced it. */
const MOBILE_NAV_ITEMS = phoneNavDestinations();
/* A COMMENT IS NOT A CONSUMER.
   A `NAV_ITEMS` constant stood here, justified by its own comment: "Legacy —
   kept for any code that may reference NAV_ITEMS". No code did. The comment
   was the only thing asserting the need, and a comment cannot be a reference —
   it argued for its own survival and nothing checked the argument.

   It was not inert. It held the app's only surviving mention of `/veddbuild`,
   a route that is itself a bare redirect, so a dead constant was quietly
   keeping a dead destination looking reachable. Retiring the constant is what
   let the `/vailbuild` detour be seen at all.

   Guarded by `× THE SELF-JUSTIFIED CONSTANT` in
   src/app/vailbuild/redirectStubChain.test.ts. */

function isPrimaryDestinationActive(pathname: string, href: string): boolean {
  if (pathname.startsWith(href)) return true;
  // Proof Lane is an Academy curriculum surface. Keep the legacy URL for
  // saved links without exposing it as a separate top-level product.
  return href === "/education" && pathname.startsWith("/proof-lane");
}

/* ── Main Layout ─────────────────────────────────────────── */
/* The header P&L badge used to be declared HERE, as a local function, and
   that placement was the whole defect: a component declared inside the file
   that draws the July shell can only ever be rendered by the July shell. An
   OS room could not show the trader their own realized P&L. It now lives in
   HeaderPnL.tsx, where both shells can reach it. See that file's header. */

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [notifsOpen,    setNotifsOpen]    = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // Ticket T's normal Founder room already owns symbol, session, price,
  // source and fidelity. Repeating the full animated multi-symbol tape above
  // that room adds a second market narrative, consumes scarce first-viewport
  // pixels, and runs an unnecessary quote round. Other routes retain the
  // trader-customizable tape until they graduate into the same room contract.
  // Founder audit 2026-09-13: the Asset-10 sanctuary belongs to the FAMILY of
  // rooms the trader walks between (deck, morning prep, journal, paper,
  // nectar), not just one route. The registry (founderRoomRoutes.ts) is the
  // single owner of that family, so a new sibling route joins the sanctuary
  // by editing ONE file — not by rediscovering this pathname check.
  const isFounderOperatingRoom = isFounderRoomRoute(pathname);

  useEffect(() => setWorkspaceOpen(false), [pathname]);
  // Full-document product surfaces own their vertical rhythm and must remain
  // reachable inside the fixed application shell. Workspace surfaces (charts,
  // scanner, journal, etc.) keep their existing internally managed overflow.
  //
  // THE `isFounderOperatingRoom ||` DISJUNCT IS GONE, AND IT WAS DEAD.
  //
  // This value is computed here at the top of the component but only READ at
  // the scroll-owner div far below, which is part of the July shell markup —
  // and the Ticket T cutover returns WMExperienceShell before that markup is
  // ever reached. So at every point where `documentScroll` is actually used,
  // `isFounderOperatingRoom` is false by construction and the disjunct only
  // ever contributed `false || x`.
  //
  // This is the SECOND dead branch on that flag in this file; the first was
  // the tape-suppression ternary in the July header. The pattern is worth
  // naming: a cutover that returns early turns every later mention of the
  // flag it switched on into decoration, and decoration reads as intent. The
  // next person to touch scroll ownership would have reasoned about an OS
  // case that cannot occur, and any source-scanning gate would have confirmed
  // it for them — a scan sees characters, not reachability.
  //
  // OS rooms DO get document-scroll semantics; WMExperienceShell owns that
  // fact, which is the whole point of the cutover. `/proof-lane` is still on
  // the July shell (frame: "legacy") and still needs document scroll here.
  const documentScroll = pathname === "/proof-lane";
  const router   = useRouter();
  const { user, signOut, signOutAllDevices } = useAuth();

  /* ── Capital right-of-way over the primary rail ────────────────────────────
     Canon: "THE MOMENT CAPITAL IS LIVE, WM SHOULD REDUCE NAVIGATION."

     Two INDEPENDENT inputs, doing two different jobs — see the v2 note in
     selectNavEmphasis.ts:

       experienceContext.mode  — a PREFERENCE. Drives EMPHASIS only.
       capital                 — a FACT from compileScene, republished by the
                                 route that owns a book. Drives ADMISSION.

     `capital` is UNOBSERVED on every route that has no broker panel, which is
     currently most of them. UNOBSERVED withholds nothing and asserts nothing:
     it is not a claim that the trader is flat (§14.1 — FLAT is a finding,
     never a default). Today only /paper publishes, so this rail reduces there
     and nowhere else. That is a wiring limit, not a behavioural one — the day
     a live broker panel lands it publishes the same way and the shell already
     obeys. */
  const { context: experienceContext } = useDecisionContext();
  const capital = useCapitalObservation();
  /* Read alongside `capital`, from the same publication, so the two can never
     describe different books. Kept as a separate hook call rather than folded
     into the emphasis selector — see the render-site note by `shellClause`. */
  const reach = useCapitalReach();
  const navEmphasis = React.useMemo(
    () => selectNavEmphasis(experienceContext.mode, capital, NAV_CORE),
    [experienceContext.mode, capital],
  );
  const railWithheld = navEmphasis.railWithheld;
  const railItems = React.useMemo(
    () => NAV_CORE.filter(item => !railWithheld.includes(item.href)),
    [railWithheld],
  );

  const unreadCount = initialUnreadNotificationCount();

  const openSearch = useCallback(() => {
    setNotifsOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setSearchOpen(true);
  }, []);

  React.useEffect(() => { setMounted(true); }, []);

  // ── Global settings applier ─────────────────────────────────
  // Reads wm_settings and applies app-wide visual settings (light/dark
  // theme + base font size) on mount and whenever Settings is saved.
  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem("wm_settings");
        const s = raw ? JSON.parse(raw) : {};
        // Dark mode: when explicitly false → light theme class on <html>
        const dark = s.darkMode !== false;
        document.documentElement.classList.toggle("wm-light", !dark);
        // Base font size
        const fs = s.fontSize === "small" ? "14px" : s.fontSize === "large" ? "18px" : "16px";
        document.documentElement.style.fontSize = fs;
      } catch {}
    };
    apply();
    window.addEventListener("wm-settings-changed", apply);
    return () => window.removeEventListener("wm-settings-changed", apply);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K → open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);

  // Skip shell on auth pages — MUST be after all hooks to keep hook order stable
  if (isPublicAuthPath(pathname)) {
    return <>{children}</>;
  }

  /**
   * TICKET T PARENT CUTOVER — the Founder operating room owns its own scene.
   *
   * The 2026-09-13 Founder audit named G2 (root/ownership) and G9 (human
   * fruit) RED because "the actual parent did not change." The Founder
   * lands on `FOUNDER_LANDING_ROUTE = "/command-deck"`, and until this
   * moment that route rendered INSIDE the July shell — the left-rail,
   * ticker tape, music player, Mobile Session pill, Spaidbot chrome and
   * a dashboard nav that competes with MARKET for the first viewport.
   *
   * WMExperienceShell (Founder Phase 1: Skeleton) already exists at
   * src/components/experience/WMExperienceShell.tsx and had ZERO
   * consumers — the Asset-10 room built and never moved into. Naming
   * that receipt was the P0 the audit demanded, and the receipt is:
   *
   *   PARENT_SCENE_OWNER_FILE:      src/components/layout/MainLayout.tsx
   *   PARENT_SCENE_OWNER_COMPONENT: MainLayout
   *   LEGACY_PARENT_TO_RETIRE:      MainLayout (1405 lines, this file)
   *   NEW_ASSET10_PARENT_FILE:      src/components/experience/WMExperienceShell.tsx
   *   NEW_ASSET10_PARENT_COMPONENT: WMExperienceShell
   *
   * This branch is the cut, not a wrap. When the Founder loads
   * /command-deck the shell that returns from this component is
   * WMExperienceShell — the July `<div className="wm-universe">…`
   * further down never runs on this route. G2 flips green here.
   *
   * G9 (silhouette blur test) may still need further work INSIDE the
   * room — that is the parallel worker's lane on command-deck/page.tsx.
   * This cut deliberately does not touch what the deck RENDERS; it only
   * changes what wraps it. Anti-collision + the audit's own sequencing
   * (parent first, then content) both point to that split.
   */
  if (isFounderOperatingRoom) {
    return (
      /* THE ROOM SAYS WHAT ROOM IT IS.
         The Visual Canon's one-canvas frame carries a two-line masthead plate:
         the serif wordmark, and under it the engraved legend
         "— A TRADING SANCTUARY —". The product shipped only the first line, so
         the masthead named the COMPANY and never named the PLACE — the single
         most-quoted difference between the approved frame and the runtime.
         The legend is a property of the operating room itself, so it is set
         here, where the room is composed, not inside the brand primitive
         (every other surface that borrows WmWordmark names its own sub-line). */
      <WMExperienceShell brand={<WmWordmark size="compact" subtitle="— A Trading Sanctuary —" />}>
        {children}
      </WMExperienceShell>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden" }}
      className="bg-wm-black wm-universe"
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        style={{ minHeight: 44, flexShrink: 0 }}
        className="flex items-center px-3 border-b border-wm-border bg-wm-dark z-50 wm-shell-header"
      >
        {/* Brand — WM wordmark shipped with the shell so every route
            (education, news, paper, copy-trading, backtesting, ai-bot,
            lounge, tv, radio, shop, creator, partnerships, ...) inherits
            the same brand identity. Per-page subtitles remain on hero
            surfaces (Command Deck, Growth, Morning Prep, Journal, ...) */}
        <div className="flex items-center gap-2 shrink-0">
          <WMLogo size={26} />
          <div className="hidden md:block">
            <WmWordmark size="compact" />
          </div>
        </div>

        {/* THE TAPE IS SUPPRESSED IN AN OS ROOM BY STRUCTURE, NOT BY A FLAG.
            This was a ternary on `isFounderOperatingRoom`, and it could not
            run. The cutover above returns WMExperienceShell before this markup
            is reached, so by the time control arrives here that flag is ALWAYS
            false — the true-arm was unreachable JSX carrying a `data-testid`
            that no rendered tree could ever contain.

            It survived because a Sentinel asserted it, by reading this file as
            text and finding the attribute. A source scan cannot tell a live
            branch from a dead one; it only sees the characters. So the gate
            reported "tape suppression works" on the strength of code that had
            stopped executing, which is worse than no gate — a green light
            wired to nothing still turns green.

            The suppression is real; it just is not conditional. The July
            header only ever draws for a July route, and every OS room gets a
            masthead that has no tape in it at all. See founderRoomShell.test. */}
        <div className="wm-shell-ticker flex-1 overflow-hidden mx-2">
          <TickerTape />
        </div>

        {/* Mobile Session Pill — fills the phone header when the ticker
            is hidden, giving phone users a canonical "active symbol +
            live/observed" read that ties into the Market Truth graph
            without shrinking the desktop ticker into a broken thin bar. */}
        <div className="wm-mobile-session-slot flex-1 min-w-0 overflow-hidden mx-1 flex items-center justify-center">
          <MobileSessionPill />
        </div>

        {/* Right controls */}
        <div className="wm-shell-actions flex items-center gap-1 shrink-0">
          {/* Live P&L (toggled by Settings → Show P&L in header) */}
          <HeaderPnL />

          {/* Search — opens modal */}
          <button
            ref={searchTriggerRef}
            onClick={openSearch}
            aria-label="Search symbols"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            // MEASURED 2026-09-19 on live /charts at 1920: this button reported
            // `aria-controls="wm-symbol-search-dialog"` while `getElementById`
            // returned null. The dialog is mounted only while `searchOpen` — see
            // the AnimatePresence block at the foot of this file — so the
            // reference dangled for the whole time the control was most likely to
            // be pressed. A dangling `aria-controls` is not ignored, it is
            // FOLLOWED: the reader offers the jump, the human takes it, nothing is
            // there and nothing is said, which reads as a broken page rather than
            // a shut dialog. `aria-expanded` alone is complete and honest, so
            // dropping the reference silences nothing. Same law, same day, as the
            // equipment pair in WMOperatingSystem — gated per BUTTON, on the state
            // that governs this button's own target.
            aria-controls={searchOpen ? "wm-symbol-search-dialog" : undefined}
            className="wm-shell-action flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors group"
            title="Search symbols (Ctrl+K)"
          >
            <Search size={14} />
            <span className="text-[10px] hidden group-hover:inline text-wm-text-dim">⌘K</span>
          </button>

          {/* Notifications */}
          <button
            ref={notificationsTriggerRef}
            onClick={() => { setNotifsOpen(true); setSettingsOpen(false); }}
            aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
            aria-haspopup="dialog"
            aria-expanded={notifsOpen}
            // Same defect, same repair as Search above: the drawer is mounted
            // only while `notifsOpen`, so an unconditional reference named a node
            // that does not exist for the whole time the control is shut.
            aria-controls={notifsOpen ? "wm-notifications-drawer" : undefined}
            className="wm-shell-action relative p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span aria-hidden="true" className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-wm-red rounded-full ring-1 ring-wm-dark" />
            )}
          </button>

          {/* Settings */}
          <button
            ref={settingsTriggerRef}
            onClick={() => { setSettingsOpen(true); setNotifsOpen(false); }}
            aria-label="Open settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            // Same defect, same repair. Gated on this button's own state rather
            // than on any shared "a drawer is open" flag: three controls, three
            // different targets, so a shared gate would let Settings claim the
            // drawer Notifications opened — a reference that resolves and still
            // lies, which is the quieter and more expensive kind.
            aria-controls={settingsOpen ? "wm-settings-drawer" : undefined}
            className="wm-shell-action p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* WM$ balance */}
          <div className="wm-mobile-hide"><WMSBar /></div>

          {/* PRO badge */}
          <div className="wm-mobile-hide ml-1 flex items-center gap-1 bg-gradient-to-r from-wm-gold/25 to-wm-gold/10 border border-wm-gold/40 rounded-full px-2.5 py-0.5">
            <Zap size={10} className="text-wm-gold fill-wm-gold" />
            <span className="text-[10px] font-bold text-wm-gold tracking-wide">PRO</span>
          </div>

          {/* User avatar — click to open dropdown */}
          <div className="wm-shell-profile relative ml-2">
            <button
              ref={workspaceTriggerRef}
              onClick={() => setProfileOpen(o => !o)}
              aria-label={profileOpen ? "Close profile menu" : "Open profile menu"}
              className="wm-shell-avatar w-7 h-7 rounded-full overflow-hidden ring-2 ring-wm-green/30 hover:ring-wm-green/60 transition-all shrink-0"
              title={user?.displayName ?? "Profile"}
            >
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-wm-green to-wm-blue flex items-center justify-center text-[11px] font-black text-wm-black">
                  {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "W"}
                </div>
              )}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-[149]" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-9 z-[150] w-52 rounded-xl border border-wm-border bg-wm-dark shadow-2xl overflow-hidden"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  {/* User info */}
                  <div className="px-3 py-3 border-b border-wm-border/60">
                    <div className="text-xs font-bold text-wm-text truncate">{user?.displayName ?? "Guest"}</div>
                    <div className="text-[10px] text-wm-text-dim truncate">{user?.email ?? ""}</div>
                  </div>
                  {/* Menu items */}
                  {[
                    { label: "My Profile",  icon: "👤", action: () => { router.push("/profile"); setProfileOpen(false); } },
                    { label: "Settings",    icon: "⚙️", action: () => { setSettingsOpen(true); setProfileOpen(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-wm-text-muted transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold">
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div className="border-t border-wm-border/60 mt-1">
                    <button
                      onClick={async () => { setProfileOpen(false); await signOut(); }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold"
                      style={{ color: "#FF4D6A" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,77,106,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>🚪</span> Sign Out
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Log out of WealthyMindsets Pro on ALL devices? Every other signed-in device will be signed out at its next check.")) return;
                        setProfileOpen(false);
                        await signOutAllDevices();
                      }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-[11px] text-wm-text-muted transition-colors hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold"
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>🔒</span> Log out all devices
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body row (sidebar + content) ───────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, height: 0 }}>
        {/* MooMoo-style 72px icon+label sidebar */}
        <aside className="wm-primary-sidebar" style={{
          width: 72, flexShrink: 0,
          background: "linear-gradient(180deg,#111018 0%,#0b0b11 55%,#120b0e 100%)",
          borderRight: "1px solid #1E2030",
          display: "flex", flexDirection: "column",
          zIndex: 40, overflow: "visible",
        }}>
          {/* Five-job decision dock. The full product remains reachable from
              Workspace without forcing every destination into the live rail. */}
          <nav aria-label="Primary" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 4 }}>
            {railItems.map(({ href, icon: Icon, label, authority }) => {
              const active = isPrimaryDestinationActive(pathname, href);
              return (
                <Link href={href} title={label}
                  key={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 3, height: 58, cursor: "pointer", textDecoration: "none",
                    background: active ? "linear-gradient(90deg,rgba(232,185,35,.16),rgba(5,150,105,.04))" : "transparent",
                    borderLeft: active ? "2px solid #E8B923" : "2px solid transparent",
                    transition: "background 0.12s",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Icon size={18} style={{ color: active ? "#E8B923" : "#8B8FA8", flexShrink: 0 }} />
                  <span style={{
                    // Founder 2026-09-02: allow up to two lines so two-word
                    // primary destinations ("Command Deck", "Morning Prep")
                    // render in full instead of truncating to "Command D…".
                    // 72px rail is fixed, so we keep the ellipsis fallback
                    // to prevent a rogue three-word label from overflowing.
                    fontSize: 9, fontWeight: active ? 600 : 400,
                    color: active ? "#E2E8F0" : "#8B8FA8",
                    textAlign: "center", lineHeight: 1.15, maxWidth: 66,
                    display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2,
                    overflow: "hidden", wordBreak: "keep-all",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>
                  {/* M3 quarantine (Founder 2026-09-19): a room that lost
                      normal-route authority keeps its door but the door says
                      so. Data from the destination owner, not a local list. */}
                  {authority === "legacy" && (
                    <span
                      data-testid="rail-legacy-chip"
                      style={{
                        fontSize: 7, letterSpacing: "0.12em", color: "#6F7490",
                        border: "1px solid rgba(111,116,144,0.45)", borderRadius: 3,
                        padding: "0px 3px", marginTop: 1,
                      }}
                    >
                      LEGACY
                    </span>
                  )}
                </Link>
              );
            })}

            {/* §9 "…and a word". A destination that disappears without a
                sentence is a worse version of the thing the colour clauses
                exist to prevent: the trader sees a changed screen and has to
                guess whether the product broke or is protecting them.
                `role="note"` + aria-live so it is announced, not just seen.
                No amber, no pulse — this is a calm reduction, not an alarm;
                §9 is explicit that WAIT and CLOSED do not pulse. */}
            {navEmphasis.reductionNote !== null && (
              <div
                role="note"
                aria-live="polite"
                style={{
                  margin: "8px 6px 4px", padding: "8px 6px",
                  borderTop: "1px solid #1E2030",
                  color: "#8B8FA8", fontSize: 8, lineHeight: 1.5,
                  textAlign: "center", letterSpacing: "0.01em",
                }}
              >
                {navEmphasis.reductionNote}
                {/* ── REACH, as a second sentence ────────────────────────────
                    The rail has just reduced because a book is open. The
                    trader's other devices cannot see that book, so they will
                    NOT reduce — and until this line existed, nothing on any
                    screen said so. That divergence was introduced by the
                    reduction itself, which makes it this component's debt to
                    disclose. Master Index parity law: a limitation one surface
                    cannot support must be explicit and owned, not accidental
                    drift.

                    Deliberately NOT routed through `selectNavEmphasis`. That
                    selector answers "what does this MODE emphasise"; reach is
                    capital provenance, which no preference may influence.
                    Feeding it in would put a fact and a preference through one
                    function and its own test asserts they never cross.

                    Rendered only when there is a clause — ALL_DEVICES returns
                    null, and a shell that narrates the happy path is noise. */}
                {reach !== null && reach.shellClause !== null && (
                  <span style={{ display: "block", marginTop: 4, color: "#6F7490" }}>
                    {reach.shellClause}
                  </span>
                )}
              </div>
            )}
          </nav>

          <div style={{ borderTop: "1px solid #1E2030", padding: "6px 0 8px" }}>
            <button
              type="button"
              aria-label="Open workspace menu"
              aria-expanded={workspaceOpen}
              // FOUND BY THE CLASS-WIDE NET, not by the live probe — this rail
              // button is below the desktop fold the probe read, so the measured
              // list of three carriers was three of FOUR. The drawer it names is
              // mounted only while `workspaceOpen` (the AnimatePresence block
              // immediately below), so the unconditional form dangled for the
              // whole time the control was shut, exactly like the three masthead
              // triggers. This is the argument for the net: a probe reports what
              // it could see, and a defect class does not stop at the fold.
              aria-controls={workspaceOpen ? "wm-workspace-menu" : undefined}
              onClick={() => setWorkspaceOpen(open => !open)}
              style={{
                width: "100%", height: 56, border: 0, borderLeft: workspaceOpen ? "2px solid #E8B923" : "2px solid transparent",
                background: workspaceOpen ? "linear-gradient(90deg,rgba(232,185,35,.16),rgba(5,150,105,.04))" : "transparent",
                color: workspaceOpen ? "#E8B923" : "#8B8FA8", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer",
              }}
            >
              {workspaceOpen ? <X size={19} /> : <Menu size={19} />}
              <span style={{ fontSize: 9, fontWeight: workspaceOpen ? 700 : 500 }}>Workspace</span>
            </button>
          </div>

          <AnimatePresence>
            {workspaceOpen && (
              <ShellModalDrawer
                id="wm-workspace-menu"
                titleId="wm-workspace-title"
                descriptionId="wm-workspace-description"
                title="Workspace"
                description="Everything, without the clutter. Open one focused tool, then return to the market."
                closeLabel="Close workspace menu"
                width={360}
                fallbackTriggerRef={workspaceTriggerRef}
                onClose={() => setWorkspaceOpen(false)}
                titleIcon={<Menu size={17} aria-hidden="true" />}
              >
                <div style={{ padding: "2px 16px 20px" }}>

                  {[
                    /* Withheld-from-rail surfaces land HERE, first, so the
                       reduction is a MOVE and not a deletion. Without this
                       section the rail filter would make Academy and Journal
                       unreachable while a position is open — trapping a
                       trader inside a screen to "protect" them, which is a
                       worse failure than the noise it was fixing. The section
                       title states where they went and why. */
                    ...(railWithheld.length > 0
                      ? [{
                          title: "Moved here while capital is live",
                          items: NAV_CORE.filter(item => railWithheld.includes(item.href)),
                        }]
                      : []),
                    { title: "Market tools", items: NAV_WORKBENCH },
                    { title: "Community & business", items: NAV_BOTTOM },
                  ].map(section => (
                    <div key={section.title} style={{ marginTop: 18 }}>
                      <div style={{ color: "#74798f", fontSize: 9, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>{section.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {section.items.map(({ href, icon: Icon, label, authority }) => {
                          const active = pathname.startsWith(href);
                          return (
                            <Link key={href} href={href} aria-current={active ? "page" : undefined}
                              style={{
                                minHeight: 72, borderRadius: 12, border: active ? "1px solid rgba(232,185,35,.55)" : "1px solid #242735",
                                background: active ? "linear-gradient(145deg,rgba(232,185,35,.16),rgba(5,150,105,.08))" : "rgba(255,255,255,.025)",
                                color: active ? "#F2D578" : "#D1D5E2", textDecoration: "none", padding: 12,
                                display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 9,
                              }}>
                              <Icon size={17} aria-hidden="true" />
                              <span style={{ fontSize: 11, fontWeight: 700 }}>
                                {label}
                                {/* M3 quarantine: this drawer draws ROOM doors too (the
                                    withheld-while-capital-is-live section), so the deck's
                                    door must SAY the word here as well as on the rail. */}
                                {authority === "legacy" && (
                                  <span data-testid="drawer-legacy-chip" style={{ marginLeft: 6, fontSize: 7, letterSpacing: "0.12em", color: "#6F7490", border: "1px solid rgba(111,116,144,0.45)", borderRadius: 3, padding: "0px 3px", verticalAlign: "middle" }}>LEGACY</span>
                                )}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ShellModalDrawer>
            )}
          </AnimatePresence>
        </aside>

        {/* Main content */}
        <main
          className="wm-app-surface"
          data-scroll-owner={documentScroll ? "shell" : "workspace"}
          style={{
            flex: 1,
            overflowX: "hidden",
            overflowY: documentScroll ? "auto" : "hidden",
            minWidth: 0,
            position: "relative",
            height: "100%",
            overscrollBehaviorY: documentScroll ? "contain" : undefined,
          }}
        >
          {mounted ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={documentScroll
                  ? { position: "relative", minHeight: "100%" }
                  : { position: "absolute", inset: 0 }}
              >
                <ErrorBoundary>{children}</ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div style={documentScroll
              ? { position: "relative", minHeight: "100%" }
              : { position: "absolute", inset: 0 }}><ErrorBoundary>{children}</ErrorBoundary></div>
          )}
        </main>
      </div>

      <nav className="wm-mobile-nav" aria-label="Primary navigation">
        {MOBILE_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx("wm-mobile-nav-link", active && "is-active")}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        {/* Landscape-only trio: header is hidden in landscape-short mode
            (globals.css:192), so Notifications / Settings / Profile would
            otherwise be unreachable. Render them here as native buttons
            reusing the same state setters. Hidden in portrait via CSS. */}
        <div className="wm-mobile-nav-landscape-actions" aria-label="Access">
          <button
            type="button"
            onClick={() => { setNotifsOpen(true); setSettingsOpen(false); }}
            aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
            className="wm-mobile-nav-link wm-mobile-nav-action"
          >
            <span className="relative inline-flex" aria-hidden="true">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-wm-red rounded-full ring-1 ring-wm-dark" />
              )}
            </span>
            <span>Alerts</span>
          </button>
          <button
            type="button"
            onClick={() => { setSettingsOpen(true); setNotifsOpen(false); }}
            aria-label="Open settings"
            className="wm-mobile-nav-link wm-mobile-nav-action"
          >
            <Settings size={19} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <Link
            href="/profile"
            aria-label="Open profile"
            className={clsx(
              "wm-mobile-nav-link wm-mobile-nav-action",
              pathname.startsWith("/profile") && "is-active",
            )}
          >
            <User size={19} aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </div>
      </nav>

      {/* ── Overlays ─────────────────────────────────────────── */}
      {mounted && (
        <AnimatePresence>
          {searchOpen   && <SearchPanel        key="search"   onClose={() => setSearchOpen(false)} fallbackTriggerRef={searchTriggerRef} />}
          {notifsOpen   && <NotificationsPanel key="notifs" onClose={() => setNotifsOpen(false)} fallbackTriggerRef={notificationsTriggerRef} />}
          {settingsOpen && <SettingsPanel key="settings" onClose={() => setSettingsOpen(false)} fallbackTriggerRef={settingsTriggerRef} />}
        </AnimatePresence>
      )}

      {/* The player and the assistant, from the one mount point both shells
          use. They were declared here and nowhere else, which made them
          persistent on fourteen routes rather than persistent. */}
      <ShellCompanions />

    </div>
  );
}
