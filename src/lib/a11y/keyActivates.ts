import type { KeyboardEvent } from "react";

/**
 * Enter / Space on a focused clickable surface fires its own click
 * (2026-10-04). Cards, rows and headers that were mouse-only `div`s keep their
 * existing onClick; this only makes them reachable from a keyboard. Keys that
 * land on a real control inside the surface are left to that control.
 */
export function keyActivates(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.target !== e.currentTarget) return;
  e.preventDefault();
  e.currentTarget.click();
}
