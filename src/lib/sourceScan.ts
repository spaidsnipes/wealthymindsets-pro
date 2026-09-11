/**
 * Source-text scanning helpers shared by the repo's static guards.
 *
 * WHY THIS MODULE EXISTS — read before adding a fourth scanner.
 *
 * This repository defends several invariants with static scans over its own
 * source text: the host-neutrality lock (no Vercel coupling), the env-manifest
 * gate in `src/lib/envManifest.test.ts`, and its sibling in
 * `scripts/env-manifest.test.ts`. Each one grew its own `readFileSync` +
 * regex, and each independently inherited the same blind spot: a regex over
 * raw file text cannot tell CODE from a COMMENT ABOUT CODE.
 *
 * That blind spot became visible on 2026-09-11. A defect fix in
 * `src/lib/email.ts` documented, in prose, the two mechanisms an earlier lock
 * had guarded — naming `process.env.VERCEL*` and `x-vercel-ip-city` in a
 * comment. Three separate scanners immediately failed, reporting a `VERCEL`
 * environment variable that no line of code reads and a host coupling that had
 * just been removed. The guards were not detecting the defect; they were
 * detecting the sentence describing it.
 *
 * That failure mode is worse than a false alarm. This codebase deliberately
 * records why a defect happened at the site of the fix, so a scanner that
 * fails on the explanation puts every future author under pressure to delete
 * the explanation to get a green suite — the guard would slowly consume the
 * institutional memory it exists to protect.
 *
 * Three scanners with one blind spot is a missing owner, not three bugs. This
 * module is that owner: the stripper lives here once, and every scanner
 * imports it rather than retyping its own. A fourth scanner should import it
 * too. Fixing the stripper fixes every guard at once, which is the whole point.
 */

/**
 * Remove comments from TypeScript/JavaScript source so a scan measures code
 * rather than commentary.
 *
 * Deliberately a lexical approximation, not a parser. It handles the two forms
 * that matter — block comments (including JSDoc) and line comments — and it
 * spares `://` so a URL inside a string literal is not mistaken for the start
 * of a comment. It is not asked to be exact about every pathological case: a
 * scanner's job is to catch a real read like `h.get("x-vercel-ip-city")`, and
 * a `//` sequence inside a string literal that is not part of a URL is rare
 * enough that over-stripping it cannot hide such a read.
 *
 * Any consumer MUST keep a positive control asserting that this function
 * removes prose while preserving code. Without one, a stripper that became too
 * greedy would blank every file and report a permanently clean repository —
 * the scanner would pass by seeing nothing at all.
 *
 * THE BODY IS NOT HERE. It lives in `./sourceScan.mjs`, because the third
 * consumer — `scripts/env-manifest.mjs` — is run by plain `node` and cannot
 * import TypeScript. This file is the typed doorway for the `@/lib/...`
 * consumers; that file is the single implementation both doorways share.
 * Changing the stripper means editing the `.mjs`.
 */
export { stripComments } from "./sourceScan.mjs";
