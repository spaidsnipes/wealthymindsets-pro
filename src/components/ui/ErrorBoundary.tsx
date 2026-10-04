"use client";

import React from "react";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

interface State { hasError: boolean; error: string }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, error: err?.message ?? "Unknown error" };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[WM ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      // WM voice, not a stack trace (2026-10-04): the raw message moved behind
      // a disclosure, the orange retry became WM brass, and a way out exists
      // when retrying the same room fails the same way.
      return (
        <div role="alert" style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%", minHeight: 160,
          background: "#0b0a08", color: "#a89c80", gap: 10, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: "#ede6d3" }}>
            This part of the room didn’t load.
          </div>
          <div style={{ fontSize: 12, maxWidth: 340, lineHeight: 1.5 }}>
            The rest of WM is still running. Nothing you saved was touched.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: "" })}
              style={{
                minHeight: 44, padding: "0 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "rgba(201,165,92,0.12)", border: "1px solid rgba(201,165,92,0.5)", color: "#e8b923",
              }}
            >
              Try again
            </button>
            <button type="button" onClick={() => window.location.assign(INSTRUMENT_VIEW_ROUTE)} style={{
              minHeight: 44, padding: "0 18px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)", color: "#ede6d3",
            }}>Back to the chart</button>
          </div>
          {this.state.error ? (
            <details style={{ marginTop: 6, fontSize: 10, color: "#8b8fa8", maxWidth: 360 }}>
              <summary style={{ cursor: "pointer" }}>Details</summary>
              <div style={{ marginTop: 4, fontFamily: "ui-monospace, monospace", wordBreak: "break-word" }}>{this.state.error}</div>
            </details>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Lightweight wrapper for individual panels */
export function SafePanel({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", minHeight: 60, fontSize: 11, color: "#8b8fa8",
        }}>
          {name ?? "Panel"} unavailable
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
