/**
 * Actual component interaction fixture, not production/account proof.
 * All API traffic is synthetic, GET-only, loopback-only. Never signs in or
 * submits/cancels an order. Run from repository root with installed deps.
 */
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const root = process.cwd();
const readinessOnly = process.argv.includes('--readiness');
const webullOnly = process.argv.includes('--webull');
const output = mkdtempSync(join(tmpdir(), 'wm-paper-account-proof-'));
const files = [
  'src/components/broker/AlpacaTradingPanel.tsx',
  'src/components/broker/BrokerConnectPanel.tsx',
  'src/components/chart/ChartsDashboard.tsx',
  'src/components/layout/ShellModalDrawer.tsx',
  'src/components/layout/useShellModalFocus.ts',
  'src/app/globals.css',
  'src/app/readiness/page.tsx',
  'src/lib/broker/selectReadinessWireboard.ts',
  'src/lib/positionTruth.ts',
];
const manifest = Object.fromEntries(files.map(path => [path,
  createHash('sha256').update(readFileSync(path)).digest('hex')]));
const entry = `
  import React, {useRef, useState} from 'react';
  import {createRoot} from 'react-dom/client';
  import {BrokerConnectPanel} from './src/components/broker/BrokerConnectPanel';
  import {AlpacaTradingPanel} from './src/components/broker/AlpacaTradingPanel';
  import ReadinessPage from './src/app/readiness/page';
  function Fixture() {
    const trigger = useRef(null);
    const [brokerOpen, setBrokerOpen] = useState(false);
    const [tradeOpen, setTradeOpen] = useState(false);
    return <main>
      <h1>WM paper-account component fixture</h1>
      <p>Synthetic paper position. No broker connection or execution.</p>
      <button ref={trigger} onClick={() => setBrokerOpen(true)}>Connect brokers</button>
      {brokerOpen && <BrokerConnectPanel onClose={() => setBrokerOpen(false)} fallbackTriggerRef={trigger}
        onOpenPaperAccount={() => {setBrokerOpen(false); setTradeOpen(true);}} />}
      {tradeOpen && <AlpacaTradingPanel defaultSymbol="TSLA" initialTab="positions"
        fallbackTriggerRef={trigger} onClose={() => setTradeOpen(false)}
        onSwitchBroker={() => setBrokerOpen(true)} />}
    </main>;
  }
  createRoot(document.getElementById('root')).render(<React.StrictMode>${readinessOnly ? '<ReadinessPage/>' : '<Fixture/>'}</React.StrictMode>);
`;
const bundle = await build({stdin: {contents: entry, loader: 'tsx', resolveDir: root},
  bundle: true, write: false, platform: 'browser', format: 'iife',
  // Match the client build's empty, non-secret environment in this fixture.
  define: {'process.env.NODE_ENV': '"development"', 'process.env':'{}'},
});
const css = await postcss([tailwindcss('./tailwind.config.ts')])
  .process(readFileSync('src/app/globals.css', 'utf8'), {from: 'src/app/globals.css'});
let fault = false;
let emptyPositions = false;
let workingOrder = false;
let positionQuantity = '1';
const apiRequests = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; font-src 'none'");
  if (req.method !== 'GET') {res.writeHead(405).end(); return;}
  if (url.pathname === '/bundle.js') {res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return;}
  if (url.pathname === '/fixture.css') {res.setHeader('Content-Type', 'text/css'); res.end(css.css); return;}
  if (url.pathname.startsWith('/api/')) {
    apiRequests.push(url.pathname + url.search);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/broker/webull/status' && webullOnly) {
      if (fault === 'hang') {res.writeHead(200); res.write('{"provider":"webull",'); return;}
      if (fault) {res.writeHead(503).end(JSON.stringify({error:'Synthetic connection check failed'})); return;}
      res.end(JSON.stringify({provider:'webull',authMode:'SIGNED_OPENAPI',configured:true,connected:true,state:'CONNECTED',accountCount:1,accountTypes:['CASH'],note:'Synthetic signed account-list read only. No real broker connection or order access.'})); return;
    }
    if (url.pathname === '/api/broker/readiness') {
      if (fault === 'hang') {res.writeHead(200); res.write('{"providers":['); return;}
      if (fault) {res.writeHead(503).end(JSON.stringify({error:'Fixture readiness unavailable'})); return;}
      res.end(JSON.stringify({providers:[
        {provider:'webull-data', label:'Webull market data', lane:'market-data', status:'READY', missing:[], missingRecommended:[], note:'Synthetic configuration presence only'},
        {provider:'alpaca-live', label:'Alpaca (live)', lane:'broker', status:'READY', missing:[], missingRecommended:[], note:'Synthetic configuration presence only'},
        {provider:'moomoo', label:'Moomoo (OpenD bridge)', lane:'broker', status:'BLOCKED', missing:['MOOMOO_BRIDGE_URL'], missingRecommended:[], note:'Synthetic missing configuration'},
      ],envPresence:[]})); return;
    }
    if (url.pathname === '/api/alpaca-trading') {
      if (fault === 'account-only-fail' && url.searchParams.get('action') === 'account') {
        res.writeHead(503).end(JSON.stringify({error:'Synthetic account-only failure'})); return;
      }
      if (fault === 'account-hang' && url.searchParams.get('action') === 'account') {
        res.writeHead(200); res.write('{'); return;
      }
      if (fault === 'order-hang' && url.searchParams.get('action') === 'orders') {
        res.writeHead(200); res.write('['); return;
      }
      if (fault === 'position-hang' && url.searchParams.get('action') === 'positions') {
        res.writeHead(200); res.write('['); return;
      }
      if (fault && fault !== 'account-only-fail') {res.writeHead(503).end(JSON.stringify({error:'Fixture account refresh unavailable'})); return;}
      const action = url.searchParams.get('action');
      if (action === 'account') {res.end(JSON.stringify({status:'ACTIVE', cash:'1000', equity:'1100', buying_power:'1000', portfolio_value:'1100', pattern_day_trader:false, trading_blocked:false, account_number:'FIXTURE', _env:'paper', _connected:true})); return;}
      if (action === 'positions') {res.end(JSON.stringify(emptyPositions ? [] : [{symbol:'TSLA', qty:positionQuantity, avg_entry_price:'100', current_price:'99', market_value:'99', unrealized_pl:'-1', unrealized_plpc:'-0.01', side:'long'}])); return;}
      if (action === 'orders') {res.end(JSON.stringify(workingOrder ? [{id:'fixture-order',symbol:'TSLA',side:'buy',qty:'1',filled_qty:'0',type:'limit',limit_price:'90',status:'new',submitted_at:'2026-09-04T13:00:00Z'}] : [])); return;}
    }
    res.writeHead(503).end(JSON.stringify({error:'Fixture: provider unavailable', configured:false, connected:false})); return;
  }
  if (url.pathname !== '/') {res.writeHead(404).end(); return;}
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WM paper account — TEST FIXTURE</title><link rel="stylesheet" href="/fixture.css"><style>body{background:#07080a;color:#eee;font:14px system-ui}main{padding:24px}main>button{min-height:44px;padding:12px;border:1px solid #aaa}body:after{content:'LOCAL TEST FIXTURE — SYNTHETIC ACCOUNT DATA';position:fixed;bottom:0;left:0;z-index:999;color:#fff;background:#702b20;font:9px system-ui;padding:2px;pointer-events:none}</style><div id="root"></div><script src="/bundle.js"></script></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const rows = [];
const errors = [];
let failure = null;
try {
  browser = await chromium.launch({channel:'chrome',headless:true});
  for (const [device, width, height] of [
    ['computer-1280',1280,900], ['computer-1920',1920,1080],
    ['iphone-390',390,844], ['ipad-portrait',834,1194], ['ipad-landscape',1194,834],
  ]) {
    fault = false;
    const context = await browser.newContext({viewport:{width,height}});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push({device, error:e.message}));
    await context.route('**/*', async route => {
      const request = route.request();
      if (!request.url().startsWith(origin + '/') || request.method() !== 'GET') {
        errors.push({device, blocked:request.method() + ' ' + request.url()});
        await route.abort(); return;
      }
      await route.continue();
    });
    await page.goto(origin);
    if (readinessOnly) {
      await page.getByText('2/3 providers configured',{exact:true}).waitFor();
      if (await page.getByText('READY',{exact:true}).count()) throw new Error(device + ': presence promoted to READY');
      if (await page.getByText('SETUP PRESENT',{exact:true}).count() !== 2) throw new Error(device + ': setup labels missing');
      const overflow = await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth + 1);
      if (overflow) throw new Error(device + ': readiness horizontal overflow');
      await page.screenshot({path:join(output,device+'-readiness.png'),fullPage:true});
      fault = true;
      await page.reload();
      await page.getByText(/Could not load \/api\/broker\/readiness/).waitFor();
      if (await page.getByText('SETUP PRESENT',{exact:true}).count()) throw new Error(device + ': stale setup after failed read');
      fault = false;
      await page.getByRole('button',{name:'Retry connection check',exact:true}).click();
      await page.getByText('2/3 providers configured',{exact:true}).waitFor();
      await page.clock.install();
      fault = 'hang';
      const stalled = page.waitForResponse(response => response.url().endsWith('/api/broker/readiness'));
      await page.reload();
      await stalled;
      await page.clock.runFor(12_100);
      await page.getByRole('alert').filter({hasText:'Connection setup check timed out'}).waitFor();
      if (await page.getByText('SETUP PRESENT',{exact:true}).count()) throw new Error(device + ': stalled body retained configuration');
      fault = false;
      await page.getByRole('button',{name:'Retry connection check',exact:true}).click();
      await page.getByText('2/3 providers configured',{exact:true}).waitFor();
      rows.push({device,width,height,setupNotReady:true,contained:true,failureDoesNotCertify:true,httpRetry:true,stalledBodyBounded:true,timeoutRetry:true});
      await context.close();
      continue;
    }
    await page.getByRole('button', {name:'Connect brokers',exact:true}).click();
    if (webullOnly) {
      await page.getByText('Webull account wire connected',{exact:true}).waitFor();
      await page.clock.install();
      const check = page.getByRole('button',{name:'Check wire',exact:true});
      fault = true;
      await check.click();
      await page.getByText('Connection check failed (HTTP 503).',{exact:true}).waitFor();
      if (await page.getByText('Webull account wire connected',{exact:true}).count()) throw new Error(device + ': stale Webull success after failed check');
      fault = 'hang';
      const stalled = page.waitForResponse(response => response.url().endsWith('/api/broker/webull/status'));
      await check.click();
      await stalled;
      await page.clock.runFor(12_100);
      await page.getByText('Connection check timed out. Account access is unverified; retry when ready.',{exact:true}).waitFor();
      if (!(await check.isEnabled())) throw new Error(device + ': Webull retry stayed disabled');
      await check.scrollIntoViewIfNeeded();
      await page.screenshot({path:join(output,device+'-webull-timeout.png')});
      fault = false;
      await check.click();
      await page.getByText('Webull account wire connected',{exact:true}).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Connect brokers',exact:true}).waitFor();
      rows.push({device,width,height,failedReadClearsSuccess:true,stalledBodyBounded:true,retryEnabled:true,retryRecovers:true});
      await context.close();
      continue;
    }
    await page.getByRole('button', {name:'Open Alpaca paper account',exact:true}).click();
    const dialog = page.getByRole('dialog', {name:'Alpaca paper account',exact:true});
    await dialog.getByText('TSLA', {exact:true}).waitFor();
    await dialog.getByText('−$1.00', {exact:true}).waitFor();
    const escape = dialog.getByRole('link', {name:/Open broker/});
    await escape.waitFor();
    // Wait for the real drawer spring to settle, not just its children to mount.
    let stableSamples = 0;
    let previousX = Number.NaN;
    for (let sample = 0; sample < 100 && stableSamples < 6; sample++) {
      const rect = await dialog.boundingBox();
      stableSamples = rect && rect.x >= -1 && rect.x + rect.width <= width + 1 &&
        Math.abs(rect.x - previousX) < 0.1 ? stableSamples + 1 : 0;
      previousX = rect?.x ?? Number.NaN;
      await page.waitForTimeout(50);
    }
    if (stableSamples < 6) throw new Error(device + ': drawer never settled inside viewport');
    const box = await dialog.boundingBox();
    const escapeBox = await escape.boundingBox();
    if (!box || box.x < -1 || box.x+box.width > width+1) throw new Error(device + ': drawer escaped viewport ' + JSON.stringify({box,width,dom:await dialog.evaluate(el=>({x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right,innerWidth}))}));
    if (!escapeBox || escapeBox.y < 0 || escapeBox.y+escapeBox.height > height+1) throw new Error(device + ': broker escape clipped');
    await page.screenshot({path:join(output,device+'-observed.png')});
    // Advancing a browser clock is synthetic evidence, never market time proof.
    // The actual component must stop treating an old position as current.
    await page.clock.install();
    await page.clock.runFor(31_100);
    await dialog.getByText('LONG 1 — LAST KNOWN, not confirmed',{exact:true}).waitFor();
    if (!(await escape.isVisible())) throw new Error(device + ': escape lost when position ages');
    await page.screenshot({path:join(output,device+'-aged-position.png')});
    fault = 'position-hang';
    const stalledPosition = page.waitForResponse(response => response.url().endsWith('action=positions'));
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await stalledPosition;
    await page.clock.runFor(12_100);
    await dialog.getByText('Could not refresh positions.',{exact:false}).waitFor();
    await dialog.getByText('TSLA',{exact:true}).waitFor();
    if (!(await escape.isVisible())) throw new Error(device + ': broker escape lost during stalled position body');
    fault = true;
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await dialog.getByText(/PAPER ACCOUNT UNVERIFIED/).waitFor();
    await dialog.getByText('TSLA',{exact:true}).waitFor();
    await dialog.getByText('Last observed P&L',{exact:true}).waitFor();
    await dialog.getByText('Last observed mark: $99.00',{exact:true}).waitFor();
    if (!(await escape.isVisible())) throw new Error(device + ': broker escape lost during failure');
    await page.screenshot({path:join(output,device+'-failed-refresh.png')});
    await escape.focus();
    await page.keyboard.press('Tab');
    if (!(await dialog.getByRole('button',{name:'Refresh paper account'}).evaluate(el=>el===document.activeElement))) throw new Error(device + ': focus escaped dialog');
    fault = false;
    emptyPositions = true;
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await page.clock.runFor(1_100);
    await dialog.getByText('No open positions',{exact:true}).waitFor();
    await page.clock.runFor(31_100);
    await dialog.getByText('Last observed empty — current positions unverified',{exact:true}).waitFor();
    await page.screenshot({path:join(output,device+'-aged-empty.png')});
    emptyPositions = false;
    await dialog.getByRole('button',{name:'Orders',exact:true}).click();
    workingOrder = true;
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await dialog.getByText('NEW',{exact:true}).waitFor();
    fault = 'order-hang';
    const stalledOrder = page.waitForResponse(response => response.url().includes('action=orders&status=all'));
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await stalledOrder;
    await page.clock.runFor(12_100);
    await dialog.getByText('Could not load orders.',{exact:false}).waitFor();
    await dialog.getByText('Last observed status: NEW',{exact:true}).waitFor({timeout:5000});
    await dialog.getByText('TSLA',{exact:true}).waitFor();
    if (!(await escape.isVisible())) throw new Error(device + ': order failure lost broker escape');
    await page.screenshot({path:join(output,device+'-working-order-unverified.png')});
    if (await dialog.getByText('No recent orders',{exact:true}).count()) throw new Error(device + ': hung orders claimed empty');
    fault = false;
    workingOrder = false;
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await dialog.getByText('No recent orders',{exact:true}).waitFor();
    fault = 'account-hang';
    const stalledAccount = page.waitForResponse(response => response.url().endsWith('action=account'));
    await dialog.getByRole('button',{name:'Refresh paper account',exact:true}).click();
    await stalledAccount;
    await page.clock.runFor(12_100);
    await dialog.getByText('Account check timed out. Current account state is unverified.',{exact:true}).waitFor({timeout:5000});
    const retryAccount = dialog.getByRole('button',{name:'Refresh paper account',exact:true});
    if (!(await retryAccount.isEnabled())) throw new Error(device + ': timed-out account trapped refresh');
    if (!(await escape.isVisible())) throw new Error(device + ': account timeout lost broker escape');
    await page.screenshot({path:join(output,device+'-account-timeout.png')});
    fault = false;
    await retryAccount.click();
    await dialog.getByText(/PAPER ACCOUNT OBSERVED/).waitFor();
    fault = 'account-only-fail';
    await retryAccount.click();
    await dialog.getByText('Synthetic account-only failure',{exact:true}).waitFor();
    await dialog.getByRole('button',{name:'Trade',exact:true}).click();
    await dialog.getByText('Buying power is unknown, so an order that adds risk cannot be shown as funded.',{exact:true}).waitFor();
    if (await dialog.getByRole('button',{name:'BUY 1 TSLA — MARKET',exact:true}).isEnabled()) throw new Error(device + ': retained account funded a new buy after failure');
    await dialog.getByRole('button',{name:'SELL',exact:true}).click();
    if (!(await dialog.getByRole('button',{name:'SELL 1 TSLA — MARKET',exact:true}).isEnabled())) throw new Error(device + ': account failure blocked known-position reduction');
    await page.clock.runFor(31_100);
    const unknownRisk = dialog.getByText(/Your position could not be confirmed, so this order cannot be confirmed to reduce risk\./);
    await unknownRisk.waitFor();
    // UNKNOWN_EFFECT keeps the existing broker-delegated exit policy. It must
    // disclose uncertainty, not certify a reduction against an expired book.
    positionQuantity = '1oops';
    await retryAccount.click();
    await dialog.getByText('Synthetic account-only failure',{exact:true}).waitFor();
    await page.clock.runFor(1_100);
    await unknownRisk.waitFor();
    positionQuantity = '1';
    await retryAccount.click();
    await dialog.getByText('Synthetic account-only failure',{exact:true}).waitFor();
    await page.clock.runFor(1_100);
    await unknownRisk.waitFor({state:'hidden'});
    // Inspect controls only. Never click submit; server rejects every non-GET.
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'});
    if (!(await page.getByRole('button',{name:'Connect brokers',exact:true}).evaluate(el=>el===document.activeElement))) throw new Error(device + ': focus not restored');
    rows.push({device,width,height,drawerContained:true,escapeVisible:true,snapshotAges:true,emptySnapshotAges:true,stalledPositionBodyBounded:true,stalledOrderBodyBounded:true,workingOrderRetainedOnFailure:true,orderReadRetryRecovers:true,stalledAccountBodyBounded:true,accountReadRetryRecovers:true,staleAndMalformedHoldingsDisclosed:true,holdingsRetryRecovers:true,retainedPositionOnFailure:true,focusTrap:true,escapeCloses:true,focusRestored:true});
    await context.close();
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
} catch (error) {
  failure = String(error);
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  const receipt = {claim:'LOCAL COMPONENT FIXTURE ONLY — NOT BROKER OR PRODUCTION PROOF',
    surface:readinessOnly ? 'readiness' : webullOnly ? 'webull-account-check' : 'paper-account',
    at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    manifest,rows,errors,failure,passed:failure === null && rows.length === 5,
    apiRequests: [...new Set(apiRequests)],serverClosed:!server.listening};
  writeFileSync(join(output,'receipt.json'),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({output,receipt},null,2));
}
