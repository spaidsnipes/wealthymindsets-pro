import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const prompt = fs.readFileSync(
  path.join(process.cwd(), "src/components/pwa/InstallPrompt.tsx"),
  "utf8",
);

describe("PWA install prompt truth and accessibility", () => {
  it("describes an installable shortcut without promising unavailable capabilities", () => {
    expect(prompt).toContain("same WM Pro web app");
    expect(prompt).toContain("depend on your connection and enabled services");
    expect(prompt).toContain("Home screen shortcut");
    expect(prompt).not.toContain("full native experience");
    expect(prompt).not.toContain("no browser needed");
    expect(prompt).not.toContain("Install Now — It&apos;s Free");
    expect(prompt).not.toContain("offline charts");
    expect(prompt).not.toContain("Push alerts");
    expect(prompt).not.toContain("Zero latency");
    expect(prompt).not.toContain("Real-time data");
  });

  it("keeps the nonmodal prompt named, contained, and touch reachable", () => {
    expect(prompt).toContain('role="region"');
    expect(prompt).toContain('aria-live="polite"');
    expect(prompt).toContain('aria-labelledby="wm-install-prompt-title"');
    expect(prompt).toContain('aria-describedby="wm-install-prompt-description"');
    expect(prompt).toContain('aria-label="Dismiss install prompt"');
    // RE-ANCHORED 2026-09-08. This rule pinned the literal string
    // `w-[calc(100%-2rem)] max-w-sm` and called the result "touch reachable".
    // It was green at 375px while the dismiss button sat ENTIRELY off screen
    // (measured: card left 188, right 531, viewport 375), because the sibling
    // `-translate-x-1/2` that did the centering was silently discarded by
    // Framer. A class name cannot witness geometry.
    //
    // What is actually required is that the card be bounded by the VIEWPORT
    // without depending on a transform. Insets do that; a width plus a
    // transform does not. Real geometry is asserted by measurement, and the
    // transform-ownership rule lives in design/motionTransformOwnership.
    expect(prompt).toMatch(/inset-x-\d/);
    expect(prompt).toContain("max-w-sm");
    expect(prompt).not.toMatch(/className="[^"]*-translate-x-/);
    expect(prompt).toContain("min-h-11 min-w-11");
    expect(prompt).toContain("inline-flex min-h-11");
  });

  it("preserves the native install event and dismissal owner", () => {
    expect(prompt).toContain('window.addEventListener("beforeinstallprompt", handler)');
    expect(prompt).toContain("deferredPrompt.prompt()");
    expect(prompt).toContain('localStorage.setItem("wm-install-dismissed", "true")');
    expect(prompt).toContain("Add to Home Screen");
  });
});
