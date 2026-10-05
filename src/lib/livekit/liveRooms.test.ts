import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isRegisteredLiveRoom, isWmParticipantIdentity, REGISTERED_LIVE_ROOMS } from "./liveRooms";

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), "utf8");

describe("registered live rooms (P0-B)", () => {
  it("every Lounge live room is registered", () => {
    const lounge = read("../../app/lounge/page.tsx");
    const block = lounge.slice(lounge.indexOf("const LIVE_ROOMS = ["), lounge.indexOf("];", lounge.indexOf("const LIVE_ROOMS = [")));
    const names = [...block.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(REGISTERED_LIVE_ROOMS.has(n), n).toBe(true);
  });

  it("every WM TV stage room is registered", () => {
    const tv = read("../../app/tv/page.tsx");
    const block = tv.slice(tv.indexOf("type StageChannel"), tv.indexOf("];", tv.indexOf("type StageChannel")));
    const ids = [...block.matchAll(/id:\s*"([^"]+)"/g)].map(m => `wmtv-${m[1]}`);
    expect(ids.length).toBeGreaterThan(0);
    for (const r of [...ids, ...[...tv.matchAll(/roomName="([^"]+)"/g)].map(m => m[1])]) expect(REGISTERED_LIVE_ROOMS.has(r), r).toBe(true);
  });

  it("arbitrary and malformed rooms / identities are refused", () => {
    expect(isRegisteredLiveRoom("my-private-room")).toBe(false);
    expect(isRegisteredLiveRoom("")).toBe(false);
    expect(isRegisteredLiveRoom(null)).toBe(false);
    expect(isWmParticipantIdentity("wm:4f6c-aa_1")).toBe(true);
    expect(isWmParticipantIdentity("founder")).toBe(false);
    expect(isWmParticipantIdentity("wm:../x")).toBe(false);
  });

  it("both token-minting routes consult the registry", () => {
    expect(read("../../app/api/livekit/route.ts")).toContain("isRegisteredLiveRoom(room)");
    const approve = read("../../app/api/livekit/approve/route.ts");
    expect(approve).toContain("isRegisteredLiveRoom(room)");
    expect(approve).toContain("isWmParticipantIdentity(identity)");
    expect(approve).not.toMatch(/error:\s*String\(e\)/);
  });
});
