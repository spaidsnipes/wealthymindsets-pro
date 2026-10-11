"use client";

/**
 * MOBILE TAB BAR — the phone's app bar for the market room (Founder, 2026-10-11: "it should be
 * like Webull, moomoo, Robinhood mobile — not half a computer screen smushed").
 *
 * Shown only on a phone held portrait (globals.css `.wm-mobile-tabbar`, A PHONE IS NOT A SMALL DESK);
 * the desk and the tablet never see it. It owns NO behaviour of its own: every tab presses the
 * room's existing control (the one TRADE door, Watchlist, Tools, Rooms, the profile menu), so there
 * is still exactly one trade door and one way into each place.
 */
import Link from "next/link";
import React from "react";

interface Tab {
  readonly id: string;
  readonly label: string;
  /** The existing control this tab presses. */
  readonly target?: string;
  /** A tab that is a place, not a control on this page (Account → /profile). */
  readonly href?: string;
  readonly icon: React.ReactNode;
  readonly primary?: boolean;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const MOBILE_TABS: readonly Tab[] = [
  { id: "watchlist", label: "Watchlist", target: '[data-testid="context-watchlist"]',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 6h16M4 12h16M4 18h10" /></svg> },
  { id: "tools", label: "Tools", target: '[data-testid="os-equipment-tools"]',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></svg> },
  { id: "trade", label: "Trade", target: '[data-testid="context-trade"]', primary: true,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 17l5-6 4 3 7-8" /><path d="M15 6h5v5" /></svg> },
  { id: "rooms", label: "Rooms", target: '[data-testid="os-market-rooms"]',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg> },
  // The profile MENU lives in the desk masthead, which a phone's market screen does not show
  // (measured 2026-10-11: pressing it opened nothing visible) — so Account is the profile screen.
  { id: "account", label: "Account", href: "/profile",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg> },
];

/** Press the room's own control for a tab. Returns false when that control is not on the page. */
export function pressMobileTab(target: string, doc: Pick<Document, "querySelector"> = document): boolean {
  const el = doc.querySelector(target) as HTMLElement | null;
  if (!el) return false;
  el.click();
  return true;
}

export function MobileTabBar(): React.ReactElement {
  return (
    <nav className="wm-mobile-tabbar" aria-label="Market app">
      {MOBILE_TABS.map(t => t.href ? (
        <Link key={t.id} href={t.href} prefetch={false} data-tab={t.id} className="wm-mobile-tab">
          <span aria-hidden="true" className="wm-mobile-tab-icon">{t.icon}</span>
          <span className="wm-mobile-tab-label">{t.label}</span>
        </Link>
      ) : (
        <button key={t.id} type="button" data-tab={t.id}
          className={t.primary ? "wm-mobile-tab wm-mobile-tab--trade" : "wm-mobile-tab"}
          onClick={() => { if (t.target) pressMobileTab(t.target); }}>
          <span aria-hidden="true" className="wm-mobile-tab-icon">{t.icon}</span>
          <span className="wm-mobile-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default MobileTabBar;
