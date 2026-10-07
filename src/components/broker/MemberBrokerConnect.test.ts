import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REFERRAL_IS_NOT_ENTITLEMENT, brokerSignupDoor } from "./MemberBrokerConnect";

const src = readFileSync(resolve(__dirname, "MemberBrokerConnect.tsx"), "utf8");
const panel = readFileSync(resolve(__dirname, "BrokerConnectPanel.tsx"), "utf8");

describe("member broker doors (Garden 19 §25)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("unset referral env → the plain public sign-up page, labelled as nothing", () => {
    vi.stubEnv("NEXT_PUBLIC_TASTYTRADE_REFERRAL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_WEBULL_REFERRAL_URL", "");
    expect(brokerSignupDoor("tastytrade")).toEqual({ href: "https://open.tastytrade.com/", isReferral: false });
    expect(brokerSignupDoor("webull")).toEqual({ href: "https://www.webull.com/signup", isReferral: false });
  });

  it("set referral env → the Founder's link, labelled as a referral; non-https is ignored", () => {
    vi.stubEnv("NEXT_PUBLIC_TASTYTRADE_REFERRAL_URL", "https://example.test/ref/abc");
    vi.stubEnv("NEXT_PUBLIC_WEBULL_REFERRAL_URL", "javascript:alert(1)");
    expect(brokerSignupDoor("tastytrade")).toEqual({ href: "https://example.test/ref/abc", isReferral: true });
    expect(brokerSignupDoor("webull").isReferral).toBe(false);
  });

  it("the door says a referral is not a data entitlement", () => {
    expect(REFERRAL_IS_NOT_ENTITLEMENT).toMatch(/does not by itself give WM market data/);
    expect(src).toMatch(/REFERRAL_IS_NOT_ENTITLEMENT/);
  });

  it("secrets travel only in a POST body, are cleared after submit, and never sit in a URL", () => {
    expect(src).toMatch(/method: "POST"[\s\S]*body: JSON\.stringify\(\{ clientSecret, refreshToken \}\)/);
    expect(src).toMatch(/setClientSecret\(""\); setRefreshToken\(""\)/);
    expect(src).not.toMatch(/\?clientSecret=|\?refreshToken=|localStorage|sessionStorage/);
  });

  it("connect/disconnect re-ask the shared stream so the member's OWN feed (and LIVE chip) follows", () => {
    expect(src.match(/reopenTastyStream\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("members (GUEST audience) get their own connect card; the owner keeps the deployment wire", () => {
    expect(panel).toMatch(/memberView && broker\.id === "tastytrade" \? \(\s*<MemberTastytradeConnect/);
    expect(panel).toMatch(/const memberView = audience === "GUEST"/);
  });
});
