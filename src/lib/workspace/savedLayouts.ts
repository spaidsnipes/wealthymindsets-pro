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

import { ARRANGEMENT_SPECS, defaultStarterArms, type ArrangementId } from "@/lib/marketData/viewModels/selectChartArrangement";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { MY_STACK_STORAGE_KEY, parseMyStack } from "@/lib/marketData/viewModels/myProfileStack";
import { PROFILE_STRENGTHS, type ProfileStrength } from "@/lib/chart/profileFamilyInk";
import { parseVisualRoles, type VisualRoles } from "@/lib/workspace/visualRoles";
import { parseFootprintPrefs, type FootprintPrefs } from "@/lib/workspace/footprintPrefs";

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
  /** Garden 18 §XVII: HOW I WANT TO SEE — visual roles and profile strength. Preferences, never market state. */
  readonly roles?: VisualRoles;
  readonly profileStrength?: ProfileStrength;
  /** The footprint mode and Big Trades as the View was saved. */
  readonly footprint?: FootprintPrefs;
  /**
   * Drive Garden 18 §B1–2 (2026-10-07): set when this entry is the trader's
   * EDITED COPY of a starter View (Clean / Order Flow / Regime / Review). It
   * carries the starter's canon name and is not counted against the cap;
   * Restore removes it and the starter answers with its canon arms again.
   */
  readonly starter?: ArrangementId;
}

/** The style half of a View, as saved with it. */
export interface LayoutStyle { readonly roles?: VisualRoles; readonly profileStrength?: ProfileStrength; readonly footprint?: FootprintPrefs | null }

function cleanStyle(raw: { roles?: unknown; profileStrength?: unknown; footprint?: unknown }): { roles?: VisualRoles; profileStrength?: ProfileStrength; footprint?: FootprintPrefs } {
  const roles = parseVisualRoles(raw.roles ?? null);
  const out: { roles?: VisualRoles; profileStrength?: ProfileStrength; footprint?: FootprintPrefs } = {};
  const fp = parseFootprintPrefs(raw.footprint);
  if (fp) out.footprint = fp;
  if (Object.keys(roles).length) out.roles = roles;
  if (typeof raw.profileStrength === "string" && PROFILE_STRENGTHS.includes(raw.profileStrength as ProfileStrength)) out.profileStrength = raw.profileStrength as ProfileStrength;
  return out;
}

interface SavedLayoutsDocV1 {
  readonly v: 1;
  readonly layouts: readonly SavedLayout[];
  /**
   * "My current view" migration done (§B1–2, 2026-10-07). Every document this
   * build writes carries it: the door evaluates the migration on mount, before
   * any write, so a written document is a migrated one.
   */
  readonly cv?: 1;
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
  if (name.length === 0) return { ok: false, problem: "EMPTY", message: "Name the View first" };
  if (name.length > MAX_LAYOUT_NAME_LENGTH) {
    return { ok: false, problem: "TOO_LONG", message: `Keep the name to ${MAX_LAYOUT_NAME_LENGTH} characters` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, problem: "BAD_CHARACTERS", message: "That name has characters that cannot be saved" };
  }
  if (RESERVED_KEYS.has(layoutNameKey(name))) {
    return { ok: false, problem: "RESERVED", message: `“${name}” is a starter View — pick another name` };
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
  style: LayoutStyle = {},
): SaveLayoutResult {
  const st = cleanStyle(style);
  const check = checkLayoutName(rawName);
  if (!check.ok) return { ok: false, message: check.message };
  const clean = sanitizeLayoutSwitches(switches);
  if (Object.keys(clean).length === 0) {
    return { ok: false, message: "The chart has not reported its arrangement yet" };
  }
  const key = layoutNameKey(check.name);
  const at = list.findIndex((l) => layoutNameKey(l.name) === key);
  if (at >= 0) {
    const layout: SavedLayout = { id: list[at].id, name: check.name, switches: clean, ...st };
    const next = list.slice();
    next[at] = layout;
    return { ok: true, list: next, layout, replaced: true };
  }
  if (userViews(list).length >= MAX_SAVED_LAYOUTS) {
    return { ok: false, message: `${MAX_SAVED_LAYOUTS} Views saved — delete one first` };
  }
  const taken = new Set(list.map((l) => l.id));
  let id = newId();
  for (let i = 0; taken.has(id) || !isLayoutId(id); i++) id = `layout-${i}-${list.length}`;
  const layout: SavedLayout = { id, name: check.name, switches: clean, ...st };
  return { ok: true, list: [...list, layout], layout, replaced: false };
}

export type RenameLayoutResult =
  | { readonly ok: true; readonly list: readonly SavedLayout[]; readonly layout: SavedLayout }
  | { readonly ok: false; readonly message: string };

export function renameLayout(list: readonly SavedLayout[], id: string, rawName: string): RenameLayoutResult {
  const at = list.findIndex((l) => l.id === id);
  if (at >= 0 && list[at].starter) return { ok: false, message: "A starter View keeps its name — duplicate it to name your own" };
  if (at < 0) return { ok: false, message: "That View is no longer saved" };
  const check = checkLayoutName(rawName, list, id);
  if (!check.ok) return { ok: false, message: check.message };
  const layout: SavedLayout = { ...list[at], name: check.name };
  const next = list.slice();
  next[at] = layout;
  return { ok: true, list: next, layout };
}

/**
 * Garden 18 §XIX DUPLICATE VIEW — "MY ORDER FLOW → MY ORDER FLOW + TPO"
 * without touching the original. The copy lands right after its source under
 * the first free "<name> 2", "<name> 3" … that fits the name limit.
 */
export function duplicateLayout(list: readonly SavedLayout[], id: string, newId: () => string): SaveLayoutResult {
  const at = list.findIndex((l) => l.id === id);
  if (at < 0) return { ok: false, message: "That View is no longer saved" };
  if (userViews(list).length >= MAX_SAVED_LAYOUTS) return { ok: false, message: `${MAX_SAVED_LAYOUTS} Views saved — delete one first` };
  const src = list[at];
  const taken = new Set(list.map((l) => layoutNameKey(l.name)));
  let name = "";
  for (let n = 2; n < 100; n++) {
    const suffix = ` ${n}`;
    const candidate = `${src.name.slice(0, MAX_LAYOUT_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;
    if (!taken.has(layoutNameKey(candidate))) { name = candidate; break; }
  }
  if (!name) return { ok: false, message: "No free name for the copy — rename one first" };
  const ids = new Set(list.map((l) => l.id));
  let copyId = newId();
  for (let i = 0; ids.has(copyId) || !isLayoutId(copyId); i++) copyId = `layout-${i}-${list.length}`;
  const { starter: _starter, ...rest } = src;
  void _starter;
  const layout: SavedLayout = { ...rest, id: copyId, name, switches: { ...src.switches } };
  const next = [...list.slice(0, at + 1), layout, ...list.slice(at + 1)];
  return { ok: true, list: next, layout, replaced: false };
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
    layouts: list.map((l) => ({ id: l.id, name: l.name, switches: l.switches, ...cleanStyle(l), ...(l.starter ? { starter: l.starter } : null) })),
    cv: 1,
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
  const starters = new Set<string>();
  let users = 0;
  for (const entry of layouts) {
    if (!entry || typeof entry !== "object") continue;
    const { id, name, switches, roles, profileStrength, footprint, starter } = entry as { id?: unknown; name?: unknown; switches?: unknown; roles?: unknown; profileStrength?: unknown; footprint?: unknown; starter?: unknown };
    if (!isLayoutId(id) || typeof name !== "string") continue;
    // An edited starter View: its id and name are the starter's own, one per starter.
    const spec = typeof starter === "string" ? ARRANGEMENT_SPECS.find((a) => a.id === starter) : undefined;
    if (starter !== undefined) {
      if (!spec || starters.has(spec.id) || id !== starterViewId(spec.id)) continue;
      const clean = sanitizeLayoutSwitches(switches);
      if (Object.keys(clean).length === 0) continue;
      starters.add(spec.id);
      out.push({ id, name: spec.label, switches: clean, ...cleanStyle({ roles, profileStrength, footprint }), starter: spec.id });
      continue;
    }
    if (users >= MAX_SAVED_LAYOUTS) continue;
    const check = checkLayoutName(name);
    if (!check.ok) continue;
    const key = layoutNameKey(check.name);
    if (ids.has(id) || names.has(key)) continue;
    const clean = sanitizeLayoutSwitches(switches);
    if (Object.keys(clean).length === 0) continue;
    ids.add(id);
    names.add(key);
    users++;
    out.push({ id, name: check.name, switches: clean, ...cleanStyle({ roles, profileStrength, footprint }) });
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
  // A proof scene persists NOTHING (proofSceneHoldsComposition.sentinel): its
  // Views live for this page only, exactly like its roles and strength.
  if (proofSceneHoldsWrites()) return false;
  if (!storage) return false;
  try {
    storage.setItem(SAVED_LAYOUTS_STORAGE_KEY, serializeSavedLayouts(list));
    return true;
  } catch {
    return false;
  }
}

// ── STARTER VIEWS + MY CURRENT VIEW (Drive Garden 18 snapshot 10-02 §B1–2) ──

/** The Views event: the same tab learns of a commit (`storage` fires only in OTHER tabs). */
export const MY_VIEWS_EVENT = "wm-my-views";

/** A starter View's edited copy has a fixed id, so re-saves never duplicate it. */
export function starterViewId(id: ArrangementId): string {
  return `starter-${id}`;
}

/** The trader's own Views — everything but edited starter copies. */
export function userViews(list: readonly SavedLayout[]): readonly SavedLayout[] {
  return list.filter((l) => !l.starter);
}

/** The trader's edit of a starter View, or null when it is at its default. */
export function starterOverride(list: readonly SavedLayout[], id: ArrangementId): SavedLayout | null {
  return list.find((l) => l.starter === id) ?? null;
}

/** The arms each edited starter presses — what the compiler registry is fed. */
export function starterArmsFromList(list: readonly SavedLayout[]): Partial<Record<ArrangementId, readonly ProfileId[]>> {
  const out: Partial<Record<ArrangementId, readonly ProfileId[]>> = {};
  for (const l of list) {
    if (!l.starter) continue;
    out[l.starter] = (Object.entries(l.switches) as [ProfileId, boolean | undefined][]).filter(([, v]) => v === true).map(([k]) => k);
  }
  return out;
}

/** The starter's switch set over every TOGGLE row: its arms on, the rest off. */
export function starterDefaultSwitches(id: ArrangementId): LayoutSwitches {
  const arms = defaultStarterArms(id);
  const out: Partial<Record<ProfileId, boolean>> = {};
  for (const t of toggleIds()) out[t as ProfileId] = arms.includes(t as ProfileId);
  return out;
}

/** The starter View as it presses now — the trader's edit, else the canon default. */
export function starterView(list: readonly SavedLayout[], id: ArrangementId): SavedLayout {
  const spec = ARRANGEMENT_SPECS.find((a) => a.id === id);
  return starterOverride(list, id) ?? { id: starterViewId(id), name: spec?.label ?? id, switches: starterDefaultSwitches(id), starter: id };
}

/**
 * EDIT a starter View: keep the chart's current composition (and style) as
 * this starter. The edited copy replaces any earlier edit; the canon is
 * untouched, so Restore can always bring it back.
 */
export function saveStarterView(
  list: readonly SavedLayout[],
  id: ArrangementId,
  switches: Readonly<Partial<Record<string, unknown>>>,
  style: LayoutStyle = {},
): SaveLayoutResult {
  const spec = ARRANGEMENT_SPECS.find((a) => a.id === id);
  if (!spec) return { ok: false, message: "That starter View does not exist" };
  const clean = sanitizeLayoutSwitches(switches);
  if (Object.keys(clean).length === 0) return { ok: false, message: "The chart has not reported its arrangement yet" };
  const layout: SavedLayout = { id: starterViewId(id), name: spec.label, switches: clean, ...cleanStyle(style), starter: id };
  const at = list.findIndex((l) => l.starter === id);
  if (at >= 0) {
    const next = list.slice();
    next[at] = layout;
    return { ok: true, list: next, layout, replaced: true };
  }
  return { ok: true, list: [...list, layout], layout, replaced: false };
}

/** RESTORE a starter View to its default: the edit is removed, nothing else moves. */
export function restoreStarterView(list: readonly SavedLayout[], id: ArrangementId): readonly SavedLayout[] {
  return list.filter((l) => l.starter !== id);
}

/**
 * The Views a Desk screen can wear (§LVI): the three composed starters as they
 * press now, then the trader's own. Clean is offered by the screen as its own
 * option (every reading off).
 */
export function screenViews(list: readonly SavedLayout[]): readonly SavedLayout[] {
  const starters = ARRANGEMENT_SPECS.filter((a) => a.arms.length > 0).map((a) => starterView(list, a.id));
  return [...starters, ...userViews(list)];
}

export const CURRENT_VIEW_ID = "my-current-view";
export const CURRENT_VIEW_NAME = "My current view";

/** Has the stored document already been through the "My current view" migration? */
export function currentViewMigrated(storedRaw: string | null): boolean {
  if (!storedRaw) return false;
  try {
    const doc = JSON.parse(storedRaw) as { cv?: unknown };
    return doc?.cv === 1;
  } catch {
    return false;
  }
}

/**
 * MIGRATE IN PLACE — the trader's switches as they stand become a View named
 * "My current view". Nothing is turned on or off: this only ADDS a list entry
 * holding the capture the chart announced. Returns null when there is nothing
 * to do (already migrated, the chart has not answered, or a View already holds
 * exactly this composition).
 */
export function migrateCurrentView(
  list: readonly SavedLayout[],
  storedRaw: string | null,
  capture: Readonly<Partial<Record<string, unknown>>> | null,
  style: LayoutStyle = {},
): readonly SavedLayout[] | null {
  if (currentViewMigrated(storedRaw) || !capture) return null;
  const clean = sanitizeLayoutSwitches(capture);
  if (Object.keys(clean).length === 0) return null;
  // Clean (nothing on) has its own starter View; and a View that already holds
  // the composition needs no twin. Either way the document is still written so
  // the migration is recorded as done.
  const nothingOn = !Object.values(clean).some((v) => v === true);
  const twin = list.some((l) => Object.keys(l.switches).length > 0 && Object.entries(l.switches).every(([k, v]) => clean[k as ProfileId] === v));
  if (nothingOn || twin || list.some((l) => l.id === CURRENT_VIEW_ID) || userViews(list).length >= MAX_SAVED_LAYOUTS) return list;
  return [{ id: CURRENT_VIEW_ID, name: CURRENT_VIEW_NAME, switches: clean, ...cleanStyle(style) }, ...list];
}

/** DUPLICATE a starter View (edited or default) into the trader's own Views — "Order Flow 2". */
export function duplicateStarterView(list: readonly SavedLayout[], id: ArrangementId, newId: () => string): SaveLayoutResult {
  const edited = starterOverride(list, id) !== null;
  const withStarter = edited ? list : [...list, starterView(list, id)];
  const result = duplicateLayout(withStarter, starterViewId(id), newId);
  if (!result.ok || edited) return result;
  return { ...result, list: result.list.filter((l) => !(l.starter === id && l.id === starterViewId(id))) };
}
