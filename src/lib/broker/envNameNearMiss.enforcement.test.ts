/**
 * Near-miss env-name detector enforcement — canon "IMPLEMENTED is not
 * REACHABLE".
 *
 * This module exists because of a real production defect (2026-09-05):
 * /api/finnhub answered 503 {"edge":"NOT CONFIGURED","missing":["FINNHUB_KEY"]}
 * while the Cloudflare host carried a secret literally named `FINNHUB_KEY_`.
 * computeEnvParity scored that name ABSENT_BOTH and called it agreement, so
 * every receipt stayed quiet while the stock tape was dead.
 *
 * A detector nobody calls would fail in exactly the same way — perfectly
 * correct, perfectly invisible. So this Sentinel pins the whole chain:
 *
 *   detectUnaccountedEnvNameNearMisses   (the lib)
 *     -> /api/broker/readiness           (emits `nearMisses` in the receipt)
 *       -> selectReadinessWireboard      (turns hits into view-model rows)
 *         -> /readiness page             (renders them where a human looks)
 *
 * Break any link and this fails by NAME, telling the next engineer which
 * one they dropped.
 *
 * It also re-asserts the secrets boundary structurally: the detector's
 * output type carries three NAME/label fields and no value field, so a
 * receipt can never leak a secret through this path.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectUnaccountedEnvNameNearMisses } from "./providerReadiness";

const SRC_ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(resolve(SRC_ROOT, rel), "utf8");

describe("env-name near-miss detector MUST stay reachable (breadcrumb chain)", () => {
  it("the readiness API route calls the detector and emits nearMisses", () => {
    const route = read("app/api/broker/readiness/route.ts");
    expect(route).toContain("detectUnaccountedEnvNameNearMisses");

    // Emitted under a stable key the selector reads.
    //
    // Deliberately scoped to the RESPONSE BODY, not the whole file. A revive
    // attempt (2026-09-05) deleted the `nearMisses,` line from the JSON body
    // and left `const nearMisses = ...` in place; a whole-file /\bnearMisses\b/
    // still matched, so the Sentinel passed while the receipt went silent —
    // computing the answer and dropping it is the same invisibility bug this
    // file exists to catch. Anchor on the payload or prove nothing.
    const bodyStart = route.indexOf("NextResponse.json(");
    expect(bodyStart).toBeGreaterThan(-1);
    expect(route.slice(bodyStart)).toMatch(/\bnearMisses\b/);
  });

  it("the wireboard selector consumes nearMisses from the payload", () => {
    const selector = read("lib/broker/selectReadinessWireboard.ts");
    expect(selector).toMatch(/nearMisses\?:/);
    expect(selector).toContain("nearMisses: (payload?.nearMisses ?? [])");
  });

  it("the /readiness page RENDERS the near-miss section", () => {
    const page = read("app/readiness/page.tsx");
    // A field that is selected but never rendered is the same invisibility
    // bug one layer up.
    expect(page).toContain("wireboard.nearMisses");
    expect(page).toContain("Name mismatch suspected");
  });

  it("the rendered section distinguishes a near-certain typo from a mere lead", () => {
    const selector = read("lib/broker/selectReadinessWireboard.ts");
    expect(selector).toContain("NEAR-CERTAIN");
    expect(selector).toContain("LEAD");
  });
});

describe("secrets boundary is structural, not a promise", () => {
  it("a hit carries only names and a confidence label — no value field", () => {
    const hits = detectUnaccountedEnvNameNearMisses({ FINNHUB_KEY_: "super-secret-value" });
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(Object.keys(hit).sort()).toEqual(["confidence", "expected", "found"]);
    }
    expect(JSON.stringify(hits)).not.toContain("super-secret-value");
  });

  it("the API route does not widen the payload with raw env values", () => {
    const route = read("app/api/broker/readiness/route.ts");
    // The route may read process.env, but must never spread it into the body.
    expect(route).not.toMatch(/\.\.\.\s*process\.env/);
    expect(route).not.toMatch(/\.\.\.\s*env\b/);
  });
});
