import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const lounge = readFileSync(resolve(__dirname, "../app/lounge/page.tsx"), "utf8");

describe("Lounge runtime truth", () => {
  // Re-pinned 2026-10-03: the browser bundle carried no public Supabase
  // connection, so the old client-side lounge never loaded for anyone. Every
  // read and write now goes through /api/lounge, where the session names the
  // author; the page never talks to the store itself.
  it("reads and writes only through the server lounge route", () => {
    expect(lounge).toContain("fetch(`/api/lounge${init?.query ?? \"\"}`");
    expect(lounge).not.toMatch(/from "@\/lib\/supabase"/);
    expect(lounge).not.toMatch(/\.from\("lounge_/);
    expect(lounge).toContain('if (storeState !== "OK" && storeState !== "LOADING")');
  });

  it("never sends author identity or marks from the browser", () => {
    const compose = lounge.slice(lounge.indexOf('op: "post"') - 200, lounge.indexOf('op: "post"') + 200);
    expect(compose).not.toMatch(/user_ceo|user_tier|user_verified|user_handle/);
  });

  it("does not pretend missing configuration is an empty community", () => {
    expect(lounge).toContain('data-lounge-runtime="not-configured"');
    expect(lounge).toContain("No community records were requested, and no empty feed is being inferred.");
    expect(lounge).not.toContain("Supabase client not configured — set");
  });

  it("keeps the unavailable surface bounded to one responsive canvas", () => {
    expect(lounge).toContain("max-w-xl");
    expect(lounge).toContain("overflow-hidden");
    expect(lounge).toContain('role="status"');
    expect(lounge).toContain('aria-live="polite"');
  });

  it("keeps configured community tools behind one explicit disclosure", () => {
    expect(lounge).toContain("showCommunityTools");
    expect(lounge).toContain('aria-label="Open community tools"');
    expect(lounge).toContain('aria-label="Close community tools"');
    expect(lounge).toContain('aria-label="Community tools"');
    expect(lounge).toContain('style={{width:260,position:"absolute",inset:"0 auto 0 0",zIndex:40}}');
    expect(lounge).not.toContain('style={{width:200,flexShrink:0}}');
  });
});
