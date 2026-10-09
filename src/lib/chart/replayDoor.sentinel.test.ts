/**
 * THE REPLAY DOOR — `/charts?…&replay=start` (coordinator ruling 3, 2026-10-09).
 * One door, read once at mount, through the Replay owner's own start; honest when there are no bars.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { REPLAY_DOOR_NO_BARS_WORDS, REPLAY_DOOR_WAIT_MS, REPLAY_MIN_BARS, replayDoorNext, replayStartRequested } from "@/lib/chart/replayWindow";
import { parseProofScene } from "@/lib/chart/proofScene";

const dash = readFileSync(resolve(__dirname, "..", "..", "..", "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("replay=start", () => {
  it("only `replay=start` is a request", () => {
    expect(replayStartRequested("?scene=clean&on=fvg&replay=start")).toBe(true);
    expect(replayStartRequested("?replay=START")).toBe(true);
    expect(replayStartRequested("?replay=1")).toBe(false);
    expect(replayStartRequested("?scene=clean")).toBe(false);
    expect(replayStartRequested("")).toBe(false);
  });

  it("the scene beside it still parses (the door is not a scene token)", () => {
    const s = parseProofScene("?scene=clean&on=fvg&replay=start");
    expect(s.active).toBe(true);
    expect(s.clean).toBe(true);
  });

  it("starts once bars exist, becomes STARTED when Replay is on, and never restarts", () => {
    expect(replayDoorNext("WAITING", { replayActive: false, bars: 0, waitedMs: 100 })).toEqual({ state: "WAITING", start: false });
    expect(replayDoorNext("WAITING", { replayActive: false, bars: REPLAY_MIN_BARS, waitedMs: 100 })).toEqual({ state: "WAITING", start: true });
    expect(replayDoorNext("WAITING", { replayActive: true, bars: 500, waitedMs: 200 })).toEqual({ state: "STARTED", start: false });
    // The trader stopped Replay later: the door does not start it again.
    expect(replayDoorNext("STARTED", { replayActive: false, bars: 500, waitedMs: 9e9 })).toEqual({ state: "STARTED", start: false });
    expect(replayDoorNext("NONE", { replayActive: false, bars: 500, waitedMs: 0 })).toEqual({ state: "NONE", start: false });
  });

  it("with no bars inside the wait it gives up honestly", () => {
    expect(replayDoorNext("WAITING", { replayActive: false, bars: 1, waitedMs: REPLAY_DOOR_WAIT_MS })).toEqual({ state: "NO_BARS", start: false });
    expect(REPLAY_DOOR_NO_BARS_WORDS).toMatch(/could not start/);
    expect(REPLAY_DOOR_NO_BARS_WORDS).not.toMatch(/live/i);
  });

  it("the room reads it once at mount from the router's params and uses the owner's own start", () => {
    expect(dash).toMatch(/useState<ReplayDoorState>\(\(\) => \(replayStartRequested\(`\?\$\{mountSearchParams\?\.toString\(\) \?\? ""\}`\) \? "WAITING" : "NONE"\)\)/);
    expect(dash).toMatch(/if \(next\.start\) startReplay\(\);/);
    // No second snapshot: the door never freezes bars itself.
    expect(dash.match(/freezeReplaySnapshot\(/g)!.length).toBe(1);
    expect(dash).toMatch(/data-testid="replay-door-refusal"/);
    expect(dash).toMatch(/data-testid="replay-door-start" onClick=\{\(\) => \{ startReplay\(\);/);
  });
});
