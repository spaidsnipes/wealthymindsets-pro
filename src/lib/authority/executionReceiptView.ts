/**
 * executionReceiptView — the single surface-ready composer that turns a raw
 * order-route response body into a WHY / evidence view model, or null.
 *
 * This closes the canon's FIRST BUILDABLE SLICE data path in one call:
 *   API JSON (unknown)
 *     → parseReceiptFromResponse   (defensive: trust nothing, fabricate nothing)
 *     → formatExecutionReceiptLine  (one truthful headline)
 *     → executionResultTone         (color hint, no re-derived truth)
 *     → formatExecutionReceiptWhy   (ordered evidence rows, no secrets)
 *
 * A surface calls exactly this and renders the result — it never touches the
 * raw receipt, so it cannot overclaim (a DENIED / NOT-EXECUTED verdict stays
 * exactly that) and cannot crash on a malformed body (→ null).
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no randomness.
 */

import type { AIExecutionReceipt } from "./executionReceipt";
import { parseExecutionReceipt, parseReceiptFromResponse } from "./parseExecutionReceipt";
import {
  executionResultTone,
  formatExecutionReceiptLine,
  formatExecutionReceiptWhy,
  type ExecutionReceiptWhyLine,
} from "./formatExecutionReceipt";

export interface ExecutionReceiptView {
  /** One truthful headline, e.g. "EXECUTED — buy 1 TSLA (paper) · broker BRK-1". */
  readonly line: string;
  /** Color hint a surface maps without re-deriving truth. */
  readonly tone: "positive" | "neutral" | "warning" | "danger";
  /** Ordered evidence rows — only what the receipt actually supports. */
  readonly why: readonly ExecutionReceiptWhyLine[];
  /** The validated receipt, for surfaces that need more than the view. */
  readonly receipt: AIExecutionReceipt;
}

function toView(receipt: AIExecutionReceipt): ExecutionReceiptView {
  return {
    line: formatExecutionReceiptLine(receipt),
    tone: executionResultTone(receipt.result),
    why: formatExecutionReceiptWhy(receipt),
    receipt,
  };
}

/** Build a WHY view model from an already-validated receipt. */
export function executionReceiptView(receipt: AIExecutionReceipt): ExecutionReceiptView {
  return toView(receipt);
}

/** Build a WHY view model directly from a (possibly bare) receipt value. */
export function executionReceiptViewFromValue(value: unknown): ExecutionReceiptView | null {
  const receipt = parseExecutionReceipt(value);
  return receipt ? toView(receipt) : null;
}

/** Build a WHY view model from a raw order-route response body ({ …, receipt }). */
export function executionReceiptViewFromResponse(body: unknown): ExecutionReceiptView | null {
  const receipt = parseReceiptFromResponse(body);
  return receipt ? toView(receipt) : null;
}

export default executionReceiptViewFromResponse;
