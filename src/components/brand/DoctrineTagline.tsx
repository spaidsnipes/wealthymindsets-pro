"use client";
import * as React from "react";

/**
 * DoctrineTagline — the serif aphorism cadence from Founder Aug-14
 * mockups.
 *
 * Rotates through the WM doctrine voice ("THE MIRROR REFLECTS. YOU
 * EVOLVE." / "DISCIPLINE OPENS THE DOOR. LEGACY WALKS THROUGH." /
 * "MIRROR REFLECTS. DISCIPLINE PROTECTS. WEALTH COMPOUNDS." /
 * "OBSERVE TRUTH. PROTECT PROCESS. COMPOUND WISDOM.")
 *
 * DETERMINISTIC pick — hashes the trader's ownerId + local date so the
 * same trader sees a stable line for a full day (never a distracting
 * per-render change) but a different line day-over-day (fresh cadence).
 *
 * No animation. No wall-clock reads inside render.
 */

const TAGLINES: readonly string[] = [
  "THE MIRROR REFLECTS. YOU EVOLVE.",
  "DISCIPLINE OPENS THE DOOR. LEGACY WALKS THROUGH.",
  "MIRROR REFLECTS · DISCIPLINE PROTECTS · WEALTH COMPOUNDS.",
  "OBSERVE TRUTH · PROTECT PROCESS · COMPOUND WISDOM.",
  "ONE IDENTITY · ONE KINGDOM · UNLIMITED REALMS.",
  "READ WHAT THE MARKET SHOWS. IGNORE WHAT IT WHISPERS.",
  "THE PLAN. THE PROCESS. THE PRIVILEGE.",
  "PATIENT ENTRIES · PROTECTED CAPITAL · COMPOUNDED EDGE.",
] as const;

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface DoctrineTaglineProps {
  /** For daily-stable rotation. Pass ownerId + local date, or fixed key. */
  seed: string;
  /** Override — pass a specific tagline if you want (e.g. surface-specific). */
  override?: string;
  className?: string;
}

export function DoctrineTagline({ seed, override, className }: DoctrineTaglineProps) {
  const idx = React.useMemo(() => hashKey(seed) % TAGLINES.length, [seed]);
  const text = override ?? TAGLINES[idx];
  return (
    <div
      className={["wm-doctrine-tagline", className ?? ""].join(" ")}
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 11,
        letterSpacing: 0.4,
        color: "#c9a55c",
        textAlign: "center",
        padding: "8px 12px",
        fontStyle: "normal",
      }}
      aria-label={`Doctrine: ${text}`}
    >
      {text}
    </div>
  );
}

export default DoctrineTagline;
