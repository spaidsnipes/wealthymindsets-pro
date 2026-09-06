import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * ROOT CAUSE THIS FIXES: the project resolves the `@/*` path alias to `./src/*`
 * via `tsconfig.json` for the app + typecheck, but Vitest does NOT read
 * `tsconfig.json` paths on its own and no plugin supplied the alias. So any test
 * that VALUE-imports a `@/...` module without mocking it failed to resolve
 * ("Cannot find package '@/...'"). Tests only "passed" before when their `@/`
 * imports were either type-only (elided at runtime) or replaced by a
 * `vi.mock("@/...")` factory (never really resolved) — masking the gap until a
 * real, unmocked `@/` value import appeared (useLearningGenomeBundle.test.ts).
 *
 * Wiring the same alias Vitest-side makes test module resolution match the app
 * and the TypeScript compiler — one canonical alias, no parallel copy. It is
 * strictly additive: mocked and type-only `@/` imports are unaffected.
 */
export default defineConfig({
  test: {
    // Nested Claude worktrees are separate historical checkouts, not part of
    // this repository candidate. Running their copied suites mixes stale
    // expectations into the root receipt and can double/triple execution.
    //
    // `scratchpad/` is the same hazard one directory over: it holds the §22
    // Orkin revive harness, whose whole method is keeping byte-copies of real
    // suites to restore after each revive. Those copies were being discovered
    // and run. A stale duplicate of a Sentinel passing in the root receipt is
    // worse than one failing — it reports as green a guard that is no longer
    // guarding the shipped file.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**", "scratchpad/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
