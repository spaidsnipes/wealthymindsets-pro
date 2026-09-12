/**
 * Sentinel — `.env.example` MUST NOT document a credential label that nothing
 * in this codebase reads.
 *
 * The parity Sentinel next door (`providerReadiness.envExample.test.ts`) runs
 * this comparison in ONE direction: every name the registry requires must be
 * documented. That direction catches an undocumented var. It cannot catch the
 * opposite, and the opposite is the failure that actually cost this product
 * six days of dark US equity tape.
 *
 * THE SHAPE. An operator reads `.env.example`, finds a label, and installs a
 * real credential under it. Nothing reads that name. The credential is present,
 * correct, and permanently unused, and every receipt reports the provider as
 * missing a key — so the next person goes and obtains a SECOND key instead of
 * fixing a label. `FINNHUB_KEY_` was that failure pointed one way (host name the
 * code did not read); `FINNHUB_API_KEY` and `POLYGON_API_KEY` sat in this file
 * as the same failure pointed the other way, and were removed BY HAND on
 * 2026-09-11 with nothing to stop them returning.
 *
 * ATH's current Command Center names this failure class directly and rates it
 * RED: CIRCUIT_ALIAS_DRIFT / WRONG_CIRCUIT_LABEL — "an operator can correctly
 * install a credential under one label while runtime code asks for another."
 * Its work order asks for a machine check, because the reconciliation table in
 * `.env.example`'s own comments is not a reconciliation: it is a note saying
 * someone once did one.
 *
 * WHAT COUNTS AS READ is DERIVED, never re-listed here. A second hand-typed
 * list of legitimate names would be the very drift this guards against — it
 * would be correct on the day it was typed and free to disagree afterwards.
 * A name is legitimate when the provider registry declares it (required,
 * recommended, alias, or alternative group) OR when some source file actually
 * reads it. Comments are stripped before the read scan: a label mentioned only
 * in prose is exactly the orphan being hunted, and must not vouch for itself.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { allProviderEnvNames } from "./providerReadiness";
import { SERVICE_KEY_VARS } from "@/lib/supabaseConfigStatus";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SRC_ROOT = resolve(REPO_ROOT, "src");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

/** Every env NAME documented in `.env.example`. Names only — the file has no values. */
function documentedLabels(): string[] {
  const text = readFileSync(resolve(REPO_ROOT, ".env.example"), "utf8");
  const names: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Every env NAME some non-test source file actually reads, comments stripped. */
function readByCode(): Set<string> {
  const names = new Set<string>();
  for (const file of sourceFiles(SRC_ROOT)) {
    const source = stripComments(readFileSync(file, "utf8"));
    for (const m of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) names.add(m[1]);
    for (const m of source.matchAll(/process\.env\[\s*["'`]([A-Z0-9_]+)["'`]\s*\]/g)) names.add(m[1]);
    for (const m of source.matchAll(/\benv\.([A-Z0-9_]+)\b/g)) names.add(m[1]);
    for (const m of source.matchAll(/\benv\[\s*["'`]([A-Z0-9_]+)["'`]\s*\]/g)) names.add(m[1]);
  }
  return names;
}

describe("a documented credential label must have a reader", () => {
  it("no name in .env.example is an orphan", () => {
    // Every DECLARING OWNER is imported, never re-listed. A name resolved
    // through an owner's own table is legitimate even though no file names it
    // next to `process.env` — `SUPABASE_SERVICE_ROLE_KEY` is exactly that, and
    // this guard reported it as an orphan on its first run until the owner was
    // imported. When a third resolver appears, this test fails by name and
    // forces its declaration to be imported here too, which is the point: the
    // alternative is a hand-kept allowlist, i.e. the drift being guarded.
    const legitimate = new Set([...allProviderEnvNames(), ...SERVICE_KEY_VARS, ...readByCode()]);
    const orphans = documentedLabels().filter((name) => !legitimate.has(name));
    expect(
      orphans,
      `.env.example documents ${orphans.length} label(s) nothing reads: ${orphans.join(", ")}. ` +
        "A credential installed under one of these is present, correct and permanently unused, " +
        "while every receipt reports the provider as missing a key. Either wire a reader, " +
        "declare it as an alias in PROVIDER_REQUIREMENTS, or delete the label.",
    ).toEqual([]);
  });

  it("the two stale vendor aliases removed by hand cannot return", () => {
    // Named explicitly because these two are the measured instances, and a
    // generic assertion would not tell the next reader WHICH labels once
    // existed or why their return is a regression rather than a new idea.
    const documented = documentedLabels();
    expect(documented).not.toContain("FINNHUB_API_KEY");
    expect(documented).not.toContain("POLYGON_API_KEY");
  });

  it("the scan reads code, not prose", () => {
    // The guard's own credibility. If the read scan counted comments, then
    // `.env.example`'s reconciliation table — which NAMES the stale aliases in
    // order to record that they were retired — would vouch for them, and this
    // Sentinel would certify the exact drift it exists to catch.
    const withOnlyAComment = stripComments("// process.env.WM_LABEL_THAT_ONLY_A_COMMENT_MENTIONS\n");
    expect(withOnlyAComment).not.toContain("WM_LABEL_THAT_ONLY_A_COMMENT_MENTIONS");
    // And the scan does find a real read, so an empty result can never pass by
    // accident — a reader set that silently came back empty would mark every
    // documented label an orphan, or worse, be mistaken for "nothing to check".
    expect(readByCode().size).toBeGreaterThan(10);
  });
});
