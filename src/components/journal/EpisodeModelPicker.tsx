"use client";

/** The trader marks which model a broker episode was taken under (§32). Kept on this device. */

import React, { useEffect, useState } from "react";

import { EPISODE_MODELS_KEY, MODEL_LABEL, parseModels, type ModelMark } from "@/lib/journal/episodeModel";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

export function EpisodeModelPicker({ episodeId }: { readonly episodeId: string }) {
  const [mark, setMark] = useState<ModelMark | null>(null);
  useEffect(() => { try { setMark(parseModels(localStorage.getItem(EPISODE_MODELS_KEY))[episodeId] ?? null); } catch { /* none */ } }, [episodeId]);
  const save = (m: ModelMark | null) => {
    setMark(m);
    try {
      const all = parseModels(localStorage.getItem(EPISODE_MODELS_KEY));
      if (m) all[episodeId] = m; else delete all[episodeId];
      localStorage.setItem(EPISODE_MODELS_KEY, JSON.stringify(all));
    } catch { /* this visit only */ }
  };
  return (
    <div data-testid="episode-model" style={{ margin: "6px 0", fontSize: 11, color: MUTED, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: GOLD, letterSpacing: 1 }}>MODEL</span>
      <span>(your mark — fills cannot say)</span>
      {(Object.keys(MODEL_LABEL) as ModelMark[]).map(m => (
        <button key={m} type="button" aria-pressed={mark === m} onClick={() => save(mark === m ? null : m)}
          style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, cursor: "pointer", background: "transparent", border: `1px solid ${mark === m ? GOLD : LINE}`, color: mark === m ? INK : MUTED }}>
          {MODEL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}
