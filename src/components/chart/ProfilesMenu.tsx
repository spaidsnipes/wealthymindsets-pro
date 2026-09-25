"use client";

/**
 * THE PROFILES MENU — the one door in front of every profile this repo owns.
 *
 * Founder directive: "there should also have a profiles drop down for all the
 * different vps and the profiles i created, the inventions."
 *
 * ── WHY A CONTROL THAT CANNOT DRAW IS STILL NOT `disabled` ──────────────────
 *
 * This follows the rule already proven in `FootprintControls`: a profile that
 * the feed cannot currently draw keeps its button ARMED and loses its SELECTED
 * ring, rather than being greyed out. Two reasons, both learned the hard way:
 *
 *   1. The condition changes DURING a session. A sided print can arrive a
 *      minute after the trader looks; a control that went dead on load is a
 *      control they have already stopped looking at.
 *   2. `disabled` removes the button from a screen reader's button list and
 *      makes it untappable on a phone — which turns one silence into two.
 *
 * So the reason travels in the visible row, in `title`, and in `aria-label`.
 * The trader is told what is missing, not merely denied.
 *
 * Nothing here decides anything. `selectProfileMenu` compiles the list; this
 * renders it and reports clicks back up.
 *
 * ── IT IS A PANEL NOW, NOT A CHIP-WITH-POPOVER (2026-09-21) ────────────────
 *
 * This used to be a gold chip in `.wm-chart-toolbar-pinned`, the sticky strip
 * above the candles, and the popover it opened was a `PortalPopover` anchored
 * to that chip. D-701 demolished the strip and its SALVAGE clause says where
 * the organ goes: "MIGRATE LEGITIMATE ORGANS INTO WORKSPACE/TOOLS DRAWERS".
 *
 * The popover could NOT come along. `ShellModalDrawer` is `aria-modal` with a
 * Tab trap scoped to its own panel, and `PortalPopover` renders into
 * `document.body` — OUTSIDE that panel. A chip inside the drawer would open a
 * surface a mouse could reach and a keyboard could not, which is the same
 * class of defect as the covered controls the demolition was for. So the body
 * renders INLINE and the chip's two jobs move onto the panel itself: the
 * summary line still prints `vm.summary`, and the computed accessible name
 * still prints `silentNote` verbatim.
 */

import React from "react";
import { Layers, Check } from "lucide-react";
import {
  selectProfileMenu,
  type ProfileId,
  type ProfileMenuEntry,
  type ProfileMenuInput,
  type ProfileFamily,
} from "@/lib/marketData/viewModels/selectProfileMenu";

/** The dot beside each entry. Availability is a colour AND a sentence, never only a colour. */
const AVAILABILITY_DOT: Record<ProfileMenuEntry["availability"], string> = {
  READY: "#4ADE80",
  WAITING_FOR_BARS: "#8B8FA8",
  WAITING_FOR_PRINTS: "#8B8FA8",
  NEEDS_SIDED_TAPE: "#F0B429",
  REFUSED_BY_DATA: "#F0B429",
};

export function ProfilesMenu({
  barsPresent,
  printsPresent,
  observedAggressorFlow,
  active,
  onToggle,
  families,
  heading = "Price instruments",
  testId = "profiles-menu-panel",
  columns = 2,
  stateDetail,
  speciesRefusal,
}: {
  /** Bars RECEIVED, not bars requested. */
  barsPresent: boolean;
  /** At least one real per-trade print received by this chart room. */
  printsPresent: boolean;
  /** `selectAggressorFlow(...).hasFlow` — a sided print OBSERVED, not promised. */
  observedAggressorFlow: boolean;
  active: ProfileMenuInput["active"];
  onToggle: (id: ProfileId) => void;
  /** One door per family — omitted shows the whole catalogue. */
  families?: readonly ProfileFamily[];
  /** The grid's small caps heading ("Price instruments", "Order-flow tools" …). */
  heading?: string;
  testId?: string;
  /** 1 in the narrow tool-family doors, so a tool's name is never truncated. */
  columns?: 1 | 2;
  /** A switched-on row's own position, printed after DRAWING (e.g. a depth). */
  stateDetail?: Readonly<Partial<Record<ProfileId, string>>>;
  /** Species whose selector refused the bars on screen, with its reason (see selectProfileMenu). */
  speciesRefusal?: ProfileMenuInput["speciesRefusal"];
}) {
  const vm = selectProfileMenu({ barsPresent, printsPresent, observedAggressorFlow, active, families, speciesRefusal });

  return (
    <section
      /*
        THE ACCESSIBLE NAME MAY NOT CLAIM MORE THAN THE GLASS SHOWS.

        This used to read "6 of 8 drawing" straight off `activeCount` — but
        active is not drawing. On a tape that states no aggressor side, four
        of those six paint nothing, so the name was announcing a chart that
        did not exist to the one reader who cannot look up and check.

        `silentNote` is the compiler's sentence, printed verbatim. It is not
        re-worded here: the module that measured the gap is the module that
        gets to describe it.

        It rides the PANEL now rather than a chip, because the chip is gone —
        but it is the same sentence, computed the same way, so a screen reader
        entering the drawer is told what a sighted trader can see at the top
        of it.
      */
      aria-label={
        vm.activeCount === 0
          ? "Profiles menu. Nothing switched on."
          : vm.silentCount > 0
            ? `Profiles menu. ${vm.activeCount} of ${vm.entries.length} switched on, ${vm.activeCount - vm.silentCount} drawing. ${vm.silentNote}`
            : `Profiles menu. ${vm.activeCount} of ${vm.entries.length} switched on and drawing.`
      }
      title={
        vm.silentNote ||
        "Every volume profile and microstructure profile this product owns"
      }
      // Published so a probe can read the withheld count without parsing the
      // label, and so the glass and the chrome can be checked against each
      // other from outside the app.
      data-profiles-silent={String(vm.silentCount)}
      data-testid={testId}
      data-profile-layout="instrument-grid"
      className="min-w-0"
    >
        <div
          role="menu"
          aria-label="Profiles"
          className="rounded-lg border border-wm-border bg-wm-surface/95 p-2"
        >
          {/* THE SUMMARY LINE — what the chip used to say, said in place.
              `vm.summary` carries the switched-on count AND the SILENT suffix;
              it is the only profile truth that used to be readable without
              opening the popover, so it opens the panel instead. */}
          <div
            className="flex items-center gap-1 px-1 pb-2 text-[12px] font-bold"
            style={{ color: vm.activeCount > 0 ? "#d4af37" : "#8B8FA8" }}
            data-testid="profiles-menu-summary"
          >
            <Layers size={11} aria-hidden />
            {vm.summary}
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-wm-text-dim">
              {heading}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-wm-text-dim">
              {vm.readyCount}/{vm.entries.length} ready
            </div>
          </div>

          <div className={columns === 1 ? "grid grid-cols-1 gap-1" : "grid grid-cols-2 gap-1"} data-testid={testId === "profiles-menu-panel" ? "profiles-instrument-grid" : `${testId}-grid`}>
            {vm.entries.map(entry => {
              const ready = entry.availability === "READY";
              const stateLabel = ready
                ? entry.active ? (stateDetail?.[entry.id] ? `DRAWING · ${stateDetail[entry.id]}` : "DRAWING") : "READY"
                : entry.availability === "WAITING_FOR_BARS"
                  ? "WAITING FOR BARS"
                  : entry.availability === "WAITING_FOR_PRINTS"
                    ? "WAITING FOR PRINTS"
                    : entry.availability === "REFUSED_BY_DATA"
                      ? entry.active ? "SILENT · DATA REFUSES" : "DATA REFUSES"
                      : entry.active ? "SILENT · TAPE REQUIRED" : "TAPE REQUIRED";

              return (
                <button
                  key={entry.id}
                  role="menuitemcheckbox"
                  aria-checked={entry.active}
                  // NOT `disabled` — see the header. The reason rides along instead.
                  onClick={() => onToggle(entry.id)}
                  title={`${entry.what}\n\n${entry.gestureNote}\n\n${entry.availabilityNote}`}
                  aria-label={`${entry.label}. ${entry.what}. ${entry.availabilityNote}.`}
                  data-profile-id={entry.id}
                  data-profile-availability={entry.availability}
                  data-profile-active={entry.active ? "1" : "0"}
                  className="min-w-0 rounded border px-2 py-1.5 text-left transition-colors hover:bg-wm-card"
                  style={{
                    borderColor: entry.active ? "rgba(212,175,55,0.32)" : "rgba(139,143,168,0.18)",
                    background: entry.active ? "rgba(212,175,55,0.055)" : "rgba(19,21,32,0.54)",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: AVAILABILITY_DOT[entry.availability] }}
                    />
                    {entry.organism != null && (
                      <span
                        className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border text-[8px] font-bold"
                        style={{ borderColor: "rgba(201,165,92,0.55)", color: "#d4af37" }}
                        title={`P-110 organism ${entry.organism}`}
                        data-testid={`profile-organism-${entry.id}`}
                      >
                        {entry.organism}
                      </span>
                    )}
                    <span
                      className="min-w-0 truncate text-[11px] font-bold"
                      style={{ color: entry.active ? "#d4af37" : "#C9CCDA" }}
                    >
                      {entry.label}
                    </span>
                    {entry.gesture === "DRAW" && (
                      <span className="shrink-0 rounded border border-wm-border px-1 text-[7px] uppercase tracking-wider text-wm-text-dim">
                        Box
                      </span>
                    )}
                    {entry.active && <Check size={11} className="ml-auto shrink-0" color="#d4af37" />}
                  </div>

                  <div className="mt-1 flex min-w-0 items-center justify-between gap-2 pl-3">
                    {/* The STATE is the fact the trader needs and never
                        truncates ("REA…" read as nothing). The levels list is
                        detail — it yields, and stays whole in the tooltip. */}
                    <span
                      className="shrink-0 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: AVAILABILITY_DOT[entry.availability] }}
                      data-testid={`profile-note-${entry.id}`}
                    >
                      {stateLabel}
                    </span>
                    <span className="min-w-0 truncate text-right text-[8px] uppercase tracking-[0.08em] text-wm-text-dim">
                      {entry.levels.join(" · ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {vm.silentCount > 0 && (
            <div
              className="mt-2 flex items-center justify-between gap-3 border-t border-wm-border/70 px-1 pt-2 text-[9px] uppercase tracking-[0.1em]"
              data-testid="profiles-silence-summary"
            >
              <span style={{ color: "#F0B429" }}>
                {vm.silentSummary}
              </span>
              <span className="text-wm-text-dim">Hover a reading for full provenance</span>
            </div>
          )}
        </div>
    </section>
  );
}
