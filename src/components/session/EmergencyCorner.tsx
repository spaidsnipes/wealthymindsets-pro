"use client";

/**
 * THE EMERGENCY CORNER (emergencyCorner.ts). Five buttons → STOP (close what's open through the ticket's own FLATTEN,
 * which he previews and confirms) → RECOVER (his menu) → REASSESS (lock for the day). Nothing here sends an order.
 */
import Link from "next/link";
import React from "react";
import { EMERGENCY_KINDS, FLATTEN_ASK_PARAM, FLATTEN_ASK_VALUE, pressEmergency, RECOVERY_MENU, toggleRecovery } from "@/lib/session/emergencyCorner";
import { lockNow, type SessionDay } from "@/lib/session/sessionDay";

const GOLD = "#d4a94a", MUTED = "#9a927f", RED = "#e5546b";

export function flattenAskHref(): string { return `/charts?${FLATTEN_ASK_PARAM}=${FLATTEN_ASK_VALUE}`; }

export function EmergencyCorner({ day, update, card, title }: {
  readonly day: SessionDay; readonly update: (fn: (d: SessionDay) => SessionDay) => void;
  readonly card: React.CSSProperties; readonly title: React.CSSProperties;
}) {
  const last = day.emergencies[day.emergencies.length - 1] ?? null;
  const kind = last ? EMERGENCY_KINDS.find(k => k.id === last.kind) : null;
  const btn: React.CSSProperties = { minHeight: 52, borderRadius: 8, border: `1px solid ${RED}`, background: "rgba(229,84,107,0.08)", color: "#f2c9cf", fontWeight: 800, letterSpacing: ".1em", fontSize: 12.5, cursor: "pointer" };
  return (
    <section id="emergency" style={{ ...card, gridColumn: "1 / -1", borderColor: "rgba(229,84,107,0.6)" }} data-testid="emergency-corner" data-presses={day.emergencies.length}>
      <div style={{ ...title, color: RED }}>Emergency corner</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        {EMERGENCY_KINDS.map(k => (
          <button key={k.id} type="button" data-testid={`emergency-${k.id}`} style={btn} onClick={() => update(d => ({ ...d, emergencies: pressEmergency(d.emergencies, k.id, Date.now()) }))}>{k.label}</button>
        ))}
      </div>
      {last && kind ? (
        <div data-testid="emergency-steps" style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={{ color: MUTED, fontSize: 12 }}>{kind.label} · pressed {new Date(last.atMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {day.emergencies.length} today</div>
          <div>
            <div style={{ font: "700 18px Georgia, serif" }}>1 · STOP</div>
            <div style={{ fontSize: 13.5, margin: "4px 0 8px" }}>{kind.stop} No new orders.</div>
            <Link href={flattenAskHref()} data-testid="emergency-flatten" style={{ display: "inline-block", padding: "10px 14px", border: `1px solid ${GOLD}`, borderRadius: 8, color: GOLD, fontWeight: 800, letterSpacing: ".08em", textDecoration: "none" }}>
              CLOSE WHAT&apos;S OPEN — opens the ticket with FLATTEN
            </Link>
            <div style={{ color: MUTED, fontSize: 11.5, marginTop: 6 }}>The ticket shows the exact symbol, quantity, side and account. Nothing is sent until you preview and confirm it there. Flat already? Skip this.</div>
          </div>
          <div>
            <div style={{ font: "700 18px Georgia, serif" }}>2 · RECOVER</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {RECOVERY_MENU.map(r => {
                const on = last.recovered.includes(r);
                return <button key={r} type="button" aria-pressed={on} onClick={() => update(d => ({ ...d, emergencies: toggleRecovery(d.emergencies, r) }))}
                  style={{ minHeight: 40, padding: "0 12px", borderRadius: 20, cursor: "pointer", background: "transparent", border: `1px solid ${on ? "#2ec4a0" : "#3a3326"}`, color: on ? "#2ec4a0" : "#ede6d3" }}>{on ? "✓ " : ""}{r}</button>;
              })}
            </div>
          </div>
          <div>
            <div style={{ font: "700 18px Georgia, serif" }}>3 · REASSESS</div>
            <button type="button" data-testid="emergency-lock" onClick={() => update(d => lockNow({ ...d, lockMode: "REST_OF_DAY" }, "DONE", Date.now()))}
              style={{ marginTop: 6, minHeight: 46, padding: "0 16px", borderRadius: 8, border: "none", background: GOLD, color: "#120d02", fontWeight: 800, letterSpacing: ".1em", cursor: "pointer" }}>
              I&apos;M DONE FOR TODAY — LOCK UNTIL TOMORROW
            </button>
          </div>
        </div>
      ) : <div style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>Press the one that&apos;s true. Each press is time-stamped in today&apos;s log.</div>}
    </section>
  );
}
