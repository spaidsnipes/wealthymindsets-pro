/**
 * formatExecutionReceipt — turn an AI Execution Receipt into honest,
 * human-readable copy for the WHY / evidence view, per the Founder ATH
 * Intelligence System canon (Aug-30): the "FIRST BUILDABLE SLICE" ends
 * "... WHY/evidence view -> AI Execution Receipt ...".
 *
 * This is presentation only. It NEVER upgrades the truth of the receipt:
 * a DENIED receipt reads as denied, an AUTHORIZED_NOT_EXECUTED receipt is
 * never dressed up as "done", and EXECUTED copy always names the real
 * broker order id the receipt carries. No secrets are ever formatted —
 * the receipt itself carries none.
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no randomness.
 */

import type { AIExecutionReceipt, ExecutionResult } from "./executionReceipt";

/** A short, verdict-first label safe for a chip. */
export function executionResultLabel(result: ExecutionResult): string {
  switch (result) {
    case "EXECUTED": return "EXECUTED";
    case "AUTHORIZED_NOT_EXECUTED": return "AUTHORIZED — NOT EXECUTED";
    case "FAILED": return "FAILED";
    case "DENIED": return "DENIED";
    default: return "UNKNOWN";
  }
}

/** A tone hint surfaces can map to color without re-deriving truth. */
export function executionResultTone(
  result: ExecutionResult,
): "positive" | "neutral" | "warning" | "danger" {
  switch (result) {
    case "EXECUTED": return "positive";
    case "AUTHORIZED_NOT_EXECUTED": return "neutral";
    case "FAILED": return "danger";
    case "DENIED": return "warning";
    default: return "neutral";
  }
}

/**
 * One truthful line summarizing what actually happened. Examples:
 *   "EXECUTED — buy 1 TSLA (paper) · broker BRK-42"
 *   "AUTHORIZED — NOT EXECUTED — buy 1 TSLA (paper) · no broker effect"
 *   "DENIED — buy 1 TSLA (paper): A proposal from an automated source needs
 *    human approval to execute."
 */
export function formatExecutionReceiptLine(receipt: AIExecutionReceipt): string {
  const { side, qty, symbol } = receipt.intentSummary;
  const intent = `${side} ${qty} ${symbol} (${receipt.env})`;
  const label = executionResultLabel(receipt.result);

  switch (receipt.result) {
    case "EXECUTED":
      return `${label} — ${intent} · broker ${receipt.brokerOrderId ?? "?"}`;
    case "AUTHORIZED_NOT_EXECUTED":
      return `${label} — ${intent} · no broker effect`;
    case "FAILED":
      return `${label} — ${intent} · broker rejected`;
    case "DENIED":
      return `${label} — ${intent}: ${receipt.reason}`;
    default:
      return `${label} — ${intent}`;
  }
}

export interface ExecutionReceiptWhyLine {
  readonly label: string;
  readonly value: string;
}

/**
 * A structured WHY breakdown — ordered rows a surface can render without
 * inventing anything. Only includes rows the receipt actually supports.
 */
export function formatExecutionReceiptWhy(receipt: AIExecutionReceipt): ExecutionReceiptWhyLine[] {
  const rows: ExecutionReceiptWhyLine[] = [
    { label: "Result", value: executionResultLabel(receipt.result) },
    { label: "Reason", value: receipt.reason },
    { label: "Source", value: receipt.source },
    { label: "Environment", value: receipt.env },
    { label: "Action class", value: receipt.actionClass },
    {
      label: "Human approval",
      value: receipt.requiresHumanApproval
        ? (receipt.humanApprovedBy ? `required · approved by ${receipt.humanApprovedBy}` : "required · NOT provided")
        : (receipt.humanApprovedBy ? `approved by ${receipt.humanApprovedBy}` : "not required"),
    },
  ];
  if (receipt.modelRuntime) {
    rows.push({ label: "Model class", value: `${receipt.modelRuntime.providerClass} · ${receipt.modelRuntime.capability}` });
  }
  if (receipt.brokerOrderId) {
    rows.push({ label: "Broker order", value: receipt.brokerOrderId });
  }
  if (receipt.sourceRefs.length > 0) {
    rows.push({ label: "Evidence", value: receipt.sourceRefs.join(", ") });
  }
  return rows;
}

export default formatExecutionReceiptLine;
