"use client";

/**
 * CANON | GLASS — the visual station (Garden 18 §VII). The Founder plate on
 * the left, the serving /charts on the right, at the same time, so every
 * visual build is CANON ⇄ LIVE, never coded from memory.
 *
 *   /canon/glass?plate=72                     the plate and its default glass
 *   /canon/glass?plate=72&glass=symbol=…      the plate beside any /charts query
 *
 * The right pane is this origin's own /charts (a proof scene by default, so
 * nothing the station shows is written into the trader's saved chart).
 */

import React, { useEffect, useMemo, useState } from "react";
import { CANON_PLATES, canonPlate, glassHref, plateImageUrl } from "@/lib/canon/canonPlates";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

export default function CanonGlassPage() {
  const [plateKey, setPlateKey] = useState<string>("72");
  const [glassQuery, setGlassQuery] = useState<string | null>(null);
  const [split, setSplit] = useState(0.42);
  // The station reads no feed itself; the framed /charts carries its own.
  usePublishOsStanding({ surface: "Canon | Glass", feed: FEEDLESS_SURFACE });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setPlateKey(q.get("plate") ?? "72");
    setGlassQuery(q.get("glass"));
  }, []);

  const plate = canonPlate(plateKey);
  const glass = useMemo(() => glassHref(glassQuery ?? plate.glass), [glassQuery, plate]);

  const choose = (key: string) => {
    setPlateKey(key);
    setGlassQuery(null);
    const q = new URLSearchParams(window.location.search);
    q.set("plate", key); q.delete("glass");
    window.history.replaceState(null, "", `?${q.toString()}`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#07080b", color: "#e8dcc0", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", borderBottom: "1px solid rgba(212,175,55,0.25)", fontSize: 12 }}>
        <strong style={{ letterSpacing: "0.14em", color: "#d4af37" }}>CANON | GLASS</strong>
        <select aria-label="Founder plate" value={plate.key} onChange={e => choose(e.target.value)}
          style={{ background: "#0f1116", color: "#e8dcc0", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 4, padding: "3px 6px", fontSize: 12 }}>
          {CANON_PLATES.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
        </select>
        <span style={{ color: "#8b8fa8" }}>Glass:</span>
        <code data-testid="canon-glass-href" style={{ color: "#c8c0ae", fontSize: 11 }}>{glass}</code>
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "#8b8fa8" }}>
          Split
          <input type="range" min={0.2} max={0.7} step={0.01} value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Plate width" />
        </label>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div data-testid="canon-pane" style={{ width: `${split * 100}%`, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRight: "1px solid rgba(212,175,55,0.3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plateImageUrl(plate)} alt={`Founder plate ${plate.title}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
        <iframe data-testid="glass-pane" key={glass} src={glass} title="Serving /charts" style={{ flex: 1, border: 0, background: "#07080b" }} />
      </div>
    </div>
  );
}
