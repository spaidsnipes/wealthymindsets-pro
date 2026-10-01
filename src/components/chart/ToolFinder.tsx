"use client";

/**
 * TOOL FINDER + ACTIVE STRIP — Garden 18 §XXVI–§XXVIII.
 *
 * "NOTHING IMPORTANT MAY HIDE." One search box at the top of Tools: type
 * ABSORPTION, TPO, CLARITY or BRICK and the tool is right there with its
 * one-line job, its availability and its switch — no family archaeology.
 * Below it, ACTIVE names every reading on the chart right now, each with ×,
 * so "what the hell is on my chart?" always has an answer.
 *
 * Switches only through `onToggle` — the same handler every family door uses,
 * so a tool can never read ON here and OFF behind its family door.
 */

import React, { useEffect, useMemo, useState } from "react";

import { ROLE_LAYERS, VISUAL_ROLES_EVENT, autoCompose, nextRole, readStoredRoles, writeStoredRoles, type VisualRole, type VisualRoles } from "@/lib/workspace/visualRoles";

import { PROFILE_FAMILY, selectProfileMenu, type ProfileId, type ProfileMenuInput } from "@/lib/marketData/viewModels/selectProfileMenu";
import { censusPlaceWords, searchCensusPlaces } from "@/lib/canon/inventionCensus";
import { FAMILY_WORD, LIBRARY_CATEGORIES, LIBRARY_CATEGORY, searchToolRows, searchTools } from "@/lib/workspace/toolSearch";

/** A chart instrument outside the reading catalogue (footprint modes, Big Trades). */
export interface FinderInstrument { readonly id: string; readonly label: string; readonly what: string; readonly active: boolean; readonly aliases?: readonly string[]; readonly familyWord: string; readonly onToggle: () => void }

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";
const AMBER = "#F0B429";
const ROLE_STYLE: Readonly<Record<VisualRole, React.CSSProperties>> = {
  PRIMARY: { background: GOLD, color: "#14110a" },
  SUPPORTING: { border: "1px solid rgba(212,175,55,0.6)", color: GOLD },
  AMBIENT: { border: "1px solid rgba(139,143,168,0.6)", color: MUTED },
  LATENT: { border: "1px dashed rgba(139,143,168,0.5)", color: MUTED, opacity: 0.8 },
};

export function ToolFinder({ barsPresent, printsPresent, observedAggressorFlow, active, onToggle, speciesRefusal, instruments = [] }: {
  instruments?: readonly FinderInstrument[];
  barsPresent: boolean;
  printsPresent: boolean;
  observedAggressorFlow: boolean;
  active: ProfileMenuInput["active"];
  onToggle: (id: ProfileId) => void;
  speciesRefusal?: ProfileMenuInput["speciesRefusal"];
}) {
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const vm = selectProfileMenu({ barsPresent, printsPresent, observedAggressorFlow, active, speciesRefusal });
  const hits = useMemo(() => searchTools(vm.entries, q, id => PROFILE_FAMILY[id]), [vm.entries, q]);
  const on = vm.entries.filter(e => e.active);
  const instHits = useMemo(() => searchToolRows(instruments, q), [instruments, q]);
  const instOn = instruments.filter(i => i.active);
  const places = useMemo(() => searchCensusPlaces(q), [q]);
  // §XXXVII roles: one store, read here and by the chart's governor.
  const [roles, setRoles] = useState<VisualRoles>({});
  useEffect(() => {
    const load = () => setRoles(readStoredRoles());
    load();
    window.addEventListener(VISUAL_ROLES_EVENT, load);
    return () => window.removeEventListener(VISUAL_ROLES_EVENT, load);
  }, []);
  const setRole = (id: ProfileId, role: VisualRole) => writeStoredRoles({ ...roles, [id]: role });

  return (
    <section data-testid="tool-finder" aria-label="Find a tool" className="rounded-lg border border-wm-border bg-wm-surface/95 p-2 mb-2">
      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }}
        placeholder="Find a tool — absorption, TPO, clarity, brick…"
        aria-label="Find a tool"
        data-testid="tool-finder-input"
        className="w-full rounded border border-wm-border bg-black/40 px-2 py-1.5 text-[12px] outline-none focus:border-wm-gold"
        style={{ color: PEARL }}
      />

      {q.trim() ? (
        <ul data-testid="tool-finder-results" className="mt-1.5 flex flex-col gap-1" aria-label="Matching tools">
          {instHits.map(i => (
            <li key={i.id}>
              <button type="button" role="switch" aria-checked={i.active} data-testid={`tool-finder-${i.id}`} onClick={i.onToggle}
                className="w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
                style={{ border: `1px solid ${i.active ? GOLD : "rgba(255,255,255,0.06)"}` }}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: i.active ? GOLD : "transparent", border: `1px solid ${i.active ? GOLD : MUTED}` }} />
                  <span className="text-[12.5px] font-semibold" style={{ color: i.active ? GOLD : PEARL }}>{i.label}</span>
                  <span className="ml-auto text-[9.5px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{i.familyWord}</span>
                </span>
                <span className="block pl-4 text-[11px] leading-snug" style={{ color: MUTED }}>{i.what}</span>
              </button>
            </li>
          ))}
          {places.map(e => (
            <li key={e.id} data-testid={`tool-finder-place-${e.id}`} className="rounded px-2 py-1.5" style={{ border: "1px dashed rgba(212,175,55,0.35)" }}>
              <span className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold" style={{ color: PEARL }}>{e.name}</span>
                <span className="ml-auto text-[9.5px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{e.status === "PARTIAL" ? "partly built" : "in context"}</span>
              </span>
              {e.surface.kind === "ROUTE" ? (
                <a href={e.surface.href} className="block text-[11px] leading-snug underline" style={{ color: GOLD }}>{censusPlaceWords(e)}</a>
              ) : (
                <span className="block text-[11px] leading-snug" style={{ color: GOLD }}>Where: {censusPlaceWords(e)}</span>
              )}
            </li>
          ))}
          {hits.length === 0 && instHits.length === 0 && places.length === 0 ? (
            <li className="px-1 text-[11px]" style={{ color: MUTED }}>No tool by that name. Try a word it does — “delta”, “profile”, “walls”.</li>
          ) : hits.map(e => (
            <li key={e.id}>
              <button
                type="button"
                role="switch"
                aria-checked={e.active}
                data-testid={`tool-finder-${e.id}`}
                onClick={() => onToggle(e.id)}
                className="w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
                style={{ border: `1px solid ${e.active ? GOLD : "rgba(255,255,255,0.06)"}` }}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: e.active ? GOLD : "transparent", border: `1px solid ${e.active ? GOLD : MUTED}` }} />
                  <span className="text-[12.5px] font-semibold" style={{ color: e.active ? GOLD : PEARL }}>{e.label}</span>
                  <span className="ml-auto text-[9.5px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{FAMILY_WORD[PROFILE_FAMILY[e.id]]}</span>
                </span>
                <span className="block pl-4 text-[11px] leading-snug" style={{ color: MUTED }}>{e.what}</span>
                {e.availability !== "READY" ? (
                  <span className="block pl-4 text-[10.5px] leading-snug" style={{ color: AMBER }}>{e.availabilityNote}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!q.trim() ? (
        <button type="button" data-testid="tool-library-toggle" aria-expanded={browse} onClick={() => setBrowse(b => !b)}
          className="mt-1.5 text-[11px]" style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {browse ? "▾" : "▸"} Browse all tools by family
        </button>
      ) : null}
      {browse && !q.trim() ? (
        <div data-testid="tool-library" className="mt-1.5 flex flex-col gap-2">
          {LIBRARY_CATEGORIES.map(cat => {
            const rows = vm.entries.filter(e => LIBRARY_CATEGORY[e.id] === cat);
            const extra = cat === "ORDER FLOW" ? instruments : [];
            if (!rows.length && !extra.length) return null;
            return (
              <div key={cat}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{cat}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rows.map(e => (
                    <button key={e.id} type="button" role="switch" aria-checked={e.active} title={e.availability === "READY" ? e.what : e.availabilityNote}
                      data-testid={`tool-library-${e.id}`} onClick={() => onToggle(e.id)}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ border: `1px solid ${e.active ? GOLD : "rgba(255,255,255,0.12)"}`, color: e.active ? GOLD : e.availability === "READY" ? PEARL : AMBER, background: e.active ? "rgba(212,175,55,0.1)" : "transparent" }}>
                      {e.label}
                    </button>
                  ))}
                  {extra.map(i => (
                    <button key={i.id} type="button" role="switch" aria-checked={i.active} title={i.what} onClick={i.onToggle}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ border: `1px solid ${i.active ? GOLD : "rgba(255,255,255,0.12)"}`, color: i.active ? GOLD : PEARL, background: i.active ? "rgba(212,175,55,0.1)" : "transparent" }}>
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div data-testid="active-tools-strip" className="mt-2 flex flex-wrap items-center gap-1" aria-label="Active on the chart">
        <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>Active</span>
        {on.some(e => ROLE_LAYERS[e.id]) ? (
          <button type="button" data-testid="auto-compose" title="Give one sense the lead and quiet the context — nothing is switched off"
            onClick={() => writeStoredRoles(autoCompose(on.map(e => e.id)))}
            className="ml-auto order-last rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: GOLD, border: "1px solid rgba(212,175,55,0.45)" }}>
            Auto compose
          </button>
        ) : null}
        {instOn.map(i => (
          <span key={i.id} data-testid={`active-tool-${i.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
            style={{ border: "1px solid rgba(212,175,55,0.55)", color: PEARL }} title={i.what}>
            {i.label}
            <button type="button" aria-label={`Turn off ${i.label}`} data-testid={`active-tool-off-${i.id}`} onClick={i.onToggle}
              className="ml-0.5 leading-none hover:text-white" style={{ color: MUTED }}>×</button>
          </span>
        ))}
        {on.length === 0 && instOn.length === 0 ? (
          <span className="text-[11px]" style={{ color: MUTED }}>Clean — just the market.</span>
        ) : on.map(e => (
          <span key={e.id} data-testid={`active-tool-${e.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
            style={{ border: `1px solid ${e.availability === "READY" ? "rgba(212,175,55,0.55)" : "rgba(240,180,41,0.55)"}`, color: e.availability === "READY" ? PEARL : AMBER }}
            title={e.availability === "READY" ? e.what : e.availabilityNote}>
            {e.label}
            {ROLE_LAYERS[e.id] ? (
              <button type="button" data-testid={`role-${e.id}`} data-role={roles[e.id] ?? "SUPPORTING"}
                aria-label={`${e.label} visual role: ${(roles[e.id] ?? "SUPPORTING").toLowerCase()}. Press to change.`}
                title="Primary · Supporting · Ambient · Latent"
                onClick={() => setRole(e.id, nextRole(roles[e.id]))}
                className="rounded px-1 text-[9px] font-bold leading-[14px]"
                style={ROLE_STYLE[roles[e.id] ?? "SUPPORTING"]}>
                {(roles[e.id] ?? "SUPPORTING")[0]}
              </button>
            ) : null}
            <button type="button" aria-label={`Turn off ${e.label}`} data-testid={`active-tool-off-${e.id}`} onClick={() => onToggle(e.id)}
              className="ml-0.5 leading-none hover:text-white" style={{ color: MUTED }}>×</button>
          </span>
        ))}
      </div>
    </section>
  );
}
