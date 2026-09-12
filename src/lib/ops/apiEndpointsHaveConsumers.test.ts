/**
 * AN ENDPOINT WITH NO CONSUMER IS NOT A FEATURE. IT IS A CLAIM.
 *
 * ── The measured failure that started this ───────────────────────────────────
 *
 * `/api/broker/certification` shipped a complete twelve-stage read side — canon
 * §W3 taxonomy, a pure level selector, auth gating, and its own test file — and
 * NOTHING in the app called it. The only place a human could encounter the
 * Certification Harness was one sentence of prose on /readiness telling them the
 * harness "owns that proof," pointing at a door that had never been cut.
 *
 * Every source Sentinel was green the entire time, correctly: the endpoint was
 * well-typed, well-tested, and did exactly what it said. The defect was not in
 * the endpoint. It was in the absence of an edge leading to it, and absence has
 * no file to typecheck. BACKEND_GREEN_FRONTEND_DARK — the shape a codebase
 * takes when the read side is easier to write than the wiring.
 *
 * ── Why this guard is repo-wide and not broker-shaped ────────────────────────
 *
 * Its first version covered `src/app/api/broker/**` only, because that is where
 * the defect was found. Widening the same measurement to every API route was
 * one line and reported 18 of 60 routes — thirty percent of the HTTP surface —
 * with no in-app caller. Scoping a guard to the place a bug happened to be
 * noticed is how the next instance gets missed; the measurement was cheap and
 * the scope was arbitrary.
 *
 * ── What this proves, precisely, and what it does not ────────────────────────
 *
 * For every route under `src/app/api/**`, at least one file OUTSIDE
 * `src/app/api/` and outside the test suite must reference its path.
 *
 * That is a WEAK claim on purpose. It proves an edge EXISTS, not that the edge
 * renders anything a trader would understand, and not that the edge is ever
 * taken at runtime. A strong claim needs a rendered pixel, which is the phone
 * geometry harness's job, not this one. Weak and enforced beats strong and
 * aspirational: the failure this catches is the TOTAL absence of a caller,
 * which is exactly the failure that occurred.
 *
 * Comments are stripped before matching — see `stripComments` for the measured
 * reason. A module header that NAMES an endpoint is not a caller of it, and the
 * first draft of this guard could not tell the difference.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");
const API_ROOT = join(ROOT, "app", "api");

/**
 * Why a route legitimately has no in-app caller. Each class is a different
 * KIND of claim, and collapsing them would be the same mistake this repo keeps
 * finding — a register where everything reads the same tells you nothing.
 */
type OrphanClass =
  /** Proven called from `scripts/` or CI. The caller exists; it is not in src. */
  | "EXTERNAL_TOOLING"
  /** A diagnostic designed to be hit by hand when something is broken. Wiring
   *  it into the app would make it useless in the outage it exists for. */
  | "OPERATOR_DIAGNOSTIC"
  /** Called by a DIFFERENT WM property (lounge / shop / radio / Dreamboard). */
  | "CROSS_PRODUCT"
  /** No consumer, and it SHOULD have one. A debt, not a design. Carries a task. */
  | "DARK";

interface OrphanEntry {
  readonly cls: OrphanClass;
  /** What was actually checked to justify the class. Never a guess. */
  readonly evidence: string;
}

/**
 * THE DEBT REGISTER. Not a waiver list.
 *
 * An entry does not say the endpoint is fine unconsumed. It says the gap is
 * known, classified, and evidenced, so it can be COUNTED instead of forgotten.
 * Every `evidence` string below records what was actually grepped or read on
 * 2026-09-12 — not what seemed likely. Where nothing was found, the class is
 * DARK and says so, because "probably called from somewhere" is precisely the
 * accidentally-correct silence this codebase keeps mistaking for approval.
 */
const NO_IN_APP_CALLER: Readonly<Record<string, OrphanEntry>> = {
  "/api/build-identity": {
    cls: "EXTERNAL_TOOLING",
    evidence:
      "scripts/verify-prod-parity.mjs fetches it — that is the entire purpose of the route, " +
      "and an in-app caller would not make the deploy receipt any more true.",
  },
  "/api/diagnostics/supabase": {
    cls: "OPERATOR_DIAGNOSTIC",
    evidence:
      "Route header states it is the diagnostic for being LOCKED OUT and is public for that " +
      "reason. Wiring it into the app would make it useless in the one situation it exists for.",
  },
  "/api/diagnostics/email": {
    cls: "OPERATOR_DIAGNOSTIC",
    evidence:
      "Route header: an authenticated post-deploy check that RESEND_FROM_EMAIL is set and " +
      "delivery has left Resend test mode. Hit by hand after a deploy, by design.",
  },
  "/api/dev/coverage-inspect": {
    cls: "OPERATOR_DIAGNOSTIC",
    evidence:
      "Route header: 'Founder-only diagnostic', written to answer one forensic question about " +
      "owner_id drift across JWT rotations. Not a product surface and never was.",
  },
  "/api/emails/welcome": {
    cls: "DARK",
    evidence:
      "The route's OWN header already records this: 'Signup flow calls sendWelcomeEmail directly " +
      "(function import), not this HTTP endpoint — grep confirmed zero internal HTTP callers.' " +
      "An HTTP wrapper around a function nobody calls over HTTP is a second door to the same " +
      "room, kept authenticated and rate-limited at a cost nobody is paying for. Task #48.",
  },
  "/api/passport/handoff": {
    cls: "CROSS_PRODUCT",
    evidence:
      "Route defines DESTINATIONS = {lounge, shop, radio} and mints a session cookie for them. " +
      "The callers are other WM properties by construction, so they cannot appear in this repo.",
  },
  "/api/alpaca-stream": {
    cls: "DARK",
    evidence:
      "Zero references in src outside its own route+test. This is the SSE per-trade tape proxy " +
      "whose header says it 'is what makes Big Trades bubbles populate on EVERY US stock live'. " +
      "The capability is written and nothing opens the EventSource. Task #49.",
  },
  "/api/alpaca/trade": {
    cls: "DARK",
    evidence:
      "Zero HTTP callers. src/lib/authority/alpacaOrderAuthorization.ts names the path three " +
      "times, all inside doc comments. Paper order placement with nothing able to reach it. Task #50.",
  },
  "/api/market-data/certification": {
    cls: "DARK",
    evidence:
      "Zero references outside comments — providerProbeFleet.ts and brandCanon.ts both mention " +
      "the path in doc text only. This is the DATA-side twin of /api/broker/certification and " +
      "carries exactly the defect that one just had. Task #51.",
  },
  "/api/market-data/moomoo/ticks": {
    cls: "DARK",
    evidence:
      "The only occurrence outside src/app/api is scripts/.env-manifest.json, which LISTS routes " +
      "against the env vars they need. A manifest is documentation, not a caller. Task #51.",
  },
  "/api/market-memory/observations": {
    cls: "DARK",
    evidence:
      "Zero references anywhere outside its own route+test — nothing in the app persists a " +
      "market observation through it, despite the persistence layer being fully written. Task #51.",
  },
  "/api/memecoin": {
    cls: "DARK",
    evidence:
      "Zero references in src outside its own route+test. A DexScreener/GeckoTerminal proxy was " +
      "written and normalised for 'the chart layer', and the chart layer never wired it. Task #52.",
  },
  "/api/polymarket": {
    cls: "DARK",
    evidence:
      "Zero references in src outside its own route+test. Same shape as /api/memecoin — proxy " +
      "written and normalised for a chart layer that never consumed it. Task #52.",
  },
  "/api/sentiment": {
    cls: "DARK",
    evidence:
      "Zero references to the PATH. /app/news and /app/education use the WORD 'sentiment' for " +
      "unrelated local scoring, which is why a looser grep looks reassuring and is not. Task #52.",
  },
  "/api/tradovate": {
    cls: "DARK",
    evidence:
      "Zero references to the path. BrokerConnectPanel.tsx lists tradovate as a broker CARD with " +
      "external sign-in links, which is not a call to this credential-holding proxy. Task #50.",
  },
  "/api/audio": {
    cls: "DARK",
    evidence:
      "Zero references. /app/radio hardcodes its track URLs in a literal array (page.tsx:200) " +
      "instead of reading this store, so the store holds nothing anyone sees. Task #53.",
  },
  "/api/upload-track": {
    cls: "DARK",
    evidence:
      "Zero references. /app/radio's UploadModal writes DIRECTLY to Supabase storage from the " +
      "browser (page.tsx:677-689) under the user's own auth, bypassing this route. Two upload " +
      "paths with different authority — this one holds the SERVICE ROLE key — and the app uses " +
      "the other one. Task #53.",
  },
  "/api/broker/tastytrade/market-metrics": {
    cls: "DARK",
    evidence:
      "FOUND BY THIS GUARD on its first honest run, immediately after comment-stripping was " +
      "added. Returns tastytrade IV / volatility metrics; referenced only by its own test and a " +
      "path list inside a tastytradeAdapter doc comment. Task #47.",
  },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every API route's public path, e.g. "/api/broker/certification". */
function apiRoutePaths(): string[] {
  return walk(API_ROOT)
    .filter((f) => f.endsWith(`${sep}route.ts`))
    .map((f) => f.slice(ROOT.length, -`${sep}route.ts`.length).split(sep).join("/"))
    .map((p) => p.replace(/^\/app/, ""))
    .sort();
}

/**
 * Remove comments before matching.
 *
 * MEASURED, not theorised: the first version of this guard did not strip them,
 * and when the /readiness fetch was deliberately typo'd to prove the guard
 * bites, IT STAYED GREEN — because the page's own explanatory JSX comment and
 * the selector's module header both spell the endpoint path. A guard that
 * accepts PROSE as evidence of wiring is the exact defect it was written to
 * catch, one level in: a clean report about something nobody connected.
 *
 * Conservative on purpose. Block comments go entirely; line comments are
 * dropped only when the line's first non-space characters are `//` or `*`, so
 * a `//` inside a real `https://` URL in live code is never touched.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("//") && !t.startsWith("*");
    })
    .join("\n");
}

/** Source files that could plausibly call an endpoint: app + lib + components,
 * minus the API handlers themselves and minus tests. A route referenced only by
 * its own test is exactly the state this guard exists to reject. */
function callerSources(): { readonly file: string; readonly text: string }[] {
  const apiPrefix = API_ROOT + sep;
  return walk(ROOT)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !f.startsWith(apiPrefix))
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f))
    .map((f) => ({ file: f.slice(ROOT.length + 1), text: stripComments(readFileSync(f, "utf8")) }));
}

const routes = apiRoutePaths();
const sources = callerSources();

/**
 * The files that reference a route's path.
 *
 * Prefix-safe by construction: a longer route that CONTAINS a shorter one
 * (`/api/broker/status` inside `/api/broker/status/x`) can only ever make the
 * shorter one look MORE called, never less — so this cannot manufacture an
 * orphan, only miss one. Erring toward missing is the right direction for a
 * guard whose failure mode would otherwise be a false accusation.
 */
function calledBy(route: string): string[] {
  return sources.filter((s) => s.text.includes(route)).map((s) => s.file);
}

describe("every API endpoint has something that actually calls it", () => {
  it("finds routes and callers to check at all", () => {
    // Guards the guard: if the layout changes and these walks return nothing,
    // every assertion below would pass vacuously over an empty set.
    expect(routes.length).toBeGreaterThan(20);
    expect(routes).toContain("/api/broker/certification");
    expect(sources.length).toBeGreaterThan(0);
  });

  it("no endpoint is reachable only from its own test file", () => {
    const orphans = routes.filter((route) => {
      if (route in NO_IN_APP_CALLER) return false;
      return calledBy(route).length === 0;
    });

    expect(
      orphans,
      "these endpoints exist, are typed, are tested, and NOTHING in the app calls " +
        "them. Every source Sentinel stays green because the defect is a missing edge, " +
        "and absence has no file to typecheck. Give each one a consumer, or add it to " +
        "NO_IN_APP_CALLER with a class and the evidence you actually checked",
    ).toEqual([]);
  });

  it("every register entry names a route that still exists and still has no caller", () => {
    // A stale entry is worse than none. It silently pre-forgives a path that may
    // have been deleted, renamed, or — the dangerous case — quietly GIVEN a
    // consumer, in which case the register overstates the debt and the next
    // reader trusts a number that is wrong in the comfortable direction.
    for (const [path, entry] of Object.entries(NO_IN_APP_CALLER)) {
      expect(
        routes,
        `${path} is in the register but no such route exists — delete the entry rather ` +
          "than leaving it to cover a route that comes back",
      ).toContain(path);

      expect(
        calledBy(path),
        `${path} is registered as having no caller, but something now references it — ` +
          "delete the entry so the register stops claiming a debt that was already paid",
      ).toEqual([]);

      expect(
        entry.evidence.length,
        `${path} is registered without evidence. The class is a CONCLUSION; the evidence is ` +
          "what was actually grepped or read. An entry without it is a guess wearing a label",
      ).toBeGreaterThan(60);
    }
  });

  it("the DARK debt is counted, not dissolved into the register", () => {
    // The register exists so this number can be READ. If DARK entries could be
    // quietly reclassified as OPERATOR_DIAGNOSTIC or EXTERNAL_TOOLING, the debt
    // would vanish without any code changing — the exact move this whole file
    // exists to make impossible. Changing a count here is allowed; doing it
    // without touching a route is not something that can happen silently.
    const every = Object.values(NO_IN_APP_CALLER);
    const dark = Object.entries(NO_IN_APP_CALLER).filter(([, e]) => e.cls === "DARK");

    expect(dark.length, "DARK count changed — a debt was paid or a new one was taken on").toBe(13);
    expect(every.filter((e) => e.cls === "OPERATOR_DIAGNOSTIC").length).toBe(3);
    expect(every.filter((e) => e.cls === "EXTERNAL_TOOLING").length).toBe(1);
    expect(every.filter((e) => e.cls === "CROSS_PRODUCT").length).toBe(1);

    // Every DARK entry must point at the ticket that owns paying it down.
    for (const [path, entry] of dark) {
      expect(
        entry.evidence,
        `${path} is DARK — a debt with no owner. Name the task that will close it`,
      ).toMatch(/Task #\d+/);
    }
  });

  it("the certification board is consumed from a surface, not just a lib", () => {
    // The specific regression. /api/broker/certification is the endpoint that
    // was dark; naming it here means a future refactor that drops the
    // /readiness wiring fails by name rather than sliding back into prose.
    const consumers = calledBy("/api/broker/certification");

    expect(
      consumers.some((f) => f.startsWith("app/") || f.startsWith("components/")),
      `certification is referenced only from ${JSON.stringify(consumers)} — no page or ` +
        "component reaches it, so the twelve-stage read side is once again something " +
        "the Founder is told about rather than shown",
    ).toBe(true);
  });
});
