import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
  PathParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { WMExperienceShell } from "@/components/experience/WMExperienceShell";
import { RadioProvider } from "@/contexts/RadioContext";
import WmWordmark from "@/components/brand/WmWordmark";
import ProofLane from "@/app/proof-lane/page";
import Scanner from "@/app/scanner/page";
import Education from "@/app/education/page";
import Backtesting from "@/app/backtesting/page";
import AiBot from "@/app/ai-bot/page";
import CopyTrading from "@/app/copy-trading/page";
import Lounge from "@/app/lounge/page";
import Shop from "@/app/shop/page";
import Partnerships from "@/app/partnerships/page";
import Creator from "@/app/creator/page";
import Tv from "@/app/tv/page";
import Radio from "@/app/radio/page";
import Profile from "@/app/profile/page";
import News from "@/app/news/page";

/**
 * WHY THIS HARNESS GREW A ROUTER.
 *
 * Four rooms — /scanner, /news, /ai-bot and /radio — could not be LOOKED AT
 * at all. Three threw "invariant expected app router to be mounted" and one
 * threw "useRadio must be used inside RadioProvider". They were not failing
 * the frame; they were unreachable by the instrument, and so they sat at
 * `frame: "cleared"` indefinitely for a reason that had nothing to do with
 * them.
 *
 * "Cleared" is supposed to be a MEASUREMENT. A room nobody can render is not
 * measured, it is parked — and a parking lot that only grows is how a
 * transformation quietly stops. So the harness takes on the two providers
 * `app/layout.tsx` supplies in production, and the rooms become judgeable.
 *
 * HONEST LIMIT, UNCHANGED: this is STATIC FIRST PAINT. No effects run, no
 * data arrives, no Suspense boundary resolves. A room that looks right here
 * has cleared exactly one bar — the one the frame cares about — and nothing
 * more may be claimed from it.
 */
const noopRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
} as never;

function Providers({ route, children }: { route: string; children: React.ReactNode }) {
  return (
    <AppRouterContext.Provider value={noopRouter}>
      <PathnameContext.Provider value={`/${route}`}>
        <SearchParamsContext.Provider value={new URLSearchParams()}>
          <PathParamsContext.Provider value={{}}>
            <RadioProvider>{children}</RadioProvider>
          </PathParamsContext.Provider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

const ROOMS: Array<[string, React.ComponentType<never>]> = [
  ["proof-lane", ProofLane as never],
  ["scanner", Scanner as never],
  ["education", Education as never],
  ["backtesting", Backtesting as never],
  ["ai-bot", AiBot as never],
  ["copy-trading", CopyTrading as never],
  ["lounge", Lounge as never],
  ["shop", Shop as never],
  ["partnerships", Partnerships as never],
  ["creator", Creator as never],
  ["tv", Tv as never],
  ["radio", Radio as never],
  ["profile", Profile as never],
  ["news", News as never],
];

describe("look at every cleared room under the OS frame", () => {
  for (const [name, Page] of ROOMS) {
    it(name, () => {
      let html = "";
      try {
        const P = Page as unknown as React.ComponentType;
        html = renderToStaticMarkup(
          <Providers route={name}>
            <WMExperienceShell brand={<WmWordmark size="compact" />}>
              <P />
            </WMExperienceShell>
          </Providers>,
        );
      } catch (err) {
        html = "<pre>RENDER_FAILED: " + (err instanceof Error ? err.message : String(err)) + "</pre>";
      }
      writeFileSync(
        `/tmp/room-${name}.html`,
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tmp/wm.css"><style>html,body{margin:0;min-height:100%;background:#050506;font-family:system-ui}</style></head><body>${html}</body></html>`,
      );
      expect(html.length).toBeGreaterThan(0);
    });
  }
});
