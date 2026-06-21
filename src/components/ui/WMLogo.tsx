// WealthyMindsets "W" logo with upward arrow and integrated dollar sign
import React from "react";

interface WMLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export function WMLogo({ size = 32, className = "", showGlow = false }: WMLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={showGlow ? { filter: "drop-shadow(0 0 6px rgba(240,180,41,0.7))" } : undefined}
    >
      {/* Background circle */}
      <circle cx="20" cy="20" r="19" fill="#0D1117" stroke="#F0B429" strokeWidth="1.5" />

      {/* W shape */}
      <path
        d="M7 12 L11.5 26 L16 17 L20.5 26 L25 12"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Upward arrow integrated into right stroke of W */}
      <path
        d="M25 12 L33 12"
        stroke="#F0B429"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M29 8 L33 12 L29 16"
        stroke="#F0B429"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Dollar sign inside the W */}
      <text
        x="17"
        y="29"
        fontSize="7"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        fill="#F0B429"
        textAnchor="middle"
      >
        $
      </text>
    </svg>
  );
}

// Icon-only version for Smart Money panel trigger (exact logo)
export function WMSmartMoneyIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-md cursor-pointer transition-all duration-200"
      style={{
        width: size + 8,
        height: size + 8,
        background: active
          ? "linear-gradient(135deg, rgba(240,180,41,0.25), rgba(240,180,41,0.1))"
          : "rgba(240,180,41,0.06)",
        border: `1px solid ${active ? "rgba(240,180,41,0.6)" : "rgba(240,180,41,0.2)"}`,
        boxShadow: active ? "0 0 12px rgba(240,180,41,0.3)" : "none",
      }}
    >
      <WMLogo size={size} showGlow={active} />
    </div>
  );
}
