import { describe, expect, it } from "vitest";
import { admitRoomMessage } from "./roomMessages";

const host = { identity: "wm:host", metadata: JSON.stringify({ role: "host" }) };
const viewer = { identity: "wm:viewer", metadata: JSON.stringify({ role: "viewer" }) };

describe("live-room messages act on the authenticated sender (P0-B)", () => {
  it("a viewer cannot approve itself or anyone", () => {
    expect(admitRoomMessage({ type: "JOIN_APPROVED", identity: "wm:viewer" }, viewer)).toBeNull();
    expect(admitRoomMessage({ type: "JOIN_DENIED", identity: "wm:other" }, viewer)).toBeNull();
  });
  it("a host's approval stands", () => {
    expect(admitRoomMessage({ type: "JOIN_APPROVED", identity: "wm:viewer" }, host)).toEqual({ type: "JOIN_APPROVED", identity: "wm:viewer" });
  });
  it("a raise-hand or cancel cannot be filed under another identity", () => {
    expect(admitRoomMessage({ type: "JOIN_REQUEST", identity: "wm:victim", name: "V" }, viewer)).toEqual({ type: "JOIN_REQUEST", identity: "wm:viewer", name: "V" });
    expect(admitRoomMessage({ type: "REQUEST_CANCEL", identity: "wm:victim" }, viewer)).toEqual({ type: "REQUEST_CANCEL", identity: "wm:viewer" });
  });
  it("unknown, malformed or sender-less messages are dropped", () => {
    expect(admitRoomMessage({ type: "KICK", identity: "wm:x" }, host)).toBeNull();
    expect(admitRoomMessage("junk", host)).toBeNull();
    expect(admitRoomMessage({ type: "JOIN_REQUEST" }, undefined)).toBeNull();
    expect(admitRoomMessage({ type: "JOIN_APPROVED", identity: "wm:v" }, { identity: "wm:h", metadata: "{not json" })).toBeNull();
  });
});
