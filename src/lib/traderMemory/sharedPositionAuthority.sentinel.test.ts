/**
 * CALL-SITE SENTINEL for the shared position authority.
 *
 * The unit tests prove `decideWrite` answers correctly. Only a sentinel can
 * prove the ROUTE asks it — and, more importantly, that the route never grows
 * its own copy of the answer. H21: one owner per rule, never a second copy.
 *
 * §22 Orkin: "a Sentinel that never fires is worthless." Each assertion below
 * corresponds to a specific way this wiring has historically rotted, not to a
 * general wish for tidiness.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const ROUTE = join(ROOT, "src", "app", "api", "decision-position", "route.ts");
const LAW = join(ROOT, "src", "lib", "traderMemory", "sharedPositionAuthority.ts");
const MIGRATION = join(
  ROOT, "supabase", "migrations",
  "20260907080000_wm_decision_position_shared_authority.sql",
);

/** Comments explain the law; they must not be mistaken for restating it. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("H21 — the route asks the owner, it does not answer for itself", () => {
  const route = code(ROUTE);

  it("imports decideWrite from the one module that holds the law", () => {
    expect(route).toMatch(/import\s*\{[\s\S]*?decideWrite[\s\S]*?\}\s*from\s*"@\/lib\/traderMemory\/sharedPositionAuthority"/);
  });

  it("actually calls it — an unused import is not enforcement", () => {
    expect(route).toMatch(/decideWrite\(/);
  });

  it("does not compare versions itself", () => {
    // The exact defect this forbids: a route that decides staleness inline
    // and then diverges from the module the tests are pointed at.
    expect(route).not.toMatch(/baseReconVersion\s*[<>]=?\s*\w/);
    expect(route).not.toMatch(/reconVersion\s*[<>]=?\s*current/i);
  });

  it("does not mint its own next version", () => {
    // `nextReconVersion` is the authority's to state. A route computing
    // `current + 1` would be a second minting site.
    expect(route).not.toMatch(/currentReconVersion\s*\+\s*1/);
    expect(route).not.toMatch(/baseReconVersion\s*\+\s*1/);
  });

  it("does not keep its own list of settled-truth field names", () => {
    // SETTLED_TRUTH_KEYS lives in the law so the list grows in one place
    // when the record grows a new piece of broker truth.
    expect(route).not.toMatch(/quantityFilled[\s\S]{0,80}quantityProtected[\s\S]{0,80}executionState[\s\S]{0,120}=/);
    expect(route).not.toMatch(/SETTLED_TRUTH_KEYS\s*=/);
  });
});

describe("§11 — a signed-in device is still not a broker", () => {
  const route = code(ROUTE);

  it("does not take the RECONCILIATION role from the request body alone", () => {
    // The failure this stops: `role: write.role` — any phone that types the
    // word RECONCILIATION into JSON becomes the broker.
    expect(route).not.toMatch(/role:\s*write\.role/);
    expect(route).not.toMatch(/role\s*=\s*write\.role/);
  });

  it("requires a separate worker proof before granting the role", () => {
    expect(route).toMatch(/isReconciliationWorker\(/);
  });

  it("the worker proof reads a secret and compares it to a header", () => {
    expect(route).toMatch(/WM_RECONCILIATION_WORKER_SECRET/);
    expect(route).toMatch(/headers\.get\(/);
  });

  it("an absent secret does not grant the role", () => {
    // Fail closed. `if (!secret) return false` — never `return true`, and
    // never a comparison of two undefineds, which passes.
    expect(route).toMatch(/if\s*\(!secret\)\s*return false/);
  });

  it("every write path is behind requireAuth", () => {
    const handlers = route.match(/export async function (GET|POST)/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    // One requireAuth per exported handler, each followed by the guard return.
    const guards = route.match(/await requireAuth\(request\)/g) ?? [];
    expect(guards.length).toBe(handlers.length);
    expect(route).toMatch(/if\s*\(!auth\.ok\)\s*return auth\.response/);
  });
});

describe("the reach verdict is evidence, never a repo fact", () => {
  const route = code(ROUTE);

  it("names the authority only after the table has answered", () => {
    // The whole capitalReach seam collapses if this route returns
    // SHARED_POSITION_AUTHORITY unconditionally: the shell would claim
    // ALL_DEVICES on a database where the migration was never applied.
    // The USE of the constant, not the import of it.
    const at = route.indexOf("serverAuthority: SHARED_POSITION_AUTHORITY");
    expect(at).toBeGreaterThan(-1);
    const before = route.slice(0, at);
    expect(before).toMatch(/probeAuthority\(\)/);
    expect(before).toMatch(/serverAuthority:\s*null/);
  });

  it("the probe asks the database a real question", () => {
    expect(route).toMatch(/rpc\("wm_read_decision_position"/);
  });

  it("an unconfigured runtime and an unapplied migration both yield null", () => {
    const nulls = route.match(/serverAuthority:\s*null/g) ?? [];
    expect(nulls.length).toBeGreaterThanOrEqual(1);
    expect(route).toMatch(/if\s*\(!admin\)/);
  });
});

describe("§8 — the route speaks the way the law does", () => {
  const raw = readFileSync(ROUTE, "utf8");
  const notes = [...raw.matchAll(/note:\s*\n?\s*("(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*)/g)]
    .map(m => m[1]);

  it("has notes to check (the matcher itself must not rot)", () => {
    expect(notes.length).toBeGreaterThanOrEqual(4);
  });

  for (const word of ["ERROR", "FATAL", "CRITICAL", "INVALID", "FAILED"]) {
    it(`no note says ${word}`, () => {
      for (const note of notes) expect(note.toUpperCase()).not.toContain(word);
    });
  }
});

describe("the migration enforces atomicity and nothing else", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("updates only where the writer's version is the one on the row", () => {
    // This is the half TypeScript cannot do: two devices that both passed
    // decideWrite against version 7, and exactly one may land.
    expect(sql).toMatch(/recon_version\s*=\s*p_base_version/);
  });

  it("the intent RPC physically cannot set settled truth", () => {
    const fn = sql.slice(
      sql.indexOf("wm_record_decision_intent"),
      sql.indexOf("wm_apply_decision_reconciliation"),
    );
    expect(fn).not.toMatch(/quantity_filled\s*=/);
    expect(fn).not.toMatch(/quantity_protected\s*=/);
    expect(fn).not.toMatch(/execution_state\s*=/);
    expect(fn).not.toMatch(/protection_state\s*=/);
  });

  it("the table is server-only: RLS on, deny-all for anon and authenticated", () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/FOR ALL TO anon, authenticated[\s\S]{0,80}USING \(false\)/);
  });

  it("does not restate the law's vocabulary in SQL", () => {
    // No REJECT_STALE / REJECT_ROLE strings, no note text. If the words
    // lived here too they would drift from the module that is tested.
    expect(sql).not.toMatch(/REJECT_STALE|REJECT_ROLE|'ACCEPT'/);
  });

  it("every security-definer function pins its search_path", () => {
    const definers = sql.match(/SECURITY DEFINER/g) ?? [];
    const paths = sql.match(/SET search_path =/g) ?? [];
    expect(definers.length).toBeGreaterThan(0);
    expect(paths.length).toBe(definers.length);
  });
});

describe("the law module stays pure", () => {
  const law = code(LAW);

  it("imports nothing — it can be tested without a database", () => {
    expect(law).not.toMatch(/^\s*import\s/m);
  });

  it("reads no clock", () => {
    // §6: devices disagree about the time. Whose clock is authority? Nobody's.
    expect(law).not.toMatch(/Date\.now|new Date/);
  });
});
