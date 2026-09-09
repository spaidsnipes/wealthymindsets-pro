import { describe, expect, it } from "vitest";
import { buildWebullSignedHeaders, signWebullRequest } from "./webullMarketData";

// Public dummy inputs. Vectors independently calculated with Python stdlib
// hmac/hashlib/urllib.parse.quote(safe='') per SDK tree8e970dbe; no provider call.
const input = {
  path: "/market-data/options/snapshots/list",
  query: { symbols: "TSLA260911C00370000", category: "US_OPTION" },
  appKey: "public-test-key", appSecret: "public-test-secret",
  host: "api.webull.com", timestamp: "2026-09-09T18:00:00Z", nonce: "public-test-nonce",
};

describe("Webull explicit signing profiles — protocol proof only", () => {
  it("retains legacy default and makes modern an explicit choice", () => {
    expect(signWebullRequest(input)).toBe("FcbBbFzf+6UfKdXWMbbgXzV/sXc=");
    expect(signWebullRequest({ ...input, profile: "legacy-sha1" })).toBe(signWebullRequest(input));
    expect(signWebullRequest({ ...input, profile: "sdk-sha256" })).toBe("b76mbhP24yF/AGdvL5Tp+VlcpLm019LY/x8GXLvGGvY=");
  });
  it.each([
    ["", "6djyFxXggG2+vtF9DIZAoiCzWtorix3gOUWcdnPH2bk="],
    ['{"text":"quote !\'()* café +%/"}', "8cWxeR9sUWtuKeu6I3wHqboc65+dgtRSFub1w/KHijs="],
  ])("hashes exact explicit body bytes %j with modern SHA256", (body, signature) => {
    expect(signWebullRequest({ ...input, profile: "sdk-sha256", body })).toBe(signature);
  });
  it("owns the algorithm header with the signature and leaves API version unsigned", () => {
    const modern = buildWebullSignedHeaders({ ...input, profile: "sdk-sha256", apiVersion: "v3" });
    expect(modern).toEqual({
      "x-app-key": input.appKey, "x-timestamp": input.timestamp,
      "x-signature": "b76mbhP24yF/AGdvL5Tp+VlcpLm019LY/x8GXLvGGvY=",
      "x-signature-algorithm": "HMAC-SHA256", "x-signature-version": "1.0",
      "x-signature-nonce": input.nonce, "x-version": "v3",
    });
    expect(buildWebullSignedHeaders({ ...input, profile: "legacy-sha1", apiVersion: "v2" })).toMatchObject({
      "x-signature": "FcbBbFzf+6UfKdXWMbbgXzV/sXc=", "x-signature-algorithm": "HMAC-SHA1",
    });
    expect(buildWebullSignedHeaders({ ...input, profile: "sdk-sha256", apiVersion: "v2" })["x-signature"]).toBe(modern["x-signature"]);
    expect(JSON.stringify(modern)).not.toContain(input.appSecret);
  });
  it("is independent of query insertion order", () => {
    expect(signWebullRequest({ ...input, profile: "sdk-sha256", query: { category: "US_OPTION", symbols: input.query.symbols } }))
      .toBe(signWebullRequest({ ...input, profile: "sdk-sha256" }));
  });
  it("matches strict SDK escaping for punctuation, Unicode, plus, percent and slash", () => {
    expect(signWebullRequest({ ...input, profile: "sdk-sha256", query: { ...input.query, probe: "!'()* café +%/," } }))
      .toBe("WhaftxNUH5Ce17pT5wUoYDxf0PigIegK8bh9RpBjoHI=");
  });
});
