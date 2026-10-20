import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { credentialProblems } from "@/lib/broker/tastyCredentialShape";
import {
  ONBOARDING_LINE,
  TASTY_DATA_TERMS,
  TASTY_LINKS,
  WEBULL_MEMBER_STATUS,
  checkWords,
  tastyCardState,
  type CardState,
} from "./MemberBrokerConnect";

const src = readFileSync(resolve(__dirname, "MemberBrokerConnect.tsx"), "utf8");
const panel = readFileSync(resolve(__dirname, "BrokerConnectPanel.tsx"), "utf8");

/** Brief 2026-10-20: the friend on his phone, and the seven named states. */
describe("member Connect card — states, words, onboarding", () => {
  it("maps every server answer to exactly one of the seven named states", () => {
    const seen = new Set<CardState | null>([
      tastyCardState({ state: "SIGNED_OUT", connected: false }, false),
      tastyCardState({ state: "NOT_CONNECTED", connected: false }, false),
      tastyCardState({ state: "NOT_CONNECTED", connected: false }, true),
      tastyCardState({ state: "CONNECTED", connected: true, connection: "CONNECTED" }, false),
      tastyCardState({ state: "CONNECTED", connected: true, connection: "PARTIAL" }, false),
      tastyCardState({ state: "CONNECTED", connected: true, connection: "AUTH_EXPIRED" }, false),
      tastyCardState({ state: "CONNECTED", connected: true, connection: "ERROR" }, false),
      tastyCardState({ state: "MEMBER_CONNECTIONS_NOT_ENABLED", connected: false }, false),
      tastyCardState({ state: "GRANT_UNREADABLE", connected: false }, false),
    ]);
    expect([...seen].sort()).toEqual(["Authentication expired", "Connected", "Connecting", "Error", "Not connected", "Partially available", "Unsupported"]);
  });

  it("a signed-out visitor is told to sign in — never 'not enabled' (the 401 used to read as switched off)", () => {
    expect(tastyCardState({ state: "SIGNED_OUT", connected: false }, false)).toBe("Not connected");
    expect(src).toMatch(/r\.status === 401\) return \{ state: "SIGNED_OUT"/);
    expect(src).toContain("Sign in to connect");
  });

  it("validates the fields on the phone with the same rules the server uses", () => {
    expect(credentialProblems({ clientSecret: "", refreshToken: "" })).toEqual({ clientSecret: "Paste the client secret.", refreshToken: "Paste the refresh token." });
    expect(credentialProblems({ clientSecret: "abc def ghi", refreshToken: "x".repeat(20) }).clientSecret).toMatch(/space or line break/);
    expect(credentialProblems({ clientSecret: "x".repeat(20), refreshToken: "x".repeat(20) }).refreshToken).toMatch(/two different values/);
    expect(credentialProblems({ clientSecret: "a".repeat(20), refreshToken: "b".repeat(40) })).toEqual({});
  });

  it("names a missing permission in plain words, with tastytrade's funded-account rule for data", () => {
    expect(checkWords({ key: "quotes", result: "NO_PERMISSION", httpStatus: 403 })).toBe("Not permitted (HTTP 403) — tastytrade gives API market data to funded accounts");
    expect(checkWords({ key: "balances", result: "FAILED", httpStatus: 500 })).toBe("Failed (HTTP 500)");
  });

  it("shows the labelled fields, a Test connection button and the read-only promise", () => {
    expect(src).toMatch(/htmlFor="tt-client-secret">Client secret</);
    expect(src).toMatch(/htmlFor="tt-refresh-token">Refresh token</);
    expect(src.match(/"Test connection"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src).toContain('method: "PUT"');
    expect(src).toContain("Off — WM never places orders with this connection");
  });

  it("onboarding: the Founder's line, the tutorial slot, the account door and tastytrade's verified data terms — no dollar figure", () => {
    expect(ONBOARDING_LINE).toBe("For now, connect Tastytrade for live data. Webull is coming.");
    expect(src).toContain("Video tutorial coming soon");
    expect(src).toContain("New to Tastytrade? Open an account");
    expect(TASTY_LINKS.openAccount).toBe("https://open.tastytrade.com/");
    expect(TASTY_DATA_TERMS).toMatch(/14 calendar days/);
    expect(TASTY_DATA_TERMS).toMatch(/any amount/);
    expect(TASTY_DATA_TERMS).not.toMatch(/\$\s?\d/);
    expect(src).toContain("TASTY_LINKS.unfundedLiveQuotes");
  });

  it("Webull: an honest status and no button that looks live", () => {
    expect(WEBULL_MEMBER_STATUS).toBe("Waiting on Webull access");
    const webull = src.slice(src.indexOf("export function MemberWebullDoor"));
    expect(webull).not.toMatch(/<button/);
  });

  it("members see tastytrade first, Webull second, the onboarding on top, and no setup-queue button", () => {
    expect(panel).toMatch(/id === "tastytrade" \? -2 : id === "webull" \? -1/);
    expect(panel).toContain('{panelAudience === "GUEST" && <MemberBrokerOnboarding />}');
    expect(panel).toMatch(/\{ownerView && <button[\s\S]{0,200}onToggle\(\)/);
  });
});
