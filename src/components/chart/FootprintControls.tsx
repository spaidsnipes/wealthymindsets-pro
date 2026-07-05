"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Volume2, VolumeX, Settings, RefreshCw, Pause, Play, RotateCcw, HelpCircle, X } from "lucide-react";
import type { FootprintType } from "./ChartsDashboard";
import { getIndicatorInfo } from "./indicatorDescriptions";
import { SchemePresets } from "./SchemePresets";

function emitBigTradesControl(action: "pause" | "resume" | "refresh") {
  try { window.dispatchEvent(new CustomEvent("wm-bigtrades-control", { detail: { action } })); } catch {}
}

/* Portal-based popover. The order-flow toolbar lives in a low stacking context,
   while the chart's canvas overlay paints at a higher one — so an in-flow
   `position:absolute` popover (even at z-60) renders BEHIND the candles and the
   user sees "nothing opens". Rendering into document.body with position:fixed at
   a very high z-index guarantees the popover sits above the chart. Owns its own
   outside-click + Escape handling (anchor + content are in different DOM trees). */
function PortalPopover({
  anchorRef, open, onClose, width, align = "left", children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width: number;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return; }
    const compute = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      let left = align === "right" ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = Math.min(r.bottom + 4, window.innerHeight - 8);
      setPos({ top, left });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && ref.current.contains(t)) return;
      if (anchorRef.current && anchorRef.current.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} style={{ position: "fixed", top: pos.top, left: pos.left, width, zIndex: 600 }}
         onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  );
}

/* Big-Trades controls: a gear icon that opens a dropdown with Sound, Pause and
   Refresh. The MainChart bubble engine reads the localStorage flags / listens for
   the "wm-bigtrades-control" window event, so these persist + drive the engine. */
function BigTradesControls() {
  const [open, setOpen]   = useState(false);
  const [sound, setSound] = useState<boolean>(
    () => typeof window === "undefined" || localStorage.getItem("wm_bubble_sound") !== "off"
  );
  const [paused, setPaused] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("wm_bubble_paused") === "1"
  );
  const [simul, setSimul] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("wm_bigtrades_simul") === "1"
  );
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggleSimul = () => {
    const next = !simul; setSimul(next);
    try { localStorage.setItem("wm_bigtrades_simul", next ? "1" : "0"); } catch {}
    try { window.dispatchEvent(new CustomEvent("wm-bigtrades-simul", { detail: { on: next } })); } catch {}
  };

  const toggleSound = () => {
    const next = !sound; setSound(next);
    try { localStorage.setItem("wm_bubble_sound", next ? "on" : "off"); } catch {}
  };
  const togglePause = () => {
    const next = !paused; setPaused(next);
    try { localStorage.setItem("wm_bubble_paused", next ? "1" : "0"); } catch {}
    emitBigTradesControl(next ? "pause" : "resume");
  };
  const refresh = () => emitBigTradesControl("refresh");
  const reset = () => {
    // Restore defaults: sound ON, resumed, exclusive mode, and clear current bubbles.
    setSound(true);   try { localStorage.setItem("wm_bubble_sound", "on"); } catch {}
    setPaused(false); try { localStorage.setItem("wm_bubble_paused", "0"); } catch {}
    setSimul(false);  try { localStorage.setItem("wm_bigtrades_simul", "0"); } catch {}
    try { window.dispatchEvent(new CustomEvent("wm-bigtrades-simul", { detail: { on: false } })); } catch {}
    emitBigTradesControl("resume");
    emitBigTradesControl("refresh");
  };

  return (
    <div className="relative inline-flex items-center ml-1 shrink-0">
      {/* Gear → dropdown with all options (Sound / Pause / Refresh / Reset).
          The inline Pause + Refresh buttons were removed so the toolbar stays
          clean — everything lives in this single gear dropdown now. */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Big Trades settings"
        className={clsx(
          "flex items-center justify-center w-5 h-5 ml-1 rounded transition-all border",
          open ? "bg-wm-green/15 text-wm-green border-wm-green/40"
               : "text-wm-text-dim hover:text-wm-text border-wm-border"
        )}
      >
        <Settings size={12} />
      </button>

      <PortalPopover anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={176} align="right">
        <div className="w-full rounded-md border border-wm-border bg-wm-surface shadow-xl p-1">
          <button
            onClick={toggleSound}
            className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[12px] text-wm-text hover:bg-wm-bg/60"
          >
            <span className="flex items-center gap-2">
              {sound ? <Volume2 size={13} /> : <VolumeX size={13} />} Sound
            </span>
            <span className={clsx("text-[10px] font-bold", sound ? "text-wm-green" : "text-wm-text-dim")}>
              {sound ? "ON" : "OFF"}
            </span>
          </button>
          <button
            onClick={togglePause}
            className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[12px] text-wm-text hover:bg-wm-bg/60"
          >
            <span className="flex items-center gap-2">
              {paused ? <Play size={13} /> : <Pause size={13} />} Pause
            </span>
            <span className={clsx("text-[10px] font-bold", paused ? "text-amber-300" : "text-wm-text-dim")}>
              {paused ? "PAUSED" : "LIVE"}
            </span>
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[12px] text-wm-text hover:bg-wm-bg/60"
          >
            <RefreshCw size={13} /> Refresh bubbles
          </button>
          {/* Simultaneous Mode — when ON, Big Trades bubbles overlay ON TOP of
              whatever other order-flow tool is active (Delta, Bid×Ask, Imbalance,
              Agg/Passive, Vol Profile). When OFF, selecting Big Trades runs it
              alone (exclusive) and turns the other order-flow tools off. */}
          <button
            onClick={toggleSimul}
            className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[12px] text-wm-text hover:bg-wm-bg/60 border-t border-wm-border/40 mt-1 pt-2"
          >
            <span className="flex flex-col items-start text-left">
              <span className="font-semibold">Simultaneous Mode</span>
              <span className="text-[9.5px] text-wm-text-dim leading-tight mt-0.5">
                {simul ? "Overlays on top of other tools" : "Runs alone (exclusive)"}
              </span>
            </span>
            <span className={clsx(
              "shrink-0 w-8 h-4 rounded-full relative transition-colors",
              simul ? "bg-wm-green/60" : "bg-wm-border"
            )}>
              <span className={clsx(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                simul ? "left-[18px]" : "left-0.5"
              )} />
            </span>
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[12px] text-wm-text hover:bg-wm-bg/60 border-t border-wm-border/40 mt-1 pt-2"
          >
            <RotateCcw size={13} /> Reset to defaults
          </button>
        </div>
      </PortalPopover>
    </div>
  );
}

/* Rich "?" help popover for an order-flow type — TradingView-style sections
   (Definition / Calculation / How to Use / What to Look For / Summary), pulled
   from the shared indicatorDescriptions authoring. */
function OrderFlowHelp({ label, desc }: { label: string; desc: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const info = getIndicatorInfo(label, "Order Flow", desc);
  const sections: [string, string][] = [
    ["Definition", info.definition],
    ["Calculation", info.calculation],
    ["How to Use", info.howToUse],
    ["What to Look For", info.whatToLookFor],
    ["Summary", info.summary],
  ];

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title={`${label} — info`}
        className={clsx(
          "flex items-center justify-center w-5 h-5 ml-1 rounded border transition-all",
          open ? "bg-wm-green/20 text-wm-green border-wm-green/60"
               : "bg-wm-surface text-wm-text border-wm-border hover:text-wm-green hover:border-wm-green/50"
        )}
      >
        <HelpCircle size={13} />
      </button>
      <PortalPopover anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={320}>
        <div className="w-full rounded-lg border border-wm-border bg-wm-surface shadow-2xl p-3 text-left cursor-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-wm-green">{label}</span>
            <button onClick={() => setOpen(false)} className="text-wm-text-dim hover:text-wm-text"><X size={13} /></button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            {sections.map(([h, body]) => (
              <div key={h}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-wm-text-dim mb-0.5">{h}</div>
                <p className="text-[11.5px] leading-snug text-wm-text">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </PortalPopover>
    </div>
  );
}

/* Order-flow color gear: lets the user recolor the aggressive-buy and
   aggressive-sell sides used across all footprint modes (Bid×Ask, Delta,
   Imbalance, Agg/Passive). Writes localStorage + fires "wm-of-colors" so the
   chart's draw loop repaints immediately. */
/* NEW default scheme: positive side = Royal Blue, negative side = Royal Purple
   (white text is applied in the chart draw loop). Shared across every order-flow
   tool so the colour language stays consistent, but a gear is rendered on EACH
   tool so users can recolour from wherever they are. */
const OF_BUY_DEFAULT  = "#2563EB"; // Royal Blue  → positive / bid / aggressive buy
const OF_SELL_DEFAULT = "#6A0DAD"; // Royal Purple → negative / ask / aggressive sell

/* Per-tool colour gear. Each tool (Bid×Ask, Delta, Imbalance, Agg/Passive, Vol
   Profile) writes its OWN `wm_of_<toolId>_buy`/`_sell` keys, so recoloring one
   tool never changes another — exactly what "the gear for the Delta only affects
   the Delta" means. Offers the shared named schemes plus custom pickers. Fires
   "wm-of-colors" so the chart draw loop repaints immediately. */
function OrderFlowColorGear({ toolId, label = "Order Flow" }: { toolId: FootprintType; label?: string }) {
  const KBUY = `wm_of_${toolId}_buy`;
  const KSELL = `wm_of_${toolId}_sell`;
  const read = (k: string, fb: string) => (typeof window === "undefined" ? fb : localStorage.getItem(k) || fb);
  const [open, setOpen] = useState(false);
  const [buy,  setBuy]  = useState<string>(() => read(KBUY,  OF_BUY_DEFAULT));
  const [sell, setSell] = useState<string>(() => read(KSELL, OF_SELL_DEFAULT));
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      try {
        setBuy(localStorage.getItem(KBUY)  || OF_BUY_DEFAULT);
        setSell(localStorage.getItem(KSELL) || OF_SELL_DEFAULT);
      } catch {}
    };
    window.addEventListener("wm-of-colors", sync);
    return () => { window.removeEventListener("wm-of-colors", sync); };
  }, [open, KBUY, KSELL]);

  const apply = (b: string, s: string) => {
    try { localStorage.setItem(KBUY, b); localStorage.setItem(KSELL, s); } catch {}
    try { window.dispatchEvent(new CustomEvent("wm-of-colors")); } catch {}
  };
  const onBuy  = (v: string) => { setBuy(v);  apply(v, sell); };
  const onSell = (v: string) => { setSell(v); apply(buy, v); };
  const applyScheme = (up: string, dn: string) => { setBuy(up); setSell(dn); apply(up, dn); };
  const reset  = () => { setBuy(OF_BUY_DEFAULT); setSell(OF_SELL_DEFAULT); apply(OF_BUY_DEFAULT, OF_SELL_DEFAULT); };

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title={`${label} — colours`}
        className={clsx("flex items-center justify-center w-5 h-5 ml-1 rounded transition-all border",
          open
            ? "bg-wm-green/20 text-wm-green border-wm-green/60 shadow-[0_0_6px_rgba(0,229,204,0.35)]"
            : "bg-wm-surface text-wm-text border-wm-border hover:text-wm-green hover:border-wm-green/50")}>
        <Settings size={13} />
      </button>
      <PortalPopover anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={224}>
        <div className="w-full rounded-lg border border-wm-border bg-wm-surface shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-wm-green">{label} — Colours</span>
            <button onClick={() => setOpen(false)} className="text-wm-text-dim hover:text-wm-text"><X size={12} /></button>
          </div>
          {/* Agg/Passive 4-way legend — moved off the chart and into the settings
              panel with beginner-friendly descriptions. `buy` = aggressive-buy /
              positive colour, `sell` = aggressive-sell / negative colour. Passive
              rows use a dimmed version of the same colour so the language stays
              consistent with what's drawn on the chart. */}
          {toolId === "aggressive-passive" && (
            <div className="mb-2 space-y-1.5">
              {([
                [buy,       "Aggressive Buyers",  "MARKET buy orders lifting the ask — active demand pushing price UP (blue)", 1],
                [sell,      "Aggressive Sellers", "MARKET sell orders hitting the bid — active supply pushing price DOWN (purple)", 1],
                ["#94A3B8", "Passive Buyers",     "Resting LIMIT bids absorbing sellers — support waiting below (gray)", 1],
                ["#FF9500", "Passive Sellers",    "Resting LIMIT offers absorbing buyers — resistance waiting above (orange)", 1],
              ] as [string, string, string, number][]).map(([c, label, desc, op]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="mt-0.5 w-3 h-3 rounded-sm shrink-0" style={{ background: c, opacity: op }} />
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold text-wm-text">{label}</div>
                    <div className="text-[9.5px] text-wm-text-dim">{desc}</div>
                  </div>
                </div>
              ))}
              <div className="h-px bg-wm-border/40 my-1" />
            </div>
          )}
          <div className="mb-2"><SchemePresets onApply={applyScheme} /></div>
          <div className="h-px bg-wm-border/40 mb-2" />
          <label className="flex items-center justify-between mb-2 text-[12px] text-wm-text">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: buy }} /> Positive (bid / buy)</span>
            <input type="color" value={buy} onChange={e => onBuy(e.target.value)} className="w-7 h-6 rounded cursor-pointer bg-transparent border border-wm-border" />
          </label>
          <label className="flex items-center justify-between mb-2 text-[12px] text-wm-text">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: sell }} /> Negative (ask / sell)</span>
            <input type="color" value={sell} onChange={e => onSell(e.target.value)} className="w-7 h-6 rounded cursor-pointer bg-transparent border border-wm-border" />
          </label>
          <button onClick={reset} className="flex items-center gap-2 w-full px-2 py-1.5 mt-1 rounded text-[12px] text-wm-text hover:bg-wm-bg/60 border-t border-wm-border/40 pt-2">
            <RotateCcw size={13} /> Reset (Royal Blue / Purple)
          </button>
        </div>
      </PortalPopover>
    </div>
  );
}

const FOOTPRINT_TYPES: { id: FootprintType; label: string; desc: string }[] = [
  { id: "bid-ask",            label: "Bid × Ask",    desc: "Bid/ask split cells per price level — order flow footprint" },
  { id: "delta",              label: "Delta",         desc: "Net ask−bid per row. Teal = buying pressure, purple = selling" },
  { id: "volume-profile",     label: "Vol Profile",   desc: "Volume-at-price horizontal bars per candle" },
  { id: "imbalance",          label: "Imbalance",     desc: "Highlight cells with >2.5× bid/ask ratio — spot trapped traders" },
  { id: "aggressive-passive", label: "Agg/Passive",   desc: "Teal = aggressive buyers lifting ask. Purple = aggressive sellers hitting bid" },
  { id: "big-trades",         label: "Big Trades",    desc: "Large trade circles on candles — spot institutional order flow" },
];

export function FootprintControls({
  active, enabled, onChange, onDisable, bigTradesOverlay = false,
}: {
  active: FootprintType;
  enabled: boolean;
  onChange: (t: FootprintType) => void;
  onDisable: () => void;
  bigTradesOverlay?: boolean;
}) {
  return (
    <>
      <span className="text-[11px] text-wm-text-dim uppercase tracking-widest ml-2 mr-1 shrink-0">ORDER FLOW:</span>

      {/* OFF button — always visible, prominent when active */}
      <button
        onClick={onDisable}
        title="Turn off all footprint overlays"
        className={clsx(
          "px-2 h-5 rounded text-[11px] font-bold tracking-wide transition-all shrink-0 mr-1",
          !enabled
            ? "bg-red-500/20 text-red-400 border border-red-500/50"
            : "text-wm-text-dim hover:text-red-400 hover:bg-red-500/10 border border-transparent"
        )}
      >
        OFF
      </button>

      {FOOTPRINT_TYPES.map(({ id, label, desc }) => (
        <div key={id} className="inline-flex items-center shrink-0">
          <button
            onClick={() => onChange(id)}
            title={desc}
            className={clsx(
              "px-2.5 h-5 rounded text-[11px] font-semibold tracking-wide transition-all",
              ((active === id && enabled) || (id === "big-trades" && bigTradesOverlay))
                ? "bg-wm-green/20 text-wm-green border border-wm-green/50 shadow-[0_0_6px_rgba(0,229,204,0.25)]"
                : "text-wm-text-dim hover:text-wm-text hover:bg-wm-surface border border-transparent"
            )}
          >
            {label}
          </button>
          {/* Each tool gets its own settings gear — always visible so colours
              can be configured even when Order Flow is OFF. Big Trades uses its
              dedicated controls (sound/pause/refresh); all others get the colour gear. */}
          {id === "big-trades"
            ? <BigTradesControls />
            : <OrderFlowColorGear toolId={id} label={label} />}
          <OrderFlowHelp label={label} desc={desc} />
        </div>
      ))}
    </>
  );
}
