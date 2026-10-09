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

import { VISUAL_ROLES_EVENT, readStoredRoles, type VisualRoles } from "@/lib/workspace/visualRoles";

import { PROFILE_FAMILY, selectProfileMenu, type ProfileId, type ProfileMenuInput } from "@/lib/marketData/viewModels/selectProfileMenu";
import { censusPlaceWords, searchCensusPlaces } from "@/lib/canon/inventionCensus";
import { FAMILY_WORD, LIBRARY_CATEGORIES, LIBRARY_CATEGORY, searchToolRows, searchTools } from "@/lib/workspace/toolSearch";
import { educationTruthLines } from "@/lib/chart/inventionEducation";
import type { ChainScope } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";
import { InventionInfoButton, InventionPreview } from "./InventionInfo";
import { ActiveToolsPanel } from "./ActiveToolsPanel";

/** A chart instrument outside the reading catalogue (footprint modes, Big Trades). */
export interface FinderInstrument {
  readonly id: string; readonly label: string; readonly what: string; readonly active: boolean; readonly aliases?: readonly string[]; readonly familyWord: string; readonly onToggle: () => void;
  /** §9 · its owner's verdict for THIS chart (e.g. the order-flow capability reason), printed verbatim by the ⓘ preview. */
  readonly truth?: { readonly ok: boolean; readonly waiting?: boolean; readonly sentence: string };
}

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";
const AMBER = "#F0B429";

export function ToolFinder({ barsPresent, printsPresent, observedAggressorFlow, active, onToggle, speciesRefusal, instruments = [], symbol, feed = null, stateDetail, chainScope = null }: {
  /** §B5 · the chart's paint receipts as words (`senseEventStates`) — Active tools says what the glass holds. */
  stateDetail?: Readonly<Partial<Record<string, string>>>;
  instruments?: readonly FinderInstrument[];
  symbol?: string;
  /** §9 · the chart feed's quality (DELAYED, STALE …) — the ⓘ preview says what that means for the tool. */
  feed?: MarketQualityState | "UNKNOWN" | null;
  /** §20 · the options chain the pressure owner heard — an options tool's ⓘ states a near-money subset. */
  chainScope?: ChainScope | null;
  barsPresent: boolean;
  printsPresent: boolean;
  observedAggressorFlow: boolean;
  active: ProfileMenuInput["active"];
  onToggle: (id: ProfileId) => void;
  speciesRefusal?: ProfileMenuInput["speciesRefusal"];
}) {
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const vm = selectProfileMenu({ barsPresent, printsPresent, observedAggressorFlow, active, speciesRefusal, symbol });
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
  // §9 · ONE preview open at a time, under the row it explains.
  const [eduId, setEduId] = useState<string | null>(null);
  const flip = (id: string) => setEduId(cur => (cur === id ? null : id));
  const entryPreview = (e: (typeof vm.entries)[number], scope = "finder") => eduId === e.id ? (
    <InventionPreview scope={scope} id={e.id} label={e.label} what={e.what} familyWord={FAMILY_WORD[PROFILE_FAMILY[e.id]]} symbol={symbol}
      truth={educationTruthLines({ entry: e, feed, chainScope })} active={e.active} gestureNote={e.gesture === "DRAW" ? e.gestureNote : undefined}
      onAdd={() => onToggle(e.id)} onClose={() => setEduId(null)} />
  ) : null;
  const instPreview = (i: FinderInstrument, scope = "finder") => eduId === i.id ? (
    <InventionPreview scope={scope} id={i.id} label={i.label} what={i.what} familyWord={i.familyWord} symbol={symbol}
      truth={educationTruthLines({ instrumentTruth: i.truth ?? null, feed, id: i.id, symbol })} active={i.active}
      onAdd={i.onToggle} onClose={() => setEduId(null)} />
  ) : null;

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
              <div className="flex items-start gap-1">
              <button type="button" role="switch" aria-checked={i.active} data-testid={`tool-finder-${i.id}`} onClick={i.onToggle}
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-white/5"
                style={{ border: `1px solid ${i.active ? GOLD : "rgba(255,255,255,0.06)"}` }}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: i.active ? GOLD : "transparent", border: `1px solid ${i.active ? GOLD : MUTED}` }} />
                  <span className="text-[12.5px] font-semibold" style={{ color: i.active ? GOLD : PEARL }}>{i.label}</span>
                  <span className="ml-auto text-[9.5px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{i.familyWord}</span>
                </span>
                <span className="block pl-4 text-[11px] leading-snug" style={{ color: MUTED }}>{i.what}</span>
              </button>
              <InventionInfoButton scope="finder" id={i.id} label={i.label} open={eduId === i.id} onToggle={() => flip(i.id)} />
              </div>
              {instPreview(i)}
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
              <div className="flex items-start gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={e.active}
                data-testid={`tool-finder-${e.id}`}
                onClick={() => onToggle(e.id)}
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-white/5"
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
              <InventionInfoButton scope="finder" id={e.id} label={e.label} open={eduId === e.id} onToggle={() => flip(e.id)} />
              </div>
              {entryPreview(e)}
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
            // Footprint modes browse under ORDER FLOW; a context instrument
            // (Session Bands, familyWord "Context") under MARKET SENSE.
            const extra = instruments.filter(i => (i.familyWord === "Context" ? "MARKET SENSE" : "ORDER FLOW") === cat);
            if (!rows.length && !extra.length) return null;
            return (
              <div key={cat}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{cat}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {rows.map(e => (
                    <span key={e.id} className="inline-flex items-center gap-0.5">
                    <button type="button" role="switch" aria-checked={e.active} title={e.availability === "READY" ? e.what : e.availabilityNote}
                      data-testid={`tool-library-${e.id}`} onClick={() => onToggle(e.id)}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ border: `1px solid ${e.active ? GOLD : "rgba(255,255,255,0.12)"}`, color: e.active ? GOLD : e.availability === "READY" ? PEARL : AMBER, background: e.active ? "rgba(212,175,55,0.1)" : "transparent" }}>
                      {e.label}
                    </button>
                    <InventionInfoButton compact scope="library" id={e.id} label={e.label} open={eduId === e.id} onToggle={() => flip(e.id)} />
                    </span>
                  ))}
                  {extra.map(i => (
                    <span key={i.id} className="inline-flex items-center gap-0.5">
                    <button type="button" role="switch" aria-checked={i.active} title={i.what} onClick={i.onToggle}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ border: `1px solid ${i.active ? GOLD : "rgba(255,255,255,0.12)"}`, color: i.active ? GOLD : PEARL, background: i.active ? "rgba(212,175,55,0.1)" : "transparent" }}>
                      {i.label}
                    </button>
                    <InventionInfoButton compact scope="library" id={i.id} label={i.label} open={eduId === i.id} onToggle={() => flip(i.id)} />
                    </span>
                  ))}
                </div>
                {rows.map(e => eduId === e.id ? <div key={`edu-${e.id}`}>{entryPreview(e, "library")}</div> : null)}
                {extra.map(i => eduId === i.id ? <div key={`edu-${i.id}`}>{instPreview(i, "library")}</div> : null)}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* §B5 ACTIVE TOOLS (2026-10-07): one compact panel — every sense ON,
          its receipt's words, focus / configure / hide / remove. */}
      <ActiveToolsPanel
        entries={vm.entries}
        instruments={instOn}
        receipts={stateDetail}
        roles={roles}
        onToggle={onToggle}
        configureOpenId={q.trim() ? null : eduId}
        onConfigure={flip}
        renderConfigure={id => {
          const e = vm.entries.find(x => x.id === id);
          if (e) return entryPreview(e, "active");
          const i = instruments.find(x => x.id === id);
          return i ? instPreview(i, "active") : null;
        }}
      />
    </section>
  );
}
