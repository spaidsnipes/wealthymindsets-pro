import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DECK_SECTIONS,
  DECK_SECTION_INDEX_VERSION,
  deckSection,
} from "./deckSectionIndex";

const root = path.resolve(__dirname, "../../..");
const raw = fs.readFileSync(path.join(root, "src/app/command-deck/page.tsx"), "utf8");

/**
 * A Sentinel that fails on its own honest prose is testing the wrong surface.
 * The comment explaining WHY the Story Ribbon row was removed necessarily
 * names it; that is documentation, not a promise rendered to a trader.
 */
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const page = stripComments(raw);

describe("deckSectionIndex", () => {
  it("is versioned so a surface can pin the index it renders", () => {
    expect(DECK_SECTION_INDEX_VERSION).toBe("wm.deck-section-index.v1");
  });

  it("numbers every section uniquely and in ascending order", () => {
    const ns = DECK_SECTIONS.map((s) => s.n);
    expect(new Set(ns).size).toBe(ns.length);
    expect([...ns].sort((a, b) => a - b)).toEqual(ns);
  });

  it("gives every section a non-empty label and tagline", () => {
    for (const s of DECK_SECTIONS) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.tagline.trim().length).toBeGreaterThan(0);
    }
  });

  it("throws rather than returning a hole for an unknown ordinal", () => {
    // A banner that silently renders a blank heading is the absent-cell
    // defect again: the trader cannot tell a missing section from an
    // unnamed one.
    expect(() => deckSection(1)).toThrow(/no \/command-deck section numbered 1/);
    expect(deckSection(3).tagline).toBe("regime → management");
  });
});

describe("SENTINEL — ONE OWNER FOR THE NUMBERED SECTIONS", () => {
  // The deck used to name its sections twice: once in <SectionBanner> and
  // once in a hardcoded array inside the "Awaiting first observation"
  // placeholder. They drifted. The Story Ribbon was retired and a Sentinel
  // was added forbidding its BANNER — but the placeholder kept promising
  // "1 · Story Ribbon · Market Narrative" as a section still to come.
  // A SENTINEL PINNED TO A SPELLING IS NOT PINNED TO A MEANING.

  it("self-test: stripComments removes prose but keeps rendered literals", () => {
    expect(stripComments('{/* "Story Ribbon" */}<b>x</b>')).not.toContain("Story Ribbon");
    expect(stripComments('const a = "Story Ribbon";')).toContain("Story Ribbon");
  });

  it("the waiting index maps the shared array — it does not retype the sections", () => {
    expect(page).toContain("DECK_SECTIONS.map(");
    expect(page).toContain('from "@/lib/experience/deckSectionIndex"');
  });

  it("no section is promised anywhere that the index does not own", () => {
    // Every retired heading must be gone from the page as a rendered
    // literal, not merely gone from its banner.
    const known = DECK_SECTIONS.map((s) => s.label);
    expect(known).not.toContain("Story Ribbon · Market Narrative");
    expect(page).not.toContain("Story Ribbon · Market Narrative");
  });

  it("every SectionBanner reads its label from the index", () => {
    const banners = page.match(/<SectionBanner[^>]*\/>/g) ?? [];
    expect(banners.length).toBe(DECK_SECTIONS.length);
    for (const b of banners) {
      // A literal label string here would be a second owner.
      expect(b).toMatch(/label=\{deckSection\(\d+\)\.label\}/);
      expect(b).toMatch(/tagline=\{deckSection\(\d+\)\.tagline\}/);
    }
  });

  it("every SectionBanner ordinal exists in the index", () => {
    const banners = page.match(/<SectionBanner number=\{(\d+)\}/g) ?? [];
    const ns = banners.map((b) => Number(b.replace(/\D/g, "")));
    expect(ns.length).toBeGreaterThan(0);
    for (const n of ns) expect(() => deckSection(n)).not.toThrow();
    // ...and the index promises nothing the page does not render.
    expect([...ns].sort((a, b) => a - b)).toEqual(DECK_SECTIONS.map((s) => s.n));
  });
});
