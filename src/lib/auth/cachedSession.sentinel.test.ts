/**
 * SOURCE SENTINELS FOR THE IDENTITY BOUNDARY.
 *
 * The defect was a cast, and a cast is invisible to behaviour: it compiles, it
 * runs, and it is only wrong about bytes a test has to go out of its way to
 * produce. What must be pinned is that no code path turns an unchecked value
 * into a signed-in trader, and that the guards have ONE owner (H21).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const CONTEXT = read("src/contexts/AuthContext.tsx");
const OWNER = read("src/lib/auth/cachedSession.ts");
const SHAPE = read("src/lib/storedShape.ts");
const JOURNAL_SHAPE = read("src/lib/journal/journalRecordShape.ts");

describe("no path turns unchecked bytes into a signed-in trader", () => {
  it("AuthContext does not cast the cached session", () => {
    expect(CONTEXT).not.toMatch(/as WMUser/);
    expect(CONTEXT).not.toMatch(/JSON\.parse\([^)]*\) as /);
  });

  it("AuthContext does not parse the session key itself", () => {
    // The read belongs to the owner. A second reader here is a second answer
    // to "who is signed in".
    expect(CONTEXT).toMatch(/readCachedSession\(localStorage, SESSION_KEY\)/);
    expect(CONTEXT).not.toMatch(/JSON\.parse\(\s*raw/);
  });

  it("the /api/auth/me body is hydrated, not spread", () => {
    // This branch WRITES the cache, so an id-less 200 body did not render
    // wrong once — it was persisted and re-read on every later load.
    expect(CONTEXT).toMatch(/hydrateCachedUser\(data\.user\)/);
    expect(CONTEXT).not.toMatch(/\.\.\.raw,/);
  });

  it("core-team status is derived, never read off the payload", () => {
    expect(CONTEXT).toMatch(/ceo: isCoreTeam\(/);
  });

  it("the account shape is declared once, beside its reader", () => {
    expect(CONTEXT).not.toMatch(/interface WMUser \{/);
    expect(OWNER).toMatch(/export interface WMUser \{/);
  });
});

describe("the owner refuses the two fields an account cannot exist without", () => {
  it("id and email are both required, as text", () => {
    expect(OWNER).toMatch(/const id = readStoredText\(value\.id\)/);
    expect(OWNER).toMatch(/const email = readStoredText\(value\.email\)/);
    expect(OWNER).toMatch(/if \(id === undefined \|\| email === undefined\) return null;/);
  });

  it("flags are read strictly — a truthy string grants nothing", () => {
    for (const flag of ["profileComplete", "verified", "ceo"]) {
      expect(OWNER).toMatch(new RegExp(`${flag}: value\\.${flag} === true`));
    }
    // `!!value.verified` would hand a badge to the string "false".
    expect(OWNER).not.toMatch(/!!value\./);
    expect(OWNER).not.toMatch(/Boolean\(value\./);
  });

  it("no default identity — absence never resolves to a session (§14.1)", () => {
    expect(OWNER).not.toMatch(/\?\? "anonymous"/);
    expect(OWNER).not.toMatch(/id: [^;]*\?\? /);
  });
});

describe("the generic guards have one owner (H21)", () => {
  it("the identity owner asks storedShape rather than re-deriving", () => {
    expect(OWNER).toMatch(/from "@\/lib\/storedShape"/);
    expect(OWNER).not.toMatch(/typeof value === "string"/);
    expect(OWNER).not.toMatch(/\.trim\(\) !== ""/);
    expect(OWNER).not.toMatch(/Array\.isArray/);
  });

  it("the journal shape now delegates the same three questions", () => {
    // These moved OUT of journalRecordShape so identity and the book cannot
    // drift apart on what a readable string is.
    expect(JOURNAL_SHAPE).toMatch(/from "@\/lib\/storedShape"/);
    expect(JOURNAL_SHAPE).not.toMatch(/typeof value === "number" && Number\.isFinite/);
    expect(JOURNAL_SHAPE).not.toMatch(/!Array\.isArray\(value\)/);
  });

  it("storedShape is domain-free — it answers about values, not records", () => {
    // Scoped to CODE. The header legitimately names its callers in order to
    // explain why they must not keep private copies; matching that prose and
    // calling it a domain dependency would make this sentinel a liar.
    const code = SHAPE
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/journal|trade|pnl|WMUser|session/i);
    expect(code).toMatch(/export function isStoredRecord/);
  });
});
