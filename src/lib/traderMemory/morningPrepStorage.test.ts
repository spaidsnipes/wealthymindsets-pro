import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  morningPrepStorageKey,
  readMorningPrepEntries,
  writeMorningPrepEntries,
  type MorningPrepEntry,
} from "./morningPrepStorage";

const prepPage = readFileSync(resolve(__dirname, "../../app/morning-prep/page.tsx"), "utf8");
const prepHook = readFileSync(resolve(__dirname, "./adapters/useTodayPrep.ts"), "utf8");
const deckPage = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
const journalPage = readFileSync(resolve(__dirname, "../../app/journal/page.tsx"), "utf8");

class FakeStorage {
  readonly values = new Map<string, string>();
  getItem = vi.fn((key: string) => this.values.get(key) ?? null);
  setItem = vi.fn((key: string, value: string) => { this.values.set(key, value); });
}

const ENTRY: MorningPrepEntry = {
  id: "prep-1",
  date: "2026-08-19T10:00:00.000Z",
  routine: "Wait for confirmation.",
  mood: "🎯",
  checklist: [{ id: "risk", text: "Risk set", done: true }],
  photo: null,
  createdAt: 1_787_120_000_000,
};

describe("Morning Prep immutable owner storage", () => {
  it("uses only a non-empty immutable UID key", () => {
    expect(morningPrepStorageKey("user/a")).toBe("wm:morning-prep:v2:user%2Fa");
    expect(morningPrepStorageKey(null)).toBeNull();
    expect(morningPrepStorageKey("  ")).toBeNull();
  });

  it("round-trips a versioned exact-owner envelope and acknowledges after readback", () => {
    const storage = new FakeStorage();
    const onChanged = vi.fn();
    expect(writeMorningPrepEntries("user-a", [ENTRY], { storage, onChanged })).toBe(true);
    expect(readMorningPrepEntries("user-a", storage)).toEqual({ state: "PRESENT", entries: [ENTRY] });
    expect(onChanged).toHaveBeenCalledOnce();
    expect(onChanged).toHaveBeenCalledWith("user-a");
  });

  it("fails closed across owners and never reads legacy handle, email, or guest keys", () => {
    const storage = new FakeStorage();
    storage.values.set("wm_morning_prep_founder", JSON.stringify([ENTRY]));
    storage.values.set("wm_morning_prep_email", JSON.stringify([ENTRY]));
    storage.values.set("wm_morning_prep_guest", JSON.stringify([ENTRY]));
    expect(readMorningPrepEntries("user-b", storage)).toEqual({ state: "ABSENT", entries: [] });
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledWith("wm:morning-prep:v2:user-b");
    expect(storage.values.get("wm_morning_prep_founder")).toBe(JSON.stringify([ENTRY]));
  });

  it("distinguishes unavailable malformed/cross-owner state from valid absence", () => {
    const storage = new FakeStorage();
    const key = morningPrepStorageKey("user-a")!;
    expect(readMorningPrepEntries("user-a", storage).state).toBe("ABSENT");
    storage.values.set(key, "{");
    expect(readMorningPrepEntries("user-a", storage).state).toBe("UNAVAILABLE");
    storage.values.set(key, JSON.stringify({ version: 2, ownerId: "user-b", entries: [ENTRY] }));
    expect(readMorningPrepEntries("user-a", storage).state).toBe("UNAVAILABLE");
    storage.values.set(key, JSON.stringify({ version: 2, ownerId: "user-a", entries: [{ id: "bad" }] }));
    expect(readMorningPrepEntries("user-a", storage).state).toBe("UNAVAILABLE");
  });

  it("never persists null/guest state and emits no success after a failed write", () => {
    const storage = new FakeStorage();
    const onChanged = vi.fn();
    expect(writeMorningPrepEntries(null, [ENTRY], { storage, onChanged })).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem.mockImplementationOnce(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(writeMorningPrepEntries("user-a", [ENTRY], { storage, onChanged })).toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("wires writer and both readers to the shared UID owner and owner-scoped events", () => {
    expect(prepPage).toContain("writeMorningPrepEntries(ownerId, next)");
    expect(prepPage).not.toContain("wm_morning_prep_");
    expect(prepHook).toContain("MORNING_PREP_CHANGED_EVENT");
    expect(prepHook).toContain("if (ownerId === userId) refresh();");
    expect(deckPage).toContain('<TodayPrepBridge userId={user?.id ?? null} />');
    expect(journalPage).toContain('<TodayIntentStrip userId={authCtx?.user?.id ?? null} />');
    expect(deckPage).not.toContain('userHandle={user?.id ?? "guest"}');
    expect(journalPage).not.toContain('userHandle={authCtx?.user?.id ?? "guest"}');
  });

  it("keeps every Growth Rings action on the 44px touch contract", () => {
    expect(prepPage).toMatch(/className="inline-flex min-h-11 items-center justify-center focus-visible:[^"]+"[\s\S]*?Growth Rings ↗/);
    expect(prepPage).toMatch(/className="inline-flex min-h-11 items-center justify-center text-sm font-bold focus-visible:[^"]+"[\s\S]*?Open the wall ↗/);
    expect(prepPage).toContain('className="inline-flex min-h-11 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"');
    expect(prepPage).toContain('className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"');
    expect(prepPage).toContain('className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold disabled:opacity-50"');
  });
});
