import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { AUTH_LINK_EXPIRED, AUTH_LINK_INVALID, AUTH_UNREACHABLE, authFailureMessage, authLinkErrorMessage } from "./authLinkError";

describe("auth link errors are classified, never echoed", () => {
  it("names an expired link without repeating the link's words", () => {
    expect(authLinkErrorMessage("Email+link+is+invalid+or+has+expired")).toBe(AUTH_LINK_EXPIRED);
  });

  it("an attacker's sentence in the fragment becomes the plain invalid-link line", () => {
    const msg = authLinkErrorMessage("Your account is locked. Call 555-0100 to restore access");
    expect(msg).toBe(AUTH_LINK_INVALID);
    expect(msg).not.toContain("555");
  });

  it("a fetch failure reads as a sentence, a server sentence passes through", () => {
    expect(authFailureMessage(new TypeError("Failed to fetch"), "x")).toBe(AUTH_UNREACHABLE);
    expect(authFailureMessage(new Error("That code has expired."), "x")).toBe("That code has expired.");
    expect(authFailureMessage("nope", "fallback")).toBe("fallback");
  });

  it("login and reset pages read the fragment only through the classifier", () => {
    for (const rel of ["../../app/login/page.tsx", "../../app/reset-password/page.tsx"]) {
      const src = readFileSync(path.resolve(__dirname, rel), "utf8");
      expect(src).toContain("authLinkErrorMessage(");
      expect(src).not.toMatch(/set(Error|Message)\(\s*decodeURIComponent\(hashError/);
      expect(src).not.toMatch(/setMessage\(hash\.get\("error_description"\)/);
    }
  });
});
