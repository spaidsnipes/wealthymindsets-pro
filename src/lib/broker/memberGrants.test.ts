import { describe, expect, it } from "vitest";

import {
  deleteMemberGrant,
  grantStoreAvailability,
  memberGrantKey,
  openGrant,
  readMemberGrant,
  writeMemberGrant,
  type MemberGrantKv,
} from "./memberGrants";

export function memoryKv(): MemberGrantKv & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    async get(k) { return raw.get(k) ?? null; },
    async put(k, v) { raw.set(k, v); },
    async delete(k) { raw.delete(k); },
  };
}

const KEY = "test-grant-key-0123456789abcdef";
const SECRETS_A = { clientSecret: "A-client-secret-zzz", refreshToken: "A-refresh-token-yyyyyyyy" };
const SECRETS_B = { clientSecret: "B-client-secret-qqq", refreshToken: "B-refresh-token-wwwwwwww" };
const META = { accounts: 2, quotes: true, level: "api", validatedAt: "2026-10-07T05:00:00.000Z" };

function enabled(kv: MemberGrantKv, secret = KEY) {
  const s = grantStoreAvailability({ WM_BROKER_GRANT_KEY: secret }, kv);
  if (!s.enabled) throw new Error("expected enabled");
  return s;
}

describe("member broker grants — encrypted, per-user", () => {
  it("is NOT enabled without the key or without a store (never a plaintext fallback)", () => {
    expect(grantStoreAvailability({}, memoryKv())).toEqual({ enabled: false, reason: "NO_KEY" });
    expect(grantStoreAvailability({ WM_BROKER_GRANT_KEY: "short" }, memoryKv())).toEqual({ enabled: false, reason: "NO_KEY" });
    expect(grantStoreAvailability({ WM_BROKER_GRANT_KEY: KEY }, null)).toEqual({ enabled: false, reason: "NO_STORE" });
  });

  it("round-trips for the owning member", async () => {
    const kv = memoryKv();
    const store = enabled(kv);
    await writeMemberGrant(store, "tastytrade", "user-A", SECRETS_A, META);
    const r = await readMemberGrant(store, "tastytrade", "user-A");
    expect(r).toEqual({ state: "OK", secrets: SECRETS_A, meta: META });
  });

  it("stores NO plaintext secret, and the KV key does not contain the user id", async () => {
    const kv = memoryKv();
    await writeMemberGrant(enabled(kv), "tastytrade", "user-A", SECRETS_A, META);
    expect(kv.raw.size).toBe(1);
    const [[k, v]] = [...kv.raw.entries()];
    expect(k).not.toContain("user-A");
    expect(v).not.toContain(SECRETS_A.clientSecret);
    expect(v).not.toContain(SECRETS_A.refreshToken);
    expect(v).not.toContain(btoa(SECRETS_A.refreshToken));
  });

  it("member B can never read member A's grant", async () => {
    const kv = memoryKv();
    const store = enabled(kv);
    await writeMemberGrant(store, "tastytrade", "user-A", SECRETS_A, META);
    expect(await readMemberGrant(store, "tastytrade", "user-B")).toEqual({ state: "NONE" });
  });

  it("A's ciphertext copied under B's key does NOT decrypt (AAD binds it to A)", async () => {
    const kv = memoryKv();
    const store = enabled(kv);
    await writeMemberGrant(store, "tastytrade", "user-A", SECRETS_A, META);
    const aRaw = kv.raw.get(await memberGrantKey("tastytrade", "user-A"))!;
    kv.raw.set(await memberGrantKey("tastytrade", "user-B"), aRaw);
    const r = await readMemberGrant(store, "tastytrade", "user-B");
    expect(r.state).toBe("UNREADABLE");
    expect(JSON.stringify(r)).not.toContain(SECRETS_A.refreshToken);
  });

  it("a rotated key reads UNREADABLE (fail closed), and a tampered record never decrypts", async () => {
    const kv = memoryKv();
    await writeMemberGrant(enabled(kv), "tastytrade", "user-A", SECRETS_A, META);
    expect((await readMemberGrant(enabled(kv, "another-key-entirely-9876543210"), "tastytrade", "user-A")).state).toBe("UNREADABLE");
    const k = await memberGrantKey("tastytrade", "user-A");
    const rec = JSON.parse(kv.raw.get(k)!);
    rec.ct = rec.ct.slice(0, -4) + (rec.ct.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await openGrant(KEY, "tastytrade", "user-A", JSON.stringify(rec))).toBeNull();
  });

  it("each member's grant stays theirs; delete removes only the caller's", async () => {
    const kv = memoryKv();
    const store = enabled(kv);
    await writeMemberGrant(store, "tastytrade", "user-A", SECRETS_A, META);
    await writeMemberGrant(store, "tastytrade", "user-B", SECRETS_B, META);
    await deleteMemberGrant(store, "tastytrade", "user-A");
    expect(await readMemberGrant(store, "tastytrade", "user-A")).toEqual({ state: "NONE" });
    expect(await readMemberGrant(store, "tastytrade", "user-B")).toMatchObject({ state: "OK", secrets: SECRETS_B });
  });
});
