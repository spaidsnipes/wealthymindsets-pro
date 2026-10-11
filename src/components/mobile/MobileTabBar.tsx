"use client";

/**
 * MOBILE TAB BAR — the phone's app bar for the market room (Founder, 2026-10-11: "it should be
 * like Webull, moomoo, Robinhood mobile — not half a computer screen smushed").
 *
 * Shown only on a phone held portrait (globals.css `.wm-mobile-tabbar`, A PHONE IS NOT A SMALL DESK);
 * the desk and the tablet never see it. It owns NO trading behaviour: TRADE and Watchlist press the
 * room's existing controls (one trade door), Chart and Journal are plain links, and More is a list of
 * links read from the one destination registry (wmDestinations.ts) — so each place has one way in.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { WM_DESTINATIONS, type WmDestination } from "@/lib/routing/wmDestinations";
import { openSettings } from "@/components/layout/shellPanelDoors";

interface Tab {
  readonly id: string;
  readonly label: string;
  /** The existing control this tab presses. */
  readonly target?: string;
  /** A tab that is a place, not a control on this page (Account → /profile). */
  readonly href?: string;
  readonly icon: React.ReactNode;
  readonly primary?: boolean;
  /** Where this tab goes when its control is not on this page (another room): the chart, told what to open. */
  readonly fallbackHref?: string;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const MOBILE_TABS: readonly Tab[] = [
  // Chart · Journal sit where the other rooms' phone bar has them (PHONE_SLOT_HREFS), so the bar
  // reads the same from screen to screen; the market screen's own jobs fill the middle.
  { id: "chart", label: "Chart", href: INSTRUMENT_VIEW_ROUTE,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M7 4v16M17 4v16" /><rect x="5" y="8" width="4" height="7" rx="1" /><rect x="15" y="6" width="4" height="9" rx="1" /></svg> },
  { id: "watchlist", label: "Watchlist", target: '[data-testid="context-watchlist"]', fallbackHref: `${INSTRUMENT_VIEW_ROUTE}?open=watchlist`,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 6h16M4 12h16M4 18h10" /></svg> },
  { id: "trade", label: "Trade", target: '[data-testid="context-trade"]', fallbackHref: `${INSTRUMENT_VIEW_ROUTE}?open=trade`, primary: true,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 17l5-6 4 3 7-8" /><path d="M15 6h5v5" /></svg> },
  { id: "journal", label: "Journal", href: "/journal",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M9 8h6M9 12h6" /></svg> },
  // More = every other place in the product, as an app's More screen (MobileMoreSheet): the rooms
  // rail it used to press listed four "changed-job" rooms and none of News, Academy, Paper, Profile.
  { id: "more", label: "More",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg> },
];

/** Press the room's own control for a tab. Returns false when that control is not on the page. */
export function pressMobileTab(target: string, doc: Pick<Document, "querySelector"> = document): boolean {
  const el = doc.querySelector(target) as HTMLElement | null;
  if (!el) return false;
  el.click();
  return true;
}

/** The chart room opens what a tab from another room asked for, once (`?open=trade|watchlist`). */
export const MOBILE_OPEN_PARAM = "open";

/** The bar's own places (Chart, Journal) are not repeated on the More screen. */
const IN_BAR = new Set<string>([INSTRUMENT_VIEW_ROUTE, "/journal"]);

export interface MoreSection { readonly title: string; readonly items: readonly WmDestination[] }

/**
 * The More screen's sections, read from the ONE destination registry (wmDestinations.ts) — no
 * private list. Profile moves to Account beside Settings, as an app files them.
 */
export function moreSections(all: readonly WmDestination[] = WM_DESTINATIONS): readonly MoreSection[] {
  const rest = all.filter(d => !IN_BAR.has(d.href));
  const isAccount = (d: WmDestination) => d.href === "/profile";
  return [
    { title: "Rooms", items: rest.filter(d => d.group === "ROOM") },
    { title: "Tools", items: rest.filter(d => d.group === "TOOL") },
    { title: "Community", items: rest.filter(d => d.group === "COMMUNITY" && !isAccount(d)) },
    { title: "Account", items: rest.filter(isAccount) },
  ].filter(sec => sec.items.length > 0);
}

function MobileMoreSheet({ onClose }: { onClose: () => void }): React.ReactElement {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="wm-mobile-more" role="dialog" aria-modal="true" aria-label="More" data-testid="mobile-more">
      <div className="wm-mobile-more-head">
        <span className="wm-mobile-more-title">More</span>
        <button type="button" className="wm-mobile-more-close" onClick={onClose} aria-label="Close More">Close</button>
      </div>
      <div className="wm-mobile-more-body">
        {moreSections().map(sec => (
          <section key={sec.title} className="wm-mobile-more-section">
            <h2 className="wm-mobile-more-section-title">{sec.title}</h2>
            {sec.items.map(d => {
              const Icon = d.icon;
              return (
                <Link key={d.href} href={d.href} prefetch={false} className="wm-mobile-more-row" onClick={onClose}>
                  <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
                  <span className="wm-mobile-more-label">{d.label}</span>
                  {/* A room under legacy authority says the word on every door drawn to it. */}
                  {d.authority === "legacy" ? <span className="wm-mobile-more-legacy">LEGACY</span> : null}
                  <span aria-hidden="true" className="wm-mobile-more-chev">›</span>
                </Link>
              );
            })}
            {sec.title === "Account" ? (
              // Settings is the shell's drawer, opened where the trader stands (a link to
              // /settings → /charts?settings=open is read only when the shell first mounts).
              <button type="button" className="wm-mobile-more-row" onClick={() => { onClose(); openSettings(); }}>
                <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.7} />
                <span className="wm-mobile-more-label">Settings</span>
                <span aria-hidden="true" className="wm-mobile-more-chev">›</span>
              </button>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export function MobileTabBar(): React.ReactElement {
  const path = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = React.useState(false);
  const closeMore = React.useCallback(() => setMoreOpen(false), []);
  React.useEffect(() => { setMoreOpen(false); }, [path]);
  const isCurrent = (t: Tab) => !!t.href && (path === t.href || path.startsWith(`${t.href}/`));
  return (
    <>
    <nav className="wm-mobile-tabbar" aria-label="Market app">
      {MOBILE_TABS.map(t => t.href ? (
        <Link key={t.id} href={t.href} prefetch={false} data-tab={t.id} aria-current={isCurrent(t) ? "page" : undefined}
          className={isCurrent(t) ? "wm-mobile-tab wm-mobile-tab--current" : "wm-mobile-tab"}>
          <span aria-hidden="true" className="wm-mobile-tab-icon">{t.icon}</span>
          <span className="wm-mobile-tab-label">{t.label}</span>
        </Link>
      ) : (
        <button key={t.id} type="button" data-tab={t.id}
          aria-expanded={t.id === "more" ? moreOpen : undefined}
          className={t.primary ? "wm-mobile-tab wm-mobile-tab--trade" : t.id === "more" && moreOpen ? "wm-mobile-tab wm-mobile-tab--current" : "wm-mobile-tab"}
          onClick={() => {
            if (t.id === "more") { setMoreOpen(o => !o); return; }
            setMoreOpen(false);
            // This room's own control when it is here; from another room, the chart told what to open.
            if (t.target && pressMobileTab(t.target)) return;
            if (t.fallbackHref) window.location.assign(t.fallbackHref);
          }}>
          <span aria-hidden="true" className="wm-mobile-tab-icon">{t.icon}</span>
          <span className="wm-mobile-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
    {moreOpen ? <MobileMoreSheet onClose={closeMore} /> : null}
    </>
  );
}

export default MobileTabBar;
