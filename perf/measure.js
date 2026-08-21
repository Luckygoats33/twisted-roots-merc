(async () => {
  const out = {url: location.pathname, vw: innerWidth, vh: innerHeight};
  if (document.readyState !== 'complete') { await new Promise(r => addEventListener('load', r, {once:true})); }
  let lcp = null; const shifts = []; const lts = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) lcp = e; }).observe({type:'largest-contentful-paint', buffered:true}); } catch(e){ out.lcpErr = ''+e; }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) shifts.push(e); }).observe({type:'layout-shift', buffered:true}); } catch(e){ out.clsErr = ''+e; }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) lts.push(e); }).observe({type:'longtask', buffered:true}); } catch(e){ out.ltErr = ''+e; }
  await new Promise(r => setTimeout(r, 2500));
  const nav = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');
  out.ttfb = +(nav.responseStart - nav.startTime).toFixed(1);
  out.fcp = +((paint.find(p=>p.name==='first-contentful-paint')||{startTime:-1}).startTime).toFixed(1);
  out.domInteractive = +nav.domInteractive.toFixed(1);
  out.domContentLoaded = +nav.domContentLoadedEventEnd.toFixed(1);
  out.load = +nav.loadEventEnd.toFixed(1);
  out.lcp = lcp ? +lcp.startTime.toFixed(1) : null;
  out.lcpEl = lcp ? (lcp.element ? (lcp.element.tagName + (lcp.element.id?'#'+lcp.element.id:'') + (lcp.element.className?'.'+String(lcp.element.className).split(' ').slice(0,3).join('.'):'')) : (lcp.url||'?')) : null;
  out.lcpUrl = lcp ? lcp.url : null;
  out.lcpSize = lcp ? lcp.size : null;
  // CLS total + session window
  let total = 0; const detail = [];
  for (const s of shifts) { if (s.hadRecentInput) continue; total += s.value;
    detail.push({t: +s.startTime.toFixed(0), v: +s.value.toFixed(5), src: (s.sources||[]).map(x => x.node ? (x.node.tagName||x.node.nodeName) + (x.node.id?'#'+x.node.id:'') + (x.node.className && typeof x.node.className==='string' ? '.'+x.node.className.trim().split(/\s+/).slice(0,3).join('.') : '') : '?').slice(0,4)});
  }
  let cur=0, curFirst=0, curLast=0, max=0;
  for (const s of shifts) { if (s.hadRecentInput) continue;
    if (cur && (s.startTime - curLast > 1000 || s.startTime - curFirst > 5000)) { max = Math.max(max, cur); cur = 0; }
    if (!cur) curFirst = s.startTime;
    curLast = s.startTime; cur += s.value; }
  max = Math.max(max, cur);
  out.clsTotal = +total.toFixed(4); out.cls = +max.toFixed(4);
  out.shifts = detail.sort((a,b)=>b.v-a.v).slice(0, 12);
  // TBT: blocking time of long tasks before... use load as proxy end
  out.longTasks = lts.map(t => ({start:+t.startTime.toFixed(0), dur:+t.duration.toFixed(0), attr: (t.attribution||[]).map(a=>a.name).slice(0,2)})).sort((a,b)=>b.dur-a.dur).slice(0,15);
  out.tbtAll = +lts.reduce((a,t)=>a + Math.max(0, t.duration - 50), 0).toFixed(0);
  const fcpT = out.fcp;
  out.tbtAfterFcp = +lts.filter(t=>t.startTime + t.duration > fcpT).reduce((a,t)=>a + Math.max(0, t.duration - 50), 0).toFixed(0);
  out.longTaskCount = lts.length;
  // resources
  const res = performance.getEntriesByType('resource');
  let totalTransfer = nav.transferSize || 0, totalDecoded = nav.decodedBodySize || 0;
  const byType = {};
  const list = [];
  for (const r of res) {
    const t = r.initiatorType === 'link' ? 'css/link' : r.initiatorType;
    const ts = r.transferSize || 0, ds = r.decodedBodySize || 0;
    totalTransfer += ts; totalDecoded += ds;
    byType[t] = byType[t] || {n:0, transfer:0, decoded:0};
    byType[t].n++; byType[t].transfer += ts; byType[t].decoded += ds;
    list.push({u: r.name.replace(location.origin,''), ty: t, kb: +(ts/1024).toFixed(1), dkb: +(ds/1024).toFixed(1), ms: +r.duration.toFixed(0), start: +r.startTime.toFixed(0)});
  }
  out.docTransferKB = +((nav.transferSize||0)/1024).toFixed(1);
  out.totalTransferKB = +(totalTransfer/1024).toFixed(1);
  out.totalDecodedKB = +(totalDecoded/1024).toFixed(1);
  out.byType = Object.fromEntries(Object.entries(byType).map(([k,v])=>[k, {n:v.n, kb:+(v.transfer/1024).toFixed(1), decodedKb:+(v.decoded/1024).toFixed(1)}]));
  out.resourceCount = res.length;
  out.topResources = list.sort((a,b)=>b.kb-a.kb).slice(0, 20);
  // render blocking
  out.renderBlocking = [...document.querySelectorAll('head link[rel=stylesheet], head script[src]')].map(e => ({tag:e.tagName, href: (e.href||e.src||'').replace(location.origin,''), media: e.media||'', async: e.async, defer: e.defer, rb: e.media && e.media !== 'all' && e.media !== 'print' ? 'media' : (e.media==='print'?'no(print)':'YES')}));
  // scripts at body end
  out.bodyScripts = [...document.querySelectorAll('body script[src]')].map(e => ({src: e.src.replace(location.origin,''), async:e.async, defer:e.defer, type:e.type||''}));
  // images without dimensions
  const imgs = [...document.images];
  out.imgTotal = imgs.length;
  out.imgsNoDim = imgs.filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => ({src: i.currentSrc.replace(location.origin,''), nw: i.naturalWidth, nh: i.naturalHeight, dw: i.width, dh: i.height, loading: i.loading, srcset: !!i.srcset, alt: i.alt===''? '(empty)' : (i.alt? 'yes':'MISSING')}));
  out.imgsWithDim = imgs.length - out.imgsNoDim.length;
  out.imgsNoSrcset = imgs.filter(i => !i.srcset && !(i.parentElement && i.parentElement.tagName==='PICTURE')).length;
  out.imgsOversized = imgs.filter(i => i.naturalWidth > 0 && i.width > 0 && i.naturalWidth > i.width * devicePixelRatio * 1.5).map(i=>({src:i.currentSrc.replace(location.origin,''), natural:i.naturalWidth+'x'+i.naturalHeight, displayed:i.width+'x'+i.height}));
  return JSON.stringify(out);
})()
