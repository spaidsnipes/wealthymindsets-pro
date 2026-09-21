import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WEBULL_SESSION_KV_BINDING } from "./webullSessionStore";

/**
 * SENTINEL — the code's idea of the binding name and the manifest's must not
 * drift. FAILURE CLASS: SILENT_DURABILITY_LOSS.
 *
 * `webullSessionStore` falls back to an isolate-local store when it cannot find
 * the binding, and that fallback is CORRECT — an unprovisioned namespace should
 * cost durability, not availability. But it is also SILENT, which makes a
 * rename uniquely dangerous here: rename the binding in wrangler.jsonc, or the
 * constant in the module, and nothing throws, nothing 500s, no test goes red.
 * The Worker just quietly returns to storing sessions in an isolate.
 *
 * That is precisely the state measured in production on 2026-09-21:
 *
 *   05:02:09  accessToken:true   "minted and PENDING your 2FA approval"
 *   -- Founder approves in the Webull app --
 *   05:04:46  accessToken:FALSE  "minted and PENDING your 2FA approval"
 *
 * His approval landed on a session held by an isolate that no longer existed,
 * so WM Pro minted a new one and asked him again. A defect whose only symptom
 * is "the Founder is asked to tap forever" must not be reachable by a typo.
 *
 * NAMES ONLY. This reads the manifest as text and compares the BINDING NAME. A
 * KV id names a container and does not open one, but it is not asserted here
 * either — this test is about agreement, not about the value.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WRANGLER_PATH = resolve(REPO_ROOT, "wrangler.jsonc");
const wranglerText = readFileSync(WRANGLER_PATH, "utf8");

/** jsonc → JSON. Block comments and trailing commas both appear in this file. */
function parseJsonc(text: string): Record<string, unknown> {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(stripped) as Record<string, unknown>;
}

const manifest = parseJsonc(wranglerText);
const kvNamespaces = (manifest.kv_namespaces ?? []) as Array<{ binding?: string; id?: string }>;

describe("wrangler KV binding ↔ webullSessionStore", () => {
  it("POSITIVE CONTROL: this test actually read wrangler.jsonc", () => {
    // Without this, an unreadable or renamed manifest would make the parse
    // yield `{}` and every assertion below could pass vacuously. That exact
    // failure mode has shipped in this repo before.
    expect(wranglerText.length).toBeGreaterThan(500);
    expect(manifest.name).toBe("wealthymindsets-pro");
  });

  it("declares the KV namespace the Webull session store looks for", () => {
    const bindings = kvNamespaces.map((entry) => entry.binding);

    expect(
      bindings,
      `wrangler.jsonc declares no KV binding named ${WEBULL_SESSION_KV_BINDING}. ` +
        "Without it the Webull session is isolate-local again, and a 2FA approval " +
        "can be evicted before any request observes it.",
    ).toContain(WEBULL_SESSION_KV_BINDING);
  });

  it("gives that binding a namespace id, so the deploy actually binds something", () => {
    const entry = kvNamespaces.find((k) => k.binding === WEBULL_SESSION_KV_BINDING);

    // A binding with no id is a declaration that cannot be honoured. It reads
    // like provisioned durability in review and delivers none at runtime.
    expect(entry?.id, "KV binding declared with no namespace id").toMatch(/^[0-9a-f]{32}$/);
  });
});
