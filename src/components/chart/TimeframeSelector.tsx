"use client";

import React from "react";

interface Props {
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

const INTERVALS = [
  { label: "1m",  tf: "1m"  },
  { label: "2m",  tf: "2m"  },
  { label: "5m",  tf: "5m"  },
  { label: "15m", tf: "15m" },
  { label: "30m", tf: "30m" },
  { label: "1h",  tf: "1h"  },
  { label: "D",   tf: "D"   },
  { label: "W",   tf: "W"   },
  { label: "M",   tf: "M"   },
];

function TFBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0 10px",
        height: 28,
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #FF8C00" : "2px solid transparent",
        color: active ? "#E2E8F0" : "#8B8FA8",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 0.1s",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#E2E8F0"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#8B8FA8"; }}
    >
      {label}
    </button>
  );
}

export function TimeframeSelector({ timeframe, onTimeframeChange }: Props) {
  return (
    <div style={{
      background: "#0D0E14",
      borderTop: "1px solid #1E2030",
      flexShrink: 0,
    }}>
      {/* Exact native interval buttons */}
      <div style={{
        height: 28,
        display: "flex",
        alignItems: "center",
        paddingLeft: 4,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {INTERVALS.map(({ label, tf }) => (
          <TFBtn
            key={label}
            label={label}
            active={timeframe === tf}
            onClick={() => onTimeframeChange(tf)}
          />
        ))}
      </div>
    </div>
  );
}
