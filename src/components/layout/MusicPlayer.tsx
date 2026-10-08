"use client";

import React, { useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ListMusic, Radio, Music2, Mic,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRadio } from "@/contexts/RadioContext";

function fmt(s: number) {
  if (!s || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function MusicPlayer() {
  const { nowPlaying, playing, progress, volume, toggle, seek, setVolume, stop } = useRadio();
  const [muted, setMuted]       = useState(false);
  const [prevVol, setPrevVol]   = useState(0.7);

  if (!nowPlaying) return <div style={{ height: 52, flexShrink: 0 }} className="wm-music-player border-t border-wm-border bg-wm-dark" />;

  const duration = nowPlaying.duration;
  const isLive   = duration <= 0;
  // A station with no stream URL is selected, not live (2026-10-04: every
  // station's stream is unset, and the bar still pulsed "● LIVE" over silence).
  const streaming = isLive && Boolean(nowPlaying.url) && playing;
  const pct      = isLive ? 0 : Math.min(100, (progress / duration) * 100);

  const TypeIcon = nowPlaying.type === "station" ? Radio
                 : nowPlaying.type === "episode"  ? Mic
                 : Music2;

  const toggleMute = () => {
    if (muted) { setVolume(prevVol); setMuted(false); }
    else       { setPrevVol(volume); setVolume(0); setMuted(true); }
  };

  return (
    <div
      style={{ height: 52, flexShrink: 0 }}
      className="wm-music-player relative flex items-center border-t border-wm-border bg-wm-dark z-40 px-4 gap-4"
    >
      {/* Track info */}
      <div className="flex items-center gap-3 w-56 shrink-0 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${nowPlaying.color}44, ${nowPlaying.color}22)`, border: `1px solid ${nowPlaying.color}40` }}
        >
          {playing ? (
            <div className="music-wave flex items-end gap-0.5 h-4">
              {[1,2,3,4].map(i => (
                <span key={i} style={{ height: `${8 + i * 2}px`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ) : (
            <TypeIcon size={12} style={{ color: nowPlaying.color }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-wm-text truncate">{nowPlaying.title}</div>
          <div className="text-[10px] text-wm-text-muted truncate flex items-center gap-1">
            {streaming && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            {nowPlaying.artist}
          </div>
        </div>

      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        <div className="flex items-center gap-3">
          {!isLive && (
            <button onClick={() => seek(Math.max(0, progress - 15))} title="Back 15s" aria-label="Back 15 seconds" className="text-wm-text-muted hover:text-wm-text transition-colors">
              <SkipBack size={15} />
            </button>
          )}
          <button onClick={toggle}
            title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause" : "Play"}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${nowPlaying.color}, ${nowPlaying.color}88)` }}
          >
            {playing
              ? <Pause size={14} className="text-wm-black" />
              : <Play  size={14} className="text-wm-black ml-0.5" />
            }
          </button>
          {!isLive && (
            <button onClick={() => seek(Math.min(duration, progress + 15))} title="Forward 15s" aria-label="Forward 15 seconds" className="text-wm-text-muted hover:text-wm-text transition-colors">
              <SkipForward size={15} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isLive ? (
          <div className="flex items-center gap-2 w-full max-w-md">
            {streaming
              ? <span className="text-[9px] font-mono text-red-400 tracking-widest">● LIVE</span>
              : <span className="text-[9px] font-mono text-wm-text-dim tracking-widest">{nowPlaying.url ? "PAUSED" : "STREAM NOT CONNECTED"}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-[9px] font-mono text-wm-text-dim w-6 text-right shrink-0">{fmt(progress)}</span>
            <div
              className="flex-1 h-1 rounded-full bg-wm-muted relative cursor-pointer group"
              role="slider" tabIndex={0} aria-label="Seek"
              aria-valuemin={0} aria-valuemax={Math.floor(duration)} aria-valuenow={Math.floor(progress)}
              aria-valuetext={`${fmt(progress)} of ${fmt(duration)}`}
              onKeyDown={e => {
                // Keyboard reach (2026-10-04): arrows ±5 s, Home / End.
                const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -5 : 0;
                if (step) { e.preventDefault(); seek(Math.max(0, Math.min(duration, Math.floor(progress) + step))); }
                else if (e.key === "Home") { e.preventDefault(); seek(0); }
                else if (e.key === "End") { e.preventDefault(); seek(duration); }
              }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(Math.floor(((e.clientX - rect.left) / rect.width) * duration));
              }}
            >
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: nowPlaying.color }} />
              <div
                className="absolute top-1/2 w-2.5 h-2.5 rounded-full shadow opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
                style={{ left: `${pct}%`, transform: "translateX(-50%) translateY(-50%)", background: nowPlaying.color }}
              />
            </div>
            <span className="text-[9px] font-mono text-wm-text-dim w-6 shrink-0">{fmt(duration)}</span>
          </div>
        )}
      </div>

      {/* Volume + stop */}
      <div className="flex items-center gap-2 w-36 shrink-0 justify-end">
        <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} className="text-wm-text-muted hover:text-wm-text transition-colors">
          {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div className="w-20">
          <input
            type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => { setVolume(+e.target.value); setMuted(false); }}
            aria-label="Volume"
            className="w-full"
            style={{ accentColor: nowPlaying.color }}
          />
        </div>
        <button onClick={stop} aria-label="Stop and close player" className="text-wm-text-dim hover:text-wm-red transition-colors text-[10px] font-bold px-1">✕</button>
      </div>
    </div>
  );
}
