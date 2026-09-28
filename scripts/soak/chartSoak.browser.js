/**
 * WM PRO · /charts ACTIVE SOAK HARNESS (Garden 16 order: "run a meaningful
 * active soak during the shift … commit the repeatable soak harness and report
 * only the duration actually proven. Never claim an unrun soak passed.")
 *
 * Paste into the console of a VISIBLE /charts tab (a hidden tab gets no frames
 * and measures Chrome's throttling, not the product). It reads only what the
 * chart already publishes on its overlay canvas — the paint ledger
 * (data-paint-*) and the market clock (data-market-clock) — plus JS heap.
 *
 *   __wmSoak.start(15000)   sample every 15 s (each sample persisted)
 *   __wmSoak.resume()       after a reload/navigation: continue the same soak
 *   __wmSoak.report()       the summary over what was ACTUALLY sampled
 *   __wmSoak.stop() / clear()
 *
 * The summary states its own duration; a soak is only as long as its samples.
 */
(function () {
  function parseClock(s) {
    // "evt→state 10/20 · state→series 6.7/9.1 · series→paint 30/49 · fold 2.0/51 · backlog max 3 · n 240"
    const num = (re) => { const m = re.exec(s || ""); return m ? m.slice(1).map((v) => (v === "—" ? null : Number(v))) : [null, null]; };
    const [e50, e95] = num(/evt→state ([\d.—]+)\/([\d.—]+)/);
    const [p50, p95] = num(/series→paint ([\d.—]+)\/([\d.—]+)/);
    const [backlog] = num(/backlog max ([\d.—]+)/);
    return { evtToState95: e95, evtToState50: e50, seriesToPaint95: p95, seriesToPaint50: p50, backlogMax: backlog };
  }

  function summarize(samples) {
    if (!samples.length) return { verdict: "NO_SAMPLES", durationMin: 0, samples: 0 };
    const t0 = samples[0].t, t1 = samples[samples.length - 1].t;
    const vals = (k) => samples.map((s) => s[k]).filter((v) => typeof v === "number" && Number.isFinite(v));
    const max = (k) => { const v = vals(k); return v.length ? Math.max(...v) : null; };
    const heap = vals("heap");
    const firstHeap = heap.length ? heap[0] : null, lastHeap = heap.length ? heap[heap.length - 1] : null;
    const hidden = samples.filter((s) => s.visibility !== "visible").length;
    const over = max("paintOverBudget");
    return {
      verdict: hidden > 0 ? "TAINTED_HIDDEN" : "MEASURED",
      durationMin: Math.round(((t1 - t0) / 60000) * 10) / 10,
      samples: samples.length,
      hiddenSamples: hidden,
      paintMeanMsMax: max("paintMeanMs"),
      paintLongestMsMax: max("paintLongestMs"),
      paintOverBudgetMax: over,
      budgetMissedSamples: samples.filter((s) => s.paintBudgetMet && s.paintBudgetMet !== "MET").length,
      evtToState95Max: max("evtToState95"),
      seriesToPaint95Max: max("seriesToPaint95"),
      backlogMax: max("backlogMax"),
      heapStartMB: firstHeap == null ? null : Math.round(firstHeap / 1e5) / 10,
      heapEndMB: lastHeap == null ? null : Math.round(lastHeap / 1e5) / 10,
      heapMaxMB: max("heap") == null ? null : Math.round(max("heap") / 1e5) / 10,
      symbols: [...new Set(samples.map((s) => s.url))],
    };
  }

  function sample() {
    const o = document.querySelector("canvas.pointer-events-none");
    const d = (o && o.dataset) || {};
    const n = (v) => (v == null || v === "" ? null : Number(v));
    return {
      t: Date.now(),
      url: location.pathname + location.search,
      visibility: document.visibilityState,
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
      paintMeanMs: n(d.paintMeanMs),
      paintLongestMs: n(d.paintLongestMs),
      paintOverBudget: n(d.paintOverBudget),
      paintBudgetMet: d.paintBudgetMet || null,
      ...parseClock(d.marketClock),
    };
  }

  // Samples are persisted as they are taken: on 2026-09-27 a 50-minute soak
  // lost its in-page samples when the tab was navigated away. After a reload,
  // `__wmSoak.resume()` reads them back; `report()` then spans both.
  const KEY = "wm_soak_samples_v1";
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(api.samples.slice(-2000))); } catch { /* storage full or blocked: the in-page copy still stands */ } };
  const take = () => { api.samples.push(sample()); persist(); };
  const api = {
    samples: [],
    timer: null,
    start(everyMs = 15000) {
      api.stop();
      take();
      api.timer = setInterval(take, everyMs);
      return "soak started";
    },
    resume(everyMs = 15000) {
      try { api.samples = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { api.samples = []; }
      api.stop();
      take();
      api.timer = setInterval(take, everyMs);
      return `soak resumed with ${api.samples.length} samples`;
    },
    clear() { api.stop(); api.samples = []; try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } },
    stop() { if (api.timer) clearInterval(api.timer); api.timer = null; },
    report() { return summarize(api.samples); },
    _summarize: summarize,
    _parseClock: parseClock,
  };
  if (typeof window !== "undefined") window.__wmSoak = api;
  if (typeof module !== "undefined") module.exports = api;
})();
