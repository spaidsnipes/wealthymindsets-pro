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
 */

import React, { useRef, useState } from "react";
import { Layers, Check } from "lucide-react";
import { PortalPopover } from "./FootprintControls";
import {
  selectProfileMenu,
  type ProfileId,
  type ProfileMenuEntry,
  type ProfileMenuInput,
} from "@/lib/marketData/viewModels/selectProfileMenu";

/** The dot beside each entry. Availability is a colour AND a sentence, never only a colour. */
const AVAILABILITY_DOT: Record<ProfileMenuEntry["availability"], string> = {
  READY: "#4ADE80",
  WAITING_FOR_BARS: "#8B8FA8",
  NEEDS_SIDED_TAPE: "#F0B429",
};

export function ProfilesMenu({
  barsPresent,
  observedAggressorFlow,
  active,
  onToggle,
}: {
  /** Bars RECEIVED, not bars requested. */
  barsPresent: boolean;
  /** `selectAggressorFlow(...).hasFlow` — a sided print OBSERVED, not promised. */
  observedAggressorFlow: boolean;
  active: ProfileMenuInput["active"];
  onToggle: (id: ProfileId) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const vm = selectProfileMenu({ barsPresent, observedAggressorFlow, active });

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        /*
          THE ACCESSIBLE NAME MAY NOT CLAIM MORE THAN THE GLASS SHOWS.

          This used to read "6 of 8 drawing" straight off `activeCount` — but
          active is not drawing. On a tape that states no aggressor side, four
          of those six paint nothing, so the name was announcing a chart that
          did not exist to the one reader who cannot look up and check.

          `silentNote` is the compiler's sentence, printed verbatim. It is not
          re-worded here: the module that measured the gap is the module that
          gets to describe it.
        */
        aria-label={
          vm.activeCount === 0
            ? "Profiles menu. Nothing switched on."
            : vm.silentCount > 0
              ? `Profiles menu. ${vm.activeCount} of ${vm.entries.length} switched on, ${vm.activeCount - vm.silentCount} drawing. ${vm.silentNote}`
              : `Profiles menu. ${vm.activeCount} of ${vm.entries.length} switched on and drawing.`
        }
        className="flex items-center gap-1 px-2 h-5 rounded text-[12px] font-bold transition-all border shrink-0 whitespace-nowrap"
        style={{
          background: vm.activeCount > 0 ? "rgba(212,175,55,0.15)" : "#131520",
          borderColor: vm.activeCount > 0 ? "rgba(212,175,55,0.5)" : "#1E2030",
          color: vm.activeCount > 0 ? "#d4af37" : "#8B8FA8",
        }}
        title={
          vm.silentNote ||
          "Every volume profile and microstructure profile this product owns"
        }
        data-testid="profiles-menu-chip"
        // Published so a probe can read the withheld count without parsing the
        // label, and so the glass and the chrome can be checked against each
        // other from outside the app.
        data-profiles-silent={String(vm.silentCount)}
      >
        <Layers size={11} />
        {vm.summary}
      </button>

      <PortalPopover anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={296}>
        <div
          role="menu"
          className="rounded-lg border border-wm-border bg-wm-surface shadow-2xl p-1.5"
          data-testid="profiles-menu-panel"
        >
          <div className="px-2 pt-1 pb-2 text-[9px] uppercase tracking-[0.14em] text-wm-text-dim">
            Profiles · {vm.readyCount} of {vm.entries.length} can draw now
          </div>

          {vm.entries.map(entry => {
            const ready = entry.availability === "READY";
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
                className="w-full text-left px-2 py-2 rounded hover:bg-wm-card transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: AVAILABILITY_DOT[entry.availability] }}
                  />
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: entry.active ? "#d4af37" : "#C9CCDA" }}
                  >
                    {entry.label}
                  </span>
                  {entry.gesture === "DRAW" && (
                    <span className="text-[8px] uppercase tracking-wider text-wm-text-dim border border-wm-border rounded px-1">
                      Box
                    </span>
                  )}
                  {entry.active && <Check size={12} className="ml-auto" color="#d4af37" />}
                </div>

                <div className="mt-0.5 pl-3.5 text-[10px] leading-snug text-wm-text-dim">
                  {entry.what}
                </div>

                {/* The levels it publishes — so the row never implies more than it has. */}
                <div className="mt-1 pl-3.5 flex flex-wrap gap-1">
                  {entry.levels.map(l => (
                    <span
                      key={l}
                      className="text-[8px] uppercase tracking-wider text-wm-text-dim border border-wm-border/60 rounded px-1 py-[1px]"
                    >
                      {l}
                    </span>
                  ))}
                </div>

                {/*
                  Why it is in that state. Printed for every row that is NOT
                  ready, because the difference between "wait" and "do not wait"
                  is the whole reason this field exists.
                */}
                {!ready && (
                  <div
                    className="mt-1 pl-3.5 text-[10px] leading-snug"
                    style={{ color: AVAILABILITY_DOT[entry.availability] }}
                    data-testid={`profile-note-${entry.id}`}
                  >
                    {entry.availabilityNote}
                  </div>
                )}

                {ready && entry.gesture === "DRAW" && (
                  <div className="mt-1 pl-3.5 text-[10px] leading-snug text-wm-text-dim">
                    {entry.gestureNote}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </PortalPopover>
    </div>
  );
}
