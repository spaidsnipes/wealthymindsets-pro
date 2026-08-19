"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * RealmGateway — 5-tile bottom band from the Founder mockup grid.
 *
 * WM Pro / Dreamboard / PowerTribes / Marketplace / Games.
 *
 * Mockup pattern: 'ONE IDENTITY · ONE KINGDOM · UNLIMITED REALMS'
 * subtitle underneath, thin gold hairlines separating tiles, hover =
 * gold border intensification.
 *
 * Only WM PRO is currently in-app (routes to /charts). Other tiles
 * open external URLs when defined, otherwise render as 'coming soon'
 * placeholders. Never fabricates — a tile that isn't real says so.
 */

interface Realm {
  key: string;
  label: string;
  tagline: string;
  href?: string;
  external?: boolean;
  glyph: string;
  active?: boolean;
}

const REALMS: readonly Realm[] = [
  { key: "wm-pro",       label: "WM PRO",      tagline: "Trade · Track · Transform", href: "/command-deck", glyph: "◇", active: true },
  { key: "dreamboard",   label: "DREAMBOARD",  tagline: "Plan · Create · Manifest",   href: "https://above-the-hill-developments-built-a.vercel.app/", external: true, glyph: "★" },
  { key: "powertribes",  label: "POWERTRIBES", tagline: "Lead · Build · Scale",        glyph: "✦" },
  { key: "marketplace",  label: "MARKETPLACE", tagline: "Shop · Invest · Prosper",     glyph: "◈" },
  { key: "games",        label: "GAMES",       tagline: "Play · Compete · Conquer",    glyph: "⬢" },
];

export interface RealmGatewayProps {
  currentKey?: string;
  className?: string;
}

export function RealmGateway({ currentKey = "wm-pro", className }: RealmGatewayProps) {
  const router = useRouter();
  const openRealm = (r: Realm) => {
    if (!r.href) return;
    if (r.external) {
      if (typeof window !== "undefined") window.open(r.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(r.href);
  };

  return (
    <div
      role="navigation"
      aria-label="Realm Gateway"
      className={["wm-realm-gateway", className ?? ""].join(" ")}
      style={{
        borderTop: "1px solid rgba(139,106,41,0.35)",
        paddingTop: 20,
        marginTop: 32,
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 11,
          letterSpacing: 0.4,
          color: "#c9a55c",
          marginBottom: 16,
        }}
      >
        ONE IDENTITY · ONE KINGDOM · UNLIMITED REALMS
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
          gap: 8,
        }}
      >
        {REALMS.map((r) => {
          const isCurrent = r.key === currentKey;
          const clickable = !!r.href;
          const disabled = !r.href;
          const label = clickable
            ? `Open ${r.label}${isCurrent ? " (current realm)" : ""}${r.external ? " (opens in new tab)" : ""}`
            : `${r.label} — coming soon`;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => openRealm(r)}
              disabled={disabled}
              aria-label={label}
              aria-current={isCurrent ? "page" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "14px 8px",
                minHeight: 88,
                borderRadius: 10,
                border: isCurrent
                  ? "1px solid #d4af37"
                  : "1px solid rgba(139,106,41,0.35)",
                background: isCurrent
                  ? "rgba(212,175,55,0.08)"
                  : "rgba(19,19,23,0.5)",
                cursor: clickable ? "pointer" : "default",
                opacity: disabled ? 0.55 : 1,
                color: "#ede6d3",
                transition: "border-color 120ms ease, background 120ms ease",
                minWidth: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 22,
                  color: isCurrent ? "#d4af37" : "#c9a55c",
                  lineHeight: 1,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                {r.glyph}
              </span>
              <span
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 11,
                  letterSpacing: 0.36,
                  color: isCurrent ? "#d4af37" : "#c9a55c",
                  textAlign: "center",
                }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 0.3,
                  color: "#8a8271",
                  textAlign: "center",
                }}
              >
                {r.tagline}
              </span>
              {disabled && (
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: "#55503f",
                    marginTop: 2,
                  }}
                >
                  soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RealmGateway;
