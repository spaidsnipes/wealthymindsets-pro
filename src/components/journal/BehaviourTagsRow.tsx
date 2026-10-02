"use client";

/**
 * One episode's INFERRED behaviour tags, each with its evidence, and the
 * trader's CONFIRM / CORRECT — appended as lineage, never overwriting the
 * inference (Garden 18 v2 §59/§60/§61). Kept on this device.
 */

import React, { useEffect, useState } from "react";

import { AMENDMENTS_KEY, appendAmendment, latestAmendment, parseAmendments, type Amendment, type BehaviourTag } from "@/lib/journal/behaviorTags";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

const read = (): Amendment[] => { try { return parseAmendments(localStorage.getItem(AMENDMENTS_KEY)); } catch { return []; } };
const write = (list: Amendment[]) => { try { localStorage.setItem(AMENDMENTS_KEY, JSON.stringify(list)); } catch { /* this visit only */ } };

export function BehaviourTagsRow({ episodeId, tags }: { readonly episodeId: string; readonly tags: readonly BehaviourTag[] }) {
  const [list, setList] = useState<Amendment[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => { setList(read()); }, []);
  if (!tags.length) return null;

  const record = (t: BehaviourTag, verdict: Amendment["verdict"], correction: string) => {
    const next = appendAmendment(read(), { episodeId, tag: t.id, original: { label: t.label, evidence: t.evidence, truth: t.truth }, verdict, correction, at: Date.now() });
    write(next);
    setList(next);
    setEditing(null);
    setDraft("");
  };

  return (
    <div data-testid="behaviour-tags" style={{ margin: "6px 0", display: "grid", gap: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>WHAT THE FILLS SHOW · INFERRED — confirm or correct; your correction is kept beside the inference, never over it</div>
      {tags.map(t => {
        const a = latestAmendment(list, episodeId, t.id);
        const history = list.filter(x => x.episodeId === episodeId && x.tag === t.id);
        return (
          <div key={t.id} data-tag={t.id} data-verdict={a?.verdict ?? "INFERRED"} style={{ fontSize: 11, color: MUTED, borderLeft: `2px solid ${a ? (a.verdict === "CORRECTED" ? GOLD : INK) : LINE}`, paddingLeft: 8 }}>
            <span style={{ color: INK }}>{t.label}</span> · <span title={t.evidence}>{t.evidence}</span>{" "}
            <span style={{ color: a ? INK : MUTED }}>[{a ? `${a.verdict}${a.verdict === "CORRECTED" ? `: “${a.correction}”` : ""}` : "INFERRED"}]</span>{" "}
            {editing === t.id ? (
              <span>
                <input value={draft} onChange={ev => setDraft(ev.target.value)} placeholder="What actually happened?" aria-label="Correction"
                  style={{ width: 240, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 11, padding: "1px 6px", borderRadius: 4 }} />{" "}
                <button type="button" disabled={!draft.trim()} onClick={() => record(t, "CORRECTED", draft.trim())} style={btn}>Save correction</button>{" "}
                <button type="button" onClick={() => setEditing(null)} style={btn}>Cancel</button>
              </span>
            ) : (
              <span>
                <button type="button" onClick={() => record(t, "CONFIRMED", "")} style={btn}>Confirm</button>{" "}
                <button type="button" onClick={() => { setEditing(t.id); setDraft(""); }} style={btn}>Correct</button>
              </span>
            )}
            <div style={{ fontSize: 10, color: MUTED }}>{t.rule}</div>
            {history.length > 1 ? <div style={{ fontSize: 10, color: MUTED }}>Lineage: {history.map(h => `${new Date(h.at).toLocaleDateString()} ${h.verdict}${h.correction ? ` “${h.correction}”` : ""}`).join(" → ")}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 10, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 4, padding: "0 6px", cursor: "pointer" };
