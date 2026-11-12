"use client";

/**
 * Session Complete + Giveback meter + Toe Whooper verdict, and the share card (a PNG drawn here from the same
 * reading — his own numbers, his own verdict). Used by the lock screen and by the Session Desk.
 */
import React from "react";
import { money, readGiveback, readToeWhooper, TOE_WORDS, type SessionDay } from "@/lib/session/sessionDay";

const GOLD = "#d4a94a", INK = "#ede6d3", MUTED = "#9a927f";

export function GivebackMeter({ day }: { readonly day: SessionDay }) {
  const g = readGiveback(day);
  const w = g.known ? Math.min(100, Math.round(g.fraction * 100)) : 0;
  return (
    <div data-testid="giveback-meter" data-giveback={g.known ? Math.round(g.fraction * 100) : "NONE"}>
      <div style={{ height: 12, borderRadius: 6, background: "#1c1a15", overflow: "hidden", margin: "8px 0" }}>
        <i style={{ display: "block", height: "100%", width: `${w}%`, background: `linear-gradient(90deg, ${GOLD}, #e5546b)` }} />
      </div>
      <div style={{ color: MUTED, fontSize: 12 }}>{g.words}</div>
    </div>
  );
}

/** Draws the share card and hands it to the viewer as a file. Nothing leaves the device. */
export function saveShareCard(day: SessionDay): void {
  const t = readToeWhooper(day);
  if (!t.known) return;
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1080;
  const x = c.getContext("2d");
  if (!x) return;
  const bg = x.createLinearGradient(0, 0, 0, 1080); bg.addColorStop(0, "#0e0d0b"); bg.addColorStop(1, "#050506");
  x.fillStyle = bg; x.fillRect(0, 0, 1080, 1080);
  x.strokeStyle = GOLD; x.lineWidth = 6; x.strokeRect(40, 40, 1000, 1000);
  x.textAlign = "center"; x.fillStyle = GOLD;
  x.font = "600 30px Georgia, serif"; x.fillText("WEALTHYMINDSETS PRO · TOE WHOOPER", 540, 130);
  x.font = "400 26px Georgia, serif"; x.fillStyle = MUTED; x.fillText(day.day, 540, 175);
  x.fillStyle = t.verdict === "TOES_GOT_WHIPPED" ? "#e5546b" : GOLD;
  x.font = "800 74px Georgia, serif";
  const words = TOE_WORDS[t.verdict].split(" ");
  const half = Math.ceil(words.length / 2);
  x.fillText(words.slice(0, half).join(" "), 540, 430); x.fillText(words.slice(half).join(" "), 540, 520);
  x.fillStyle = INK; x.font = "700 64px Georgia, serif"; x.fillText(day.netCents == null ? "" : money(day.netCents), 540, 660);
  x.font = "400 30px Georgia, serif"; x.fillStyle = MUTED; x.fillText(t.because, 540, 730, 920);
  const g = readGiveback(day);
  if (g.known) x.fillText(g.words, 540, 780, 920);
  x.fillStyle = INK; x.font = "600 34px Georgia, serif";
  x.fillText(t.verdict === "TOES_GOT_WHIPPED" ? "Tomorrow is a new fight." : "You completed your job. Go live your life.", 540, 920, 960);
  x.font = "400 22px Georgia, serif"; x.fillStyle = MUTED; x.fillText("His own numbers, typed from his firm's dashboard. Not advice.", 540, 990);
  c.toBlob(b => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = `toe-whooper-${day.day}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, "image/png");
}

export function ToeWhooperCard({ day, big = false }: { readonly day: SessionDay; readonly big?: boolean }) {
  const t = readToeWhooper(day);
  return (
    <div data-testid="toe-whooper" data-verdict={t.known ? t.verdict : "NONE"} style={{ textAlign: "center" }}>
      <div style={{ font: "600 11px Inter, system-ui", letterSpacing: ".22em", color: GOLD, textTransform: "uppercase" }}>Toe Whooper · did you whip the market&apos;s toes today?</div>
      {t.known ? (
        <>
          <div style={{ font: `800 ${big ? 40 : 26}px Georgia, serif`, color: t.verdict === "TOES_GOT_WHIPPED" ? "#e5546b" : GOLD, letterSpacing: ".05em", margin: "8px 0 4px" }}>{TOE_WORDS[t.verdict]}</div>
          <div style={{ color: MUTED, fontSize: 13 }}>{t.because}</div>
          <button type="button" data-testid="toe-share" onClick={() => saveShareCard(day)}
            style={{ marginTop: 10, border: `1px solid ${GOLD}`, color: GOLD, background: "transparent", padding: "8px 14px", borderRadius: 8, fontWeight: 700, letterSpacing: ".1em", cursor: "pointer" }}>
            SAVE THE SHARE CARD
          </button>
          <div style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>Replay clip: not built yet — the card carries the verdict and your numbers only.</div>
        </>
      ) : <div style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>{t.why}</div>}
    </div>
  );
}
