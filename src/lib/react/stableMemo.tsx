/**
 * STABLE MEMO (perf 2026-10-26, the Founder's chart lag).
 *
 * The chart room re-renders on every tape flush and hands MainChart fresh inline
 * callbacks and fresh small objects each time, so a plain React.memo never skips.
 * `stableMemo(Component)` wraps a component so that:
 *  - every function prop reaches the component as a STABLE proxy that always
 *    calls the latest function (no stale closures, no new identity per render);
 *    a prop that switches between "a function" and "not a function" changes the
 *    proxy's presence, so `if (onX)` checks stay honest;
 *  - the memo compares the remaining props by identity, and small plain data
 *    (plain objects, short arrays, React elements) by structure, bounded in depth
 *    and size, so `{ health, reason }` rebuilt with equal values does not re-render.
 * Large arrays (bars, prints) and class instances are compared by identity only.
 */
import React, { useRef } from "react";

const MAX_DEPTH = 8;
const MAX_ITEMS = 64;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Bounded structural equality for small plain data and React elements. */
export function smallDataEqual(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (depth >= MAX_DEPTH || typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length || a.length > MAX_ITEMS) return false;
    for (let i = 0; i < a.length; i++) if (!smallDataEqual(a[i], b[i], depth + 1)) return false;
    return true;
  }
  if (React.isValidElement(a)) {
    if (!React.isValidElement(b) || a.type !== b.type || a.key !== b.key) return false;
    return smallDataEqual(a.props, b.props, depth + 1);
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const ka = Object.keys(a);
  if (ka.length > MAX_ITEMS || ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    const x = a[k], y = b[k];
    // A nested callback cannot be proxied: equal only by identity.
    if (typeof x === "function" || typeof y === "function") { if (x !== y) return false; continue; }
    if (!smallDataEqual(x, y, depth + 1)) return false;
  }
  return true;
}

/** Top-level prop comparison: identity, then bounded structure for small data. */
export function propsEqual(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const kp = Object.keys(prev);
  if (kp.length !== Object.keys(next).length) return false;
  for (const k of kp) {
    if (!Object.prototype.hasOwnProperty.call(next, k)) return false;
    if (!smallDataEqual(prev[k], next[k], 1)) return false;
  }
  return true;
}

type AnyFn = (...args: unknown[]) => unknown;

/**
 * Replace every function prop with one stable proxy per prop name that calls
 * whatever function `latest.current` holds at call time. Pure apart from
 * filling `proxies`; exported for tests.
 */
export function routeCallbacks<P extends object>(props: P, latest: { current: P }, proxies: Map<string, AnyFn>): P {
  const routed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v !== "function") { routed[k] = v; continue; }
    let p = proxies.get(k);
    if (!p) {
      p = (...args: unknown[]) => {
        const f = (latest.current as Record<string, unknown>)[k];
        return typeof f === "function" ? (f as AnyFn)(...args) : undefined;
      };
      proxies.set(k, p);
    }
    routed[k] = p;
  }
  return routed as P;
}

export function stableMemo<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  const Inner = React.memo(Component, (a, b) => propsEqual(a as Record<string, unknown>, b as Record<string, unknown>));
  function Stable(props: P) {
    const latest = useRef(props);
    const proxies = useRef(new Map<string, AnyFn>());
    // The latest-callback pattern: the proxies read `latest` only when called, never during render.
    latest.current = props;
    const routed = routeCallbacks(props, latest, proxies.current);
    return <Inner {...routed} />;
  }
  Stable.displayName = `Stable(${Component.displayName || Component.name || "Component"})`;
  return Stable;
}
