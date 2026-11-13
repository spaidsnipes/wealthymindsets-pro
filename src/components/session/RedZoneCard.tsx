"use client";

/**
 * RED ZONE — opt-in, on this device only (redZone.ts). Microphone LEVEL only: nothing is recorded, stored or sent, and
 * no words are recognised. When the detector calls the Red Zone the card turns red and points at the Emergency Corner.
 */
import React, { useEffect, useRef, useState } from "react";
import { feedRedZone, RED_ZONE_START, type RedZoneState } from "@/lib/session/redZone";

const RED = "#e5546b", MUTED = "#9a927f";

export function RedZoneCard({ card, title }: { readonly card: React.CSSProperties; readonly title: React.CSSProperties }) {
  const [on, setOn] = useState(false);
  const [state, setState] = useState<RedZoneState>(RED_ZONE_START);
  const [err, setErr] = useState<string | null>(null);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
      const ac = new AudioContext();
      const an = ac.createAnalyser(); an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let s = RED_ZONE_START;
      const tick = window.setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        s = feedRedZone(s, Date.now(), Math.sqrt(sum / buf.length));
        setState(s);
      }, 500);
      stop.current = () => { window.clearInterval(tick); stream.getTracks().forEach(t => t.stop()); void ac.close(); };
      setOn(true);
    } catch { setErr("The microphone was not allowed. Nothing is listening."); }
  }
  function end() { stop.current?.(); stop.current = null; setOn(false); setState(RED_ZONE_START); }
  return (
    <section style={{ ...card, borderColor: state.red ? RED : (card.borderColor as string | undefined) }} data-testid="red-zone" data-red={String(state.red)} data-on={String(on)}>
      <div style={{ ...title, color: state.red ? RED : title.color }}>Red zone · opt-in</div>
      {!on ? (
        <>
          <div style={{ fontSize: 13 }}>Listens to how LOUD the room is — not to your words. It learns your calm level for 20 seconds, then flags three raised-voice bursts inside two minutes.</div>
          <button type="button" data-testid="red-zone-start" onClick={start} style={{ marginTop: 10, minHeight: 44, padding: "0 14px", borderRadius: 8, border: "1px solid #3a3326", background: "transparent", color: "#ede6d3", cursor: "pointer" }}>Turn on for this session</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: state.red ? RED : "#ede6d3", fontWeight: state.red ? 800 : 400 }}>
            {state.baseline == null ? "Learning your calm level…" : state.red ? "RED ZONE — your voice has been up three times. Go to the Emergency Corner." : `Calm. ${state.bursts.length} raised-voice burst${state.bursts.length === 1 ? "" : "s"} in the last 2 minutes.`}
          </div>
          {state.red ? <a href="#emergency" style={{ display: "inline-block", marginTop: 8, color: RED, fontWeight: 800 }}>Emergency Corner ↓</a> : null}
          <button type="button" onClick={end} style={{ display: "block", marginTop: 10, minHeight: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #3a3326", background: "transparent", color: MUTED, cursor: "pointer" }}>Turn off</button>
        </>
      )}
      {err ? <div style={{ color: RED, fontSize: 12, marginTop: 6 }}>{err}</div> : null}
      <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>On this device only: no audio is recorded, kept or sent. Face reading is not built.</div>
    </section>
  );
}
