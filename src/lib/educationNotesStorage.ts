export type AcademyNoteStorage = Pick<Storage, "getItem" | "setItem">;

export type AcademyNotePersistenceResult =
  | { status: "PERSISTED" }
  | { status: "UNAVAILABLE"; reason: string };

export function readAcademyNote(storage: Pick<Storage, "getItem">, key: string): string {
  try {
    return storage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Persist one Academy note through its existing browser-local owner.
 * Success requires an exact immediate readback; a completed setItem call is
 * not, by itself, evidence that the note survived browser persistence.
 */
export function persistAcademyNote(
  storage: AcademyNoteStorage,
  key: string,
  value: string,
): AcademyNotePersistenceResult {
  try {
    storage.setItem(key, value);
    if (storage.getItem(key) !== value) {
      return { status: "UNAVAILABLE", reason: "Browser readback did not match the note." };
    }
    return { status: "PERSISTED" };
  } catch {
    return { status: "UNAVAILABLE", reason: "Browser storage is unavailable." };
  }
}
