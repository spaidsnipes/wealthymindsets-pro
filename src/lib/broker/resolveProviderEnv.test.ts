/**
 * A DECLARED ALIAS MUST REACH THE WIRE, NOT JUST THE RECEIPT.
 *
 * ── The measured failure (production, 2026-09-11) ───────────────────────────
 *
 * `/api/broker/readiness` returned, in ONE payload:
 *
 *   providers: [ { provider: "finnhub", status: "BLOCKED",
 *                  missing: ["FINNHUB_KEY"] }, ... ]
 *   nearMisses: [ { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_",
 *                   confidence: "EXACT_MODULO_PUNCTUATION" } ]
 *
 * The key was present the whole time. One trailing underscore kept the
 * real-time US equity tape off the air, and `providerReadiness.ts` had carried
 * a docblock describing this exact failure since 2026-09-05 without it being
 * fixed — because the detector could only ever WRITE A ROW, and nothing made
 * the row actionable by the code that needed the key.
 *
 * ── What this Sentinel actually guards ──────────────────────────────────────
 *
 * Not "FINNHUB_KEY_ is spelled right" — that is a fact about one host and it
 * belongs in the table. What must never regress is the WIRING: that declaring
 * an alias in `PROVIDER_REQUIREMENTS` is sufficient to connect the provider.
 *
 * The dangerous half-fix is declaring the alias for the receipt only. Then
 * readiness flips to READY while `/api/finnhub` still answers 503 — a green
 * receipt beside a dead wire, which is strictly worse than the red receipt we
 * started with, because it retires the one signal that was telling the truth.
 * The source scan below exists for that specific regression.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { acceptedEnvNames, resolveProviderEnv } from "./resolveProviderEnv";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const FINNHUB_CONSUMERS = ["src/app/api/finnhub/route.ts", "src/app/api/market/route.ts"];

/**
 * LiveKit joined the aliased set on 2026-09-21 — the host carries the pair as
 * ATH_LIVEKIT_KEY_ / ATH_LIVEKIT_KEY_SECRET_, the same bulk-load artifact this
 * module's docblock has named since 2026-09-11. The guard below is the same
 * guard, applied to the new consumers, for the same reason: declaring the
 * alias for the RECEIPT only would turn /readiness green beside two routes
 * that still 503.
 *
 * LiveRoom.tsx is policed too, and for an additional reason. It read the wss
 * host as `process.env.NEXT_PUBLIC_LIVEKIT_URL` — a BUILD-TIME inlined value.
 * This app is built on a laptop and deployed to Cloudflare, so that name could
 * never be satisfied by a Cloudflare secret no matter how many redeploys: it
 * inlined as undefined and LiveKitRoom received serverUrl="". The host is now
 * resolved server-side and returned with the token. If that read comes back,
 * the whole Lounge silently stops connecting again.
 */
const LIVEKIT_SERVER_CONSUMERS = [
  "src/app/api/livekit/route.ts",
  "src/app/api/livekit/approve/route.ts",
];
const LIVEKIT_CREDENTIALS = [
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_LIVEKIT_URL",
] as const;

describe("resolveProviderEnv", () => {
  it("THE MEASURED FAILURE: the name the host actually carries is accepted", () => {
    const accepted = acceptedEnvNames("FINNHUB_KEY");
    expect(
      accepted,
      "The production host carries the Finnhub key as FINNHUB_KEY_. If this " +
        "name is not accepted, /api/finnhub answers 503 beside a present secret " +
        "and the US equity tape does not render.",
    ).toContain("FINNHUB_KEY_");
  });

  it("resolves a credential that exists ONLY under its alias", () => {
    const resolved = resolveProviderEnv("FINNHUB_KEY", { FINNHUB_KEY_: "live-value" });
    expect(resolved).toEqual({ name: "FINNHUB_KEY_", value: "live-value", viaAlias: true });
  });

  it("prefers the canonical name when both are present", () => {
    // Otherwise a stale alias left on a host would silently outrank a freshly
    // rotated canonical secret — a rotation that appears to do nothing.
    const resolved = resolveProviderEnv("FINNHUB_KEY", {
      FINNHUB_KEY: "canonical",
      FINNHUB_KEY_: "stale-alias",
    });
    expect(resolved).toMatchObject({ name: "FINNHUB_KEY", value: "canonical", viaAlias: false });
  });

  it("treats an empty or whitespace canonical value as absent and falls through", () => {
    // A binding set to "" is how a half-finished dashboard edit presents. It
    // must not shadow a working alias.
    expect(resolveProviderEnv("FINNHUB_KEY", { FINNHUB_KEY: "   ", FINNHUB_KEY_: "live" }))
      .toMatchObject({ name: "FINNHUB_KEY_", value: "live" });
  });

  it("returns null rather than an empty-string credential when nothing is set", () => {
    // "" would sign a request with no key and surface as an upstream 401 —
    // a provider failure masking a configuration failure.
    expect(resolveProviderEnv("FINNHUB_KEY", {})).toBeNull();
  });

  it("does not guess: an undeclared lookalike is NOT accepted", () => {
    // The near-miss detector may SUSPECT a name; only the table may accept one.
    expect(acceptedEnvNames("FINNHUB_KEY")).not.toContain("FINNHUB_SECRET");
    expect(resolveProviderEnv("FINNHUB_KEY", { FINNHUB_KEY__: "x", FINNHUB: "y" })).toBeNull();
  });

  it("canonical name is always tried first in the accepted list", () => {
    expect(acceptedEnvNames("FINNHUB_KEY")[0]).toBe("FINNHUB_KEY");
  });

  it("an undeclared credential resolves against its own name only", () => {
    expect(acceptedEnvNames("NOT_A_DECLARED_VAR")).toEqual(["NOT_A_DECLARED_VAR"]);
  });
});

describe("the declaration reaches the wire, not only the receipt", () => {
  it("THE HALF-FIX GUARD: no Finnhub consumer re-derives its own env names", () => {
    for (const rel of FINNHUB_CONSUMERS) {
      const src = stripComments(fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"));
      expect(
        src,
        `${rel} reads process.env.FINNHUB_KEY directly. A hand-written name ` +
          "chain cannot see aliases declared in PROVIDER_REQUIREMENTS, which is " +
          "how readiness went READY while this route answered 503. Resolve " +
          "through resolveProviderEnv instead.",
      ).not.toMatch(/process\.env\.(NEXT_PUBLIC_)?FINNHUB_KEY/);
      expect(src, `${rel} must resolve its key through the canonical table`)
        .toMatch(/resolveProviderEnv\(\s*"FINNHUB_KEY"\s*\)/);
    }
  });

  it("THE HALF-FIX GUARD: no LiveKit server route re-derives its own env names", () => {
    for (const rel of LIVEKIT_SERVER_CONSUMERS) {
      const src = stripComments(fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"));
      for (const name of LIVEKIT_CREDENTIALS) {
        expect(
          src,
          `${rel} reads process.env.${name} directly. A hand-written name cannot ` +
            "see the ATH_LIVEKIT_KEY_ / ATH_LIVEKIT_KEY_SECRET_ aliases declared in " +
            "PROVIDER_REQUIREMENTS, so /readiness would report livekit READY beside " +
            "a route that 503s. Resolve through resolveProviderEnv instead.",
        ).not.toContain(`process.env.${name}`);
        expect(src, `${rel} must resolve ${name} through the canonical table`)
          .toMatch(new RegExp(`resolveProviderEnv\\(\\s*"${name}"\\s*\\)`));
      }
    }
  });

  it("all three LiveKit credentials are resolved, not just the key pair", () => {
    // The wss host was the one that silently broke: a token minted against a
    // missing host is a 200 response in front of a room that cannot be dialled.
    expect(acceptedEnvNames("LIVEKIT_API_KEY")).toContain("ATH_LIVEKIT_KEY_");
    expect(acceptedEnvNames("LIVEKIT_API_SECRET")).toContain("ATH_LIVEKIT_KEY_SECRET_");
    expect(acceptedEnvNames("NEXT_PUBLIC_LIVEKIT_URL")).toContain("LIVEKIT_URL");
  });

  it("THE BUILD-TIME TRAP: the browser must not read the wss host from process.env", () => {
    // NEXT_PUBLIC_ values are inlined at BUILD time. WM Pro builds on a laptop
    // and deploys to Cloudflare, so a host set as a Cloudflare secret inlines
    // as `undefined` and LiveKitRoom silently receives serverUrl="". The host
    // arrives from /api/livekit with the token instead. If this read returns,
    // the Lounge stops connecting with no error naming a variable.
    const src = stripComments(
      fs.readFileSync(path.join(REPO_ROOT, "src/components/lounge/LiveRoom.tsx"), "utf8"),
    );
    expect(src).not.toContain("process.env.NEXT_PUBLIC_LIVEKIT_URL");
    expect(src, "the host must come from the token response").toContain("serverUrl");
  });

  it("the scan is not vacuous — it can see the defect when it exists", () => {
    const defect = 'const k = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY;';
    expect(/process\.env\.(NEXT_PUBLIC_)?FINNHUB_KEY/.test(stripComments(defect))).toBe(true);
  });

  it("and the consumers it polices actually exist", () => {
    for (const rel of [...FINNHUB_CONSUMERS, ...LIVEKIT_SERVER_CONSUMERS]) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} moved — this Sentinel has rotted`).toBe(true);
    }
  });
});
