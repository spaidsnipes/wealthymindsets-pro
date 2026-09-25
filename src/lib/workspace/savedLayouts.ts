/**
 * SAVED LAYOUTS — the trader's own named desks, kept in the WORKSPACE door.
 *
 * ── THE FINDING THIS CLOSES (F24 "Layout", OPEN until now) ─────────────────
 *
 * Garden 11: "WORKSPACE = arrangements of the same Market room: Clean. Order
 * Flow. Regime. Review. Approved saved layouts." and "Workspace owns
 * arrangement/layout."
 *
 * What shipped was ONE unnamed slot, "My stack", living in the TOOLS door
 * (Chart tools › Profiles), holding only the PROFILE-family switches. Tools is
 * "what gets painted"; Workspace is "how the book is arranged". A saved
 * arrangement in the Tools door is an arrangement filed under the wrong hand,
 * and one slot is not a list.
 *
 * ── WHAT A SAVED LAYOUT IS ─────────────────────────────────────────────────
 *
 * Exactly what a built-in desk is: a set of TOGGLE switch positions, captured
 * by the arrangement compiler (`captureArrangement`) and applied through the
 * SAME door the four desks walk (`savedArrangementSwitches` → the room's
 * `arrangementDeskRef` → `applyRespectingLocks`). Stack preferences (lane
 * order, opacity, width, lock, fusion) are NOT part of a layout: they are the
 * trader's standing preferences for how a lane is drawn, and a LOCKED lane is
 * defined as holding its switch against "a preset, a Workspace desk or
 * Restore" — a layout that rewrote the lock would defeat the lock.
 *
 * ── WHAT THIS MODULE OWNS ──────────────────────────────────────────────────
 *
 * The LIST: names, validation, dedupe, cap, schema-versioned serialization and
 * the one-time migration of the legacy "My stack" slot. PURE — storage is
 * passed in, never reached for, so every rule here is testable without a DOM.
 */

import { ARRANGEMENT_SPECS } from "@/lib/marketData/viewModels/selectChartArrangement";
import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { MY_STACK_STORAGE_KEY, parseMyStack } from "@/lib/marketData/viewModels/myProfileStack";

export const SAVED_LAYOUTS_STORAGE_KEY = "wm_workspaceLayouts";
/** Re-exported so the door names the legacy slot from its one owner. */
export const LEGACY_MY_STACK_STORAGE_KEY = MY_STACK_STORAGE_KEY;
export const SAVED_LAYOUTS_SCHEMA_VERSION = 1;
/** Equipment on the same camera, not a room: a short list the eye can take in. */
export const MAX_SAVED_LAYOUTS = 12;
export const MAX_LAYOUT_NAME_LENGTH = 32;
/** The legacy slot's id and name once it is a list entry. Stable, so re-reads never duplicate it. */
export const MIGRATED_MY_STACK_ID = "my-stack";
export const MIGRATED_MY_STACK_NAME = "My stack";

export type LayoutSwitches = Readonly<Partial<Record<ProfileId, boolean>>>;

export interface SavedLayout {
  readonly id: string;
  readonly name: string;
  readonly switches: LayoutSwitches;
}

interface SavedLayoutsDocV1 {
  readonly v: 1;
  readonly layouts: readonly SavedLayout[];
}

/** Every TOGGLE row in the whole catalogue — the only keys a layout may carry. */
function toggleIds(): ReadonlySet<string> {
  return new Set(
    selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} })
      .entries.filter((e) => e.gesture === "TOGGLE")
      .map((e) => e.id),
  );
}

/** Keep only known TOGGLE ids with boolean values. */
export function sanitizeLayoutSwitches(raw: unknown): LayoutSwitches {
  const out: Partial<Record<ProfileId, boolean>> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const ids = toggleIds();
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ids.has(k) && typeof v === "boolean") out[k as ProfileId] = v;
  }
  return out;
}

/** How many readings a layout switches ON — the one-line hint under its name. */
export function layoutOnCount(layout: Pick<SavedLayout, "switches">): number {
  return Object.values(layout.switches).filter((v) => v === true).length;
}

// ── NAMES ────────────────────────────────────────────────────────────────────

/** Trim and collapse runs of whitespace (including tabs/newlines) to one space. */
export function normaliseLayoutName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Names are unique case-insensitively: "scalp" and "Scalp" are one layout. */
export function layoutNameKey(name: string): string {
  return normaliseLayoutName(name).toLowerCase();
}

export type LayoutNameProblem = "EMPTY" | "TOO_LONG" | "BAD_CHARACTERS" | "RESERVED" | "DUPLICATE";

export type LayoutNameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly problem: LayoutNameProblem; readonly message: string };

const RESERVED_KEYS: ReadonlySet<string> = new Set(ARRANGEMENT_SPECS.map((s) => layoutNameKey(s.label)));

/**
 * Is this a name a layout may take?
 *
 * `existing` + `exceptId` make DUPLICATE a rename-time rule: renaming onto a
 * name another layout holds would merge two layouts silently. SAVING onto an
 * existing name is not a duplicate — it UPDATES that layout (see `saveLayout`)
 * — so `saveLayout` does not pass `existing` here.
 */
export function checkLayoutName(
  raw: string,
  existing?: readonly SavedLayout[],
  exceptId?: string,
): LayoutNameCheck {
  const name = normaliseLayoutName(raw);
  if (name.length === 0) return { ok: false, problem: "EMPTY", message: "Name the layout first" };
  if (name.length > MAX_LAYOUT_NAME_LENGTH) {
    return { ok: false, problem: "TOO_LONG", message: `Keep the name to ${MAX_LAYOUT_NAME_LENGTH} characters` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, problem: "BAD_CHARACTERS", message: "That name has characters that cannot be saved" };
  }
  if (RESERVED_KEYS.has(layoutNameKey(name))) {
    return { ok: false, problem: "RESERVED", message: `“${name}” is a built-in desk — pick another name` };
  }
  if (existing) {
    const key = layoutNameKey(name);
    const clash = existing.find((l) => l.id !== exceptId && layoutNameKey(l.name) === key);
    if (clash) return { ok: false, problem: "DUPLICATE", message: `“${clash.name}” is already saved` };
  }
  return { ok: true, name };
}

// ── LIST OPERATIONS ─────────────────────────────────────────────────────────

export type SaveLayoutResult =
  | { readonly ok: true; readonly list: readonly SavedLayout[]; readonly layout: SavedLayout; readonly replaced: boolean }
  | { readonly ok: false; readonly message: string };

/**
 * Save the CURRENT arrangement under `rawName`.
 *
 * Same name as an existing layout (case-insensitive) → that layout is UPDATED
 * in place: same id, same position, new switches. A trader who re-saves "Open"
 * after adjusting it means "keep this as Open", not "make a second Open".
 * A NEW name at the cap is refused rather than silently evicting the oldest.
 */
export function saveLayout(
  list: readonly SavedLayout[],
  rawName: string,
  switches: Readonly<Partial<Record<string, unknown>>>,
  newId: () => string,
): SaveLayoutResult {
  const check = checkLayoutName(rawName);
  if (!check.ok) return { ok: false, message: check.message };
  const clean = sanitizeLayoutSwitches(switches);
  if (Object.keys(clean).length === 0) {
    return { ok: false, message: "The chart has not reported its arrangement yet" };
  }
  const key = layoutNameKey(check.name);
  const at = list.findIndex((l) => layoutNameKey(l.name) === key);
  if (at >= 0) {
    const layout: SavedLayout = { id: list[at].id, name: check.name, switches: clean };
    const next = list.slice();
    next[at] = layout;
    return { ok: true, list: next, layout, replaced: true };
  }
  if (list.length >= MAX_SAVED_LAYOUTS) {
    return { ok: false, message: `${MAX_SAVED_LAYOUTS} layouts saved — delete one first` };
  }
  const taken = new Set(list.map((l) => l.id));
  let id = newId();
  for (let i = 0; taken.has(id) || !isLayoutId(id); i++) id = `layout-${i}-${list.length}`;
  const layout: SavedLayout = { id, name: check.name, switches: clean };
  return { ok: true, list: [...list, layout], layout, replaced: false };
}

export type RenameLayoutResult =
  | { readonly ok: true; readonly list: readonly SavedLayout[]; readonly layout: SavedLayout }
  | { readonly ok: false; readonly message: string };

export function renameLayout(list: readonly SavedLayout[], id: string, rawName: string): RenameLayoutResult {
  const at = list.findIndex((l) => l.id === id);
  if (at < 0) return { ok: false, message: "That layout is no longer saved" };
  const check = checkLayoutName(rawName, list, id);
  if (!check.ok) return { ok: false, message: check.message };
  const layout: SavedLayout = { ...list[at], name: check.name };
  const next = list.slice();
  next[at] = layout;
  return { ok: true, list: next, layout };
}

export function deleteLayout(list: readonly SavedLayout[], id: string): readonly SavedLayout[] {
  return list.filter((l) => l.id !== id);
}

// ── SERIALIZATION ───────────────────────────────────────────────────────────

function isLayoutId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);
}

export function serializeSavedLayouts(list: readonly SavedLayout[]): string {
  const doc: SavedLayoutsDocV1 = {
    v: SAVED_LAYOUTS_SCHEMA_VERSION,
    layouts: list.map((l) => ({ id: l.id, name: l.name, switches: l.switches })),
  };
  return JSON.stringify(doc);
}

/**
 * Read a stored document. `null` means UNREADABLE (absent, not JSON, or a
 * schema this build does not know) — distinct from `[]`, a readable empty
 * list the trader got to by deleting everything. The caller treats the two
 * differently: only an unreadable store falls back to the legacy slot.
 *
 * Each entry is re-validated: bad ids, bad names, reserved names and switch
 * sets with nothing left after sanitizing are dropped; duplicates (by id or by
 * name) keep the FIRST; the list is capped.
 */
export function parseSavedLayouts(raw: string | null): readonly SavedLayout[] | null {
  if (!raw) return null;
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object") return null;
  const { v, layouts } = doc as { v?: unknown; layouts?: unknown };
  if (v !== SAVED_LAYOUTS_SCHEMA_VERSION || !Array.isArray(layouts)) return null;
  const out: SavedLayout[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of layouts) {
    if (out.length >= MAX_SAVED_LAYOUTS) break;
    if (!entry || typeof entry !== "object") continue;
    const { id, name, switches } = entry as { id?: unknown; name?: unknown; switches?: unknown };
    if (!isLayoutId(id) || typeof name !== "string") continue;
    const check = checkLayoutName(name);
    if (!check.ok) continue;
    const key = layoutNameKey(check.name);
    if (ids.has(id) || names.has(key)) continue;
    const clean = sanitizeLayoutSwitches(switches);
    if (Object.keys(clean).length === 0) continue;
    ids.add(id);
    names.add(key);
    out.push({ id, name: check.name, switches: clean });
  }
  return out;
}

/**
 * THE LEGACY SLOT, AS A LIST ENTRY. The old "Save my stack" wrote the PROFILE
 * switches under `wm_ofMyStack`; its reader (`parseMyStack`) stays the one
 * owner of that format. The result keeps its profile-only shape on purpose:
 * applying it touches exactly the switches the old Restore touched.
 */
export function migrateLegacyMyStack(legacyRaw: string | null): SavedLayout | null {
  const stack = parseMyStack(legacyRaw);
  if (!stack) return null;
  const switches = sanitizeLayoutSwitches(stack);
  if (Object.keys(switches).length === 0) return null;
  return { id: MIGRATED_MY_STACK_ID, name: MIGRATED_MY_STACK_NAME, switches };
}

/**
 * The list the Workspace door shows.
 *
 *  - a readable store wins, even when empty — a trader who deleted "My stack"
 *    must not see it resurrected from the old key on the next visit;
 *  - an absent or unreadable store falls back to the legacy slot, so a trader
 *    who pressed "Save my stack" before this shipped finds it here, first in
 *    the list, with nothing lost. The old key is never deleted or rewritten.
 */
export function readSavedLayouts(storedRaw: string | null, legacyRaw: string | null): readonly SavedLayout[] {
  const stored = parseSavedLayouts(storedRaw);
  if (stored) return stored;
  const migrated = migrateLegacyMyStack(legacyRaw);
  return migrated ? [migrated] : [];
}

/** Read through a Storage-shaped object. Blocked storage reads as an empty list. */
export function loadSavedLayouts(storage: Pick<Storage, "getItem"> | null | undefined): readonly SavedLayout[] {
  if (!storage) return [];
  try {
    return readSavedLayouts(storage.getItem(SAVED_LAYOUTS_STORAGE_KEY), storage.getItem(LEGACY_MY_STACK_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Write through a Storage-shaped object. Returns false when storage refused (kept for this visit only). */
export function storeSavedLayouts(
  storage: Pick<Storage, "setItem"> | null | undefined,
  list: readonly SavedLayout[],
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_LAYOUTS_STORAGE_KEY, serializeSavedLayouts(list));
    return true;
  } catch {
    return false;
  }
}
