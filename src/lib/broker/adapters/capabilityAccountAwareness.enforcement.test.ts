/**
 * Canon §W4 — ACCOUNT-AWARE CAPABILITY DISCOVERY, enforced across the registry.
 *
 * BrokerAdapter's own docstring is the rule:
 *
 *   "Authenticated capability discovery. Must return account-aware results —
 *    never hard-code assumptions the broker can answer."
 *
 * WHY THIS GUARD EXISTS (the concrete consequence it protects)
 * ------------------------------------------------------------
 * `supportedPurposes()` and `compileOrderPurpose()` in src/lib/orderPurpose.ts
 * build the trader's entire order menu by filtering on
 * `BrokerCapabilities.orderTypes`. A non-empty orderTypes array is therefore a
 * direct assertion that THIS ACCOUNT can place THOSE orders.
 *
 * A broker's documented product surface does not establish that. Brokers
 * authorize individual API clients per account, and an account whose product
 * tier fully supports stop orders can still hand a given client a read-only /
 * Non-Trading grant. If an adapter fills orderTypes from product documentation,
 * the app renders an order primitive that the account cannot execute — the exact
 * class of overclaim §8 forbids.
 *
 * THE RULE
 * --------
 * An adapter may satisfy `capabilities()` in exactly one of two honest ways:
 *
 *   1. THROW  — "I cannot answer for this account" (webull's choice; strongest).
 *   2. UNDER-CLAIM — return an empty/false capability set meaning UNKNOWN, with
 *      the reason stated in notes[] (alpaca, tastytrade, moomoo).
 *
 * What it may NOT do is return a populated `orderTypes` array, because no
 * adapter in this build performs real account-aware discovery yet. When one
 * genuinely does — querying the broker for THIS accountId and receiving a
 * per-account grant — add it to VERIFIED_ACCOUNT_AWARE below, with the code
 * path that proves it. Adding it without that path is the regression this test
 * is here to catch.
 */

import { describe, it, expect } from "vitest";
import { listAdapters } from "./index";
import type { BrokerCapabilities, BrokerId } from "../BrokerAdapter";

/**
 * Adapters proven to derive capabilities from a real per-account broker query.
 * EMPTY IS CORRECT TODAY. Do not add an id here to make a failure go away —
 * name the code path that queries the broker with the accountId argument.
 */
const VERIFIED_ACCOUNT_AWARE: readonly BrokerId[] = [];

type Answer =
  | { readonly kind: "threw"; readonly message: string }
  | { readonly kind: "returned"; readonly caps: BrokerCapabilities };

async function ask(
  adapter: { capabilities(accountId: string): Promise<BrokerCapabilities> },
): Promise<Answer> {
  try {
    return { kind: "returned", caps: await adapter.capabilities("acct-under-test") };
  } catch (err) {
    return { kind: "threw", message: err instanceof Error ? err.message : String(err) };
  }
}

describe("canon §W4 — no adapter advertises executable capabilities it never asked the broker about", () => {
  it("every registered adapter either throws UNKNOWN or under-claims", async () => {
    const adapters = listAdapters();
    expect(adapters.length).toBeGreaterThan(0);

    for (const adapter of adapters) {
      if (VERIFIED_ACCOUNT_AWARE.includes(adapter.id)) continue;

      const answer = await ask(adapter);
      if (answer.kind === "threw") continue; // honest UNKNOWN

      expect(
        answer.caps.orderTypes,
        `${adapter.id}.capabilities() returned a populated orderTypes array without ` +
          `account-aware discovery. orderTypes feeds supportedPurposes(), so this ` +
          `advertises order primitives the account may not be authorized to place. ` +
          `Either throw, or under-claim with the reason in notes[].`,
      ).toEqual([]);
    }
  });

  it("an under-claiming adapter cannot also claim live or paper trading", async () => {
    for (const adapter of listAdapters()) {
      if (VERIFIED_ACCOUNT_AWARE.includes(adapter.id)) continue;
      const answer = await ask(adapter);
      if (answer.kind === "threw") continue;
      if (answer.caps.orderTypes.length > 0) continue; // covered by the test above

      // supportsLive/supportsPaper may be derived from LOCAL credential presence
      // (alpaca/tastytrade do this) — that is a statement about env, not about
      // broker authorization. What is forbidden is claiming an executable
      // environment while admitting you know no order types.
      if (answer.caps.supportsLive || answer.caps.supportsPaper) {
        expect(
          answer.caps.notes.length,
          `${adapter.id} claims a tradable environment while reporting zero order ` +
            `types. That combination must be explained in notes[] so no consumer ` +
            `reads it as an execution grant.`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("every adapter explains an empty capability set rather than leaving it bare", async () => {
    for (const adapter of listAdapters()) {
      const answer = await ask(adapter);
      if (answer.kind === "threw") {
        expect(answer.message.length).toBeGreaterThan(0);
        continue;
      }
      if (answer.caps.assetClasses.length === 0 && answer.caps.orderTypes.length === 0) {
        expect(
          answer.caps.notes.length,
          `${adapter.id} returned an empty capability set with no notes. Empty must ` +
            `read as UNKNOWN (discovery has not run), never as "this broker supports ` +
            `nothing". Silence cannot carry that distinction.`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("moomoo keeps its product surface in notes, not in orderTypes", async () => {
    const moomoo = listAdapters().find(a => a.id === "moomoo");
    expect(moomoo, "moomoo adapter is registered").toBeDefined();
    const answer = await ask(moomoo!);
    expect(answer.kind).toBe("returned");
    if (answer.kind !== "returned") return;

    // The documented product surface is real information and worth keeping —
    // but only where it cannot be mistaken for a per-account grant.
    expect(answer.caps.orderTypes).toEqual([]);
    expect(answer.caps.supportsLive).toBe(false);
    expect(
      answer.caps.notes.some(n => /not an account grant/i.test(n)),
      "moomoo's notes must label the product surface as documentation, not a grant",
    ).toBe(true);
  });
});
