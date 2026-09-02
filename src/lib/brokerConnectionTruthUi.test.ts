import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");

describe("broker connection truth UI", () => {
  it("describes bridge-backed providers as bridges rather than browser OAuth", () => {
    expect(panel).toContain('label:"OpenD bridge wire"');
    expect(panel).toContain('label:"OpenAPI bridge wire"');
    expect(panel).toContain("Website sign-in alone cannot create that bridge.");
    expect(panel).toContain("Website sign-in alone does not connect the app.");
  });

  it("describes tastytrade as a server token wire", () => {
    expect(panel).toContain('label:"Server OAuth token wire"');
    expect(panel).toContain("server-side tastytrade refresh token");
  });

  it("sends runtime-backed providers to the read-only wire receipt", () => {
    expect(panel).toContain('href="/readiness"');
    expect(panel).toContain("Inspect wire");
    expect(panel).toContain("Provider setup");
  });
});
