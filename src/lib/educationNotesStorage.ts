export type AcademyNoteStorage = Pick<Storage, "getItem" | "setItem">;
type StorageSource<T> = T | (() => T);

export type AcademyNoteReadResult =
  | { status: "READ"; value: string }
  | { status: "UNAVAILABLE" };

export type AcademyNotePersistenceResult =
  | { status: "PERSISTED" }
  | { status: "UNAVAILABLE"; reason: string };

export function readAcademyNote(storage: StorageSource<Pick<Storage, "getItem">>, key: string): AcademyNoteReadResult {
  try {
    const target = typeof storage === "function" ? storage() : storage;
    return { status: "READ", value: target.getItem(key) ?? "" };
  } catch {
    return { status: "UNAVAILABLE" };
  }
}

/**
 * Persist one Academy note through its existing browser-local owner.
 * Success requires an exact immediate readback; a completed setItem call is
 * not, by itself, evidence that the note survived browser persistence.
 */
export function persistAcademyNote(
  storage: StorageSource<AcademyNoteStorage>,
  key: string,
  value: string,
): AcademyNotePersistenceResult {
  try {
    const target = typeof storage === "function" ? storage() : storage;
    target.setItem(key, value);
    if (target.getItem(key) !== value) {
      return { status: "UNAVAILABLE", reason: "Browser readback did not match the note." };
    }
    return { status: "PERSISTED" };
  } catch {
    return { status: "UNAVAILABLE", reason: "Browser storage is unavailable." };
  }
}
