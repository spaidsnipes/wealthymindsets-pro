/**
 * The pricing page's paid buttons (Supermax §11): live ONLY when the server
 * says the tier is on sale; a signed-out visitor is sent to sign in; nothing
 * invented, no count, legal links beside the button.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NOT_ON_SALE_LABEL, buyButtonState } from "./buyButtonState";

const ON = { APP: false, PASSPORT: true, OS: false };
const page = readFileSync(path.join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");

describe("buyButtonState", () => {
  it("NOT ON SALE whenever the server has not said the tier is on sale — unread, failed, not configured, or false", () => {
    const off = { kind: "NOT_ON_SALE", label: "Not on sale yet", note: null };
    expect(buyButtonState({ tier: "PASSPORT", onSale: null, mode: null, signedIn: true, memberTier: "FREE" })).toEqual(off);
    expect(buyButtonState({ tier: "PASSPORT", onSale: ON, mode: "NOT_CONFIGURED", signedIn: true, memberTier: "FREE" })).toEqual(off);
    expect(buyButtonState({ tier: "OS", onSale: ON, mode: "LIVE", signedIn: true, memberTier: "FREE" })).toEqual(off);
    expect(buyButtonState({ tier: "PASSPORT", onSale: { PASSPORT: "yes" as unknown as boolean }, mode: "LIVE", signedIn: true, memberTier: "FREE" })).toEqual(off);
    expect(NOT_ON_SALE_LABEL).toBe("Not on sale yet");
  });

  it("on sale: signed out → Sign in to buy; signed in → Subscribe; own plan → manage; another plan → change in Manage billing", () => {
    const base = { tier: "PASSPORT" as const, onSale: ON, mode: "LIVE" as const };
    expect(buyButtonState({ ...base, signedIn: false, memberTier: null })).toEqual({ kind: "SIGN_IN", label: "Sign in to buy", note: null });
    expect(buyButtonState({ ...base, signedIn: null, memberTier: null }).kind).toBe("SIGN_IN");
    expect(buyButtonState({ ...base, signedIn: true, memberTier: "FREE" })).toEqual({ kind: "BUY", label: "Subscribe", note: null });
    expect(buyButtonState({ ...base, signedIn: true, memberTier: null }).kind).toBe("BUY");
    expect(buyButtonState({ ...base, signedIn: true, memberTier: "PASSPORT" }).kind).toBe("CURRENT");
    expect(buyButtonState({ ...base, signedIn: true, memberTier: "APP" }).kind).toBe("MANAGE");
  });

  it("test mode is said on the button's note — no real charge", () => {
    expect(buyButtonState({ tier: "PASSPORT", onSale: ON, mode: "TEST", signedIn: true, memberTier: "FREE" }).note).toBe("Test mode — no real charge is made.");
  });
});

describe("the pricing page", () => {
  it("reads what is on sale from the server, sends only the tier name, and keeps the honest fallback", () => {
    expect(page.length).toBeGreaterThan(3000);
    expect(page).toContain('fetch("/api/billing/tiers", { cache: "no-store" })');
    expect(page).toContain('fetch("/api/billing/standing", { cache: "no-store" })');
    expect(page).toContain('fetch(path === "checkout" ? "/api/billing/checkout" : "/api/billing/portal", { method: "POST",');
    expect(page).toContain("body: JSON.stringify(tier ? { tier } : {})");
    // No price, amount or price id leaves the page; the webhook is never called from it.
    expect(page).not.toMatch(/price_[A-Za-z0-9]{6}|unit_amount|amount:|\/api\/billing\/webhook|WM_STRIPE|STRIPE_/);
    expect(page).toContain("Paid plans are not on sale yet.");
    expect(page.match(/cta: \{ label: "Not on sale yet" \}/g)).toHaveLength(3);
  });

  it("Terms & Privacy and the trading-risk disclosure sit beside the button", () => {
    const buy = page.slice(page.indexOf('data-testid="tier-buy"'), page.indexOf("})() : t.cta.href"));
    expect(buy.length).toBeGreaterThan(400);
    expect(buy).toContain('<Link href="/legal"');
    expect(buy).toContain('<Link href="/legal/risk"');
    expect(buy).toContain("Not investment advice.");
  });

  it("no count of members and no invented claim was added", () => {
    expect(page).not.toMatch(/of 500|Founding|founding|spots? left|seats? left|limited time|\d+ members/);
  });
});
