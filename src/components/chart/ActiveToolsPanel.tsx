"use client";

/**
 * ACTIVE TOOLS — Drive Garden 18 snapshot 10-02 §B5 (2026-10-07).
 *
 * Every sense ON for this chart, one row each, with FOCUS (bring forward /
 * quiet the others), CONFIGURE (opens the tool's family door with its row
 * brought forward — `toolDoor.ts`; a tool no door holds opens its ⓘ card
 * under the row), HIDE (kept on, quiet — LATENT) and REMOVE (the switch, through the
 * same `onToggle` every family door uses). The words on each row come from
 * `selectActiveTools`, which reads the chart's own paint receipts — the panel
 * says "ON — nothing on this camera" when the glass holds nothing, never
 * "on the chart".
 *
 * Keyboard: every control is a button; Escape inside an open card closes it
 * and returns focus to that row's Configure. ATH material: graphite + gold,
 * 44 px targets.
 */
import React from "react";

import type { ProfileId, ProfileMenuEntry } from "@/lib/marketData/viewModels/selectProfileMenu";
import { autoCompose, nextRole, ROLE_LAYERS, writeStoredRoles, type VisualRole, type VisualRoles } from "@/lib/workspace/visualRoles";
import { familyDoorFor, openToolDoor } from "@/lib/workspace/toolDoor";
import { clearFocus, focusTool, selectActiveTools, toggleHidden, toolFocused, type ActiveToolPaint } from "@/lib/workspace/activeTools";

const GOLD = "#d4af37";
const PEARL = "#E8EAF2";
const MUTED = "#8B8FA8";
const AMBER = "#F0B429";
const GRAPHITE = "rgba(11,10,8,0.6)";

const PAINT_INK: Readonly<Record<ActiveToolPaint, string>> = {
  PAINTING: GOLD,
  QUIET: MUTED,
  BLOCKED: AMBER,
  UNREPORTED: PEARL,
};

const ROLE_STYLE: Readonly<Record<VisualRole, React.CSSProperties>> = {
  PRIMARY: { background: GOLD, color: "#14110a" },
  SUPPORTING: { border: "1px solid rgba(212,175,55,0.6)", color: GOLD },
  AMBIENT: { border: "1px solid rgba(139,143,168,0.6)", color: MUTED },
  LATENT: { border: "1px dashed rgba(139,143,168,0.5)", color: MUTED, opacity: 0.8 },
};

/** A chart instrument outside the reading catalogue (footprint modes, Big Trades …). */
export interface ActiveInstrument {
  readonly id: string;
  readonly label: string;
  readonly what: string;
  readonly onToggle: () => void;
}

const BTN: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  borderRadius: 4,
  border: "1px solid rgba(212,175,55,0.28)",
  background: "transparent",
  color: MUTED,
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
};

export function ActiveToolsPanel({ entries, instruments = [], receipts, roles, onToggle, configureOpenId, onConfigure, renderConfigure, openDoor = openToolDoor }: {
  /** Configure's deep link — opens the tool's family door (toolDoor.ts). False → no door holds it. */
  openDoor?: (id: string) => boolean;
  /** The catalogue's rows (any order); only `active` ones are listed. */
  entries: readonly ProfileMenuEntry[];
  /** Instruments that are ON right now. */
  instruments?: readonly ActiveInstrument[];
  /** The chart's paint receipts as words (`senseEventStates`). */
  receipts?: Readonly<Partial<Record<string, string>>>;
  roles: VisualRoles;
  onToggle: (id: ProfileId) => void;
  /** Which row's ⓘ card is open (one at a time — the finder owns it). */
  configureOpenId: string | null;
  onConfigure: (id: string) => void;
  /** The tool's existing card, rendered under its row when open. */
  renderConfigure: (id: string) => React.ReactNode;
}) {
  const rows = selectActiveTools({ entries, receipts, roles });
  const activeIds = rows.map(r => r.id);
  const configButtons = React.useRef(new Map<string, HTMLButtonElement>());
  const anyFocus = rows.some(r => toolFocused(roles, r.id));

  const closeOnEscape = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || configureOpenId !== id) return;
    e.preventDefault();
    e.stopPropagation();
    onConfigure(id);
    configButtons.current.get(id)?.focus();
  };

  // CONFIGURE = the tool's family door (Tools › the W, or Chart tools), with
  // its row brought forward. A tool no door holds opens its ⓘ card instead.
  const configureButton = (id: string, label: string) => (
    <button
      type="button"
      ref={el => { if (el) configButtons.current.set(id, el); else configButtons.current.delete(id); }}
      data-testid={`active-tool-configure-${id}`}
      data-tool-door={familyDoorFor(id) ?? "CARD"}
      aria-label={familyDoorFor(id) ? `Configure ${label} — opens its tools door` : `Configure ${label}`}
      aria-expanded={familyDoorFor(id) ? undefined : configureOpenId === id}
      title={familyDoorFor(id) ? "Configure — open its tools door" : "Configure — its card"}
      onClick={() => { if (!openDoor(id)) onConfigure(id); }}
      style={{ ...BTN, color: configureOpenId === id ? GOLD : MUTED }}
    >
      <span aria-hidden>⚙</span>
    </button>
  );

  return (
    <section
      data-testid="active-tools-strip"
      data-active-tools-count={rows.length + instruments.length}
      aria-label="Active tools on this chart"
      className="mt-2 rounded-lg p-1.5"
      style={{ background: GRAPHITE, border: "1px solid rgba(212,175,55,0.22)" }}
    >
      <div className="flex items-center gap-1 px-1 pb-1">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
          Active tools · {rows.length + instruments.length}
        </span>
        {anyFocus ? (
          <button type="button" data-testid="active-tools-unfocus" onClick={() => writeStoredRoles(clearFocus(roles, activeIds))}
            className="ml-auto rounded px-2 text-[10px] font-semibold" style={{ ...BTN, minWidth: 0, fontSize: 10, color: GOLD }}>
            Unfocus
          </button>
        ) : null}
        {rows.some(r => ROLE_LAYERS[r.id]) ? (
          <button type="button" data-testid="auto-compose" title="Give one sense the lead and quiet the context — nothing is switched off"
            onClick={() => writeStoredRoles(autoCompose(activeIds))}
            className={`${anyFocus ? "" : "ml-auto "}rounded px-2 text-[10px] font-semibold`} style={{ ...BTN, minWidth: 0, fontSize: 10, color: GOLD }}>
            Auto compose
          </button>
        ) : null}
      </div>

      {rows.length === 0 && instruments.length === 0 ? (
        <p className="px-1 text-[11px]" style={{ color: MUTED }}>Clean — just the market.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Active tools">
          {rows.map(r => {
            const focused = toolFocused(roles, r.id);
            return (
              <li key={r.id} data-testid={`active-tool-${r.id}`} data-active-tool-paint={r.paint} data-active-tool-role={r.role}
                onKeyDown={closeOnEscape(r.id)}
                className="rounded px-1.5 py-1" style={{ border: `1px solid ${focused ? GOLD : "rgba(212,175,55,0.16)"}`, opacity: r.hidden ? 0.75 : 1 }}>
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold" style={{ color: focused ? GOLD : PEARL }}>{r.label}</span>
                    <span data-testid={`active-tool-words-${r.id}`} className="block text-[10.5px] leading-snug" style={{ color: PAINT_INK[r.paint] }}>{r.words}</span>
                  </span>
                  {r.composable ? (
                    <button type="button" data-testid={`role-${r.id}`} data-role={r.role}
                      aria-label={`${r.label} visual role: ${r.role.toLowerCase()}. Press to change.`}
                      title="Primary · Supporting · Ambient · Latent"
                      onClick={() => writeStoredRoles({ ...roles, [r.id]: nextRole(roles[r.id]) })}
                      className="rounded text-[10px] font-bold" style={{ ...BTN, ...ROLE_STYLE[r.role] }}>
                      {r.role[0]}
                    </button>
                  ) : null}
                  <button type="button" data-testid={`active-tool-focus-${r.id}`} aria-pressed={focused} disabled={!r.composable}
                    aria-label={focused ? `${r.label} is in focus` : `Focus ${r.label} — bring it forward, quiet the others`}
                    title={r.composable ? "Focus — bring forward, quiet the others" : "This tool has no layer to bring forward"}
                    onClick={() => writeStoredRoles(focusTool(roles, activeIds, r.id))}
                    style={{ ...BTN, color: focused ? GOLD : MUTED, opacity: r.composable ? 1 : 0.4, cursor: r.composable ? "pointer" : "default" }}>
                    <span aria-hidden>◎</span>
                  </button>
                  {configureButton(r.id, r.label)}
                  <button type="button" data-testid={`active-tool-hide-${r.id}`} aria-pressed={r.hidden} disabled={!r.composable}
                    aria-label={r.hidden ? `Show ${r.label} again` : `Hide ${r.label} — keep it on, quiet`}
                    title={r.composable ? (r.hidden ? "Show again" : "Hide — keep on, quiet") : "This tool has no layer to quiet"}
                    onClick={() => writeStoredRoles(toggleHidden(roles, r.id))}
                    style={{ ...BTN, color: r.hidden ? GOLD : MUTED, opacity: r.composable ? 1 : 0.4, cursor: r.composable ? "pointer" : "default" }}>
                    <span aria-hidden>{r.hidden ? "◌" : "◐"}</span>
                  </button>
                  <button type="button" data-testid={`active-tool-off-${r.id}`} aria-label={`Turn off ${r.label}`} title="Remove — switch it off"
                    onClick={() => onToggle(r.id)} style={BTN}>
                    <span aria-hidden>×</span>
                  </button>
                </div>
                {configureOpenId === r.id ? renderConfigure(r.id) : null}
              </li>
            );
          })}
          {instruments.map(i => (
            <li key={i.id} data-testid={`active-tool-${i.id}`} data-active-tool-paint="UNREPORTED" onKeyDown={closeOnEscape(i.id)}
              className="rounded px-1.5 py-1" style={{ border: "1px solid rgba(212,175,55,0.16)" }} title={i.what}>
              <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold" style={{ color: PEARL }}>{i.label}</span>
                  <span className="block text-[10.5px] leading-snug" style={{ color: PEARL }}>ON</span>
                </span>
                {configureButton(i.id, i.label)}
                <button type="button" data-testid={`active-tool-off-${i.id}`} aria-label={`Turn off ${i.label}`} title="Remove — switch it off"
                  onClick={i.onToggle} style={BTN}>
                  <span aria-hidden>×</span>
                </button>
              </div>
              {configureOpenId === i.id ? renderConfigure(i.id) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
