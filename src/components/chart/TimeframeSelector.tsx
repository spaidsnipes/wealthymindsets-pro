"use client";

import React from "react";

interface Props {
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

const PERIODS = [
  { label: "5D",      tf: "5m"  },
  { label: "1M",      tf: "1h"  },
  { label: "3M",      tf: "4h"  },
  { label: "YTD",     tf: "D"   },
  { label: "1Y",      tf: "D"   },
  { label: "5Y",      tf: "W"   },
  { label: "Max",     tf: "M"   },
  { label: "Custom",  tf: ""    },
  { label: "Daily",   tf: "D"   },
  { label: "Weekly",  tf: "W"   },
  { label: "Monthly", tf: "M"   },
  { label: "Quarterly", tf: "M" },
  { label: "Yearly",  tf: "M"   },
];

const INTERVALS = [
  { label: "1t",  tf: "1t"  },
  { label: "5t",  tf: "5t"  },
  { label: "30t", tf: "30t" },
  { label: "1m",  tf: "1m"  },
  { label: "3m",  tf: "3m"  },
  { label: "5m",  tf: "5m"  },
  { label: "10m", tf: "10m" },
  { label: "15m", tf: "15m" },
  { label: "30m", tf: "30m" },
  { label: "1h",  tf: "1h"  },
  { label: "2h",  tf: "2h"  },
  { label: "3h",  tf: "3h"  },
  { label: "4h",  tf: "4h"  },
];

function TFBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const isTick = /^\d+t$/.test(label);
  return (
    <button
      onClick={onClick}
      title={isTick ? "Tick timeframe — synthetic/approximate on the free data tier. Real per-tick history needs a paid data feed." : undefined}
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
      {isTick && <sup style={{ marginLeft: 2, color: "#E8B923", fontSize: 8, fontWeight: 900 }}>?</sup>}
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
      {/* Row 1 — Period presets */}
      <div style={{
        height: 28,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #1E2030",
        paddingLeft: 4,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {/* Chart type icon */}
        <button style={{
          display: "flex", alignItems: "center", gap: 3,
          padding: "0 10px", height: 28,
          background: "transparent", border: "none",
          color: "#8B8FA8", fontSize: 12, cursor: "pointer",
          borderRight: "1px solid #1E2030",
          flexShrink: 0,
        }}>
          📊▼
        </button>

        {PERIODS.map(({ label, tf }) => (
          <TFBtn
            key={label}
            label={label}
            active={timeframe === tf && tf !== ""}
            onClick={() => tf && onTimeframeChange(tf)}
          />
        ))}
      </div>

      {/* Row 2 — Interval buttons */}
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
