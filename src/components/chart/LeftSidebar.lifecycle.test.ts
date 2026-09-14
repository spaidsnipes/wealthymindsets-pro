import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  beginScreenCaptureRequest,
  cancelScreenCaptureRequests,
  disposeScreenCaptureOnUnmount,
  finishScreenCaptureRequest,
  isCurrentScreenCaptureRequest,
  stopRecorderOnce,
  stopStreamTracksOnce,
} from "./LeftSidebar";

describe("LeftSidebar display-capture lifecycle", () => {
  it("stops a recorder and every stream track exactly once", () => {
    let state: RecordingState = "recording";
    const recorder = {
      get state() { return state; },
      stop: vi.fn(() => { state = "inactive"; }),
    } as unknown as MediaRecorder;
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    const stream = { getTracks: () => tracks } as unknown as MediaStream;
    const recorders = new WeakSet<MediaRecorder>();
    const streams = new WeakSet<MediaStream>();

    stopRecorderOnce(recorder, recorders);
    stopStreamTracksOnce(stream, streams);
    stopRecorderOnce(recorder, recorders);
    stopStreamTracksOnce(stream, streams);

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    for (const track of tracks) expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("wires the same idempotent stops into drawer unmount and late permission resolution", () => {
    const source = readFileSync(resolve(__dirname, "LeftSidebar.tsx"), "utf8");
    expect(source).toMatch(/return \(\) => \{[\s\S]*disposeScreenCaptureOnUnmount\(\{/);
    expect(source).toContain("cancelScreenCaptureRequests(screenCaptureRequestGate.current)");
    expect(source).toMatch(/!mountedRef\.current \|\|[\s\S]*!isCurrentScreenCaptureRequest[\s\S]*stopStreamTracksOnce\(stream, stoppedScreenStreams\.current\);/);
    expect(source).toContain("if (mountedRef.current) setScreenRec(false)");
    expect(source).toMatch(/catch \(e\) \{[\s\S]*disposeScreenCaptureOnUnmount\(\{[\s\S]*stream: acquiredStream/);
    expect(source).toMatch(/if \(isCurrent\) \{\s*console\.warn/);
  });

  it("admits one permission request and rejects stale out-of-order resolutions", () => {
    const gate = { generation: 0, pending: false };

    const first = beginScreenCaptureRequest(gate);
    expect(first).toBe(1);
    expect(beginScreenCaptureRequest(gate)).toBeNull();
    expect(isCurrentScreenCaptureRequest(gate, first!)).toBe(true);

    cancelScreenCaptureRequests(gate);
    const second = beginScreenCaptureRequest(gate);
    expect(second).toBe(3);
    expect(isCurrentScreenCaptureRequest(gate, first!)).toBe(false);
    expect(isCurrentScreenCaptureRequest(gate, second!)).toBe(true);

    finishScreenCaptureRequest(gate, first!);
    expect(isCurrentScreenCaptureRequest(gate, second!)).toBe(true);
    finishScreenCaptureRequest(gate, second!);
    expect(gate.pending).toBe(false);
  });

  it("unmount is silent, clears ownership data, and survives double cleanup", () => {
    const finalize = vi.fn();
    let state: RecordingState = "recording";
    const recorder = {
      get state() { return state; },
      stop: vi.fn(() => {
        state = "inactive";
        (recorder as unknown as MediaRecorder).onstop?.(new Event("stop"));
      }),
      ondataavailable: vi.fn(),
      onstop: finalize,
    } as unknown as MediaRecorder;
    const videoTrack = { stop: vi.fn(), onended: vi.fn() };
    const audioTrack = { stop: vi.fn() };
    const stream = {
      getTracks: () => [videoTrack, audioTrack],
      getVideoTracks: () => [videoTrack],
    } as unknown as MediaStream;
    const chunks = [new Blob(["partial capture"])];
    const stoppedRecorders = new WeakSet<MediaRecorder>();
    const stoppedStreams = new WeakSet<MediaStream>();
    const dispose = () => disposeScreenCaptureOnUnmount({
      recorder, stream, chunks, stoppedRecorders, stoppedStreams,
    });

    dispose();
    dispose();

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(videoTrack.stop).toHaveBeenCalledTimes(1);
    expect(audioTrack.stop).toHaveBeenCalledTimes(1);
    expect(finalize).not.toHaveBeenCalled();
    expect(chunks).toEqual([]);
    expect(recorder.ondataavailable).toBeNull();
    expect(recorder.onstop).toBeNull();
    expect(videoTrack.onended).toBeNull();
  });

  it("silently releases an acquired stream when recorder setup fails", () => {
    const videoTrack = { stop: vi.fn(), onended: vi.fn() };
    const audioTrack = { stop: vi.fn() };
    const stream = {
      getTracks: () => [videoTrack, audioTrack],
      getVideoTracks: () => [videoTrack],
    } as unknown as MediaStream;

    disposeScreenCaptureOnUnmount({
      recorder: null,
      stream,
      chunks: [new Blob(["unowned capture data"])],
      stoppedRecorders: new WeakSet<MediaRecorder>(),
      stoppedStreams: new WeakSet<MediaStream>(),
    });

    expect(videoTrack.stop).toHaveBeenCalledTimes(1);
    expect(audioTrack.stop).toHaveBeenCalledTimes(1);
    expect(videoTrack.onended).toBeNull();
  });
});
