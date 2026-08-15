"use client";
import * as React from "react";

/**
 * CinematicAtmosphere — subtle top-down gold rays that give hero surfaces
 * the cinematic depth from Founder mockups (rays of gold light descending
 * over the Command Deck / Opening Bell mockups).
 *
 * Fixed-position pseudo-overlay pinned to the top of its container.
 * Zero interaction (pointer-events none) and reduced-motion friendly
 * (static gradient, no animation). Turn off via `intensity="none"` for
 * calm surfaces (in-position screens, review, journal).
 */

export type AtmosphereIntensity = "none" | "subtle" | "cinematic";

export interface CinematicAtmosphereProps {
  intensity?: AtmosphereIntensity;
  className?: string;
}

export function CinematicAtmosphere({ intensity = "subtle", className }: CinematicAtmosphereProps) {
  if (intensity === "none") return null;
  const opacity = intensity === "cinematic" ? 0.28 : 0.14;
  return (
    <div
      aria-hidden="true"
      className={["wm-cinematic-atmosphere", className ?? ""].join(" ")}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 320,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Central ray */}
      <div
        style={{
          position: "absolute",
          top: -20,
          left: "50%",
          transform: "translateX(-50%) rotate(0deg)",
          width: 380,
          height: 320,
          background: `conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(212,175,55,${opacity}) 8deg, transparent 22deg)`,
          filter: "blur(30px)",
        }}
      />
      {/* Left ray */}
      <div
        style={{
          position: "absolute",
          top: -20,
          left: "22%",
          transform: "translateX(-50%) rotate(-8deg)",
          width: 260,
          height: 260,
          background: `conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(212,175,55,${opacity * 0.6}) 8deg, transparent 18deg)`,
          filter: "blur(28px)",
        }}
      />
      {/* Right ray */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: "22%",
          transform: "translateX(50%) rotate(8deg)",
          width: 260,
          height: 260,
          background: `conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(212,175,55,${opacity * 0.6}) 8deg, transparent 18deg)`,
          filter: "blur(28px)",
        }}
      />
      {/* Soft bottom mask so rays fade cleanly into the surface below */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 80,
          background: "linear-gradient(180deg, transparent, rgba(11,11,13,0.9))",
        }}
      />
    </div>
  );
}

export default CinematicAtmosphere;
