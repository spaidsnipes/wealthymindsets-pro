/** Canonical browser-local Journal transport. This is not server durability. */
export const JOURNAL_STORAGE_KEY = "wm_journal_entries" as const;
export const LEGACY_JOURNAL_STORAGE_KEY = "wm-journal" as const;
export const JOURNAL_UPDATED_EVENT = "wm-journal-updated" as const;

type JournalStoragePort = Pick<Storage, "getItem" | "setItem">;

export type JournalStorageRead =
  | { readonly status: "RESOLVED_CANONICAL" | "RESOLVED_LEGACY"; readonly records: readonly unknown[]; readonly raw: string }
  | { readonly status: "ABSENT"; readonly records: readonly []; readonly raw: null }
  | { readonly status: "INVALID" | "UNAVAILABLE"; readonly records: readonly []; readonly raw: string | null; readonly reason: string };

function decodeArray(raw: string): readonly unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readJournalStorage(storage: Pick<JournalStoragePort, "getItem">): JournalStorageRead {
  let canonicalRaw: string | null;
  try {
    canonicalRaw = storage.getItem(JOURNAL_STORAGE_KEY);
  } catch {
    return { status: "UNAVAILABLE", records: [], raw: null, reason: "Canonical Journal storage is unavailable." };
  }

  if (canonicalRaw !== null) {
    const records = decodeArray(canonicalRaw);
    return records
      ? { status: "RESOLVED_CANONICAL", records, raw: canonicalRaw }
      : { status: "INVALID", records: [], raw: canonicalRaw, reason: "Canonical Journal storage is not a valid entry array." };
  }

  let legacyRaw: string | null;
  try {
    legacyRaw = storage.getItem(LEGACY_JOURNAL_STORAGE_KEY);
  } catch {
    return { status: "UNAVAILABLE", records: [], raw: null, reason: "Legacy Journal compatibility storage is unavailable." };
  }
  if (legacyRaw === null) return { status: "ABSENT", records: [], raw: null };

  const records = decodeArray(legacyRaw);
  return records
    ? { status: "RESOLVED_LEGACY", records, raw: legacyRaw }
    : { status: "INVALID", records: [], raw: legacyRaw, reason: "Legacy Journal storage is not a valid entry array." };
}

export type JournalMigrationResult =
  | { readonly status: "MIGRATED" }
  | { readonly status: "NOT_REQUIRED" }
  | { readonly status: "UNAVAILABLE"; readonly reason: string };

/** Journal-owner-only migration. The legacy bytes are never deleted. */
export function migrateLegacyJournal(storage: JournalStoragePort, read: JournalStorageRead): JournalMigrationResult {
  if (read.status !== "RESOLVED_LEGACY") return { status: "NOT_REQUIRED" };
  try {
    // Hydration and migration are separated by an effect boundary. Recheck
    // canonical custody immediately before writing so another tab cannot be
    // overwritten by a stale legacy snapshot. Any present bytes win, even []
    // or malformed data; repair is a separate, explicit authority.
    if (storage.getItem(JOURNAL_STORAGE_KEY) !== null) return { status: "NOT_REQUIRED" };
    storage.setItem(JOURNAL_STORAGE_KEY, read.raw);
    const readback = storage.getItem(JOURNAL_STORAGE_KEY);
    const parsed = readback === null ? null : decodeArray(readback);
    if (readback !== read.raw || parsed === null || JSON.stringify(parsed) !== JSON.stringify(read.records)) {
      return { status: "UNAVAILABLE", reason: "Canonical Journal migration readback did not match." };
    }
    return { status: "MIGRATED" };
  } catch {
    return { status: "UNAVAILABLE", reason: "Canonical Journal migration could not be verified." };
  }
}

export function notifyCanonicalJournalChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  } catch {
    // Event delivery is best-effort; persistence truth is determined by readback.
  }
}
