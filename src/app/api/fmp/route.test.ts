import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(()=>{vi.resetModules();vi.stubEnv("FMP_KEY","synthetic-test-key");});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();});
const request=()=>new Request("http://localhost/api/fmp?path=/v3/options/TSLA");
describe("FMP proxy full-response deadline",()=>{
 it("returns and caches a completed response",async()=>{
  const fetch=vi.fn().mockResolvedValue(Response.json([{symbol:"synthetic"}]));vi.stubGlobal("fetch",fetch);
  const {GET}=await import("./route");
  expect(await (await GET(request())).json()).toEqual([{symbol:"synthetic"}]);
  await GET(request());expect(fetch).toHaveBeenCalledTimes(1);
 });
 it("bounds stalled headers without depending on abort cooperation",async()=>{
  vi.useFakeTimers();const fetch=vi.fn().mockImplementation(()=>new Promise(()=>{}));vi.stubGlobal("fetch",fetch);
  const {GET}=await import("./route");const pending=GET(request());
  await vi.advanceTimersByTimeAsync(8_000);
  const res=await pending;expect(res.status).toBe(504);expect((await res.json()).edge).toBe("TIMEOUT");
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
 });
 it("bounds a stalled JSON body and never caches its late completion",async()=>{
  vi.useFakeTimers();let release!:(data:unknown)=>void;
  const fetch=vi.fn().mockResolvedValueOnce({ok:true,status:200,json:()=>new Promise(r=>{release=r;})})
    .mockResolvedValueOnce(Response.json([{symbol:"fresh"}]));vi.stubGlobal("fetch",fetch);
  const {GET}=await import("./route");const pending=GET(request());
  await vi.advanceTimersByTimeAsync(8_000);expect((await pending).status).toBe(504);
  release([{symbol:"late"}]);await Promise.resolve();
  expect(await (await GET(request())).json()).toEqual([{symbol:"fresh"}]);
  expect(fetch).toHaveBeenCalledTimes(2);
 });
 it("does not expose provider exception text or infer entitlement",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("upstream?apikey=synthetic-test-key")));
  const {GET}=await import("./route");const res=await GET(request());const body=await res.text();
  expect(res.status).toBe(502);expect(body).not.toContain("synthetic-test-key");expect(body).not.toMatch(/entitlement/i);
 });
 it("preserves a real provider HTTP error without caching it",async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response("forbidden",{status:403}));vi.stubGlobal("fetch",fetch);
  const {GET}=await import("./route");expect((await GET(request())).status).toBe(403);
  await GET(request());expect(fetch).toHaveBeenCalledTimes(2);
 });
});
