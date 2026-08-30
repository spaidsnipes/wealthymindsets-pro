export type AcademyProgressRecord = Record<number, {
  completed: boolean;
  lessons: Record<string, boolean>;
}>;

export type AcademyProgressPersistenceResult =
  | { status: "PERSISTED" }
  | { status: "UNAVAILABLE"; reason: string };

/** Persist progress only after an earned completion event, never on page mount. */
export function persistAcademyProgress(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  progress: AcademyProgressRecord,
): AcademyProgressPersistenceResult {
  const serialized = JSON.stringify(progress);
  try {
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) {
      return { status: "UNAVAILABLE", reason: "Browser progress readback did not match." };
    }
    return { status: "PERSISTED" };
  } catch {
    return { status: "UNAVAILABLE", reason: "Browser progress storage is unavailable." };
  }
}
