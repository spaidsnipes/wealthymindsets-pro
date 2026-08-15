"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { PersonalEdgeVM } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import WmWordmark from "@/components/brand/WmWordmark";
import DoctrineTagline from "@/components/brand/DoctrineTagline";
import RingScore from "@/components/brand/RingScore";

/**
 * GrowthHero — the /profile Growth-tab dominant surface.
 *
 * Founder Aug-14 §"CREATE VISIBLE BEFORE/AFTER IMPROVEMENT":
 *   "at least these surfaces should be transformed: /command-deck,
 *    main chart surface, one supporting workflow such as /profile,
 *    /morning-prep, or /journal."
 *
 * Mirrors the Command Deck HeroTruth visual language so /profile and
 * /command-deck read as the same product — one visual DNA (obsidian +
 * restrained gold + tabular numerals + honest UNKNOWN).
 */

export interface GrowthHeroProps {
  displayName: string | null;
  handle: string | null;
  passportIdentityBadge?: string;
  personalEdge: PersonalEdgeVM;
  ownerSeed?: string;
  className?: string;
}

export function GrowthHero({
  displayName,
  handle,
  passportIdentityBadge,
  personalEdge,
  ownerSeed,
  className,
}: GrowthHeroProps) {
  const resolutionColor =
    personalEdge.resolution === "RESOLVED" ? WM.state.ok :
    personalEdge.resolution === "PARTIAL"  ? WM.state.watch :
                                              WM.state.unknown;
  const heroValue: string =
    typeof personalEdge.overallAvgR === "number"
      ? personalEdge.overallAvgR.toFixed(2)
      : "?";
  const heroLabel = typeof personalEdge.overallAvgR === "number" ? "R" : "";

  return (
    <section
      role="banner"
      aria-label={`${displayName ?? "Trader"} — Personal Edge ${personalEdge.resolution.toLowerCase()}`}
      className={["wm-growth-hero", className ?? ""].join(" ")}
      style={{
        border: `1px solid ${resolutionColor}55`,
        borderRadius: WM.radius.hero,
        padding: `${WM.space.xxl}px ${WM.space.xxl + 2}px`,
        background: `linear-gradient(180deg, ${resolutionColor === WM.state.ok ? WM.halo.ok : resolutionColor === WM.state.watch ? WM.halo.watch : WM.halo.none}, ${WM.surface.deep})`,
        boxShadow: `0 0 60px -30px ${resolutionColor}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: WM.space.md, marginBottom: WM.space.sm, flexWrap: "wrap" }}>
        <WmWordmark size="compact" subtitle="LEGACY JOURNAL" />
        <span style={{ ...WM.type.label, color: WM.gold.mark, marginLeft: WM.space.sm }}>Growth</span>
        <span style={{ fontSize: 10, color: WM.text.dim }}>·</span>
        <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>
          personal edge · {personalEdge.resolution.toLowerCase()}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: WM.space.lg, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 0.4,
            color: WM.text.hero,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {displayName || <span style={{ color: WM.text.muted }}>—</span>}
        </span>
        {handle && (
          <span style={{ fontSize: 12, color: WM.text.muted }}>@{handle}</span>
        )}
        {passportIdentityBadge && (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              ...WM.type.labelSmall,
              color: WM.text.muted,
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 6, height: 6, borderRadius: "50%", background: WM.state.ok }}
            />
            {passportIdentityBadge}
          </span>
        )}
      </div>

      <div style={{ marginTop: WM.space.lg, display: "flex", alignItems: "center", gap: WM.space.xxl, flexWrap: "wrap" }}>
        {/* Ring-scored hero — matches the '92 EXCELLENT' mockup pattern. */}
        <RingScore
          value={typeof personalEdge.overallAvgR === "number" ? Math.min(5, Math.max(0, personalEdge.overallAvgR + 1)) : null}
          max={5}
          resolution={personalEdge.resolution === "RESOLVED" ? "RESOLVED" : personalEdge.resolution === "PARTIAL" ? "PARTIAL" : "UNKNOWN"}
          size={168}
          label={
            personalEdge.resolution === "RESOLVED"
              ? typeof personalEdge.overallAvgR === "number" && personalEdge.overallAvgR > 0
                ? "COMPOUNDING"
                : "REBUILD"
              : personalEdge.resolution === "PARTIAL"
                ? "EMERGING"
                : "NOT YET OBSERVED"
          }
          unit={typeof personalEdge.overallAvgR === "number" ? "R" : undefined}
          ariaLabel={typeof personalEdge.overallAvgR === "number" ? `Avg R ${heroValue}` : "Avg R not yet observed"}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>Personal Edge</span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: 0.2,
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: WM.text.hero,
            }}
          >
            {typeof personalEdge.overallAvgR === "number"
              ? personalEdge.overallAvgR >= 0
                ? "You are compounding."
                : "You are rebuilding."
              : "Building history."}
          </span>
          <span style={{ fontSize: 11, color: WM.text.muted, letterSpacing: 0.24 }}>
            {personalEdge.closedCount} closed · {personalEdge.reviewedCount} reviewed · min sample {personalEdge.sampleThreshold}
          </span>
        </div>
      </div>

      {/* Truth strip */}
      <div
        style={{
          marginTop: WM.space.lg,
          paddingTop: WM.space.md,
          borderTop: `1px solid ${WM.border.hair}`,
          display: "flex",
          gap: WM.space.xl,
          flexWrap: "wrap",
          fontSize: 10,
          color: WM.text.muted,
          letterSpacing: 0.24,
        }}
      >
        <span>
          <span style={{ color: WM.text.dim }}>decisions</span>{" "}
          <span style={{ color: WM.text.hero }}>{personalEdge.totalDecisions}</span>
        </span>
        <span>
          <span style={{ color: WM.text.dim }}>reviewed</span>{" "}
          <span style={{ color: WM.text.hero }}>{personalEdge.reviewedCount}</span>
        </span>
        <span>
          <span style={{ color: WM.text.dim }}>strengths</span>{" "}
          <span style={{ color: WM.state.ok }}>{personalEdge.topStrengths.length}</span>
        </span>
        <span>
          <span style={{ color: WM.text.dim }}>watch</span>{" "}
          <span style={{ color: WM.state.warn }}>{personalEdge.topWatch.length}</span>
        </span>
        <span style={{ marginLeft: "auto", color: WM.gold.mark, fontStyle: "italic" }}>
          {personalEdge.headline}
        </span>
      </div>

      {ownerSeed && (
        <div style={{ marginTop: WM.space.md, paddingTop: WM.space.sm, borderTop: `1px solid ${WM.border.hair}` }}>
          <DoctrineTagline seed={ownerSeed} />
        </div>
      )}
    </section>
  );
}

export default GrowthHero;
