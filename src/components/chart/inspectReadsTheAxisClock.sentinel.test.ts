/**
 * INSPECT READS THE AXIS'S CLOCK.
 *
 * Measured on serving (2026-09-25, BTC 1m): the SELECTED EXHAUSTION ticket
 * printed "06:18 – 06:21 UTC" beside a time axis in the trader's zone that
 * read 01:18. Labelled, so not a lie — but the microscope and the glass it
 * describes were on two clocks. Every time the ticket prints now goes through
 * ONE zoned formatter fed the chart's display zone, and names the zone.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

const TICKET = read("src/components/chart/ChartInspectTicket.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

describe("Inspect reads the axis's clock", () => {
  it("the ticket has one zoned formatter and uses it", () => {
    expect(TICKET).toContain("function zonedClock(timeZone: string | null | undefined)");
    expect(TICKET.match(/zonedClock\(timeZone\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("no time is formatted as ISO or stamped with a hard-coded UTC", () => {
    expect(TICKET).not.toMatch(/toISOString\(\)/);
    expect(TICKET).not.toMatch(/ UTC[`"]/);
    expect(TICKET).not.toMatch(/· UTC/);
  });

  it("the room hands the ticket the chart's display zone", () => {
    expect(ROOM).toContain("timeZone={effChartSettings.displayTimeZone}");
  });
});
