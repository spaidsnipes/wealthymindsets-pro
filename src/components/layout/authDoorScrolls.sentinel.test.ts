import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// <body> is inline overflow:hidden (app/layout.tsx). /login measured 919-983 px
// tall with no scroller: on a phone with the keyboard open the submit button
// could not be reached (2026-10-06). The bare auth branch must own a scroller.
describe("auth doors scroll on a phone", () => {
  const src = readFileSync(join(__dirname, "MainLayout.tsx"), "utf8");
  // A guest on an address that is no room (not-found, guest audit 2026-10-25) shares the same scroller.
  it("the public auth paths render inside the overflow-y:auto scroller", () => {
    expect(src).toMatch(/if \(isPublicInfoPath\(pathname\) \|\| isPublicAuthPath\(pathname\) \|\| isUnknownAppPath\(pathname\)\) \{\s*return \(\s*<div data-scroll-owner="public-info"[^>]*overflowY: "auto"/);
  });
});
