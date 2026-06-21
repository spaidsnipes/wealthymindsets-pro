"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import {
  INDICATOR_CONFIG, resolveParams, type IndicatorParams, type IndicatorSettings,
} from "./indicatorConfig";

/**
 * Per-indicator settings modal — edit length / multiplier / colors for a
 * single indicator. Changes are applied live via onChange.
 */
export function IndicatorSettingsModal({
  name, settings, onChange, onClose,
}: {
  name: string;
  settings: IndicatorSettings;
  onChange: (name: string, params: IndicatorParams) => void;
  onClose: () => void;
}) {
  const cfg = INDICATOR_CONFIG[name];
  const [local, setLocal] = useState<IndicatorParams>(() => resolveParams(name, settings));

  if (!cfg) return null;

  const update = (key: keyof IndicatorParams, value: number | string) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(name, next);   // live apply
  };

  const reset = () => {
    const def = { ...cfg.defaults };
    setLocal(def);
    onChange(name, def);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl border border-wm-border overflow-hidden"
        style={{ background: "#0D1017" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wm-border/60">
          <div>
            <div className="text-sm font-black text-wm-text">{name}</div>
            <div className="text-[10px] text-wm-text-dim">Indicator settings</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reset} title="Reset to defaults"
              className="p-1.5 rounded text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-colors">
              <RotateCcw size={13} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-wm-text-dim hover:text-wm-text hover:bg-wm-surface transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-4 space-y-3">
          {cfg.fields.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-3">
              <label className="text-[12px] font-semibold text-wm-text-muted">{field.label}</label>
              {field.type === "number" ? (
                <input
                  type="number"
                  min={field.min} max={field.max} step={field.step}
                  value={(local[field.key] as number) ?? ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) update(field.key, v);
                  }}
                  className="w-24 px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-wm-text outline-none text-right"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-wm-text-dim uppercase">
                    {((local[field.key] as string) ?? "#888888")}
                  </span>
                  <input
                    type="color"
                    value={(local[field.key] as string) ?? "#888888"}
                    onChange={e => update(field.key, e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-wm-border p-0.5"
                    style={{ appearance: "none" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-wm-border/60 flex items-center justify-between">
          <span className="text-[10px] text-wm-text-dim">Changes apply instantly</span>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-wm-green/20 text-wm-green border border-wm-green/40 hover:bg-wm-green/30 transition-all">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
