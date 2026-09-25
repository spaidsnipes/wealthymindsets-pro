/**
 * THE WORKSPACE DRAW SHEET CARRIES RISK GEOMETRY AND THE FIXED RANGE PROFILE.
 *
 * F24 audit (Garden 11 first inspection task): Workspace → Draw opened a sheet
 * with 15 tools and no Long/Short Position — the only way to put entry / stop /
 * target on price was a second, different tool set behind Tools → Chart tools
 * → Flow & studies. The user-selected profile (H-601 #8 Fixed Range) had no
 * Draw door either. One Draw door now carries both.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SHEET = readFileSync(path.join(process.cwd(), "src/components/chart/LeftDrawingSidebar.tsx"), "utf8");

describe("the Workspace Draw sheet", () => {
  it.each(["long-position", "short-position", "anchored-vp"])("offers %s", id => {
    expect(SHEET).toContain(`id: "${id}"`);
  });
});
