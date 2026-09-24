import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "page.tsx"), "utf8");

describe("Partnerships — Founder-designated, disclosed, no invented terms", () => {
  it("publishes Upcomers with the referral code and an affiliate disclosure", () => {
    expect(src).toContain('referralCode: "4vf9k7v"');
    expect(src).toMatch(/Affiliate disclosure/);
  });
  it("publishes VeddBuild at its official domain", () => {
    expect(src).toContain('url: "https://veddbuild.com"');
  });
  it("prints no discount percentage or promised outcome", () => {
    expect(src).not.toMatch(/\d+\s?%\s?(off|discount)/i);
    expect(src).not.toMatch(/guaranteed|risk-free/i);
  });
});
