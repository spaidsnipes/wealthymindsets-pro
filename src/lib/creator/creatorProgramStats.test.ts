import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { creatorProgramStats, type CreatorRosterRow } from "./creatorProgramStats";

const PAGE = fs.readFileSync(
  path.join(process.cwd(), "src/app/creator/page.tsx"),
  "utf8",
);
const PAGE_CODE = PAGE
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

function row(over: Partial<CreatorRosterRow> = {}): CreatorRosterRow {
  return { rank: 1, handle: "@a", tier: "PRO", earnings: "$100", subs: 3, avatar: "x", ...over };
}

describe("a dash can overclaim AND underclaim, and this strip did both", () => {
  const empty = creatorProgramStats([]);
  const byLabel = (l: string) => empty.find((s) => s.label === l)!;

  it("no tile renders a bare glyph", () => {
    // The whole defect. Four dashes stood for four different states, under
    // labels reading "Verified X" on a strip whose comment said "social proof".
    for (const s of empty) {
      expect(s.value).not.toBe("—");
      expect(s.value.trim().length).toBeGreaterThan(0);
    }
  });

  it("a genuine zero is stated as zero, not hidden behind a dash", () => {
    // "Absence is not zero" (H1) has a mirror nobody had written down: where
    // the count IS zero, a dash is also a lie — of omission. 0 is a CHECKABLE
    // claim a reader can hold us to.
    expect(byLabel("Creators enrolled").value).toBe("0");
    expect(byLabel("Creators enrolled").kind).toBe("MEASURED");
    expect(byLabel("Payouts to date").value).toBe("$0");
    expect(byLabel("Payouts to date").kind).toBe("MEASURED");
  });

  it("the mean of an empty set is UNDEFINED and must never print as 0", () => {
    const avg = byLabel("Average payout");
    expect(avg.kind).toBe("UNDEFINED");
    expect(avg.value).not.toBe("$0");
    expect(avg.value).not.toBe("0");
    expect(avg.reason).toContain("NOT zero");
  });

  it("a field that does not exist is NOT_TRACKED, not zero and not unknown", () => {
    // The roster schema has no country. This is a third state: the tile asks a
    // question the data cannot answer at any roster size.
    const c = byLabel("Countries");
    expect(c.kind).toBe("NOT_TRACKED");
    expect(c.value).not.toMatch(/^\d/);
    expect(c.reason).toContain("no field exists");
  });

  it("the four states are genuinely distinct, not four spellings of one", () => {
    expect(new Set(empty.map((s) => s.kind)).size).toBe(3);
  });

  it("every tile carries a reason, and the reason is never the label", () => {
    for (const s of empty) {
      expect(s.reason.length).toBeGreaterThan(20);
      expect(s.reason).not.toBe(s.label);
    }
  });

  it("with real creators the measured tiles become real numbers", () => {
    const got = creatorProgramStats([row({ earnings: "$300" }), row({ earnings: "$100" })]);
    const g = (l: string) => got.find((s) => s.label === l)!;
    expect(g("Creators enrolled").value).toBe("2");
    expect(g("Payouts to date").value).toBe("$400");
    expect(g("Average payout").value).toBe("$200");
    expect(g("Average payout").kind).toBe("MEASURED");
    // Countries stays NOT_TRACKED — a bigger roster does not create a field.
    expect(g("Countries").kind).toBe("NOT_TRACKED");
  });

  it("no label claims a verification the value cannot support", () => {
    // WAS "Verified Creators / Verified Payouts / Verified Average /
    // Verified Countries". "Verified" asserts a verification happened; a dash
    // beside it implies a verified figure exists and is merely withheld.
    for (const s of empty) expect(s.label).not.toMatch(/verified/i);
    expect(PAGE_CODE).not.toContain("Verified Payouts");
    expect(PAGE_CODE).not.toContain("Verified Creators");
  });

  it("the page reads the tiles from the owner and spells none of them", () => {
    expect(PAGE_CODE).toContain("creatorProgramStats(CREATORS)");
    expect(PAGE_CODE).not.toContain("const STATS = [");
  });

  it("the reason is announced on a phone, not only hovered", () => {
    // Same law as the chart-header chain: a phone has no hover, so `title`
    // alone would leave these values standing unexplained.
    expect(PAGE_CODE).toContain("title={s.reason}");
    expect(PAGE_CODE).toContain("aria-label={`${s.label}: ${s.value}. ${s.reason}`}");
  });
});
