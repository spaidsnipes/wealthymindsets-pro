import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A ROUTE NAMED IN PROSE IS A CLAIM THAT THE ROUTE EXISTS.
 *
 * `/partnerships` publishes no unverified partner and says so plainly. It is
 * careful about its data. Then its one actionable sentence read:
 *
 *     "Reach out through the Profile → Contact section."
 *
 * There is no Contact section on `/profile`. There was no contact surface
 * anywhere in the build — that sentence was the ONLY occurrence of the word in
 * the entire app, which means it did not point at a room, it invented one.
 *
 * A page can be honest about its data and still lie about its map. Prose is
 * not decoration; a named destination is a promise the product either keeps or
 * breaks, and nothing in the type system was ever going to notice.
 *
 * THIS GUARD IS BIDIRECTIONAL ON PURPOSE. It does not ban the sentence
 * forever. It ties the sentence to the room: name a contact destination only
 * while a contact surface exists. Build the room and the guard goes quiet on
 * its own. That is the difference between a rule and a grudge.
 */

const APP_DIR = resolve(__dirname, "..");
const COMPONENTS_DIR = resolve(__dirname, "../../components");
const PAGE = resolve(__dirname, "./page.tsx");

/** Every .ts/.tsx source file under a root, recursively. */
function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = resolve(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
    }
  };
  walk(root);
  return out;
}

/**
 * A contact SURFACE, not a contact WORD.
 *
 * The distinction is the whole point: the defect this file exists to prevent
 * was a page that contained the word and no surface. So a bare mention can
 * never satisfy this predicate — the file must also carry something a person
 * could actually act on (a route segment, a mail link, or a form).
 */
function hasContactSurface(): boolean {
  for (const file of [...sourceFiles(APP_DIR), ...sourceFiles(COMPONENTS_DIR)]) {
    if (file === PAGE) continue; // the claimant cannot be its own evidence
    const src = readFileSync(file, "utf8");
    if (!/contact/i.test(src)) continue;
    if (/href=["']mailto:|["']\/contact["']|<form/i.test(src)) return true;
  }
  return false;
}

describe("× A ROUTE NAMED IN PROSE IS A CLAIM THAT THE ROUTE EXISTS", () => {
  const page = readFileSync(PAGE, "utf8");

  it("× THE INVENTED ROOM: /partnerships names a contact destination only if one exists", () => {
    const surfaceExists = hasContactSurface();
    // Match the RENDERED promise, not the explanatory comment above it. The
    // comment has to be allowed to quote the defect — that is how the next
    // reader learns what went wrong — so the pattern is anchored to the
    // instruction form ("reach out", "get in touch") rather than the word.
    const promisesAChannel = /(reach out|get in touch|contact us|email us)/i.test(
      page.replace(/\/\*[\s\S]*?\*\//g, ""),
    );
    if (!surfaceExists) {
      expect(promisesAChannel).toBe(false);
    }
    // When the surface is built, this assertion inverts into documentation
    // rather than an obstacle: the page is then free to point at it.
    expect(typeof surfaceExists).toBe("boolean");
  });

  it("× THE DEAD MAP: the retired Profile→Contact route is not resurrected", () => {
    const body = page.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toContain("Profile → Contact");
    expect(body).not.toMatch(/Profile\s*→\s*Contact/);
  });

  it("× THE PHANTOM AFFORDANCE: no navigation chevron on a block that navigates nowhere", () => {
    // A right-chevron is the universal "this goes somewhere" mark. The retired
    // block carried one on a plain div with no href and no handler.
    expect(page).not.toContain("ChevronRight");
  });

  it("× THE VACUOUS SWEEP: the surface probe really reads the tree", () => {
    // Non-vacuity: if the walker found nothing, every assertion above passes
    // for the wrong reason. Prove it reads a real, populated tree.
    const files = sourceFiles(APP_DIR);
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.endsWith("partnerships/page.tsx"))).toBe(true);
  });

  it("the page still discloses why it is empty — the fix did not delete the honesty", () => {
    expect(page).toContain("No verified partners published yet");
    expect(page).toContain("Partnership enquiries are not open yet");
  });
});
