export interface MorningPrepChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MorningPrepEntry {
  id: string;
  date: string;
  routine: string;
  mood: string;
  checklist: MorningPrepChecklistItem[];
  photo?: string | null;
  createdAt: number;
}

export type MorningPrepReadState = "PRESENT" | "ABSENT" | "UNAVAILABLE";

export interface MorningPrepReadResult {
  readonly state: MorningPrepReadState;
  readonly entries: readonly MorningPrepEntry[];
}

export const MORNING_PREP_CHANGED_EVENT = "wm:morning-prep:changed:v2";
const VERSION = 2 as const;

interface MorningPrepEnvelope {
  version: typeof VERSION;
  ownerId: string;
  entries: readonly MorningPrepEntry[];
}

type StoragePort = Pick<Storage, "getItem" | "setItem">;

export function morningPrepStorageKey(userId: string | null): string | null {
  const ownerId = userId?.trim();
  return ownerId ? `wm:morning-prep:v2:${encodeURIComponent(ownerId)}` : null;
}

function isChecklistItem(value: unknown): value is MorningPrepChecklistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.text === "string" && typeof item.done === "boolean";
}

function isPrepEntry(value: unknown): value is MorningPrepEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.date === "string" &&
    typeof entry.routine === "string" &&
    typeof entry.mood === "string" &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt) &&
    Array.isArray(entry.checklist) &&
    entry.checklist.every(isChecklistItem) &&
    (entry.photo == null || typeof entry.photo === "string")
  );
}

function browserStorage(): StoragePort | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function readMorningPrepEntries(
  userId: string | null,
  storage: StoragePort | null = browserStorage(),
): MorningPrepReadResult {
  const ownerId = userId?.trim() ?? "";
  const key = morningPrepStorageKey(ownerId);
  if (!key || !storage) return { state: "UNAVAILABLE", entries: [] };

  try {
    const raw = storage.getItem(key);
    if (raw == null) return { state: "ABSENT", entries: [] };
    const parsed = JSON.parse(raw) as Partial<MorningPrepEnvelope>;
    if (
      parsed.version !== VERSION ||
      parsed.ownerId !== ownerId ||
      !Array.isArray(parsed.entries) ||
      !parsed.entries.every(isPrepEntry)
    ) return { state: "UNAVAILABLE", entries: [] };
    return { state: parsed.entries.length > 0 ? "PRESENT" : "ABSENT", entries: parsed.entries };
  } catch {
    return { state: "UNAVAILABLE", entries: [] };
  }
}

function dispatchOwnerChange(ownerId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MORNING_PREP_CHANGED_EVENT, { detail: { ownerId } }));
}

export function writeMorningPrepEntries(
  userId: string | null,
  entries: readonly MorningPrepEntry[],
  options: { storage?: StoragePort | null; onChanged?: (ownerId: string) => void } = {},
): boolean {
  const ownerId = userId?.trim() ?? "";
  const key = morningPrepStorageKey(ownerId);
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (!key || !storage || !entries.every(isPrepEntry)) return false;

  const serialized = JSON.stringify({ version: VERSION, ownerId, entries } satisfies MorningPrepEnvelope);
  try {
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return false;
    (options.onChanged ?? dispatchOwnerChange)(ownerId);
    return true;
  } catch {
    return false;
  }
}
