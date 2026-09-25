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
  requestSavedLayout,
  subscribeArrangementCapture,
  type ArrangementCapture,
} from "@/lib/workspace/equipmentChannel";
import {
  deleteLayout,
  layoutOnCount,
  loadSavedLayouts,
  MAX_LAYOUT_NAME_LENGTH,
  renameLayout,
  SAVED_LAYOUTS_STORAGE_KEY,
  saveLayout,
  storeSavedLayouts,
  type SavedLayout,
} from "@/lib/workspace/savedLayouts";
import { savedArrangementInForce } from "@/lib/marketData/viewModels/selectChartArrangement";

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

  // Another tab saved or deleted a layout: show the list that is actually stored.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_LAYOUTS_STORAGE_KEY) setLayouts(loadSavedLayouts(store));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

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
    setStatus(kept ? { tone: "ok", text: ok } : { tone: "warn", text: `${ok} — for this visit only; this browser blocked storage` });
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
    const result = saveLayout(layouts, draft, capture, newLayoutId);
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
    const neighbour = next[index] ?? next[index - 1] ?? null;
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
    minWidth: 30,
    minHeight: 30,
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
    minHeight: 30,
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
        Saved layouts
      </div>

      {layouts.length === 0 ? (
        <p data-testid="saved-layouts-empty" style={{ margin: 0, padding: "0 4px", fontSize: 10.5, lineHeight: 1.45, color: ink.hint }}>
          None saved yet. Arrange the chart, then save it here by name.
        </p>
      ) : (
        <ul aria-label="Saved layouts" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {layouts.map((layout, index) => {
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
                    aria-label={`Apply layout ${layout.name}`}
                    aria-describedby={`${idBase}-hint-${layout.id}`}
                    aria-current={inForce ? "true" : undefined}
                    disabled={!chartAnswering}
                    title={chartAnswering ? `Arrange the chart as “${layout.name}”` : "The chart is not answering yet"}
                    onClick={() => {
                      setArmedDeleteId(null);
                      requestSavedLayout({ layoutId: layout.id, switches: layout.switches });
                    }}
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      minHeight: 30,
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
                      aria-label={`Rename layout ${layout.name}`}
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
                      data-testid="saved-layout-delete"
                      data-armed={armed ? "true" : undefined}
                      aria-label={armed ? `Confirm delete layout ${layout.name}` : `Delete layout ${layout.name}`}
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
            aria-label="Layout name"
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? errorId : undefined}
            placeholder="Name this layout"
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
            aria-label="Save the chart's current arrangement under this name"
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
          aria-label="Save the chart's current arrangement as a named layout"
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
            minHeight: 32,
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
          <span aria-hidden>＋ </span>Save current layout
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
