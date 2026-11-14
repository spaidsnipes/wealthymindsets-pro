"use client";

/** The door to the Session Desk from the rooms a trader opens and closes the day in (Morning Prep, Journal). */
import Link from "next/link";
import React from "react";

export function SessionDeskDoor() {
  return (
    <Link prefetch={false} href="/session" data-testid="session-desk-door"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "12px 0", padding: "12px 14px", border: "1px solid #3a2f17", borderRadius: 10, background: "#0b0a09", color: "#ede6d3", textDecoration: "none" }}>
      <span>
        <span style={{ display: "block", font: "600 11px Inter, system-ui", letterSpacing: ".2em", color: "#d4a94a" }}>SESSION DESK</span>
        <span style={{ fontSize: 13, color: "#9a927f" }}>Target lock · I&apos;m done · MNQ→NQ checkpoint · max day · Toe Whooper</span>
      </span>
      <span aria-hidden style={{ color: "#d4a94a", fontWeight: 700 }}>›</span>
    </Link>
  );
}
