/**
 * CHUNK RECOVERY BEFORE REACT (sheriff sweep 2026-10-07).
 *
 * MEASURED on serving /radio at 12:40 CDT, inside a deploy (388c941 → 4769a31):
 * `ChunkLoadError: Loading chunk 4219 failed` — and the chunk was
 * app/global-error itself. The error boundaries in src/app/error.tsx and
 * global-error.tsx already reload once onto the current build
 * (lib/deployVersionRecovery), but a boundary whose own code cannot load never
 * runs: the room stayed on "Checking your secure session…" indefinitely.
 *
 * This listener is inline in the root layout's <head>, so it exists before any
 * chunk is requested. On a chunk-load failure it reloads ONCE, sharing the
 * boundaries' guard key and 60 s window in sessionStorage, so the two paths
 * can never loop each other. Storage refused → never reload.
 */
import { RECOVERY_KEY, RECOVERY_WINDOW_MS } from "@/lib/deployVersionRecovery";

export const CHUNK_RECOVERY_SCRIPT = `(function(){var K=${JSON.stringify(RECOVERY_KEY)},W=${RECOVERY_WINDOW_MS},R=/ChunkLoadError|Loading (CSS )?chunk [\\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;function go(x){try{var t=x&&(x.name||"")+" "+(x.message||"");if(!t||!R.test(t))return;var s=window.sessionStorage,n=Date.now(),l=Number(s.getItem(K)||0);if(l>0&&n-l<W)return;s.setItem(K,String(n));window.location.reload()}catch(e){}}window.addEventListener("error",function(e){go(e&&(e.error||{message:e.message}))},true);window.addEventListener("unhandledrejection",function(e){go(e&&e.reason)})})();`;
