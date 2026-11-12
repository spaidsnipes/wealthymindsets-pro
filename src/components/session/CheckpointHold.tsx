"use client";

/**
 * The hold card for the MNQ → NQ checkpoint. "Stay" is the default and the big button; switching anyway waits five
 * seconds first, so the step up is a decision and not a reflex.
 */
import React, { useEffect, useRef, useState } from "react";

const GOLD = "#d4a94a", MUTED = "#9a927f";
export const CHECKPOINT_WAIT_S = 5;

export function CheckpointHold({ from, to, note, onStay, onSwitch }: {
  readonly from: string; readonly to: string; readonly note: string;
  readonly onStay: () => void; readonly onSwitch: () => void;
}) {
  const [left, setLeft] = useState(CHECKPOINT_WAIT_S);
  const boxRef = useRef<HTMLDivElement>(null);
  // Focus the CARD, not "Stay": the Enter that picked NQ in the symbol search would land on a focused button
  // and press it in the same keystroke — the card would vanish before it was read.
  useEffect(() => { boxRef.current?.focus(); }, []);
  useEffect(() => {
    const t = window.setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onStay(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(t); window.removeEventListener("keydown", esc); };
  }, [onStay]);
  const base = (s: string) => s.replace(/1!$/, "");
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Checkpoint" data-testid="checkpoint-hold"
      style={{ position: "fixed", inset: 0, zIndex: 2147482000, background: "rgba(5,5,6,0.88)", display: "grid", placeItems: "center", padding: 16 }}>
      <div ref={boxRef} tabIndex={-1} style={{ outline: "none", width: "min(460px, 100%)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: 22, background: "#0b0a09", color: "#ede6d3", textAlign: "center" }}>
        <div style={{ font: "600 11px Inter, system-ui", letterSpacing: ".22em", color: GOLD }}>CHECKPOINT</div>
        <div style={{ font: "700 24px Georgia, serif", margin: "10px 0 6px" }}>{base(from)} → {base(to)}?</div>
        <div style={{ color: MUTED, fontSize: 13.5 }}>You set this checkpoint yourself{note ? `: “${note}”.` : "."} Stepping up to the full-size contract is ten times the money per point.</div>
        <button type="button" data-testid="checkpoint-stay" onClick={onStay}
          style={{ marginTop: 18, width: "100%", minHeight: 48, borderRadius: 8, border: "none", background: GOLD, color: "#120d02", fontWeight: 800, letterSpacing: ".12em", cursor: "pointer" }}>
          STAY ON {base(from)}
        </button>
        <button type="button" data-testid="checkpoint-switch" disabled={left > 0} onClick={onSwitch}
          style={{ marginTop: 10, width: "100%", minHeight: 44, borderRadius: 8, border: "1px solid #5a5246", background: "transparent", color: left > 0 ? "#6b6556" : "#ede6d3", cursor: left > 0 ? "default" : "pointer" }}>
          {left > 0 ? `Switch to ${base(to)} anyway (${left})` : `Switch to ${base(to)} anyway`}
        </button>
      </div>
    </div>
  );
}
