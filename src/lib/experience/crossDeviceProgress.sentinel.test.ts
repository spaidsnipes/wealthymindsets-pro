/**
 * CALL-SITE SENTINEL — /paper must ASK, and must not decorate.
 *
 * The unit tests prove the selector answers honestly. They cannot prove the
 * surface renders that answer rather than a prettier one, and the failure mode
 * here is specific and historic: a component that computes an honest verdict
 * and then hardcodes a reassuring string next to it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const PAPER = join(ROOT, "src", "app", "paper", "page.tsx");
const HOOK = join(ROOT, "src", "lib", "experience", "useSharedAuthorityProbe.ts");
const OWNER = join(ROOT, "src", "lib", "experience", "capitalReach.ts");

function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("/paper asks the authority instead of describing it", () => {
  const paper = code(PAPER);

  it("calls the probe", () => {
    expect(paper).toMatch(/useSharedAuthorityProbe\(\)/);
  });

  it("routes it through the reach owner, not through local branching", () => {
    expect(paper).toMatch(/selectCrossDeviceProgress\(/);
  });

  it("renders the steps the selector produced", () => {
    expect(paper).toMatch(/crossDeviceProgress\.steps\.map/);
  });

  it("renders the next dependency, which is the whole point", () => {
    // Computing an instruction and not showing it leaves the dead end intact.
    expect(paper).toMatch(/crossDeviceProgress\.nextDependency/);
  });

  it("does not spell the authority's name into the page", () => {
    // A surface that types "wm_decision_positions" is claiming the table
    // exists. The name may only arrive from something that asked.
    expect(paper).not.toMatch(/wm_decision_positions/);
  });

  it("does not decide DONE for itself", () => {
    // No local re-derivation of a step's state from the observation.
    expect(paper).not.toMatch(/authorityObservation\.(authority|status)\s*[=!]==/);
  });
});

describe("§9 — a limitation is quiet, not a status light", () => {
  const paper = readFileSync(PAPER, "utf8");
  const at = paper.indexOf("crossDeviceProgress.steps.map");
  const block = paper.slice(Math.max(0, at - 1200), at + 1200);

  it("the progress block is located (the window must not silently miss)", () => {
    expect(at).toBeGreaterThan(-1);
  });

  it("no green — green is protection, never build progress", () => {
    expect(block).not.toMatch(/wm-green|text-green|bg-green|#00D4AA/i);
  });

  it("no identity gold — gold is WM, not a tick mark", () => {
    expect(block).not.toMatch(/wm-gold|#d4af37/i);
  });

  it("no red — nothing here has been lost", () => {
    expect(block).not.toMatch(/wm-red|text-red|bg-red/i);
  });

  it("the WORD carries the state, so colour is not doing the work alone", () => {
    expect(block).toMatch(/"NOT YET"/);
    expect(block).toMatch(/"DONE"/);
  });

  it("uses tokens rather than hardcoded hex", () => {
    expect(block).toMatch(/text-wm-text-(dim|muted)/);
  });
});

describe("the probe reports what it learned, and nothing more", () => {
  const hook = code(HOOK);

  it("starts UNOBSERVED — a spinner is not a finding", () => {
    // Bound to the INVARIANT, not to one constant's name: whatever the initial
    // constant is called, it must be an UNOBSERVED-status observation whose
    // `note` is null — null note is what earns the selector's "has not asked
    // yet." sentence, and at mount that sentence is the true one.
    expect(hook).toMatch(/status:\s*"UNOBSERVED"/);
    const initial = hook.match(/useState<SharedAuthorityObservation>\((\w+)\)/);
    expect(initial, "the initial observation must be a named constant, not an inline literal").not.toBeNull();
    const declared = hook.match(
      new RegExp(`const ${initial![1]}: SharedAuthorityObservation = \\{[^}]*\\}`),
    );
    expect(declared, `${initial![1]} must be declared in this file`).not.toBeNull();
    expect(declared![0]).toMatch(/status:\s*"UNOBSERVED"/);
    expect(declared![0], "the never-asked state is the only one entitled to a null note")
      .toMatch(/note:\s*null/);
  });

  it("a lost connection does not become 'the table is absent'", () => {
    // catch { setObserved(...null) } would manufacture a finding out of an
    // offline phone. The catch must return to silence — but a silence that
    // still remembers WM asked, so it may not reuse the never-asked constant.
    const catchBlock = hook.slice(hook.indexOf("} catch {"));
    const set = catchBlock.match(/setObservation\((\w+)\)/);
    expect(set, "the catch must set an observation constant").not.toBeNull();
    const declared = hook.match(
      new RegExp(`const ${set![1]}: SharedAuthorityObservation = \\{[\\s\\S]*?\\n\\};`),
    );
    expect(declared![0]).toMatch(/status:\s*"UNOBSERVED"/);
    expect(declared![0], "a failed re-check must explain itself rather than claim WM never asked")
      .not.toMatch(/note:\s*null/);
    expect(catchBlock).not.toMatch(/status:\s*"OBSERVED"/);
  });

  it("401 is SIGNED_OUT, a real state, not a failure", () => {
    expect(hook).toMatch(/res\.status === 401/);
    expect(hook).toMatch(/status:\s*"SIGNED_OUT"/);
  });

  it("a non-string authority never becomes one", () => {
    expect(hook).toMatch(/typeof body\.serverAuthority === "string"/);
  });

  it("does not invent an authority name of its own", () => {
    expect(hook).not.toMatch(/wm_decision_positions/);
  });

  it("cancels on unmount so a late answer cannot overwrite a newer view", () => {
    expect(hook).toMatch(/live = false/);
    expect(hook).toMatch(/if \(!live\) return/);
  });
});

describe("H21 — one owner for 'how far does this book reach'", () => {
  it("the progress selector lives beside selectCapitalReach, not in a new module", () => {
    expect(code(OWNER)).toMatch(/export function selectCrossDeviceProgress\(/);
  });

  it("the owner is still pure", () => {
    const owner = code(OWNER);
    expect(owner).not.toMatch(/^\s*import\s/m);
    expect(owner).not.toMatch(/Date\.now|fetch\(/);
  });

  it("step 2 is derived from the reach verdict, never from the observation", () => {
    // Read as source, because this is the assertion whose violation would be
    // invisible in any single unit test: `observation.authority !== null`
    // appearing anywhere in the book step is the bug.
    const owner = code(OWNER);
    const from = owner.indexOf("const bookStep");
    const to = owner.indexOf("const steps =");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const bookStep = owner.slice(from, to);
    expect(bookStep).not.toMatch(/observation/);
    expect(bookStep).toMatch(/verdict\.reach === "ALL_DEVICES"/);
  });
});
