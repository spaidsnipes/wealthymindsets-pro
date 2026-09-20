import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "ServiceWorkerRegistrar.tsx"), "utf8");

describe("ServiceWorkerRegistrar — retired cache-first shell cannot outlive a deploy", () => {
  it("awaits registration and cache retirement before releasing the old document", () => {
    expect(source).toContain("navigator.serviceWorker.controller !== null");
    expect(source).toContain("await Promise.all(registrations.map");
    expect(source).toContain("await Promise.all(keys.map");
  });

  it("reloads a still-controlled document once without clearing auth storage", () => {
    expect(source).toContain('const reloadKey = "wm-sw-retirement-reload-v1"');
    expect(source).toContain("sessionStorage.setItem(reloadKey, \"1\")");
    expect(source).toContain("window.location.reload()");
    expect(source).not.toMatch(/localStorage\.clear|sessionStorage\.clear|document\.cookie/);
  });
});
