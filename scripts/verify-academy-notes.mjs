/**
 * Isolated, loopback-only Academy notes lifecycle fixture.
 * Bundles the exact LessonNotes function and its actual storage helper, before
 * (14448b0) and after (working tree). No app/auth/provider modules are loaded.
 * Browser interaction is manual or through the approved browser tool; this
 * script does not control a browser or inspect browser storage.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const pagePath = 'src/app/education/page.tsx';
const helperPath = 'src/lib/educationNotesStorage.ts';
const baseline = '14448b0b34fc7fd40bd8fe9f48f002464c115041';
const port = Number(process.env.ACADEMY_FIXTURE_PORT || 4391);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid fixture port');
const digest = text => createHash('sha256').update(text).digest('hex');
const bundles = new Map();
const receipts = {};

for (const variant of ['before', 'after']) {
  const readSource = path => variant === 'before'
    ? execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(resolve(root, path), 'utf8');
  const page = readSource(pagePath);
  const helper = readSource(helperPath);
  const start = page.indexOf('function LessonNotes(');
  const end = page.indexOf('/* ── Quiz panel', start);
  const invocation = page.match(/<LessonNotes\b[^>]*\/>/)?.[0];
  if (start < 0 || end < start || !invocation) throw new Error('Notes source boundaries changed; update fixture explicitly');
  receipts[variant] = { pageSha256: digest(page), helperSha256: digest(helper), invocation };
  const fixture = `
    import React, { useState, useRef, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import { Pencil } from 'lucide-react';
    import { readAcademyNote, persistAcademyNote } from 'academy-fixture-storage';
    ${page.slice(start, end)}

    // Test-only controls; never included in the application bundle.
    const nativeStorage = window.localStorage;
    function Fixture() {
      const [lesson, setLesson] = useState({id: 'fixture-A'});
      const [mounted, setMounted] = useState(true);
      const [fault, setFault] = useState('none');
      const [unmountAfterEdit, setUnmountAfterEdit] = useState(false);
      function changeFault(mode) {
        if (mode === 'read') Object.defineProperty(window, 'localStorage', {configurable: true, get() {throw new Error('Fixture SecurityError');}});
        else if (mode === 'write') Object.defineProperty(window, 'localStorage', {configurable: true, value: {
          getItem: key => nativeStorage.getItem(key),
          setItem() {throw new Error('Fixture QuotaExceededError');}
        }});
        else Object.defineProperty(window, 'localStorage', {configurable: true, value: nativeStorage});
        setFault(mode);
      }
      return <main>
        <h1>Isolated Academy notes: ${variant}</h1>
        <p>TEST FIXTURE — no account, app shell, providers, or production data. Source snapshot frozen at fixture startup.</p>
        <p>Selected lesson: {lesson.id} · Storage fault: {fault}</p>
        <nav aria-label="Fixture controls">
          <button onClick={() => setLesson({id: 'fixture-A'})}>Lesson A</button>
          <button onClick={() => setLesson({id: 'fixture-B'})}>Lesson B</button>
          <button onClick={() => setMounted(v => !v)}>{mounted ? 'Unmount editor' : 'Remount editor'}</button>
          <button onClick={() => changeFault('read')}>Block storage reads</button>
          <button onClick={() => changeFault('write')}>Block storage writes</button>
          <button onClick={() => changeFault('none')}>Restore storage</button>
          <label><input type="checkbox" checked={unmountAfterEdit} onChange={e => setUnmountAfterEdit(e.target.checked)}/>Unmount immediately after edit</label>
        </nav>
        <section aria-label="Actual notes component" onChange={() => {if (unmountAfterEdit) setMounted(false);}}>{mounted && ${invocation}}</section>
        <footer>Native browser persistence on this isolated origin only. Fault controls are synthetic failure injection, not provider proof.</footer>
      </main>;
    }
    createRoot(document.getElementById('root')).render(<Fixture/>);
  `;
  const result = await build({
    stdin: { contents: fixture, loader: 'tsx', resolveDir: root },
    bundle: true, write: false, platform: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{name: 'actual-notes-helper', setup(plugin) {
      plugin.onResolve({filter: /^academy-fixture-storage$/}, () => ({path: 'helper', namespace: 'fixture'}));
      plugin.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: helper, loader: 'ts'}));
    }}],
  });
  bundles.set(`/bundle-${variant}.js`, result.outputFiles[0].text);
}

const server = createServer((request, response) => {
  const path = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; frame-src 'none'");
  if (bundles.has(path)) {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(bundles.get(path));
  } else if (path === '/before' || path === '/after') {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Academy notes isolated fixture</title><style>body{font:16px system-ui;background:#111;color:#eee;margin:20px}main{max-width:760px;margin:auto}button{min-height:44px;margin:4px;padding:8px;border:1px solid #888;border-radius:8px}textarea{width:calc(100% - 24px);min-height:120px;padding:10px;font:16px system-ui}section{border:1px solid #aaa;padding:16px;margin:16px 0}footer{font-size:13px;color:#bbb}[role=status]{display:block;padding:8px}svg{width:14px;height:14px}</style><div id="root"></div><script src="/bundle-${path.slice(1)}.js"></script></html>`);
  } else { response.statusCode = 404; response.end('Fixture route not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({startedAt: new Date().toISOString(), origin: `http://127.0.0.1:${port}`, baseline, receipts}, null, 2)));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
