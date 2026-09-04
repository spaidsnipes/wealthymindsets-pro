/** Synthetic component test; no provider, auth, brokerage or production calls. */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const output = mkdtempSync(join(tmpdir(), 'wm-options-identity-'));
const source = 'src/components/chart/OptionsChain.tsx';
const bundle = await build({stdin:{contents:`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {OptionsChain} from './src/components/chart/OptionsChain';
function Fixture(){const [symbol,setSymbol]=useState('TSLA');return <main>
<p>SYNTHETIC OPTIONS FIXTURE — NOT EXECUTABLE QUOTES</p>
<button onClick={()=>setSymbol('SPY')}>Switch to SPY</button>
<OptionsChain symbol={symbol} price={500} onClose={()=>{}}/></main>}
createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture/></React.StrictMode>);`,
loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',
define:{'process.env.NODE_ENV':'"development"'}});
// Remove the app's remote font import in this isolated offline fixture.
const css = await postcss([tailwindcss('./tailwind.config.ts')]).process(readFileSync('src/app/globals.css','utf8').replace(/^@import url\([^\n]+\);\s*$/gm,''),{from:'src/app/globals.css'});
const server=createServer((req,res)=>{
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css.css);return;}
  if(req.url!=='/'){res.writeHead(404).end();return;}
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;const rows=[];const errors=[];let failure=null;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [device,width,height] of [['computer-1280',1280,900],['computer-1920',1920,1080],['iphone-390',390,844],['ipad-portrait',834,1194],['ipad-landscape',1194,834]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   if(!route.request().url().startsWith(origin+'/')||route.request().method()!=='GET'){errors.push('Unexpected external or non-GET request');await route.abort();return;}
   await route.continue();
  });
  // Deliberately ignore cancellation in this fake transport: stale completions
  // must be fenced even if abort does not stop a provider/body promise.
  await page.addInitScript(()=>{
   const original=window.fetch.bind(window);window.pendingOptions=[];
   window.fetch=(url,options)=>String(url).startsWith('/api/fmp?')?new Promise(resolve=>window.pendingOptions.push({url:String(url),resolve})):original(url,options);
   window.releaseOptions=(symbol,strike)=>{
    const pending=window.pendingOptions.filter(p=>p.url.endsWith('/'+symbol));
    window.pendingOptions=window.pendingOptions.filter(p=>!p.url.endsWith('/'+symbol));
    for(const p of pending)p.resolve(new Response(JSON.stringify([{symbol:symbol+'TEST',contractType:'call',expirationDate:'2026-12-18',strike,bid:1,ask:2,last:1.5,openInterest:1}]),{status:200}));
   };
  });
  await page.goto(origin);
  await page.waitForFunction(()=>window.pendingOptions.some(p=>p.url.endsWith('/TSLA')));
  await page.getByRole('button',{name:'Switch to SPY'}).click();
  await page.waitForFunction(()=>window.pendingOptions.some(p=>p.url.endsWith('/SPY')));
  await page.evaluate(()=>window.releaseOptions('SPY',500));
  await page.getByText('DATA AVAILABLE · FIDELITY UNKNOWN',{exact:true}).waitFor();
  await page.evaluate(()=>window.releaseOptions('TSLA',999));
  await page.waitForTimeout(100);
  if((await page.locator('tbody').innerText()).includes('999'))throw new Error(device+': stale TSLA overwrote SPY');
  await page.clock.install();
  await page.getByRole('button',{name:'Refresh options data',exact:true}).click();
  if(await page.locator('tbody').count())throw new Error(device+': old contracts remained during refresh');
  await page.clock.runFor(12_100);
  await page.getByText(/Options check timed out/).waitFor();
  await page.evaluate(()=>window.releaseOptions('SPY',888));
  await page.waitForTimeout(100);
  if(await page.locator('tbody').count())throw new Error(device+': expired response revived contracts');
  await page.getByRole('button',{name:'Refresh options data',exact:true}).click();
  await page.waitForFunction(()=>window.pendingOptions.some(p=>p.url.endsWith('/SPY')));
  await page.evaluate(()=>window.releaseOptions('SPY',501));
  await page.getByText('DATA AVAILABLE · FIDELITY UNKNOWN',{exact:true}).waitFor();
  await page.screenshot({path:join(output,device+'.png'),fullPage:true});
  const puts = page.getByText('Puts OI:',{exact:false});
  if (!(await puts.innerText()).includes('—')) throw new Error(device+': unobserved put OI became zero');
  const ratio = page.getByText('P/C Ratio:',{exact:false});
  if (!(await ratio.innerText()).includes('—')) throw new Error(device+': unobserved put side became zero ratio');
  rows.push({device,width,height,staleSymbolRejected:true,refreshClears:true,deadlineRejectsLateSuccess:true,retryRecovers:true});
  await context.close();
 }
 if(errors.length)throw new Error(JSON.stringify(errors));
}catch(e){failure=String(e);throw e;}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 const receipt={at:new Date().toISOString(),claim:'SYNTHETIC COMPONENT ONLY',sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),rows,errors,failure,serverClosed:!server.listening};
 writeFileSync(join(output,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({output,receipt},null,2));
}
