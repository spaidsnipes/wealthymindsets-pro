"use client";

import React from "react";

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
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%", minHeight: 120,
          background: "#0D0E14", color: "#8B8FA8", gap: 12, padding: 24,
        }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 11, color: "#8B8FA8", textAlign: "center", maxWidth: 320 }}>
            {this.state.error}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            style={{
              marginTop: 8, padding: "6px 18px", borderRadius: 6, fontSize: 11,
              fontWeight: 600, cursor: "pointer", background: "rgba(255,140,0,0.12)",
              border: "1px solid rgba(255,140,0,0.4)", color: "#FF8C00",
            }}
          >
            Retry
          </button>
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
          height: "100%", minHeight: 60, fontSize: 11, color: "#4A5070",
        }}>
          {name ?? "Panel"} unavailable
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
