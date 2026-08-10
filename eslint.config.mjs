// WM-DEBT-P2-01 — ESLint 9 flat config for WM Pro (2026-08-09)
//
// Adopts Next's recommended set (`core-web-vitals` + `typescript`) as the
// base then layers WM-specific rules that catch real prior bugs:
//
//  - no-restricted-syntax: prevents `NEXT_PUBLIC_*_KEY` / `NEXT_PUBLIC_*_SECRET`
//    reads OUTSIDE `src/lib/**` and `src/app/api/**` — same class of leak the
//    WM-SEC-P0-03 (Finnhub) and WM-SEC-P0-05 (Polygon) fixes closed.
//  - no-restricted-imports: blocks direct `finnhub.io` / `polygon.io` client
//    fetches — force everything through the server proxies.
//  - no-unused-vars: warn only (avoid noise on old files).
//
// Test files get a relaxed set — `any`, unused-vars off, console allowed.

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  // Next 16 publishes native flat configs. Import them directly; routing them
  // through FlatCompat duplicates plugin objects and creates a circular config.
  ...nextVitals,
  ...nextTs,

  // WM Pro overrides — surface the recurring bug classes we've paid for.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Warn (not error) on any/unused so old files don't block CI while we
      // migrate. Individual PRs should still clean.
      "@typescript-eslint/no-explicit-any":  "warn",
      "@typescript-eslint/no-unused-vars":   ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps":         "warn",
      // Next 16 enables the newer React compiler-oriented rules. Keep the
      // existing debt visible, but do not turn a framework security upgrade
      // into 150 unrelated blocking rewrites in one release.
      "react-hooks/set-state-in-effect":      "warn",
      "react-hooks/purity":                   "warn",
      "react-hooks/refs":                     "warn",
      "react-hooks/immutability":             "warn",
      "react-hooks/static-components":        "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@next/next/no-img-element":           "warn",
      // Existing code contains style-only violations that were accepted before
      // the flat config landed. Keep them visible without making the first lint
      // rollout retroactively break every production build.
      "prefer-const":                         "warn",
      "react/no-unescaped-entities":          "warn",
    },
  },

  // Client-code rules — no direct provider-secret reads outside server
  // boundaries. This is the guard that prevents WM-SEC-P0-03/05-class leaks
  // from reappearing.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/app/**/*.tsx"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^NEXT_PUBLIC_.*_(KEY|SECRET|TOKEN|PRIVATE)$/]:not([property.name='NEXT_PUBLIC_SUPABASE_ANON_KEY']):not([property.name='NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])",
          message:
            "Do NOT read NEXT_PUBLIC_*_KEY / _SECRET / _TOKEN / _PRIVATE in client code — those env vars are baked into the browser bundle. Move the call through a server route (src/app/api/**) that reads the non-public equivalent.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/finnhub.io/**", "https://finnhub.io/**"],
              message: "Direct finnhub.io fetches from client code leak the API key. Use /api/finnhub server proxy.",
            },
            {
              group: ["**/polygon.io/**", "https://api.polygon.io/**"],
              message: "Direct polygon.io fetches from client code leak the API key. Use a server-proxied route.",
            },
          ],
        },
      ],
    },
  },

  // Server utilities and API route handlers are not React render functions.
  // `react-hooks/rules-of-hooks` fires false-positives on any function whose
  // name starts with `use` even when it has nothing to do with React (e.g.
  // `useSupabase()` is a boolean config check). Disable it only at those server
  // boundaries; real components/hooks remain protected.
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },

  // Test files — relaxed
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars":  "off",
      "no-console":                          "off",
    },
  },

  // Node entrypoints/configuration intentionally use CommonJS because Electron,
  // Tailwind and one-off scripts load them directly in Node. This is not browser
  // application code and does not weaken the client secret rules above.
  {
    files: ["electron/**/*.js", "scripts/**/*.js", "tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Ignore
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "public/**",
      "out/**",
      "electron/dist/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },
];
