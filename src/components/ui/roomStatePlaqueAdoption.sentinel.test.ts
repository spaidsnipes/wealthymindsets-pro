import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * EVERY OVERLOOKED STATE (G19 Universal Cinematic Law §1, house audit 2026-10-10):
 * the rooms' empty states stand on the house's one plaque, never a hand-rolled
 * grey sentence under a 20%-opacity icon.
 */
const ROOMS: readonly (readonly [string, string])[] = [
  ["src/app/journal/page.tsx", 'testId="journal-list-empty"'],
  ["src/app/paper/page.tsx", 'testId="paper-blotter-empty"'],
  ["src/app/lounge/page.tsx", 'testId="lounge-feed-empty"'],
  ["src/app/profile/page.tsx", 'testId="profile-trades-empty"'],
];
const read = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");

describe("empty states stand on RoomStatePlaque", () => {
  for (const [file, id] of ROOMS) {
    it(file, () => {
      const src = read(file);
      expect(src.length).toBeGreaterThan(5_000);
      expect(src).toContain('import { RoomStatePlaque } from "@/components/ui/RoomStatePlaque";');
      expect(src).toContain(id);
    });
  }
  it("the retired hand-rolled empties are gone", () => {
    const paper = read("src/app/paper/page.tsx");
    const lounge = read("src/app/lounge/page.tsx");
    expect(paper.length).toBeGreaterThan(5_000);
    expect(lounge.length).toBeGreaterThan(5_000);
    expect(paper).not.toContain('<span className="text-xs">No trades yet.</span>');
    expect(lounge).not.toContain('{feedTab === "following" ? "👥" : "📝"}');
  });
});
