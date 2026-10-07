"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { SpadeBotButton } from "@/components/layout/SpaidBotButton";
import { MusicPlayer } from "@/components/layout/MusicPlayer";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * THE TWO THINGS THAT FOLLOW THE TRADER EVERYWHERE.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 * The music player and the assistant button were rendered at the tail of the
 * July `wm-universe` branch and nowhere else. So they were not persistent —
 * they were persistent ON FOURTEEN ROUTES. Walking into /command-deck stopped
 * the player's controls from existing and took the assistant away, with no
 * event explaining either disappearance.
 *
 * That is worse than a missing feature. A control that vanishes when you
 * change rooms teaches the trader not to trust that any control will still be
 * there, which is the opposite of what a persistent shell is FOR.
 *
 * ── Why a component rather than two more lines in each branch ───────────────
 * Two copies is two places to remember, and the thing being remembered is
 * "these are always on screen" — a claim that a second copy can silently stop
 * making. One mount point, mounted by both shells.
 */
const PUBLIC_STORY_PAGES = /^\/(welcome|pricing|login|signup|legal)(\/|$)/;

export function ShellCompanions(): React.ReactElement {
  const pathname = usePathname() ?? "";

  return (
    <>
      <MusicPlayer />
      {/* The assistant sits differently on the chart, where the bottom-right
          corner belongs to the price scale. The room asks for the offset; the
          button does not know which room it is in. */}
      <div
        // Public story pages (/welcome, /pricing, /login, /legal): on a phone the
        // launcher sat over the sample chart and the section headings
        // (serving /welcome at 390, 2026-10-07). There it steps aside on phones;
        // every room keeps it, and tablets/desktop keep it everywhere.
        className={pathname === INSTRUMENT_VIEW_ROUTE ? "wm-spaidbot-chart-context" : PUBLIC_STORY_PAGES.test(pathname) ? "wm-spaidbot-public-page" : undefined}
        data-testid="shell-companions-assistant"
      >
        <SpadeBotButton />
      </div>
    </>
  );
}

export default ShellCompanions;
