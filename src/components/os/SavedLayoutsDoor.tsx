"use client";
/**
 * SAVED LAYOUTS — the trader's own desks, in the WORKSPACE door, directly
 * under Clean / Order Flow / Regime / Review.
 *
 * F24 "Layout" (Garden 11): "WORKSPACE = arrangements of the same Market
 * room: Clean. Order Flow. Regime. Review. Approved saved layouts." Until this
 * shipped, the only saved arrangement was one unnamed "My stack" slot in the
 * TOOLS door. It is migrated here as the first entry (see `savedLayouts.ts`).
 *
 * ── EQUIPMENT ON THE SAME CAMERA, NOT A ROOM ───────────────────────────────
 *
 * Compact on purpose: one row per layout, one input that appears only when
 * asked for. No new rail, no new destination, no route — every control here is
 * a button or an input, and applying a layout arranges the chart the trader is
 * already looking at.
 *
 * ── ONE ARRANGEMENT BRAIN ──────────────────────────────────────────────────
 *
 * This component never touches a chart switch. It is TOLD what the chart is
 * arranged as (`subscribeArrangementCapture` — the room publishes the
 * compiler's `captureArrangement`) and it ASKS the room to arrange
 * (`requestSavedLayout`), which the room answers through the same
 * `arrangementDeskRef` → `applyRespectingLocks` door the four desks use.
 * What this component owns is the LIST: its names and its storage.
 *
 * ── KEYBOARD ───────────────────────────────────────────────────────────────
 *
 *   Enter   in a name input saves / renames.
 *   Escape  in a name input (or on an armed Delete) closes THAT and stops
 *           there — one press, one step. With nothing open here it is left to
 *           bubble, and the frame puts the whole Workspace sheet down.
 *   Focus   returns to the control that opened the step: the Save trigger,
 *           the row's Rename button, or — after a delete — the next row.
 */
import * as React from "react";

import {
  announcedArrangementCapture,
  announcedOwnArrangement,
  requestSavedLayout,
  subscribeArrangementCapture,
  subscribeOwnArrangement,
  type ArrangementCapture,
} from "@/lib/workspace/equipmentChannel";
import {
  deleteLayout,
  duplicateLayout,
  duplicateStarterView,
  layoutOnCount,
  loadSavedLayouts,
  MAX_LAYOUT_NAME_LENGTH,
  migrateCurrentView,
  renameLayout,
  restoreStarterView,
  SAVED_LAYOUTS_STORAGE_KEY,
  saveLayout,
  saveStarterView,
  starterOverride,
  starterView,
  storeSavedLayouts,
  userViews,
  type SavedLayout,
} from "@/lib/workspace/savedLayouts";
import { notifyMyViewsChanged, subscribeMyViews, syncStarterViews } from "@/lib/workspace/myViewsRuntime";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { readStoredProfileStrength, writeStoredProfileStrength } from "@/lib/chart/profileStrengthStore";
import { readStoredRoles, writeStoredRoles } from "@/lib/workspace/visualRoles";
import { announcedFootprintPrefs, requestFootprintPrefs } from "@/lib/workspace/footprintPrefs";
import { ARRANGEMENT_SPECS, CAMERA_LOADOUTS, camerasInForce, composeCamera, loadoutSwitches, savedArrangementInForce, type ArrangementId } from "@/lib/marketData/viewModels/selectChartArrangement";

/** The frame's own ink, handed in so the door paints in the hand it sits in. */
export interface SavedLayoutsInk {
  readonly gold: string;
  readonly rule: string;
  readonly pearl: string;
  readonly muted: string;
  readonly hint: string;
  readonly warn: string;
}

export interface SavedLayoutsDoorProps {
  readonly ink: SavedLayoutsInk;
  /** Injected in tests; the page's `localStorage` otherwise. */
  readonly storage?: Pick<Storage, "getItem" | "setItem"> | null;
}

function pageStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage blocked
  }
}

/** Restore a View's style: its roles (or none) and its profile strength (when it saved one). */
function applyLayoutStyle(layout: SavedLayout): void {
  writeStoredRoles(layout.roles ?? {});
  if (layout.profileStrength) writeStoredProfileStrength(layout.profileStrength);
  if (layout.footprint) requestFootprintPrefs(layout.footprint);
}

function newLayoutId(): string {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

type Status = { readonly tone: "ok" | "warn"; readonly text: string } | null;
type FocusTarget =
  | { readonly kind: "save-trigger" }
  | { readonly kind: "apply" | "rename"; readonly id: string }
  | null;

export function SavedLayoutsDoor({ ink, storage }: SavedLayoutsDoorProps): React.ReactElement {
  const store = storage === undefined ? pageStorage() : storage;
  const [layouts, setLayouts] = React.useState<readonly SavedLayout[]>(() => loadSavedLayouts(store));
  const [capture, setCapture] = React.useState<ArrangementCapture | null>(() => announcedArrangementCapture());
  const [own, setOwn] = React.useState<ArrangementCapture | null>(() => announcedOwnArrangement());
  const [naming, setNaming] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [armedDeleteId, setArmedDeleteId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>(null);
  const [inputError, setInputError] = React.useState<string | null>(null);

  const saveTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const rowButtons = React.useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = React.useRef<FocusTarget>(null);
  const idBase = React.useId();

  // Told, never inferred — and the first reading is the channel's memory, so a
  // door opened after the chart announced still knows what the chart is.
  React.useEffect(() => {
    setCapture(announcedArrangementCapture());
    return subscribeArrangementCapture(setCapture);
  }, []);
  React.useEffect(() => {
    setOwn(announcedOwnArrangement());
    return subscribeOwnArrangement(setOwn);
  }, []);

  // Another tab saved or deleted a layout: show the list that is actually stored.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_LAYOUTS_STORAGE_KEY) setLayouts(loadSavedLayouts(store));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);
  // …and this tab's other Views readers (the Desk, the Tools panel) commit too.
  React.useEffect(() => subscribeMyViews(() => setLayouts(loadSavedLayouts(store))), [store]);

  // MIGRATE IN PLACE (Drive §B1–2, 2026-10-07): the first time My Views meets
  // a chart, the trader's switches as they stand become "My current view".
  // Nothing is switched on or off — a list entry is ADDED from the capture
  // the chart announced. A proof scene's capture is the scene's, not the
  // trader's, so a scene never migrates (and never writes).
  React.useEffect(() => {
    if (!capture || proofSceneHoldsWrites()) return;
    let raw: string | null = null;
    try { raw = store?.getItem(SAVED_LAYOUTS_STORAGE_KEY) ?? null; } catch { return; }
    const list = loadSavedLayouts(store);
    const next = migrateCurrentView(list, raw, capture, { roles: readStoredRoles(), profileStrength: readStoredProfileStrength(), footprint: announcedFootprintPrefs() });
    if (!next) return;
    // The Views event re-reads the stored list into this door (subscribeMyViews above).
    if (storeSavedLayouts(store, next)) notifyMyViewsChanged(next);
  }, [capture, store]);

  // Focus moves AFTER the render that created (or removed) its target.
  React.useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target.kind === "save-trigger") saveTriggerRef.current?.focus();
    else rowButtons.current.get(`${target.kind}:${target.id}`)?.focus();
  });

  const commit = (next: readonly SavedLayout[], ok: string) => {
    setLayouts(next);
    const kept = storeSavedLayouts(store, next);
    // Tell this tab's other readers only what is actually stored; an unkept
    // list still arms the compiler for this visit.
    if (kept) notifyMyViewsChanged(next);
    else syncStarterViews(next);
    setStatus(kept ? { tone: "ok", text: ok } : { tone: "warn", text: proofSceneHoldsWrites() ? `${ok} — proof scene: this page only, nothing saved` : `${ok} — for this visit only; this browser blocked storage` });
  };

  const closeNaming = () => {
    setNaming(false);
    setDraft("");
    setInputError(null);
    pendingFocus.current = { kind: "save-trigger" };
  };

  const submitSave = () => {
    if (!capture) {
      setInputError("The chart has not reported its arrangement yet");
      return;
    }
    // The style half of the View (§XVII): roles and profile strength as they are now.
    const result = saveLayout(layouts, draft, capture, newLayoutId, { roles: readStoredRoles(), profileStrength: readStoredProfileStrength(), footprint: announcedFootprintPrefs() });
    if (!result.ok) {
      setInputError(result.message);
      return;
    }
    commit(result.list, result.replaced ? `Updated “${result.layout.name}”` : `Saved “${result.layout.name}”`);
    closeNaming();
  };

  const closeRename = (id: string) => {
    setRenamingId(null);
    setRenameDraft("");
    setInputError(null);
    pendingFocus.current = { kind: "rename", id };
  };

  const submitRename = (id: string) => {
    const result = renameLayout(layouts, id, renameDraft);
    if (!result.ok) {
      setInputError(result.message);
      return;
    }
    commit(result.list, `Renamed to “${result.layout.name}”`);
    closeRename(id);
  };

  const pressDelete = (layout: SavedLayout, index: number) => {
    if (armedDeleteId !== layout.id) {
      setArmedDeleteId(layout.id);
      return;
    }
    const next = deleteLayout(layouts, layout.id);
    setArmedDeleteId(null);
    const mine = userViews(next);
    const neighbour = mine[index] ?? mine[index - 1] ?? null;
    pendingFocus.current = neighbour ? { kind: "apply", id: neighbour.id } : { kind: "save-trigger" };
    commit(next, `Deleted “${layout.name}”`);
  };

  /** Escape closes THIS step and stops — the sheet behind it stays up. */
  const swallowEscape = (e: React.KeyboardEvent, close: () => void) => {
    if (e.key !== "Escape") return false;
    e.preventDefault();
    e.stopPropagation();
    close();
    return true;
  };

  const errorId = `${idBase}-error`;
  const headingId = `${idBase}-heading`;
  const chartAnswering = capture !== null;

  const rowButtonStyle: React.CSSProperties = {
    flex: "0 0 auto",
    minWidth: 44,
    minHeight: 44,
    padding: "0 6px",
    borderRadius: 3,
    border: `1px solid ${ink.rule}`,
    background: "transparent",
    color: ink.muted,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    lineHeight: 1,
  };
  const inputStyle: React.CSSProperties = {
    flex: "1 1 auto",
    minWidth: 0,
    minHeight: 44,
    padding: "0 8px",
    borderRadius: 3,
    border: `1px solid ${inputError ? ink.warn : ink.gold}`,
    background: "rgba(7,8,10,0.9)",
    color: ink.pearl,
    fontFamily: "inherit",
    fontSize: 11.5,
  };

  return (
    <section
      data-testid="saved-layouts"
      aria-labelledby={headingId}
      style={{ margin: "2px 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}
    >
      <div
        id={headingId}
        style={{
          fontSize: 9.5,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: ink.muted,
          padding: "4px 4px 0",
        }}
      >
        My Views
      </div>

      {/* COMPOUND CAMERA (Garden 16 §13–§15): ONE MARKET, ONE CAMERA, MANY
          SENSES. "+ Camera" adds its senses to what is on — nothing on is
          switched off — through the same saved-layout door (compiler-validated,
          locks honoured). The line above names every camera fully in force. */}
      {capture ? (() => {
        const inForce = camerasInForce(capture);
        const composable = ARRANGEMENT_SPECS.filter(a => a.arms.length > 0);
        return (
          <div data-testid="compound-camera" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
            <div data-testid="compound-camera-in-force" style={{ fontSize: 10, color: inForce.length > 1 ? ink.gold : ink.hint, letterSpacing: 0.4 }}>
              {inForce.length === 0
                ? "View · your own composition"
                : `View · ${inForce.map(id => ARRANGEMENT_SPECS.find(a => a.id === id)?.label.toUpperCase()).join(" + ")}`}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {composable.map(a => {
                const on = inForce.includes(a.id as ArrangementId);
                return (
                  <button
                    key={a.id}
                    type="button"
                    data-testid={`compound-add-${a.id}`}
                    disabled={on}
                    aria-pressed={on}
                    title={on ? `${a.label}'s senses are all on` : `Add ${a.label}'s senses to what is already on — nothing is switched off`}
                    onClick={() => requestSavedLayout({ layoutId: `compose:${a.id}`, switches: composeCamera(capture, a.id as ArrangementId) })}
                    style={{
                      fontSize: 10, minHeight: 44, padding: "4px 10px", borderRadius: 999, cursor: on ? "default" : "pointer",
                      border: `1px solid ${on ? ink.gold : ink.rule}`, color: on ? ink.gold : ink.pearl,
                      background: "transparent", opacity: on ? 0.85 : 1,
                    }}
                  >
                    {on ? "✓ " : "+ "}{a.label}
                  </button>
                );
              })}
            </div>
            {/* CAMERA LOADOUTS (§59) — named compositions, same door. */}
            <div data-testid="camera-loadouts" style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: ink.muted }}>Loadouts</span>
              {CAMERA_LOADOUTS.map(l => {
                const on = savedArrangementInForce(loadoutSwitches(capture, l.id), capture);
                return (
                  <button
                    key={l.id}
                    type="button"
                    data-testid={`loadout-${l.id}`}
                    aria-pressed={on}
                    title={`${l.label}: ${l.senses}`}
                    onClick={() => requestSavedLayout({ layoutId: `loadout:${l.id}`, switches: loadoutSwitches(capture, l.id) })}
                    style={{ fontSize: 10, minHeight: 44, padding: "4px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${on ? ink.gold : ink.rule}`, color: on ? ink.gold : ink.pearl, background: "transparent" }}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })() : null}

      {/* THE WAY BACK (Garden 16 §46): a camera replaced the trader's own
          arrangement; offered until the chart is arranged that way again. */}
      {own && capture && !savedArrangementInForce(own, capture) ? (
        <button
          type="button"
          data-testid="own-arrangement-return"
          aria-label="Return to your composition"
          onClick={() => requestSavedLayout({ layoutId: "own-arrangement", switches: own })}
          style={{
            display: "block",
            width: "100%",
            minHeight: 44,
            padding: "5px 8px",
            textAlign: "left",
            border: `1px solid ${ink.gold}`,
            borderRadius: 3,
            background: "rgba(196,165,116,0.06)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span style={{ display: "block", fontSize: 12, fontWeight: 500, letterSpacing: 0.3, color: ink.gold }}>
            <span aria-hidden>↩ </span>Your composition
          </span>
          <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.45, color: ink.hint }}>
            {layoutOnCount({ switches: own as SavedLayout["switches"] })} readings — as it was before the View
          </span>
        </button>
      ) : null}

      {/* STARTER VIEWS (Drive §B1–2, 2026-10-07): Clean / Order Flow / Regime /
          Review are the trader's editable copies. Keep the chart's current
          composition as one, duplicate it into a View of your own, or
          Restore it to its default. A starter keeps its name. */}
      <div data-testid="starter-views" role="group" aria-label="Starter Views" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: ink.muted, padding: "0 4px" }}>Starter Views</div>
        {ARRANGEMENT_SPECS.map((spec) => {
          const view = starterView(layouts, spec.id);
          const edited = starterOverride(layouts, spec.id) !== null;
          const inForce = capture !== null && (savedArrangementInForce(view.switches, capture) || (layoutOnCount(view) === 0 && !Object.values(capture).some(Boolean)));
          const on = layoutOnCount(view);
          return (
            <div
              key={spec.id}
              data-starter-view={spec.id}
              data-starter-edited={edited ? "true" : undefined}
              style={{ display: "flex", alignItems: "stretch", gap: 4, borderRadius: 3, border: `1px solid ${inForce ? ink.gold : ink.rule}`, background: inForce ? "rgba(196,165,116,0.12)" : "rgba(196,165,116,0.03)", padding: 4 }}
            >
              <button
                type="button"
                ref={(el) => {
                  if (el) rowButtons.current.set(`apply:${view.id}`, el);
                  else rowButtons.current.delete(`apply:${view.id}`);
                }}
                data-testid={`starter-view-apply-${spec.id}`}
                aria-label={`Open starter View ${spec.label}${edited ? ", edited" : ""}`}
                aria-current={inForce ? "true" : undefined}
                disabled={!chartAnswering}
                onClick={() => {
                  setArmedDeleteId(null);
                  requestSavedLayout({ layoutId: view.id, switches: view.switches });
                  if (edited) applyLayoutStyle(view);
                }}
                style={{ flex: "1 1 auto", minWidth: 0, minHeight: 44, padding: "3px 6px", textAlign: "left", border: "none", background: "transparent", cursor: chartAnswering ? "pointer" : "default", fontFamily: "inherit", opacity: chartAnswering ? 1 : 0.55 }}
              >
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, letterSpacing: 0.3, color: inForce ? ink.gold : ink.pearl }}>{spec.label}</span>
                <span style={{ display: "block", fontSize: 10, color: ink.hint, marginTop: 1 }}>
                  {inForce ? "The chart is arranged this way now" : `${edited ? "Edited" : "Default"} · ${on} reading${on === 1 ? "" : "s"} on`}
                </span>
              </button>
              <button
                type="button"
                data-testid={`starter-view-keep-${spec.id}`}
                aria-label={`Keep the chart's current composition as ${spec.label}`}
                title={`Keep what is on now as ${spec.label} — Restore brings the default back`}
                disabled={!chartAnswering}
                onClick={() => {
                  if (!capture) return;
                  const result = saveStarterView(layouts, spec.id, capture, { roles: readStoredRoles(), profileStrength: readStoredProfileStrength(), footprint: announcedFootprintPrefs() });
                  if (!result.ok) { setStatus({ tone: "warn", text: result.message }); return; }
                  commit(result.list, `${spec.label} now keeps your composition`);
                }}
                style={rowButtonStyle}
              >
                <span aria-hidden>⤓</span>
              </button>
              <button
                type="button"
                data-testid={`starter-view-duplicate-${spec.id}`}
                aria-label={`Duplicate starter View ${spec.label}`}
                title="Duplicate into your own Views"
                onClick={() => {
                  const result = duplicateStarterView(layouts, spec.id, newLayoutId);
                  if (!result.ok) { setStatus({ tone: "warn", text: result.message }); return; }
                  commit(result.list, `Duplicated as “${result.layout.name}”`);
                  setNaming(false);
                  setInputError(null);
                  setRenamingId(result.layout.id);
                  setRenameDraft(result.layout.name);
                }}
                style={rowButtonStyle}
              >
                <span aria-hidden>⧉</span>
              </button>
              {edited ? (
                <button
                  type="button"
                  data-testid={`starter-view-restore-${spec.id}`}
                  aria-label={`Restore ${spec.label} to its default`}
                  title="Restore to default"
                  onClick={() => {
                    pendingFocus.current = { kind: "apply", id: view.id };
                    commit(restoreStarterView(layouts, spec.id), `${spec.label} restored to its default`);
                  }}
                  style={rowButtonStyle}
                >
                  <span aria-hidden>↺</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {userViews(layouts).length === 0 ? (
        <p data-testid="saved-layouts-empty" style={{ margin: 0, padding: "0 4px", fontSize: 10.5, lineHeight: 1.45, color: ink.hint }}>
          No My Views yet. Turn on the tools you want, then save them here by name.
        </p>
      ) : (
        <ul aria-label="My Views" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {userViews(layouts).map((layout, index) => {
            const inForce = savedArrangementInForce(layout.switches, capture);
            const on = layoutOnCount(layout);
            const armed = armedDeleteId === layout.id;
            const renaming = renamingId === layout.id;
            return (
              <li
                key={layout.id}
                data-saved-layout={layout.id}
                data-saved-layout-in-force={inForce ? "true" : undefined}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 4,
                  borderRadius: 3,
                  border: `1px solid ${inForce ? ink.gold : ink.rule}`,
                  background: inForce ? "rgba(196,165,116,0.12)" : "rgba(196,165,116,0.03)",
                  padding: 4,
                }}
              >
                {renaming ? (
                  <input
                    autoFocus
                    aria-label={`New name for ${layout.name}`}
                    aria-invalid={inputError ? true : undefined}
                    aria-describedby={inputError ? errorId : undefined}
                    maxLength={MAX_LAYOUT_NAME_LENGTH + 8}
                    value={renameDraft}
                    onChange={(e) => {
                      setRenameDraft(e.target.value);
                      setInputError(null);
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (swallowEscape(e, () => closeRename(layout.id))) return;
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitRename(layout.id);
                      }
                    }}
                    style={inputStyle}
                  />
                ) : (
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) rowButtons.current.set(`apply:${layout.id}`, el);
                      else rowButtons.current.delete(`apply:${layout.id}`);
                    }}
                    data-testid="saved-layout-apply"
                    aria-label={`Open View ${layout.name}`}
                    aria-describedby={`${idBase}-hint-${layout.id}`}
                    aria-current={inForce ? "true" : undefined}
                    disabled={!chartAnswering}
                    title={chartAnswering ? `Arrange the chart as “${layout.name}”` : "The chart is not answering yet"}
                    onClick={() => {
                      setArmedDeleteId(null);
                      requestSavedLayout({ layoutId: layout.id, switches: layout.switches });
                      applyLayoutStyle(layout);
                    }}
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      minHeight: 44,
                      padding: "3px 6px",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: chartAnswering ? "pointer" : "default",
                      fontFamily: "inherit",
                      opacity: chartAnswering ? 1 : 0.55,
                    }}
                  >
                    <span style={{ display: "block", fontSize: 12, fontWeight: 500, letterSpacing: 0.3, color: inForce ? ink.gold : ink.pearl, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {layout.name}
                    </span>
                    <span id={`${idBase}-hint-${layout.id}`} style={{ display: "block", fontSize: 10, color: ink.hint, marginTop: 1 }}>
                      {inForce ? "The chart is arranged this way now" : `${on} reading${on === 1 ? "" : "s"} on`}
                    </span>
                  </button>
                )}
                {renaming ? (
                  <button
                    type="button"
                    aria-label={`Keep the new name for ${layout.name}`}
                    onClick={() => submitRename(layout.id)}
                    style={{ ...rowButtonStyle, color: ink.gold, borderColor: ink.gold }}
                  >
                    OK
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) rowButtons.current.set(`rename:${layout.id}`, el);
                        else rowButtons.current.delete(`rename:${layout.id}`);
                      }}
                      data-testid="saved-layout-rename"
                      aria-label={`Rename View ${layout.name}`}
                      title="Rename"
                      onClick={() => {
                        setArmedDeleteId(null);
                        setNaming(false);
                        setInputError(null);
                        setRenamingId(layout.id);
                        setRenameDraft(layout.name);
                      }}
                      style={rowButtonStyle}
                    >
                      <span aria-hidden>✎</span>
                    </button>
                    <button
                      type="button"
                      data-testid="saved-layout-duplicate"
                      aria-label={`Duplicate View ${layout.name}`}
                      title="Duplicate — experiment on a copy"
                      onClick={() => {
                        setArmedDeleteId(null);
                        const result = duplicateLayout(layouts, layout.id, newLayoutId);
                        if (!result.ok) { setStatus({ tone: "warn", text: result.message }); return; }
                        commit(result.list, `Duplicated as “${result.layout.name}”`);
                        setNaming(false);
                        setInputError(null);
                        setRenamingId(result.layout.id);
                        setRenameDraft(result.layout.name);
                      }}
                      style={rowButtonStyle}
                    >
                      <span aria-hidden>⧉</span>
                    </button>
                    <button
                      type="button"
                      data-testid="saved-layout-delete"
                      data-armed={armed ? "true" : undefined}
                      aria-label={armed ? `Confirm delete View ${layout.name}` : `Delete View ${layout.name}`}
                      title={armed ? "Press again to delete" : "Delete"}
                      onClick={() => pressDelete(layout, index)}
                      onBlur={() => armed && setArmedDeleteId(null)}
                      onKeyDown={(e) => {
                        if (armed) swallowEscape(e, () => setArmedDeleteId(null));
                      }}
                      style={{
                        ...rowButtonStyle,
                        ...(armed ? { color: ink.warn, borderColor: ink.warn, fontSize: 10 } : null),
                      }}
                    >
                      {armed ? "Delete?" : <span aria-hidden>✕</span>}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {naming ? (
        <div style={{ display: "flex", gap: 4 }}>
          <input
            autoFocus
            aria-label="View name"
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? errorId : undefined}
            placeholder="Name this View"
            maxLength={MAX_LAYOUT_NAME_LENGTH + 8}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setInputError(null);
            }}
            onKeyDown={(e) => {
              if (swallowEscape(e, closeNaming)) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submitSave();
              }
            }}
            style={inputStyle}
          />
          <button
            type="button"
            data-testid="saved-layouts-save"
            aria-label="Save the chart's current composition as a View under this name"
            onClick={submitSave}
            style={{ ...rowButtonStyle, color: ink.gold, borderColor: ink.gold, padding: "0 10px" }}
          >
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          ref={saveTriggerRef}
          data-testid="saved-layouts-new"
          aria-label="Save the chart's current composition as a named View"
          disabled={!chartAnswering}
          title={chartAnswering ? undefined : "The chart is not answering yet"}
          onClick={() => {
            setArmedDeleteId(null);
            setRenamingId(null);
            setInputError(null);
            setStatus(null);
            setNaming(true);
          }}
          style={{
            minHeight: 44,
            borderRadius: 3,
            border: `1px dashed ${ink.rule}`,
            background: "transparent",
            color: chartAnswering ? ink.muted : ink.hint,
            cursor: chartAnswering ? "pointer" : "default",
            fontFamily: "inherit",
            fontSize: 11,
            letterSpacing: 0.3,
            textAlign: "left",
            padding: "0 10px",
          }}
        >
          <span aria-hidden>＋ </span>Save as My View
        </button>
      )}

      {inputError ? (
        <p id={errorId} role="alert" style={{ margin: 0, padding: "0 4px", fontSize: 10, lineHeight: 1.35, color: ink.warn }}>
          {inputError}
        </p>
      ) : null}
      <p
        data-testid="saved-layouts-status"
        aria-live="polite"
        style={{ margin: 0, padding: "0 4px", minHeight: status ? undefined : 0, fontSize: 10, lineHeight: 1.35, color: status?.tone === "warn" ? ink.warn : ink.hint }}
      >
        {status?.text ?? ""}
      </p>
    </section>
  );
}
