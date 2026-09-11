/**
 * THE IMPLEMENTATION of the shared source-text stripper. Read
 * `src/lib/sourceScan.ts` first — it carries the full account of why this
 * module exists.
 *
 * WHY THE IMPLEMENTATION IS `.mjs` AND NOT `.ts`
 *
 * This stripper has three consumers, and they do not run in the same world.
 * `src/lib/hostNeutrality.test.ts` and `src/lib/envManifest.test.ts` run under
 * vitest, which compiles TypeScript. `scripts/env-manifest.mjs` is executed by
 * plain `node` — as a build/CI script it has no compiler in front of it and
 * therefore cannot import a `.ts` file at all.
 *
 * That constraint is exactly how the blind spot stayed alive: the scripts-side
 * scanner could not share the fix, so it kept its own naive regex and kept
 * reporting a `VERCEL` variable that no line of code reads. Duplicating the
 * stripper into `scripts/` would "fix" today's failure while re-creating the
 * original defect — a second copy that the next repair silently misses.
 *
 * So the implementation lives here, in a file BOTH worlds can load: node
 * imports it by relative path, and `sourceScan.ts` re-exports it for the
 * `@/lib/...` consumers. One function, one place to fix, two doorways.
 */

/**
 * Remove comments from TypeScript/JavaScript source so a scan measures code
 * rather than commentary.
 *
 * @param {string} src raw file text
 * @returns {string} the same text with comments removed
 */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments, including JSDoc
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments, sparing `https://`
}
