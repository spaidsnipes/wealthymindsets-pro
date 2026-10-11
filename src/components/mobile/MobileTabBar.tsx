"use client";

/**
 * MOBILE TAB BAR — the phone's app bar for the market room (Founder, 2026-10-11: "it should be
 * like Webull, moomoo, Robinhood mobile — not half a computer screen smushed").
 *
 * Shown only on a phone held portrait (globals.css `.wm-mobile-tabbar`, A PHONE IS NOT A SMALL DESK);
 * the desk and the tablet never see it. It owns NO behaviour of its own: every tab presses the
 * room's existing control (the one TRADE door, Watchlist, the room rail) or is a plain link (Chart,
 * Journal), so there is still exactly one trade door and one way into each place.
 */
import Link from "next/link";
import React from "react";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

interface Tab {
  readonly id: string;
  readonly label: string;
  /** The existing control this tab presses. */
  readonly target?: string;
  /** A tab that is a place, not a control on this page (Account → /profile). */
  readonly href?: string;
  readonly icon: React.ReactNode;
  readonly primary?: boolean;
  /** The screen this bar lives on (marked aria-current). */
  readonly current?: boolean;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const MOBILE_TABS: readonly Tab[] = [
  // Chart · Journal sit where the other rooms' phone bar has them (PHONE_SLOT_HREFS), so the bar
  // reads the same from screen to screen; the market screen's own jobs fill the middle.
  { id: "chart", label: "Chart", href: INSTRUMENT_VIEW_ROUTE, current: true,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M7 4v16M17 4v16" /><rect x="5" y="8" width="4" height="7" rx="1" /><rect x="15" y="6" width="4" height="9" rx="1" /></svg> },
  { id: "watchlist", label: "Watchlist", target: '[data-testid="context-watchlist"]',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 6h16M4 12h16M4 18h10" /></svg> },
  { id: "trade", label: "Trade", target: '[data-testid="context-trade"]', primary: true,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 17l5-6 4 3 7-8" /><path d="M15 6h5v5" /></svg> },
  { id: "journal", label: "Journal", href: "/journal",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M9 8h6M9 12h6" /></svg> },
  // More = the room rail (Tools, Rooms, Profile, every destination): the masthead's doors, which a
  // phone's market screen does not show, open the same rail.
  { id: "more", label: "More", target: '[data-testid="os-market-rooms"]',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg> },
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
        <Link key={t.id} href={t.href} prefetch={false} data-tab={t.id} aria-current={t.current ? "page" : undefined}
          className={t.current ? "wm-mobile-tab wm-mobile-tab--current" : "wm-mobile-tab"}>
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
