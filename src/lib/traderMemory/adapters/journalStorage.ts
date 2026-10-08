/** Canonical browser-local Journal transport. This is not server durability. */
import { managementKey } from "@/lib/journal/managementOwner";

/** BASE keys. In a browser the book lives under the signed-in member's own key (journalStorageKeys). */
export const JOURNAL_STORAGE_KEY = "wm_journal_entries" as const;
export const LEGACY_JOURNAL_STORAGE_KEY = "wm-journal" as const;
export const JOURNAL_UPDATED_EVENT = "wm-journal-updated" as const;

/**
 * WHOSE BOOK — Garden 19 member isolation (2026-10-08). The journal is keyed by the signed-in
 * member through the ONE owner (managementOwner): `wm_journal_entries:<member>`. A guest, or a
 * browser before auth has resolved, has NO key — nothing is read and nothing is written under a
 * guess. Outside a browser (tests, server) the base keys are used with an injected storage.
 */
export function journalStorageKeys(): { readonly canonical: string; readonly legacy: string } | null {
  const canonical = managementKey(JOURNAL_STORAGE_KEY);
  const legacy = managementKey(LEGACY_JOURNAL_STORAGE_KEY);
  return canonical && legacy ? { canonical, legacy } : null;
}

/** Whether a `storage` event key is this member's journal (canonical or legacy). */
export function isJournalStorageEventKey(key: string | null): boolean {
  const keys = journalStorageKeys();
  return !!keys && (key === keys.canonical || key === keys.legacy);
}

/** The member's canonical book bytes as stored (null when absent, unreadable, or nobody is signed in). */
export function readJournalRaw(storage: Pick<Storage, "getItem">): string | null {
  const keys = journalStorageKeys();
  if (!keys) return null;
  try { return storage.getItem(keys.canonical); } catch { return null; }
}

const NO_MEMBER_REASON = "No signed-in member: the journal opens only under the member's own key.";

/** Write the member's book. False when nobody is signed in or storage refused — never a claimed save. */
export function writeJournalStorage(storage: Pick<Storage, "setItem">, json: string): boolean {
  const keys = journalStorageKeys();
  if (!keys) return false;
  try { storage.setItem(keys.canonical, json); return true; } catch { return false; }
}

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
  const keys = journalStorageKeys();
  if (!keys) return { status: "UNAVAILABLE", records: [], raw: null, reason: NO_MEMBER_REASON };
  let canonicalRaw: string | null;
  try {
    canonicalRaw = storage.getItem(keys.canonical);
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
    legacyRaw = storage.getItem(keys.legacy);
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
  const keys = journalStorageKeys();
  if (!keys) return { status: "UNAVAILABLE", reason: NO_MEMBER_REASON };
  try {
    // Hydration and migration are separated by an effect boundary. Recheck
    // canonical custody immediately before writing so another tab cannot be
    // overwritten by a stale legacy snapshot. Any present bytes win, even []
    // or malformed data; repair is a separate, explicit authority.
    if (storage.getItem(keys.canonical) !== null) return { status: "NOT_REQUIRED" };
    storage.setItem(keys.canonical, read.raw);
    const readback = storage.getItem(keys.canonical);
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
