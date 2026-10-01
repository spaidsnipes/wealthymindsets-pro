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

import React, { useMemo, useState } from "react";

import { PROFILE_FAMILY, selectProfileMenu, type ProfileId, type ProfileMenuInput } from "@/lib/marketData/viewModels/selectProfileMenu";
import { FAMILY_WORD, searchTools } from "@/lib/workspace/toolSearch";

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";
const AMBER = "#F0B429";

export function ToolFinder({ barsPresent, printsPresent, observedAggressorFlow, active, onToggle, speciesRefusal }: {
  barsPresent: boolean;
  printsPresent: boolean;
  observedAggressorFlow: boolean;
  active: ProfileMenuInput["active"];
  onToggle: (id: ProfileId) => void;
  speciesRefusal?: ProfileMenuInput["speciesRefusal"];
}) {
  const [q, setQ] = useState("");
  const vm = selectProfileMenu({ barsPresent, printsPresent, observedAggressorFlow, active, speciesRefusal });
  const hits = useMemo(() => searchTools(vm.entries, q, id => PROFILE_FAMILY[id]), [vm.entries, q]);
  const on = vm.entries.filter(e => e.active);

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
          {hits.length === 0 ? (
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

      <div data-testid="active-tools-strip" className="mt-2 flex flex-wrap items-center gap-1" aria-label="Active on the chart">
        <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>Active</span>
        {on.length === 0 ? (
          <span className="text-[11px]" style={{ color: MUTED }}>Clean — just the market.</span>
        ) : on.map(e => (
          <span key={e.id} data-testid={`active-tool-${e.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
            style={{ border: `1px solid ${e.availability === "READY" ? "rgba(212,175,55,0.55)" : "rgba(240,180,41,0.55)"}`, color: e.availability === "READY" ? PEARL : AMBER }}
            title={e.availability === "READY" ? e.what : e.availabilityNote}>
            {e.label}
            <button type="button" aria-label={`Turn off ${e.label}`} data-testid={`active-tool-off-${e.id}`} onClick={() => onToggle(e.id)}
              className="ml-0.5 leading-none hover:text-white" style={{ color: MUTED }}>×</button>
          </span>
        ))}
      </div>
    </section>
  );
}
