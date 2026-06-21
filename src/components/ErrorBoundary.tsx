"use client";
import React from "react";

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("WM ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#070A0F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ color: "#F0B429", fontSize: 32, fontWeight: 900 }}>W</div>
          <div style={{ color: "#E2E8F0", fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ color: "#8896BE", fontSize: 13 }}>{this.state.error?.message}</div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: "10px 24px", background: "#00D4AA", color: "#000", borderRadius: 8, fontWeight: 700, cursor: "pointer", border: "none", fontSize: 14 }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
