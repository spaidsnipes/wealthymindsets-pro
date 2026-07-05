"use client";

/* ============================================================================
   LeftSidebar — TradingView-style vertical tool strip on the LEFT edge.

   Houses the controls the user asked to relocate to the left side:
     • Collapsible watchlist toggle
     • Chart layout grid (1 / 2h / 2v / 4)
     • Publish Idea      → snapshot → shareable "idea card" (share / copy / save)
     • Record Video Idea → webcam + mic capture (MediaRecorder → .webm)
     • Speak Your Mind   → microphone capture (MediaRecorder → .webm audio)
     • Screenshot        → html2canvas capture of the chart → .png
     • Screen recording  → getDisplayMedia capture → .webm

   Every action is REAL — no placeholder buttons. Media features use the
   browser MediaRecorder / getDisplayMedia / getUserMedia APIs (secure-context
   only; production is HTTPS) and gracefully surface permission errors.
============================================================================ */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PanelLeft, LayoutGrid, Share2, Video, Mic, Camera, MonitorPlay,
  X, Download, Copy, Check, Square, Loader2, AlertTriangle,
} from "lucide-react";
import type { ChartLayout } from "./ChartLayoutManager";

/* ── layout options (mirrors ChartLayoutManager, compact) ─────────────── */
const LAYOUTS: { id: ChartLayout; label: string; cells: [number, number, number, number][] }[] = [
  { id: "1",  label: "Single",       cells: [[1, 1, 26, 18]] },
  { id: "2h", label: "Side by side", cells: [[1, 1, 12, 18], [15, 1, 12, 18]] },
  { id: "2v", label: "Stacked",      cells: [[1, 1, 26, 8], [1, 11, 26, 8]] },
  { id: "4",  label: "2×2 Grid",     cells: [[1, 1, 12, 8], [15, 1, 12, 8], [1, 11, 12, 8], [15, 11, 12, 8]] },
];
function LayoutSvg({ cells }: { cells: [number, number, number, number][] }) {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20">
      {cells.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={1.5}
          fill="rgba(47,128,237,0.15)" stroke="#2F80ED" strokeWidth={1.2} />
      ))}
    </svg>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
}
function pickMime(cands: string[]): string {
  for (const c of cands) {
    if (c === "") return "";
    try { if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c; } catch { /* noop */ }
  }
  return "";
}
const VIDEO_MIMES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", ""];
const AUDIO_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""];
function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
const ACCENT = "#2F80ED";
const REC = "#FF4757";

/* ── capture the chart node to a canvas via html2canvas ───────────────── */
async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(node, {
    backgroundColor: "#0A0B10",
    logging: false,
    useCORS: true,
    scale: Math.min(window.devicePixelRatio || 1, 2),
  });
}

/* Compose a branded "idea card": screenshot + caption footer. */
function buildIdeaCard(base: HTMLCanvasElement, opts: { symbol: string; title: string }): HTMLCanvasElement {
  const pad = 0;
  const footer = 64;
  const out = document.createElement("canvas");
  out.width = base.width;
  out.height = base.height + footer;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#0A0B10";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(base, pad, 0);
  // footer bar
  ctx.fillStyle = "#0D0E14";
  ctx.fillRect(0, base.height, out.width, footer);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, base.height, 4, footer);
  const scale = out.width / 900;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#E2E8F0";
  ctx.font = `700 ${Math.round(20 * scale)}px system-ui, -apple-system, sans-serif`;
  const titleText = opts.title.trim() || `${opts.symbol} idea`;
  ctx.fillText(titleText.slice(0, 60), 18 * scale, base.height + footer * 0.38);
  ctx.fillStyle = "#8896BE";
  ctx.font = `500 ${Math.round(13 * scale)}px system-ui, -apple-system, sans-serif`;
  const stamp = new Date().toLocaleString();
  ctx.fillText(`${opts.symbol}  •  ${stamp}`, 18 * scale, base.height + footer * 0.72);
  // brand right-aligned
  ctx.textAlign = "right";
  ctx.fillStyle = "#FF8C00";
  ctx.font = `800 ${Math.round(15 * scale)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("WealthyMindsets Pro", out.width - 18 * scale, base.height + footer * 0.5);
  ctx.textAlign = "left";
  return out;
}
function canvasToBlob(c: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), type, 0.95));
}

/* ── props ────────────────────────────────────────────────────────────── */
interface Props {
  watchlistOpen: boolean;
  onToggleWatchlist: () => void;
  chartLayout: ChartLayout;
  onLayoutChange: (l: ChartLayout) => void;
  /** node to snapshot for Screenshot / Publish (the chart column). */
  captureRef: React.RefObject<HTMLElement | null>;
  symbol: string;
}

type ModalKind = null | "publish" | "video" | "audio";

export default function LeftSidebar({
  watchlistOpen, onToggleWatchlist, chartLayout, onLayoutChange, captureRef, symbol,
}: Props) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [flash, setFlash] = useState(false);          // screenshot flash feedback
  const [shotOk, setShotOk] = useState(false);        // screenshot ✓ tick
  const [busy, setBusy] = useState(false);            // capture in progress

  /* screen recording state (lives at strip level so the button pulses) */
  const [screenRec, setScreenRec] = useState(false);
  const screenRecRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenChunks = useRef<Blob[]>([]);

  const layoutBtnRef = useRef<HTMLDivElement>(null);

  /* close layout popover on outside click */
  useEffect(() => {
    if (!layoutOpen) return;
    const h = (e: MouseEvent) => {
      if (layoutBtnRef.current && !layoutBtnRef.current.contains(e.target as Node)) setLayoutOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [layoutOpen]);

  /* ── SCREENSHOT ─────────────────────────────────────────────────────── */
  const doScreenshot = useCallback(async () => {
    if (!captureRef.current || busy) return;
    setBusy(true);
    try {
      const canvas = await captureNode(captureRef.current);
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, `wm-${symbol.replace(/[^\w]/g, "")}-${Date.now()}.png`);
      setFlash(true); setTimeout(() => setFlash(false), 260);
      setShotOk(true); setTimeout(() => setShotOk(false), 1400);
    } catch (e) {
      console.error("[LeftSidebar] screenshot failed", e);
    } finally { setBusy(false); }
  }, [captureRef, symbol, busy]);

  /* ── SCREEN RECORDING ───────────────────────────────────────────────── */
  const stopScreenRec = useCallback(() => {
    try { screenRecRef.current?.stop(); } catch { /* noop */ }
  }, []);
  const startScreenRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      screenStreamRef.current = stream;
      const mime = pickMime(VIDEO_MIMES);
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      screenChunks.current = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) screenChunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(screenChunks.current, { type: mime || "video/webm" });
        if (blob.size) downloadBlob(blob, `wm-screen-${Date.now()}.webm`);
        stream.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setScreenRec(false);
      };
      // browser "Stop sharing" ends the track
      stream.getVideoTracks()[0].onended = () => stopScreenRec();
      rec.start(1000);
      screenRecRef.current = rec;
      setScreenRec(true);
    } catch (e) {
      console.warn("[LeftSidebar] screen recording denied/failed", e);
      setScreenRec(false);
    }
  }, [stopScreenRec]);
  const toggleScreenRec = useCallback(() => {
    if (screenRec) stopScreenRec(); else startScreenRec();
  }, [screenRec, startScreenRec, stopScreenRec]);

  /* ── strip button ───────────────────────────────────────────────────── */
  const Btn = ({ icon, label, active, danger, onClick }: {
    icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        position: "relative",
        width: 38, height: 38, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        background: active ? (danger ? "rgba(255,71,87,0.16)" : "rgba(47,128,237,0.16)") : "transparent",
        border: `1px solid ${active ? (danger ? "rgba(255,71,87,0.5)" : "rgba(47,128,237,0.45)") : "transparent"}`,
        color: active ? (danger ? REC : ACCENT) : "#8896BE",
        transition: "all 0.14s",
      }}
      onMouseEnter={e => { if (!active) { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.05)"; b.style.color = "#C7D0E8"; } }}
      onMouseLeave={e => { if (!active) { const b = e.currentTarget; b.style.background = "transparent"; b.style.color = "#8896BE"; } }}
    >
      {icon}
    </button>
  );

  return (
    <>
      {/* ═══ vertical strip ═══ */}
      <div style={{
        width: 46, flexShrink: 0,
        background: "#0A0B10",
        borderRight: "1px solid #1E2030",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 0", gap: 4,
      }}>
        {/* Watchlist toggle */}
        <Btn
          icon={<PanelLeft size={19} />}
          label={watchlistOpen ? "Hide watchlist" : "Show watchlist"}
          active={watchlistOpen}
          onClick={onToggleWatchlist}
        />

        {/* Layout grid */}
        <div ref={layoutBtnRef} style={{ position: "relative" }}>
          <Btn icon={<LayoutGrid size={19} />} label="Chart layout" active={layoutOpen} onClick={() => setLayoutOpen(o => !o)} />
          <AnimatePresence>
            {layoutOpen && (
              <motion.div
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "absolute", left: "calc(100% + 8px)", top: 0,
                  background: "#141824", border: "1px solid #263050", borderRadius: 10,
                  padding: 8, zIndex: 400, display: "flex", gap: 6,
                  boxShadow: "0 10px 34px rgba(0,0,0,0.55)",
                }}
              >
                {LAYOUTS.map(lo => (
                  <button key={lo.id}
                    onClick={() => { onLayoutChange(lo.id); setLayoutOpen(false); }}
                    title={lo.label}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "7px 9px", borderRadius: 7, cursor: "pointer",
                      background: chartLayout === lo.id ? "rgba(47,128,237,0.15)" : "transparent",
                      border: `1px solid ${chartLayout === lo.id ? "rgba(47,128,237,0.4)" : "transparent"}`,
                    }}
                    onMouseEnter={e => { if (chartLayout !== lo.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { if (chartLayout !== lo.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <LayoutSvg cells={lo.cells} />
                    <span style={{ fontSize: 9, color: chartLayout === lo.id ? ACCENT : "#8896BE", whiteSpace: "nowrap" }}>{lo.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ width: 26, height: 1, background: "#1E2030", margin: "5px 0" }} />

        {/* Publish Idea */}
        <Btn icon={<Share2 size={18} />} label="Publish idea" onClick={() => setModal("publish")} />
        {/* Record Video Idea */}
        <Btn icon={<Video size={19} />} label="Record video idea" onClick={() => setModal("video")} />
        {/* Speak Your Mind */}
        <Btn icon={<Mic size={19} />} label="Speak your mind" onClick={() => setModal("audio")} />

        <div style={{ width: 26, height: 1, background: "#1E2030", margin: "5px 0" }} />

        {/* Screenshot */}
        <Btn
          icon={busy ? <Loader2 size={18} className="wm-spin" /> : shotOk ? <Check size={18} /> : <Camera size={19} />}
          label="Screenshot chart (PNG)"
          onClick={doScreenshot}
        />
        {/* Screen recording */}
        <Btn
          icon={screenRec ? <Square size={15} fill={REC} /> : <MonitorPlay size={19} />}
          label={screenRec ? "Stop screen recording" : "Record screen"}
          active={screenRec} danger
          onClick={toggleScreenRec}
        />
        {screenRec && (
          <div style={{
            marginTop: 2, fontSize: 8, fontWeight: 700, color: REC,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <span className="wm-rec-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: REC, display: "inline-block" }} />
            REC
          </div>
        )}
      </div>

      {/* ═══ screenshot flash overlay ═══ */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.26 }}
            style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 9998, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* ═══ modals ═══ */}
      <AnimatePresence>
        {modal === "publish" && (
          <PublishModal symbol={symbol} captureRef={captureRef} onClose={() => setModal(null)} />
        )}
        {modal === "video" && (
          <MediaModal kind="video" symbol={symbol} onClose={() => setModal(null)} />
        )}
        {modal === "audio" && (
          <MediaModal kind="audio" symbol={symbol} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes wm-spin { to { transform: rotate(360deg); } }
        .wm-spin { animation: wm-spin 0.8s linear infinite; }
        @keyframes wm-rec-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        .wm-rec-dot { animation: wm-rec-pulse 1s ease-in-out infinite; }
      `}</style>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Modal shell
════════════════════════════════════════════════════════════════════════ */
function ModalShell({ title, icon, onClose, children, width = 520 }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
      onMouseDown={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto",
          background: "#0D0E14", border: "1px solid #263050", borderRadius: 14,
          boxShadow: "0 24px 70px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 9, padding: "13px 16px",
          borderBottom: "1px solid #1E2030",
        }}>
          <span style={{ color: ACCENT, display: "flex" }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", flex: 1 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#8896BE", cursor: "pointer", display: "flex" }} title="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

const btnStyle = (variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
  padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
  border: `1px solid ${variant === "primary" ? "rgba(47,128,237,0.5)" : variant === "danger" ? "rgba(255,71,87,0.5)" : "#263050"}`,
  background: variant === "primary" ? "rgba(47,128,237,0.16)" : variant === "danger" ? "rgba(255,71,87,0.16)" : "#141824",
  color: variant === "primary" ? "#6FB0FF" : variant === "danger" ? REC : "#C7D0E8",
  transition: "all 0.14s",
});

/* ════════════════════════════════════════════════════════════════════════
   Publish Idea — snapshot → branded card → save / copy / share
════════════════════════════════════════════════════════════════════════ */
function PublishModal({ symbol, captureRef, onClose }: {
  symbol: string; captureRef: React.RefObject<HTMLElement | null>; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const cardRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!(navigator as Navigator & { canShare?: (d?: unknown) => boolean }).canShare;

  const rebuild = useCallback(async () => {
    if (!captureRef.current) { setStatus("error"); return; }
    try {
      const base = await captureNode(captureRef.current);
      const card = buildIdeaCard(base, { symbol, title });
      cardRef.current = card;
      setPreview(card.toDataURL("image/png"));
      setStatus("ready");
    } catch (e) {
      console.error("[Publish] capture failed", e);
      setStatus("error");
    }
  }, [captureRef, symbol, title]);

  // initial capture (once)
  useEffect(() => { rebuild(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // refresh caption when title changes (debounced) — reuse existing base is cheaper,
  // but simplest correct approach is a light re-render of the footer only.
  useEffect(() => {
    if (status !== "ready" || !cardRef.current) return;
    const t = setTimeout(() => { rebuild(); }, 450);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [title]);

  const filename = `wm-idea-${symbol.replace(/[^\w]/g, "")}-${Date.now()}.png`;

  const doDownload = async () => {
    if (!cardRef.current) return;
    downloadBlob(await canvasToBlob(cardRef.current), filename);
  };
  const doCopy = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await canvasToBlob(cardRef.current);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch (e) { console.warn("[Publish] copy failed", e); }
  };
  const doShare = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await canvasToBlob(cardRef.current);
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void>; canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: title || `${symbol} idea`, text: `${symbol} chart idea — WealthyMindsets Pro` });
      } else { doDownload(); }
    } catch (e) { if ((e as Error).name !== "AbortError") console.warn("[Publish] share failed", e); }
  };

  return (
    <ModalShell title="Publish Idea" icon={<Share2 size={17} />} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          width: "100%", aspectRatio: "16 / 10", background: "#06070B", borderRadius: 10,
          border: "1px solid #1E2030", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {status === "loading" && <Loader2 size={26} className="wm-spin" color="#4A5070" />}
          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#8896BE", fontSize: 12 }}>
              <AlertTriangle size={22} color="#FF8C00" /> Could not capture the chart.
            </div>
          )}
          {status === "ready" && preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="chart idea preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>

        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Idea title (e.g. “SPY breakout above 560”)"
          maxLength={80}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
            background: "#141824", border: "1px solid #263050", color: "#E2E8F0", outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button onClick={doShare} disabled={status !== "ready"} style={{ ...btnStyle("primary"), opacity: status === "ready" ? 1 : 0.5, flex: 1, minWidth: 130 }}>
            <Share2 size={15} /> {canShare ? "Share" : "Share / Save"}
          </button>
          <button onClick={doCopy} disabled={status !== "ready"} style={{ ...btnStyle(), opacity: status === "ready" ? 1 : 0.5 }}>
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
          </button>
          <button onClick={doDownload} disabled={status !== "ready"} style={{ ...btnStyle(), opacity: status === "ready" ? 1 : 0.5 }}>
            <Download size={15} /> Save PNG
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#5A6180", lineHeight: 1.5 }}>
          Captures the current chart into a branded idea card you can share to Discord / X / the WM Lounge, copy to clipboard, or save.
        </p>
      </div>
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MediaModal — Record Video Idea (webcam+mic) OR Speak Your Mind (mic)
════════════════════════════════════════════════════════════════════════ */
function MediaModal({ kind, symbol, onClose }: {
  kind: "video" | "audio"; symbol: string; onClose: () => void;
}) {
  const isVideo = kind === "video";
  const [phase, setPhase] = useState<"init" | "ready" | "recording" | "done" | "denied">("init");
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>("");

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recRef.current?.state !== "inactive" && recRef.current?.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // acquire the stream on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          isVideo ? { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true } : { audio: true }
        );
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (isVideo && liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
        setPhase("ready");
      } catch (e) {
        console.warn(`[${kind}] getUserMedia denied/failed`, e);
        if (!cancelled) setPhase("denied");
      }
    })();
    return () => { cancelled = true; cleanup(); if (resultUrl) URL.revokeObjectURL(resultUrl); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const start = () => {
    if (!streamRef.current) return;
    const mime = pickMime(isVideo ? VIDEO_MIMES : AUDIO_MIMES);
    mimeRef.current = mime;
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime || (isVideo ? "video/webm" : "audio/webm") });
      setResultUrl(URL.createObjectURL(blob));
      setPhase("done");
    };
    rec.start(1000);
    recRef.current = rec;
    setElapsed(0); setPhase("recording");
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };
  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recRef.current?.stop(); } catch { /* noop */ }
    // keep the live preview stream until modal closes so re-record works
  };
  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null); setElapsed(0); setPhase("ready");
    if (isVideo && liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    }
  };
  const download = () => {
    if (!resultUrl) return;
    const ext = isVideo ? "webm" : "webm";
    fetch(resultUrl).then(r => r.blob()).then(b =>
      downloadBlob(b, `wm-${isVideo ? "video" : "voice"}-${symbol.replace(/[^\w]/g, "")}-${Date.now()}.${ext}`));
  };

  const title = isVideo ? "Record Video Idea" : "Speak Your Mind";
  const icon = isVideo ? <Video size={17} /> : <Mic size={17} />;

  return (
    <ModalShell title={title} icon={icon} onClose={() => { cleanup(); onClose(); }} width={isVideo ? 560 : 440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* stage */}
        <div style={{
          width: "100%", aspectRatio: isVideo ? "16 / 9" : "16 / 6",
          background: "#06070B", borderRadius: 10, border: "1px solid #1E2030",
          overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {phase === "init" && <Loader2 size={26} className="wm-spin" color="#4A5070" />}
          {phase === "denied" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#8896BE", fontSize: 12, padding: 16, textAlign: "center" }}>
              <AlertTriangle size={22} color="#FF8C00" />
              {isVideo ? "Camera/microphone" : "Microphone"} access was blocked. Allow it in your browser to record.
            </div>
          )}

          {/* live webcam preview */}
          {isVideo && (
            <video ref={liveVideoRef} muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: phase === "done" ? "none" : "block" }} />
          )}

          {/* audio: animated mic */}
          {!isVideo && phase !== "done" && phase !== "denied" && phase !== "init" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%",
                background: phase === "recording" ? "rgba(255,71,87,0.16)" : "rgba(47,128,237,0.14)",
                border: `2px solid ${phase === "recording" ? REC : ACCENT}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: phase === "recording" ? REC : ACCENT,
              }} className={phase === "recording" ? "wm-rec-dot" : ""}>
                <Mic size={26} />
              </div>
              <span style={{ fontSize: 12, color: "#8896BE" }}>
                {phase === "recording" ? "Listening…" : "Ready to record"}
              </span>
            </div>
          )}

          {/* recorded playback */}
          {phase === "done" && resultUrl && (
            isVideo
              ? <video src={resultUrl} controls playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
              : <div style={{ width: "100%", padding: "0 18px" }}><audio src={resultUrl} controls style={{ width: "100%" }} /></div>
          )}

          {/* REC badge */}
          {phase === "recording" && (
            <div style={{
              position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6,
              background: "rgba(0,0,0,0.55)", padding: "4px 9px", borderRadius: 20,
              fontSize: 11, fontWeight: 700, color: "#fff",
            }}>
              <span className="wm-rec-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: REC, display: "inline-block" }} />
              {fmtTime(elapsed)}
            </div>
          )}
        </div>

        {/* controls */}
        <div style={{ display: "flex", gap: 9, justifyContent: "center" }}>
          {phase === "ready" && (
            <button onClick={start} style={btnStyle("danger")}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: REC, display: "inline-block" }} />
              Start recording
            </button>
          )}
          {phase === "recording" && (
            <button onClick={stop} style={btnStyle("danger")}>
              <Square size={13} fill={REC} /> Stop
            </button>
          )}
          {phase === "done" && (
            <>
              <button onClick={download} style={btnStyle("primary")}><Download size={15} /> Save {isVideo ? "video" : "audio"}</button>
              <button onClick={reset} style={btnStyle()}>Re-record</button>
            </>
          )}
          {phase === "denied" && (
            <button onClick={() => { cleanup(); onClose(); }} style={btnStyle()}>Close</button>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "#5A6180", lineHeight: 1.5, textAlign: "center" }}>
          {isVideo
            ? "Record a talking-head video explaining your trade idea, then save the .webm to share."
            : "Record a quick voice note on your market thesis, then save the .webm audio."}
        </p>
      </div>
    </ModalShell>
  );
}
