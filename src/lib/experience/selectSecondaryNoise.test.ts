import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { selectSecondaryNoise, SECONDARY_NOISE_VERSION } from "./selectSecondaryNoise";
import type { MaterialityReading } from "../marketData/viewModels/selectMateriality";

const reading = (over: Partial<MaterialityReading> = {}): MaterialityReading => ({
  material: false,
  reasons: [],
  summary: "no material change",
  ...over,
});

describe("selectSecondaryNoise", () => {
  it("is versioned so a surface can pin the compiler it renders", () => {
    expect(SECONDARY_NOISE_VERSION).toBe("wm.secondary-noise.v1");
  });

  describe("A QUIET SCREEN AND AN UNWATCHED SCREEN LOOK IDENTICAL", () => {
    // The law this file exists to enforce. "Quieted" asserts that something was
    // compared and found not to matter. With no prior snapshot NOTHING was
    // compared, and printing the mockup's word anyway is the JPEG's $1.80.
    it("refuses to say Quieted when there is no prior snapshot", () => {
      const vm = selectSecondaryNoise(null);
      expect(vm.state).toBe("UNWATCHED");
      expect(vm.value).not.toMatch(/quiet/i);
      expect(vm.unresolved).toBe(true);
    });

    it("says Quieted only when a real comparison found nothing material", () => {
      const vm = selectSecondaryNoise(reading({ material: false }));
      expect(vm.state).toBe("QUIETED");
      expect(vm.value).toBe("Quieted");
      expect(vm.unresolved).toBe(false);
    });

    it("gives the two calm states DIFFERENT words AND different resolution", () => {
      const unwatched = selectSecondaryNoise(null);
      const quieted = selectSecondaryNoise(reading({ material: false }));
      expect(unwatched.value).not.toBe(quieted.value);
      expect(unwatched.unresolved).not.toBe(quieted.unresolved);
    });
  });

  describe("a material change must break the quiet", () => {
    it("reports ACTIVE and echoes the compiled summary verbatim", () => {
      const vm = selectSecondaryNoise(
        reading({ material: true, reasons: ["DECISION_CHANGED"], summary: "decision changed" }),
      );
      expect(vm.state).toBe("ACTIVE");
      expect(vm.unresolved).toBe(false);
      // Re-wording would make this file a SECOND owner of why the screen spoke.
      expect(vm.detail).toBe("decision changed");
    });

    it("never re-derives a reason of its own from `reasons`", () => {
      const vm = selectSecondaryNoise(
        reading({ material: true, reasons: ["MISSING_APPEARED", "PRIMARY_CHANGED"], summary: "S" }),
      );
      expect(vm.detail).toBe("S");
    });
  });

  it("always supplies a non-empty detail — a bare word explains nothing", () => {
    for (const vm of [
      selectSecondaryNoise(null),
      selectSecondaryNoise(reading()),
      selectSecondaryNoise(reading({ material: true, summary: "x" })),
    ]) {
      expect(vm.detail.length).toBeGreaterThan(0);
    }
  });

  it("is pure — same input yields a deeply equal result", () => {
    const r = reading({ material: true, summary: "decision changed" });
    expect(selectSecondaryNoise(r)).toEqual(selectSecondaryNoise(r));
  });
});

describe("SENTINEL — the Auto-Quiet gate must have a rendered consumer", () => {
  // selectMateriality shipped in shift-F and sat with ZERO consumers. A gate
  // nothing renders is a gate nothing obeys: the deck claimed Auto-Quiet in its
  // docblocks while quieting nothing. A COMMENT IS NOT A CONSUMER.
  const root = path.resolve(__dirname, "../../..");
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

  /**
   * A SENTINEL PINNED TO A SPELLING IS NOT PINNED TO A MEANING. The first cut
   * of the painted-word check below matched this component's own DOCBLOCK,
   * where "Quieted" appears while EXPLAINING why it must never be hardcoded.
   * Prose about a defect is not the defect.
   */
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("self-test: stripComments removes prose but keeps rendered literals", () => {
    expect(stripComments('/* say "Quieted" */ const a = "Quieted";')).toContain('"Quieted"');
    expect(stripComments('/* say "Quieted" */ const a = 1;')).not.toContain("Quieted");
    expect(stripComments('// "Quieted"\nconst a = 1;')).not.toContain("Quieted");
  });

  it("the deck compiles a real materiality delta, not a hardcoded word", () => {
    const page = read("src/app/command-deck/page.tsx");
    expect(page).toContain("selectMateriality");
    expect(page).toContain("selectSecondaryNoise");
    expect(page).toContain("noise={secondaryNoise}");
  });

  it("the banner renders the compiled value — it never spells the word itself", () => {
    const bar = read("src/components/command/ActiveQuestionBar.tsx");
    expect(bar).toContain("Secondary Noise");
    expect(bar).toContain("{noise.value}");
    // A literal "Quieted" in the RENDERED code would be a painted state. In a
    // comment it is only an explanation, so the comments come out first.
    expect(stripComments(bar)).not.toContain("Quieted");
  });
});
