"use client";
/**
 * CLEAR OF THE OPEN DOOR — an absolutely-positioned band that steps its LEFT
 * edge past whatever door the frame has open over its pane.
 *
 * Built for exactly one reader today: the chart's price legend, whose headline
 * (symbol · timeframe · price) disappeared under the Workspace sheet on live
 * /charts. See `openDoorEdge.ts` for the measurement and for why the band is
 * TOLD the door's edge rather than assuming the door's width.
 *
 * The band keeps the caller's style verbatim when no door reaches its pane —
 * same `left`, same everything — so a closed door is byte-identical to the
 * plain `<div>` it replaced, on the server and on the client.
 *
 * It measures its OWN host (`offsetParent`, the pane it is absolutely placed
 * in), never the viewport, so the right-hand pane of a split layout — which no
 * door reaches — is never pushed.
 */
import * as React from "react";
import { doorInsetFor, openDoorEdge, subscribeOpenDoorEdge } from "@/lib/os/openDoorEdge";

export interface ClearOfOpenDoorProps {
  readonly style: React.CSSProperties;
  readonly className?: string;
  readonly children?: React.ReactNode;
}

export function ClearOfOpenDoor({ style, className, children }: ClearOfOpenDoorProps): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    const measure = (edge: number | null) => {
      const el = ref.current;
      const host = (el?.offsetParent as HTMLElement | null) ?? el?.parentElement ?? null;
      if (!host) {
        setInset(0);
        return;
      }
      const r = host.getBoundingClientRect();
      setInset(doorInsetFor(edge, r.left, r.width));
    };
    measure(openDoorEdge());
    const off = subscribeOpenDoorEdge(measure);
    const onResize = () => measure(openDoorEdge());
    window.addEventListener("resize", onResize);
    return () => {
      off();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const baseLeft = typeof style.left === "number" ? style.left : 0;
  return (
    <div
      ref={ref}
      style={inset > 0 ? { ...style, left: baseLeft + inset } : style}
      className={className}
      data-door-inset={inset > 0 ? inset : undefined}
    >
      {children}
    </div>
  );
}
