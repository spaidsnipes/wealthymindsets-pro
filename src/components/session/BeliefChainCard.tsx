"use client";

/** THE BELIEF CHAIN CHECK — before and after the session (ATH mockup S-QD1; beliefChain.ts). */
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { memberKeyOf } from "@/lib/journal/managementOwner";
import { marketDayKey } from "@/lib/journal/localDayKey";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { BELIEF_BASE_KEY, CHAIN_LINKS, chainReading, readBeliefDay, type BeliefDay, type ChainCheck } from "@/lib/session/beliefChain";

const MUTED = "#9a927f";
const field: React.CSSProperties = { width: "100%", minHeight: 38, background: "#07080a", border: "1px solid #3a3326", borderRadius: 6, color: "#ede6d3", padding: "6px 10px", fontSize: 14 };

export function BeliefChainCard({ card, title }: { readonly card: React.CSSProperties; readonly title: React.CSSProperties }) {
  const { user } = useAuth();
  const key = user?.id ? memberKeyOf(BELIEF_BASE_KEY, user.id) : null;
  const [d, setD] = useState<BeliefDay | null>(null);
  useEffect(() => {
    if (!key) return;
    try { setD(readBeliefDay(JSON.parse(localStorage.getItem(key) ?? "null"), marketDayKey())); } catch { setD(readBeliefDay(null, marketDayKey())); }
  }, [key]);
  const save = useCallback((next: BeliefDay) => {
    setD(next);
    try { if (key && !proofSceneHoldsWrites()) localStorage.setItem(key, JSON.stringify(next)); } catch { /* page only */ }
  }, [key]);
  if (!d) return null;
  const part = (which: "pre" | "post", label: string) => {
    const c = d[which];
    const set = (patch: Partial<ChainCheck>) => save({ ...d, [which]: { ...c, ...patch, atMs: Date.now() } });
    const r = chainReading(c);
    return (
      <div data-testid={`belief-${which}`} data-dark={r.dark} style={{ marginTop: which === "post" ? 16 : 0 }}>
        <div style={title}>{label}</div>
        <input style={field} value={c.fact} maxLength={280} placeholder="The fact (what is actually true right now)" onChange={e => set({ fact: e.target.value })} />
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {CHAIN_LINKS.map(l => (
            <div key={l.key} style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr", gap: 6, alignItems: "center", fontSize: 12 }}>
              <span style={{ color: MUTED }}>{l.label}</span>
              {(["LIGHT", "DARK"] as const).map(side => {
                const on = c.links[l.key] === side;
                const ink = side === "LIGHT" ? "#2ec4a0" : "#e5546b";
                return (
                  <button key={side} type="button" aria-pressed={on} onClick={() => set({ links: { ...c.links, [l.key]: side } })}
                    style={{ minHeight: 36, borderRadius: 6, cursor: "pointer", fontSize: 12, background: "transparent", border: `1px solid ${on ? ink : "#3a3326"}`, color: on ? ink : "#c8c0ae" }}>
                    {side === "LIGHT" ? l.light : l.dark}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ color: r.needsReplacement ? "#e5546b" : r.dark === 0 && r.answered ? "#2ec4a0" : MUTED, fontSize: 12.5, marginTop: 8 }}>{r.words}</div>
        {r.dark > 0 ? <input style={{ ...field, marginTop: 6 }} value={c.replacement} maxLength={280} placeholder="The thought I'll stand on instead (what I expect, not what I fear)" onChange={e => set({ replacement: e.target.value })} /> : null}
      </div>
    );
  };
  return (
    <section style={card} data-testid="session-belief">
      {part("pre", "Belief chain · before the bell")}
      {part("post", "Belief chain · after the bell")}
      <div style={{ color: MUTED, fontSize: 11, marginTop: 10 }}>Facts → focus → belief → feeling → function. Worry spends today&apos;s energy on a future you don&apos;t want — after Myron Golden, in our words. Kept on this device.</div>
    </section>
  );
}
