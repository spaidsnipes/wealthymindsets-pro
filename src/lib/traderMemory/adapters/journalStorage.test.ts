import { describe, expect, it } from "vitest";
import {
  JOURNAL_STORAGE_KEY,
  JOURNAL_UPDATED_EVENT,
  LEGACY_JOURNAL_STORAGE_KEY,
  migrateLegacyJournal,
  readJournalStorage,
} from "./journalStorage";

function port(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

describe("canonical Journal storage", () => {
  it("gives canonical data absolute precedence, including an empty array", () => {
    const storage = port({ [JOURNAL_STORAGE_KEY]: "[]", [LEGACY_JOURNAL_STORAGE_KEY]: '[{"id":"legacy"}]' });
    expect(readJournalStorage(storage)).toMatchObject({ status: "RESOLVED_CANONICAL", records: [] });
  });

  it("never falls back when canonical data is malformed or not an array", () => {
    for (const raw of ["{", '{"id":"bad"}']) {
      expect(readJournalStorage(port({ [JOURNAL_STORAGE_KEY]: raw, [LEGACY_JOURNAL_STORAGE_KEY]: "[]" }))).toMatchObject({ status: "INVALID", records: [] });
    }
  });

  it("uses valid legacy data only when canonical data is absent", () => {
    expect(readJournalStorage(port({ [LEGACY_JOURNAL_STORAGE_KEY]: '[{"id":"legacy"}]' }))).toMatchObject({ status: "RESOLVED_LEGACY", records: [{ id: "legacy" }] });
    expect(readJournalStorage(port())).toMatchObject({ status: "ABSENT", records: [] });
  });

  it("fails closed when storage access throws", () => {
    expect(readJournalStorage({ getItem() { throw new Error("blocked"); } })).toMatchObject({ status: "UNAVAILABLE", records: [] });
  });

  it("migrates exact validated legacy bytes and keeps the legacy record", () => {
    const raw = '[{"id":"legacy"}]';
    const storage = port({ [LEGACY_JOURNAL_STORAGE_KEY]: raw });
    const result = migrateLegacyJournal(storage, readJournalStorage(storage));
    expect(result.status).toBe("MIGRATED");
    expect(storage.values.get(JOURNAL_STORAGE_KEY)).toBe(raw);
    expect(storage.values.get(LEGACY_JOURNAL_STORAGE_KEY)).toBe(raw);
  });

  it("does not report migration success after a write failure or readback mismatch", () => {
    const read = readJournalStorage(port({ [LEGACY_JOURNAL_STORAGE_KEY]: "[]" }));
    expect(migrateLegacyJournal({ getItem: () => null, setItem() { throw new Error("blocked"); } }, read).status).toBe("UNAVAILABLE");
    let reads = 0;
    expect(migrateLegacyJournal({ getItem: () => reads++ === 0 ? null : "[1]", setItem() {} }, read).status).toBe("UNAVAILABLE");
  });

  it("never overwrites canonical bytes that appear after the legacy read", () => {
    const read = readJournalStorage(port({ [LEGACY_JOURNAL_STORAGE_KEY]: '[{"id":"legacy"}]' }));
    for (const canonical of ['[{"id":"new"}]', "[]", "{"]) {
      let writes = 0;
      const result = migrateLegacyJournal({
        getItem: (key: string) => key === JOURNAL_STORAGE_KEY ? canonical : null,
        setItem() { writes += 1; },
      }, read);
      expect(result.status).toBe("NOT_REQUIRED");
      expect(writes).toBe(0);
    }
  });

  it("fails closed when the final canonical-absence preflight throws", () => {
    const read = readJournalStorage(port({ [LEGACY_JOURNAL_STORAGE_KEY]: "[]" }));
    let writes = 0;
    const result = migrateLegacyJournal({
      getItem() { throw new Error("blocked"); },
      setItem() { writes += 1; },
    }, read);
    expect(result.status).toBe("UNAVAILABLE");
    expect(writes).toBe(0);
  });

  it("does not migrate invalid legacy data and retains the canonical event name", () => {
    const storage = port({ [LEGACY_JOURNAL_STORAGE_KEY]: "{" });
    expect(migrateLegacyJournal(storage, readJournalStorage(storage)).status).toBe("NOT_REQUIRED");
    expect(storage.values.has(JOURNAL_STORAGE_KEY)).toBe(false);
    expect(JOURNAL_UPDATED_EVENT).toBe("wm-journal-updated");
  });
});
