import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, createRef } from "react";
import { renderToString } from "react-dom/server";
import { ShellModalDrawer } from "../components/layout/ShellModalDrawer";
import { getShellModalPortalHost, getServerModalPortalHost, subscribeShellModalPortalHost } from "../components/layout/shellModalPortalHost";

afterEach(() => vi.unstubAllGlobals());

describe("shell modal visible portal host", () => {
  it("does not touch document during server rendering", () => {
    vi.stubGlobal("document", undefined);
    expect(getServerModalPortalHost()).toBeNull();
    expect(renderToString(createElement(ShellModalDrawer, {
      id: "test-drawer", titleId: "test-title", title: "Evidence",
      closeLabel: "Close evidence", width: 440, onClose: () => {},
      fallbackTriggerRef: createRef<HTMLButtonElement>(), children: "Evidence content",
    }))).toBe("");
  });

  it("follows entering, changing, and leaving fullscreen and removes its listener", () => {
    const events = new EventTarget();
    const body = { id: "body" };
    const chart = { id: "chart-fullscreen" };
    const other = { id: "other-fullscreen" };
    const doc = {
      body,
      fullscreenElement: null as object | null,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    };
    vi.stubGlobal("document", doc);
    const hosts: Element[] = [];
    const unsubscribe = subscribeShellModalPortalHost(() => hosts.push(getShellModalPortalHost()));
    expect(getShellModalPortalHost()).toBe(body);
    for (const host of [chart, other, null]) {
      doc.fullscreenElement = host;
      events.dispatchEvent(new Event("fullscreenchange"));
    }
    expect(hosts).toEqual([chart, other, body]);
    unsubscribe();
    doc.fullscreenElement = chart;
    events.dispatchEvent(new Event("fullscreenchange"));
    expect(hosts).toHaveLength(3);
  });
});
