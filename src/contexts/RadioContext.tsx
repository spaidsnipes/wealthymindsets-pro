"use client";

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";

export interface NowPlayingInfo {
  title:    string;
  artist:   string;
  duration: number;   // seconds; 0 = live stream
  color:    string;
  type:     "track" | "station" | "episode";
  url:      string;
}

interface RadioCtx {
  nowPlaying:  NowPlayingInfo | null;
  playing:     boolean;
  progress:    number;
  volume:      number;
  play:        (info: NowPlayingInfo) => void;
  pause:       () => void;
  resume:      () => void;
  toggle:      () => void;
  seek:        (sec: number) => void;
  setVolume:   (v: number) => void;
  stop:        () => void;
}

const RadioContext = createContext<RadioCtx | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [volume,     setVolumeState]= useState(0.7);

  // Create audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.volume = 0.7;
    audio.preload = "metadata";
    audio.addEventListener("timeupdate", () => setProgress(Math.floor(audio.currentTime)));
    audio.addEventListener("ended",      () => { setPlaying(false); setProgress(0); });
    audio.addEventListener("play",       () => setPlaying(true));
    audio.addEventListener("pause",      () => setPlaying(false));
    audioRef.current = audio;
    return () => { audio.pause(); audioRef.current = null; };
  }, []);

  const play = useCallback((info: NowPlayingInfo) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (nowPlaying?.url === info.url) {
      // same track — just resume
      audio.play().catch(() => {});
      return;
    }
    audio.pause();
    setProgress(0);
    setNowPlaying(info);
    if (info.url) {
      audio.src = info.url;
      audio.load();
      audio.play().catch(() => {});
    } else {
      // no stream URL yet — show player but don't error
      setPlaying(false);
    }
  }, [nowPlaying?.url]);

  const pause  = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => audioRef.current?.play().catch(() => {}), []);
  const toggle = useCallback(() => { playing ? pause() : resume(); }, [playing, pause, resume]);

  const seek = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    setProgress(sec);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setNowPlaying(null);
    setPlaying(false);
    setProgress(0);
  }, []);

  return (
    <RadioContext.Provider value={{ nowPlaying, playing, progress, volume, play, pause, resume, toggle, seek, setVolume, stop }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used inside RadioProvider");
  return ctx;
}
