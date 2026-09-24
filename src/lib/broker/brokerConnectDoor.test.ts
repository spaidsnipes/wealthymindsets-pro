import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brokerConnectTarget } from "./brokerConnectDoor";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

describe("Connect Brokers — one door", () => {
  it("knocks in-room on the market home, navigates there from anywhere else", () => {
    expect(brokerConnectTarget(INSTRUMENT_VIEW_ROUTE)).toEqual({ kind: "EVENT" });
    expect(brokerConnectTarget("/news")).toEqual({ kind: "NAVIGATE", href: `${INSTRUMENT_VIEW_ROUTE}?connect=brokers` });
  });
  it("Settings holds the door and the market room owns the only panel", () => {
    const settings = readFileSync(join(__dirname, "../../components/layout/shellPanels.tsx"), "utf8");
    expect(settings).toContain("requestBrokerConnect()");
    const room = readFileSync(join(__dirname, "../../components/chart/ChartsDashboard.tsx"), "utf8");
    expect(room).toContain("BROKER_CONNECT_EVENT");
    expect(settings).not.toContain("<BrokerConnectPanel");
  });
});
