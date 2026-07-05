"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import {
  INDICATOR_CONFIG, resolveParams, TF_GROUPS,
  type IndicatorParams, type IndicatorSettings, type TfGroup,
} from "./indicatorConfig";
import { SchemePresets } from "./SchemePresets";

type Tab = "inputs" | "style" | "visibility";

const LINE_STYLES = [
  { v: 0, label: "Solid" },
  { v: 1, label: "Dotted" },
  { v: 2, label: "Dashed" },
];

/**
 * Per-indicator settings modal — TradingView-style Inputs / Style / Visibility
 * tabs. Changes are applied live via onChange and bind to the real rendering
 * pipeline (length/mult → math, color/lineWidth/lineStyle → series options,
 * visibility → per-timeframe show/hide in MainChart).
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
  const [tab, setTab] = useState<Tab>("inputs");

  if (!cfg) return null;

  const commit = (next: IndicatorParams) => { setLocal(next); onChange(name, next); };
  const update = (key: keyof IndicatorParams, value: number | string) =>
    commit({ ...local, [key]: value });

  const reset = () => commit({ ...cfg.defaults });

  const colorFields = cfg.fields.filter(f => f.type === "color");
  const numberFields = cfg.fields.filter(f => f.type === "number");
  const applyScheme = (up: string, dn: string) => {
    const next = { ...local };
    if (colorFields[0]) next[colorFields[0].key] = up;
    if (colorFields[1]) next[colorFields[1].key] = dn;
    commit(next);
  };

  const lineWidth = local.lineWidth ?? 1;
  const lineStyle = local.lineStyle ?? 0;
  const visOf = (g: TfGroup) => local.visibility?.[g] !== false;
  const toggleVis = (g: TfGroup) =>
    commit({ ...local, visibility: { ...local.visibility, [g]: !visOf(g) } });

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
        tab === id
          ? "bg-wm-green/20 text-wm-green border border-wm-green/40"
          : "text-wm-text-dim hover:text-wm-text border border-transparent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-wm-border overflow-hidden"
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

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-wm-border/40">
          <TabBtn id="inputs" label="Inputs" />
          <TabBtn id="style" label="Style" />
          <TabBtn id="visibility" label="Visibility" />
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* ── INPUTS — lengths & multipliers ── */}
          {tab === "inputs" && (
            numberFields.length === 0 ? (
              <div className="text-[12px] text-wm-text-dim py-2">This indicator has no numeric inputs.</div>
            ) : numberFields.map(field => (
              <div key={field.key} className="flex items-center justify-between gap-3">
                <label className="text-[12px] font-semibold text-wm-text-muted">{field.label}</label>
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
              </div>
            ))
          )}

          {/* ── STYLE — colors, line width, line style ── */}
          {tab === "style" && (
            <>
              {colorFields.length > 0 && (
                <div className="pb-1">
                  <SchemePresets onApply={applyScheme} />
                  <div className="h-px bg-wm-border/40 mt-3" />
                </div>
              )}
              {colorFields.map(field => (
                <div key={field.key} className="flex items-center justify-between gap-3">
                  <label className="text-[12px] font-semibold text-wm-text-muted">{field.label}</label>
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
                </div>
              ))}

              {/* Line width */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="text-[12px] font-semibold text-wm-text-muted">Line Width</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(w => (
                    <button key={w} onClick={() => update("lineWidth", w)}
                      className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-colors ${
                        lineWidth === w
                          ? "bg-wm-green/20 text-wm-green border border-wm-green/40"
                          : "text-wm-text-dim border border-wm-border hover:text-wm-text"
                      }`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line style */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-[12px] font-semibold text-wm-text-muted">Line Style</label>
                <div className="flex items-center gap-1.5">
                  {LINE_STYLES.map(s => (
                    <button key={s.v} onClick={() => update("lineStyle", s.v)}
                      className={`px-2.5 h-8 rounded-lg text-[11px] font-bold transition-colors ${
                        lineStyle === s.v
                          ? "bg-wm-green/20 text-wm-green border border-wm-green/40"
                          : "text-wm-text-dim border border-wm-border hover:text-wm-text"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── VISIBILITY — per-timeframe show/hide ── */}
          {tab === "visibility" && (
            <>
              <div className="text-[11px] text-wm-text-dim pb-1">
                Show this indicator only on the chosen timeframe groups.
              </div>
              {TF_GROUPS.map(g => (
                <div key={g} className="flex items-center justify-between gap-3">
                  <label className="text-[12px] font-semibold text-wm-text-muted">{g}</label>
                  <button onClick={() => toggleVis(g)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      visOf(g) ? "bg-wm-green/70" : "bg-wm-border"
                    }`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      visOf(g) ? "translate-x-5" : ""
                    }`} />
                  </button>
                </div>
              ))}
            </>
          )}
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
