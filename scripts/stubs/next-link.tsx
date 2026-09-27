/**
 * `next/link` for the geometry measurement bundle ONLY
 * (scripts/measure-experience-geometry.mjs). The script bundles surfaces to a
 * node ESM file with esbuild, and Next's CommonJS link module cannot be bundled
 * that way ("Dynamic require of react/jsx-runtime is not supported" — CI,
 * 2026-09-27, when the Experience mode row's LEARN door became a Link). For a
 * static render, Link IS its anchor: same element, same attributes, same box —
 * so measuring this stub measures the product's geometry. Never imported by app code.
 */
import * as React from "react";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string }; prefetch?: unknown; replace?: unknown; scroll?: unknown };

export default function Link({ href, prefetch: _p, replace: _r, scroll: _s, children, ...rest }: Props) {
  const to = typeof href === "string" ? href : href.pathname ?? "";
  return <a href={to} {...rest}>{children}</a>;
}
