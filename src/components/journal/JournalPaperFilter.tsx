"use client";

/**
 * LIVE / PAPER in the Journal (coordinator ruling 2026-10-10). The list can show live, paper or both; every RESULT
 * is live only (paperEntry.ts). The filter is drawn only when the book holds a paper entry; the header line says
 * how many paper entries are left out of the results. One component for the Journal and its proof scene.
 */
import { clsx } from "clsx";
import React from "react";

export type PaperFilter = "all" | "live" | "paper";

/** The header clause, or "" when there is no paper entry. */
export function paperHeldOutNote(paperCount: number): string {
  return paperCount > 0 ? ` · ${paperCount} PAPER not in results` : "";
}

export function JournalPaperFilter({ paperCount, value, onChange }: { readonly paperCount: number; readonly value: PaperFilter; readonly onChange: (v: PaperFilter) => void }): React.ReactElement | null {
  if (paperCount <= 0) return null;
  return (
    <div role="group" aria-label="Live or paper" className="flex items-center gap-1">
      {(["all", "live", "paper"] as const).map(k => (
        <button key={k} type="button" data-testid="journal-paper-filter" data-filter={k} aria-pressed={value === k} onClick={() => onChange(k)}
          className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all", value === k ? "bg-wm-surface text-wm-text border-wm-border" : "text-wm-text-muted border-transparent hover:border-wm-border")}>
          {k === "all" ? "Live + paper" : k === "live" ? "Live" : `Paper (${paperCount})`}
        </button>
      ))}
    </div>
  );
}

/** The PAPER mark beside a row's symbol. */
export function PaperMark(): React.ReactElement {
  return <span data-testid="journal-paper-mark" className="ml-1.5 px-1 rounded text-[10px] font-bold border" style={{ color: "#d9a441", borderColor: "#d9a44188" }}>PAPER</span>;
}
