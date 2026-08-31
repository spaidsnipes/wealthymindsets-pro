"use client";
import * as React from "react";
import { Pill, type PillState } from "../ui/Pill";
import {
  executionReceiptView,
  executionReceiptViewFromResponse,
  type ExecutionReceiptView,
} from "../../lib/authority/executionReceiptView";
import type { AIExecutionReceipt } from "../../lib/authority/executionReceipt";

/**
 * ExecutionReceiptCard — the canon's WHY / evidence view for an AI Execution
 * Receipt (Aug-30 ATH Intelligence System: "... WHY/evidence view -> AI
 * Execution Receipt ..."). This is the single surface that renders what a real
 * order path actually did.
 *
 * It is PRESENTATION ONLY. It never computes truth: the verdict line, tone, and
 * evidence rows all come from `executionReceiptView`, which is derived from the
 * receipt the order route signed. A DENIED receipt reads as denied; an
 * AUTHORIZED_NOT_EXECUTED receipt is never dressed up as "done"; EXECUTED copy
 * names the real broker order id. Per "NO MODEL OUTPUT ALONE CREATES AUTHORITY",
 * this card cannot manufacture an authority the receipt does not carry.
 *
 * A malformed / receipt-less body renders an honest "No execution receipt"
 * state instead of a fabricated verdict — it never crashes and never invents.
 */

/** Map the receipt's honest tone to the Pill's semantic state. */
export function toneToPillState(tone: ExecutionReceiptView["tone"]): PillState {
  switch (tone) {
    case "positive": return "confirmed";
    case "warning": return "warning";
    case "danger": return "danger";
    case "neutral": return "neutral";
    default: return "neutral";
  }
}

export interface ExecutionReceiptCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** An already-validated receipt (e.g. from an order route's typed result). */
  receipt?: AIExecutionReceipt;
  /** A raw order-route response body ({ ..., receipt }) straight off `fetch`. */
  responseBody?: unknown;
}

/**
 * Resolve exactly one view model from whichever input the caller supplied.
 * `receipt` wins when both are present; a bad `responseBody` yields null so the
 * card shows "No execution receipt" rather than overclaiming.
 */
export function resolveView(
  props: Pick<ExecutionReceiptCardProps, "receipt" | "responseBody">,
): ExecutionReceiptView | null {
  if (props.receipt) return executionReceiptView(props.receipt);
  if (props.responseBody !== undefined) return executionReceiptViewFromResponse(props.responseBody);
  return null;
}

export function ExecutionReceiptCard({
  receipt,
  responseBody,
  className,
  ...rest
}: ExecutionReceiptCardProps) {
  const view = resolveView({ receipt, responseBody });

  if (!view) {
    return (
      <div
        role="status"
        aria-label="No execution receipt"
        className={[
          "wm-execution-receipt-card rounded-lg border p-4",
          "text-[12px]",
          className ?? "",
        ].join(" ")}
        style={{ borderColor: "rgba(85,80,63,0.5)", color: "#55503f" }}
        {...rest}
      >
        No execution receipt to show.
      </div>
    );
  }

  const pillState = toneToPillState(view.tone);

  return (
    <div
      className={[
        "wm-execution-receipt-card rounded-lg border p-4",
        "flex flex-col gap-3",
        className ?? "",
      ].join(" ")}
      style={{ borderColor: "var(--wm-gold-line, #8b6a29)" }}
      {...rest}
    >
      <div className="flex items-start gap-2">
        <Pill state={pillState}>{view.receipt.result}</Pill>
        <p className="m-0 text-[13px] leading-snug" style={{ color: "var(--wm-ink, #e8e2d0)" }}>
          {view.line}
        </p>
      </div>

      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[12px]">
        {view.why.map((row) => (
          <React.Fragment key={row.label}>
            <dt
              className="uppercase tracking-[0.12em] text-[10px] self-center"
              style={{ color: "var(--wm-gold-mark, #c9a55c)" }}
            >
              {row.label}
            </dt>
            <dd className="m-0" style={{ color: "var(--wm-ink, #e8e2d0)" }}>
              {row.value}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

export default ExecutionReceiptCard;
