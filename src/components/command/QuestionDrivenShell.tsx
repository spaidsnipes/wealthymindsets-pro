"use client";

/**
 * QuestionDrivenShell — an ADAPTER, no longer a shell.
 *
 *   "make sure we dont have seperate shells its one os"
 *
 * This file used to be one of THREE frames (with MainLayout and
 * WMExperienceShell), each drawing its own rail, its own standing conditions,
 * its own footer. Three frames is three answers to "where does the machine end
 * and the work begin", which is why crossing between rooms felt like crossing
 * between PRODUCTS.
 *
 * The silhouette now lives in exactly one place — `WMOperatingSystem` — and
 * this module's only remaining job is to keep `/command-deck`'s existing call
 * site working while naming the surface it is. It holds no layout, no tokens,
 * and no readings of its own: anything it re-typed would immediately become a
 * second owner of a fact the OS frame already owns.
 *
 * Kept rather than deleted because the deck imports it by name and a rename is
 * a separate, noisier change than the one this commit is making.
 */

import * as React from "react";
import { WMOperatingSystem, OS_ROOMS, type ShellRoom } from "@/components/os/WMOperatingSystem";
import type { FeedObservation } from "@/lib/os/osChrome";

export type { ShellRoom };

/** The rooms are the OS's, not this adapter's. Re-exported for old imports. */
export const SHELL_ROOMS: readonly ShellRoom[] = OS_ROOMS;

export interface QuestionDrivenShellProps {
  readonly activeHref: string;
  /**
   * Open evidence items. `null` when no ledger compiled — rendered as UNKNOWN,
   * never as zero, because "0 open" is a clean bill of health for a ledger
   * that was never opened.
   */
  readonly openEvidenceItems: number | null;
  readonly rightOfWay: string;
  readonly rightOfWayResolved: boolean;
  readonly feed?: FeedObservation | null;
  readonly asOfLabel?: string | null;
  readonly children: React.ReactNode;
}

export function QuestionDrivenShell({
  activeHref,
  openEvidenceItems,
  rightOfWay,
  rightOfWayResolved,
  feed = null,
  asOfLabel = null,
  children,
}: QuestionDrivenShellProps): React.ReactElement {
  return (
    <WMOperatingSystem
      activeHref={activeHref}
      surface="Question-Driven Mode"
      openEvidenceItems={openEvidenceItems}
      rightOfWay={rightOfWay}
      rightOfWayResolved={rightOfWayResolved}
      feed={feed}
      asOfLabel={asOfLabel}
    >
      {children}
    </WMOperatingSystem>
  );
}

export default QuestionDrivenShell;
