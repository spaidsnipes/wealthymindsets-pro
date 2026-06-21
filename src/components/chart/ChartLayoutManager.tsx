"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

export type ChartLayout = "1" | "2h" | "2v" | "4";

interface LayoutOption {
  id: ChartLayout;
  label: string;
  icon: React.ReactNode;
}

function LayoutIcon1() {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20">
      <rect x={1} y={1} width={26} height={18} rx={2} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
    </svg>
  );
}
function LayoutIcon2H() {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20">
      <rect x={1} y={1} width={12} height={18} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      <rect x={15} y={1} width={12} height={18} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
    </svg>
  );
}
function LayoutIcon2V() {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20">
      <rect x={1} y={1} width={26} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      <rect x={1} y={11} width={26} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
    </svg>
  );
}
function LayoutIcon4() {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20">
      <rect x={1} y={1} width={12} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      <rect x={15} y={1} width={12} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      <rect x={1} y={11} width={12} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      <rect x={15} y={11} width={12} height={8} rx={1.5} fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
    </svg>
  );
}

const LAYOUTS: LayoutOption[] = [
  { id: "1",  label: "Single",       icon: <LayoutIcon1 /> },
  { id: "2h", label: "Side by side", icon: <LayoutIcon2H /> },
  { id: "2v", label: "Stacked",      icon: <LayoutIcon2V /> },
  { id: "4",  label: "2×2 Grid",     icon: <LayoutIcon4 /> },
];

interface Props {
  layout: ChartLayout;
  onLayoutChange: (l: ChartLayout) => void;
}

export function ChartLayoutManager({ layout, onLayoutChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = LAYOUTS.find(l => l.id === layout) ?? LAYOUTS[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Chart Layout"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", height: 26, borderRadius: 5, cursor: "pointer",
          background: open ? "rgba(47,128,237,0.15)" : "#141824",
          border: `1px solid ${open ? "rgba(47,128,237,0.4)" : "#263050"}`,
          color: open ? "#2F80ED" : "#8896BE",
          transition: "all 0.15s",
        }}
      >
        <LayoutGrid size={12} />
        <span style={{ fontSize: 10, fontWeight: 600 }}>{current.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "#141824",
              border: "1px solid #263050",
              borderRadius: 8, padding: 8,
              zIndex: 300,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              display: "flex", gap: 6,
            }}
          >
            {LAYOUTS.map(lo => (
              <button
                key={lo.id}
                onClick={() => { onLayoutChange(lo.id); setOpen(false); }}
                title={lo.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                  background: layout === lo.id ? "rgba(47,128,237,0.15)" : "transparent",
                  border: `1px solid ${layout === lo.id ? "rgba(47,128,237,0.4)" : "transparent"}`,
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (layout !== lo.id) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (layout !== lo.id) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {lo.icon}
                <span style={{ fontSize: 9, color: layout === lo.id ? "#2F80ED" : "#8896BE", whiteSpace: "nowrap" }}>
                  {lo.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
