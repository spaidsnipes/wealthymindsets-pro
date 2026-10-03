/**
 * MODEL 0 / 1 / 2 ON A BROKER EPISODE (Garden 18 v2 §32) — PURE.
 *
 * Fills cannot say which model a trade was taken under; the trader marks it.
 * M1 = trend / expansion, M2 = consolidation / rotation, M0 = no-trade /
 * observe (an M0 mark on a filled trade is itself evidence: a trade taken where
 * the model said wait). Results by model come only from marked trades.
 */
import type { Episode } from "@/lib/broker/webullLedger";

export type ModelMark = "M0" | "M1" | "M2";
export const MODEL_LABEL: Readonly<Record<ModelMark, string>> = {
  M0: "M0 · no-trade / observe",
  M1: "M1 · trend / expansion",
  M2: "M2 · consolidation / rotation",
};
export const EPISODE_MODELS_KEY = "wm_ledger_models_v1";

export function parseModels(raw: string | null): Record<string, ModelMark> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    const out: Record<string, ModelMark> = {};
    if (v && typeof v === "object") for (const [k, m] of Object.entries(v)) if (m === "M0" || m === "M1" || m === "M2") out[k] = m;
    return out;
  } catch { return {}; }
}

export interface ModelResult { readonly model: ModelMark; readonly n: number; readonly wins: number; readonly net: number; readonly expectancy: number }

export function resultsByModel(episodes: readonly Episode[], marks: Readonly<Record<string, ModelMark>>): { marked: number; rows: ModelResult[] } {
  const m = new Map<ModelMark, { n: number; wins: number; net: number }>();
  let marked = 0;
  for (const e of episodes) {
    if (e.label !== "RECONSTRUCTED" || e.net == null) continue;
    const k = marks[e.id];
    if (!k) continue;
    marked++;
    const r = m.get(k) ?? { n: 0, wins: 0, net: 0 };
    r.n++; if (e.net > 0) r.wins++; r.net += e.net;
    m.set(k, r);
  }
  const rows = (["M1", "M2", "M0"] as ModelMark[]).filter(k => m.has(k)).map(k => {
    const r = m.get(k)!;
    return { model: k, n: r.n, wins: r.wins, net: Math.round(r.net * 100) / 100, expectancy: Math.round((r.net / r.n) * 100) / 100 };
  });
  return { marked, rows };
}
