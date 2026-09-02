import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const lounge = readFileSync(resolve(__dirname, "../app/lounge/page.tsx"), "utf8");

describe("Lounge runtime truth", () => {
  it("checks the nullable client before every page-level query and subscription", () => {
    expect(lounge).toContain('import { getSupabase, supabase } from "@/lib/supabase"');
    expect(lounge).toContain("const loungeClient = getSupabase()");
    expect(lounge).toContain("if (!loungeClient)");
    expect(lounge).toContain("loungeClient.removeChannel(channel)");
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
});
