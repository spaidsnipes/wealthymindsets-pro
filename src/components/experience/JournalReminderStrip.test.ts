import { describe, expect, it } from "vitest";
import { etDayKey, journalReminderVisible } from "./JournalReminderStrip";

const NOW = Date.UTC(2026, 9, 16, 14, 0); // 10:00 ET

describe("plate 34 · the journal reminder is its own switch", () => {
  it("shows only after a trade today with no journal entry today", () => {
    expect(journalReminderVisible({ tradesToday: 2, journaledToday: false, state: {}, nowMs: NOW })).toBe(true);
    expect(journalReminderVisible({ tradesToday: 0, journaledToday: false, state: {}, nowMs: NOW })).toBe(false);
    expect(journalReminderVisible({ tradesToday: null, journaledToday: false, state: {}, nowMs: NOW })).toBe(false);
    expect(journalReminderVisible({ tradesToday: 2, journaledToday: true, state: {}, nowMs: NOW })).toBe(false);
  });
  it("Skip today hides it until the next ET day; Remind me later for its hour", () => {
    expect(journalReminderVisible({ tradesToday: 1, journaledToday: false, state: { skipDay: etDayKey(NOW) }, nowMs: NOW })).toBe(false);
    expect(journalReminderVisible({ tradesToday: 1, journaledToday: false, state: { skipDay: "2026-10-15" }, nowMs: NOW })).toBe(true);
    expect(journalReminderVisible({ tradesToday: 1, journaledToday: false, state: { snoozeUntil: NOW + 1000 }, nowMs: NOW })).toBe(false);
    expect(journalReminderVisible({ tradesToday: 1, journaledToday: false, state: { snoozeUntil: NOW - 1 }, nowMs: NOW })).toBe(true);
  });
  it("the ET day key", () => {
    expect(etDayKey(Date.UTC(2026, 9, 16, 3, 0))).toBe("2026-10-15");
  });
});
