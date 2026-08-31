import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allProviderEnvNames } from "./providerReadiness";

/**
 * Sentinel — the readiness requirement table (providerReadiness.ts) and the
 * committed `.env.example` MUST NOT drift apart. If a new provider var is
 * declared as required/recommended but nobody documents it in `.env.example`,
 * an operator (or the Founder pasting Drive secrets) has no cue that the var
 * exists — the "connected locally and through the host" promise silently
 * breaks. This test FAILS the build until every referenced var is documented.
 *
 * Presence-only: it reads NAMES from `.env.example` (which carries no values),
 * never a secret.
 */
describe("providerReadiness ↔ .env.example parity", () => {
  it("every provider env NAME is documented in .env.example", () => {
    const path = resolve(process.cwd(), ".env.example");
    const text = readFileSync(path, "utf8");
    // Collect declared KEY names (lines like `KEY=` / `KEY=value`, ignoring comments).
    const documented = new Set<string>();
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Z0-9_]+)=/);
      if (m) documented.add(m[1]);
    }

    const undocumented = allProviderEnvNames().filter((n) => !documented.has(n));
    expect(undocumented, `Undocumented provider vars in .env.example: ${undocumented.join(", ")}`).toEqual([]);
  });
});
