/**
 * A RUNNING BUILD MUST BE ABLE TO NAME ITSELF.
 *
 * MEASURED 2026-09-12, during a shift, by hand, because there was no other way:
 * three commits had been pushed to `main` and NONE of them were on the Founder's
 * glass. Proving that took string archaeology against minified production
 * chunks —
 *
 *   chunk 18 contains "Selected option expression"   (positive control: this IS
 *                                                     the option-expression chunk)
 *   chunk 18 contains "Reference timing unverified"  (positive control)
 *   chunk 18 does NOT contain "Observed at"          (50f1b53 absent)
 *   chunk 18 does NOT contain "Your thesis"          (6110a25 absent)
 *   chunk 17 contains "SESSION CLOSED"               (positive control: watchlist)
 *   chunk 17 does NOT contain "data-wm-row"          (64cbf8d absent)
 *
 * — because the deployed app could not answer the only question that mattered:
 * WHICH COMMIT ARE YOU? `/api/build-info` did not exist; the request fell
 * through to the app shell and returned 200 with HTML, which is the worst
 * possible answer: a success code for a question never heard.
 *
 * ROOT CAUSE of the invisibility itself was a wrangler OAuth token that expired
 * 2026-08-31T15:32:07Z and cannot refresh non-interactively. But the token
 * expiring is ordinary. What made it a TRUTH failure is that nothing announced
 * it: local gates went green, `git push` succeeded, and every downstream claim
 * of "shipped" was made against a production that had silently stopped moving
 * twelve days earlier. READINESS_THEATER — a pipeline reporting on its own
 * intentions.
 *
 * CLAIM SCOPE — read this before quoting the endpoint.
 *   PROVES:        the commit the SERVER BUNDLE now answering this request was
 *                  built from, and when it was built.
 *   DOES NOT PROVE: what any particular browser is currently executing. A glass
 *                  holding cached client chunks is a separate question with a
 *                  separate answer. Server parity is NECESSARY for a founder-
 *                  visible change to be live; it is not SUFFICIENT.
 *   NEVER CARRIES: a secret, an env NAME, a provider list, or an account id.
 *                  The commit hash of the Founder's own product is the entire
 *                  payload, and it is the minimum that makes the receipt useful.
 *
 * UNSTAMPED is a first-class honest state, not a fallback. A build that was
 * produced without the stamp does not know its own commit, and guessing — from
 * a timestamp, from a package version, from anything — would reinstate exactly
 * the false confidence this module exists to remove.
 *
 * REVIVE LEDGER — six mutations 2026-09-12, all restored byte-identically,
 * every one failing BY NAME:
 *   A. `FULL_SHA` loosened to /^[0-9a-fA-F]+$/ — "refuses a malformed stamp
 *      instead of reporting permanent false drift".
 *   B. the empty-stamp branch returning STAMPED — four tests, across the module
 *      AND the route, including "says UNSTAMPED rather than guessing".
 *   C. `deploy:cf` calling `opennextjs-cloudflare build` directly again — "the
 *      cloudflare deploy path goes through the stamping script, not around it".
 *   D. `build:cloudflare` un-stamped — "build:cloudflare stamps the commit it
 *      is building". This mutation reproduces the original defect exactly:
 *      everything green, receipt served, and it says UNSTAMPED forever.
 *      This was not hypothetical. The FIRST version of this atom stamped the
 *      build scripts and stopped there, and the built worker contained the
 *      variable NAME and not its value, because on Cloudflare `process.env` is
 *      populated from Worker bindings at request time, not from the shell that
 *      ran the build. Two more Sentinels were added for the half that
 *      package.json cannot see: next.config must carry the stamp into the
 *      bundle, and the route must read it as a LITERAL member expression.
 *   E. `env: process.env` added to the response — "carries the commit and
 *      nothing else from the environment".
 *   F. `cache-control` set to public/max-age — "is never cached".
 *
 * The parity script's four outcomes were PROVEN against live and stubbed
 * origins rather than asserted: UNREACHABLE against real production, which
 * answered 404 with text/html — the exact fall-through shape; MATCH against
 * HEAD; DRIFT against 6110a25 ("1 commit on this revision has not reached the
 * host") and against an unrelated hash ("this clone cannot relate the two
 * revisions"); and UNSTAMPED. Only MATCH exits 0.
 *
 * END-TO-END RECEIPT, not an inference. After `npm run build:cloudflare` at
 * 64cbf8d, the literal commit hash appears in `.open-next/worker.js`'s server
 * function bundle, and the built app served on a real port answered:
 *
 *   HTTP/1.1 200 OK
 *   cache-control: no-store
 *   {"state":"STAMPED","sha":"64cbf8d…cca0","shortSha":"64cbf8d",
 *    "builtAt":"2026-09-12T20:56:46Z", …}
 *
 * and `verify-prod-parity` against that origin printed MATCH and exited 0.
 */

/** Set at BUILD time by the `build:*` scripts. Never set at request time. */
export const BUILD_SHA_ENV = "WM_BUILD_SHA";
export const BUILD_TIME_ENV = "WM_BUILD_TIME";

export type BuildIdentityState = "STAMPED" | "UNSTAMPED";

export interface BuildIdentity {
  readonly state: BuildIdentityState;
  /** Full 40-char commit hash, or null when UNSTAMPED. */
  readonly sha: string | null;
  /** ISO-8601 instant the bundle was built, or null when the build did not say. */
  readonly builtAt: string | null;
  /** Why the state is what it is — always present, always a sentence. */
  readonly note: string;
}

const FULL_SHA = /^[0-9a-f]{40}$/;

/**
 * A short hash is for HUMANS to compare against `git log`. It is derived, never
 * stored, and never the thing compared by a machine: seven hex characters
 * collide, and a parity check that can collide is a parity check that can lie.
 */
export function shortSha(sha: string | null): string | null {
  return sha === null ? null : sha.slice(0, 7);
}

/**
 * @param env the process environment to read. Passed in rather than reached for
 *   so the honest states are reachable from a test without mutating a global.
 */
export function readBuildIdentity(env: Record<string, string | undefined>): BuildIdentity {
  const rawSha = (env[BUILD_SHA_ENV] ?? "").trim();
  const rawTime = (env[BUILD_TIME_ENV] ?? "").trim();
  const builtAt = rawTime === "" ? null : rawTime;

  if (rawSha === "") {
    return {
      state: "UNSTAMPED",
      sha: null,
      builtAt,
      note:
        `This bundle was built without ${BUILD_SHA_ENV}, so it does not know which ` +
        "commit produced it. Build through the repo's build scripts, which stamp it.",
    };
  }

  // A malformed stamp is WORSE than no stamp: it would be compared, and it
  // would disagree with every real commit, producing permanent false drift.
  // It is reported as UNSTAMPED with the reason named.
  if (!FULL_SHA.test(rawSha)) {
    return {
      state: "UNSTAMPED",
      sha: null,
      builtAt,
      note:
        `${BUILD_SHA_ENV} was present but is not a 40-character commit hash, so it ` +
        "cannot be compared to a git revision. The stamp is being written wrong.",
    };
  }

  return {
    state: "STAMPED",
    sha: rawSha,
    builtAt,
    note:
      "This is the commit the server bundle answering this request was built from. " +
      "It does not describe what any browser is currently executing.",
  };
}
