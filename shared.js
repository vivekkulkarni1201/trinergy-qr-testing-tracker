
const sb = supabase.createClient(TQR_CONFIG.SUPABASE_URL, TQR_CONFIG.SUPABASE_KEY);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ym = d => (d || new Date()).toISOString().slice(0,7);
const nowIso = () => new Date().toISOString();
const TQR_APP_VERSION = 'v6.14.14';


const TQR_VIEW_KEY = 'tqr_portal_view';
function getPortalView(){
  try{
    const url=new URL(location.href);
    const q=(url.searchParams.get('view')||'').toLowerCase();
    if(q==='public' || q==='testing'){
      localStorage.setItem(TQR_VIEW_KEY,q);
      return q;
    }
  }catch{}
  try{
    const stored=(localStorage.getItem(TQR_VIEW_KEY)||'').toLowerCase();
    if(stored==='public' || stored==='testing') return stored;
  }catch{}
  return 'testing';
}
function isPublicPortalView(){ return getPortalView()==='public'; }
function isTestingPortalView(){ return getPortalView()==='testing'; }
function setPortalView(mode){
  const next=(mode==='public')?'public':'testing';
  try{ localStorage.setItem(TQR_VIEW_KEY,next); }catch{}
  try{
    const url=new URL(location.href);
    url.searchParams.set('view',next);
    location.replace(url.toString());
  }catch{
    location.reload();
  }
}
function applyPortalViewClass(){
  document.body?.classList.toggle('public-view',isPublicPortalView());
  document.body?.classList.toggle('testing-view',isTestingPortalView());
}
function bindPortalViewSwitch(){
  document.querySelectorAll('[data-view-mode]').forEach(btn=>{
    btn.onclick=()=>setPortalView(btn.dataset.viewMode);
  });
}
function publicAllowedPages(){
  return ['dashboard','active','bays'];
}
function restrictPublicPage(active){
  if(!isPublicPortalView()) return;
  if(publicAllowedPages().includes(active)) return;
  try{
    const url=new URL('index.html',location.href);
    url.searchParams.set('view','public');
    location.replace(url.toString());
  }catch{}
}
window.getPortalView=getPortalView;
window.isPublicPortalView=isPublicPortalView;
window.isTestingPortalView=isTestingPortalView;
window.setPortalView=setPortalView;

function showToast(msg){
  const t = $('#toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'), 2800);
}

function mountVersionBadge(){
  const top=$('#topbar');
  if(!top||top.querySelector('.app-version-badge'))return;
  const b=document.createElement('span');
  b.className='app-version-badge';
  b.textContent=TQR_APP_VERSION;
  b.title='Trinergy QR Tracker version';
  top.appendChild(b);
}
function showUpdateNotice(){
  let n=document.querySelector('.app-update-notice');
  if(!n){
    n=document.createElement('div');
    n.className='app-update-notice';
    document.body.appendChild(n);
  }
  n.innerHTML=`<b>New tracker version available</b><span>Updating to ${TQR_APP_VERSION}…</span>`;
  requestAnimationFrame(()=>n.classList.add('show'));
}

function navHtml(active){
  const currentView=getPortalView();
  const allItems = [
    ['dashboard','index.html','⌂','Dashboard'],
    ['active','active.html','☷','Active UPS'],
    ['bays','bays.html','▦','Test Bay Monitoring'],
    ['parking','parking.html','P','Parking Area'],
    ['buffer','buffer.html','◇','Buffer Stock'],
    ['faulty','faulty.html','!','Faulty Area'],
    ['qrgen','qr.html','⌗','QR Generator'],
    ['admin','admin.html','⚙','Admin'],
    ['reports','reports.html','▥','Reports']
  ];
  const allowedPublic=new Set(publicAllowedPages());
  const items=currentView==='public' ? allItems.filter(x=>allowedPublic.has(x[0])) : allItems;
  return `<div class="brand brand-image"><img src="trinergy-brand-banner.png" alt="TRINERGY QR Testing Tracker"></div>
  <nav class="navtabs">${items.map(([id,href,icon,label])=>{
      const url=new URL(href,location.href);
      url.searchParams.set('view',currentView);
      return `<a class="navtab ${active===id?'active':''}" href="${url.pathname.split('/').pop()}${url.search}"><span>${icon}</span>${label}</a>`;
    }).join('')}</nav>
  <div class="portal-view-toggle" aria-label="Portal view mode">
    <button type="button" class="portal-view-btn ${currentView==='public'?'active':''}" data-view-mode="public">Public View</button>
    <button type="button" class="portal-view-btn ${currentView==='testing'?'active':''}" data-view-mode="testing">Testing View</button>
  </div>
  <div class="navright"><span class="live-dot"></span><span class="live-label">Live</span><div class="clockbox"><span id="dateNow"></span><b id="timeNow"></b></div></div>`;
}
function mountTopbar(active){
  applyPortalViewClass();
  restrictPublicPage(active);
  const e = $('#topbar'); if(!e) return;
  e.innerHTML = navHtml(active);
  bindPortalViewSwitch();
  const tick = ()=>{
    const d = new Date();
    const date = $('#dateNow'), time = $('#timeNow');
    if(date) date.textContent = d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    if(time) time.textContent = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };
  tick(); setInterval(tick,1000); mountVersionBadge();
}
async function table(name, select='*'){
  const r = await sb.from(name).select(select);
  if(r.error) throw r.error;
  return r.data || [];
}
async function loadCore(){
  const [u,t,b,o,h,st,op]=await Promise.all([
    table('tqr_units'),
    table('tqr_monthly_targets'),
    table('tqr_bays'),
    table('tqr_bay_occupancy'),
    table('tqr_stage_history'),
    table('tqr_stage_state'),
    table('tqr_month_opening_counts')
  ]);
  const sm=Object.fromEntries(st.map(x=>[x.unit_id,x]));u.forEach(x=>x.tqr_stage_state=sm[x.id]||null);
  return {u,t,b,o:o.filter(x=>!x.released_at),h,st,op};
}
function monthOf(v){ return v ? String(v).slice(0,7) : ''; }
function openingCounts(data,type,m){
  const row=(data.op||[]).find(x=>x.ups_type===type && monthOf(x.month_start)===m);
  return {received:Number(row?.received||0),completed:Number(row?.completed||0),as_of_date:row?.as_of_date||null};
}
function counts(data,type,m){
  const arr = data.u.filter(x=>x.ups_type===type);
  const target = Number(data.t.find(x=>x.ups_type===type && monthOf(x.month_start)===m)?.target || 0);
  const opening=openingCounts(data,type,m);
  const liveReceived=arr.filter(x=>monthOf(x.received_at)===m).length;
  const liveCompleted=arr.filter(x=>x.status==='COMPLETED' && monthOf(x.completed_at)===m).length;
  return {
    target,
    received: opening.received + liveReceived,
    completed: opening.completed + liveCompleted,
    openingReceived: opening.received,
    openingCompleted: opening.completed,
    liveReceived,
    liveCompleted,
    under: arr.filter(x=>x.status==='UNDER_TESTING').length,
    stock: arr.filter(x=>x.status==='STOCK').length
  };
}
function activeOcc(data,bayId,section){ return data.o.find(x=>x.bay_id===bayId && x.section===section); }
function unitForOcc(data,o){ return o && data.u.find(u=>u.id===o.unit_id); }
async function getTimers(){
  const d = {core_heatrun_seconds:120,booster_heatrun_seconds:60,sts_heatrun_seconds:120};
  const r = await sb.from('tqr_settings').select('*');
  if(!r.error) (r.data||[]).forEach(x=>{ if(x.setting_key in d) d[x.setting_key]=Number(x.setting_value); });
  return d;
}
function stateOf(u){ return Array.isArray(u?.tqr_stage_state) ? u.tqr_stage_state[0] : u?.tqr_stage_state; }
async function fetchUnitByQr(qr){
  const r = await sb.from('tqr_units').select('*,tqr_stage_state(*)').eq('qr_code',qr).maybeSingle();
  if(r.error) throw r.error;
  return r.data;
}
function directScan(qr){ location.href = `scan.html?qr=${encodeURIComponent(qr)}`; }


function mountScanHeader(){
  applyPortalViewClass();
  if(isPublicPortalView()){ setPortalView('testing'); return; }
  const e=$('#topbar'); if(!e)return;
  e.innerHTML=`<div class="brand brand-image"><img src="trinergy-brand-banner.png" alt="TRINERGY QR Testing Tracker"></div><div class="scan-mini-nav"><a class="navtab" href="index.html">← Dashboard</a><a class="navtab" href="active.html">Active UPS</a></div><div class="navright"><span class="live-dot"></span><span class="live-label">Live</span></div>`; mountVersionBadge();
}
let _rtTimers={};
function realtimeWatch(name,tables,callback,delay=180){
  const ch=sb.channel('rt-'+name+'-'+Math.random().toString(36).slice(2,7));
  tables.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},()=>{clearTimeout(_rtTimers[name]);_rtTimers[name]=setTimeout(callback,delay)}));
  ch.subscribe(); return ch;
}

function fullSerial(u){
  if(!u) return '';
  const raw=String(u.serial_number||'').trim();
  if(!raw) return '';
  if(/^\d{6}T(?:2X|3X|ST|STS|TST)\d{4}$/i.test(raw)) return raw.toUpperCase();

  const dt=u.received_at||u.created_at||new Date().toISOString();
  const d=new Date(dt);
  const ym = Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0,7).replace('-','')
    : `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;

  let suffix='';
  const m=raw.match(/(\d{4})$/);
  if(m) suffix=m[1];
  else return raw;

  const t=String(u.ups_type||'').toUpperCase();
  const code=t==='2X'?'T2X':t==='3X'?'T3X':'TST';
  return `${ym}${code}${suffix}`;
}

function faultSerialClass(u){return u?.faulted?' faulted-serial':''}
function runningTimedEvent(u){const s=stateOf(u)||{};return ['core_heatrun','booster_1','booster_2','booster_3'].find(k=>s[k+'_started']&&!s[k+'_passed'])||null}
function timedEventLabel(k){return k==='core_heatrun'?'Core Heatrun':k?k.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):''}
function startPolling(name,callback,ms=2500){if(window['_poll_'+name])clearInterval(window['_poll_'+name]);window['_poll_'+name]=setInterval(()=>{if(document.visibilityState==='visible')callback()},ms)}

function savePageCache(key,value){try{localStorage.setItem('tqr_cache_'+key,JSON.stringify({ts:Date.now(),value}))}catch{}}
function loadPageCache(key,maxAge=3600000){try{const x=JSON.parse(localStorage.getItem('tqr_cache_'+key)||'null');return x&&Date.now()-x.ts<maxAge?x.value:null}catch{return null}}
function debounceAsync(fn,wait=250){let t=null;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}

function bayActiveOccupancy(data,bayId){return data.o.filter(o=>o.bay_id===bayId)}
function coreBayFreeSlot(data,bayId){
  const used=new Set(bayActiveOccupancy(data,bayId).map(o=>o.section));
  if(!used.has('SLOT1'))return 'SLOT1';
  if(!used.has('SLOT2'))return 'SLOT2';
  return null;
}
function coreBayHasCapacity(data,bayId){return !!coreBayFreeSlot(data,bayId)}
function coreBayLabel(section){return section==='SLOT1'?'Slot 1':section==='SLOT2'?'Slot 2':section}

// PWA registration / install support — v6.14.4
let deferredPwaInstallPrompt=null;
let pwaInstallState='checking';

function isStandalonePwa(){
  return window.matchMedia?.('(display-mode: standalone)').matches ||
         window.navigator.standalone===true ||
         document.referrer.startsWith('android-app://');
}
function isEmbeddedBrowser(){
  const ua=navigator.userAgent||'';
  return /Teams|FBAN|FBAV|Instagram|Line\/|wv\)|; wv|WebView/i.test(ua);
}
function pwaInstallButton(){
  return document.querySelector('.pwa-install-btn');
}
function setPwaButton(label,hidden=false){
  const b=pwaInstallButton();
  if(!b)return;
  b.textContent=label;
  b.classList.toggle('hidden',!!hidden);
}
function siteUrl(){
  return `${location.origin}${location.pathname.replace(/[^/]*$/,'')}`;
}

if('serviceWorker' in navigator){
  let pwaRegistration=null;
  let pwaReloading=false;

  const activateWaitingWorker=reg=>{
    if(reg?.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
  };

  const wireAutoUpdate=reg=>{
    activateWaitingWorker(reg);

    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){
          worker.postMessage({type:'SKIP_WAITING'});
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(pwaReloading)return;
      pwaReloading=true;
      const key='trinergy-auto-update-reload';
      if(sessionStorage.getItem(key)!=='1'){
        sessionStorage.setItem(key,'1');
        showUpdateNotice();
        setTimeout(()=>location.reload(),1100);
      }else{
        sessionStorage.removeItem(key);
      }
    });
  };

  const checkPwaUpdate=()=>pwaRegistration?.update().then(()=>activateWaitingWorker(pwaRegistration)).catch(()=>{});

  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
      pwaRegistration=reg;
      wireAutoUpdate(reg);
      await checkPwaUpdate();
      pwaInstallState=isStandalonePwa()?'installed':'ready';
      if(isStandalonePwa()) setPwaButton('Installed',true);

      // Keep long-running laptop / PWA sessions fresh during factory use.
      setInterval(checkPwaUpdate,15*1000);
    }catch(err){
      pwaInstallState='sw-error';
      console.warn('PWA service worker registration failed',err);
    }
  });

  // Always check immediately when a user returns to an open app/tab.
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') checkPwaUpdate();
  });
  window.addEventListener('focus',checkPwaUpdate);
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPwaInstallPrompt=e;
  pwaInstallState='installable';
  document.documentElement.classList.add('pwa-install-available');
  setPwaButton('Install App');
});

window.addEventListener('appinstalled',()=>{
  deferredPwaInstallPrompt=null;
  pwaInstallState='installed';
  document.documentElement.classList.remove('pwa-install-available');
  setPwaButton('Installed',true);
  showToast('Trinergy app installed successfully');
});

function closePwaInstallModal(){
  document.querySelector('.pwa-install-modal')?.remove();
}
function copyTrackerLink(){
  const url=location.href.split('?')[0].split('#')[0];
  navigator.clipboard?.writeText(url).then(()=>showToast('Tracker link copied')).catch(()=>{});
}
function downloadDesktopShortcut(){
  const root=siteUrl();
  const text=`[InternetShortcut]\r\nURL=${root}\r\nIconFile=${root}favicon.ico\r\nIconIndex=0\r\n`;
  const blob=new Blob([text],{type:'application/internet-shortcut'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='Trinergy QR Testing Tracker.url';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('Desktop shortcut downloaded — open it or move it to Desktop');
}
function showPwaInstallHelp(){
  closePwaInstallModal();
  const embedded=isEmbeddedBrowser();
  const modal=document.createElement('div');
  modal.className='pwa-install-modal';
  modal.innerHTML=`<div class="pwa-install-card">
    <button class="pwa-modal-close" aria-label="Close">×</button>
    <div class="pwa-install-icon"><img src="icon-192.png" alt=""></div>
    <h2>Install Trinergy QR Tracker</h2>
    ${embedded?`<div class="pwa-alert"><b>Open this page in Chrome or Microsoft Edge first.</b><br>This page is currently inside an embedded browser, which does not offer PWA installation.</div>`:''}
    <div class="pwa-install-steps">
      <div><b>Chrome / Windows</b><span>⋮ → Cast, save and share → <strong>Install Trinergy QR Testing Tracker</strong></span></div>
      <div><b>Microsoft Edge</b><span>⋯ → Apps → <strong>Install this site as an app</strong></span></div>
      <div><b>Desktop shortcut</b><span>If your browser still hides Install, download the shortcut below and keep it on Desktop.</span></div>
    </div>
    <div class="pwa-modal-actions">
      <button class="green" id="pwaShortcutBtn">Download Desktop Shortcut</button>
      <button class="secondary" id="pwaCopyBtn">Copy Website Link</button>
    </div>
    <small class="muted">For the full standalone app experience, Chrome/Edge installation is preferred.</small>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('.pwa-modal-close').onclick=closePwaInstallModal;
  modal.onclick=e=>{if(e.target===modal)closePwaInstallModal()};
  modal.querySelector('#pwaShortcutBtn').onclick=downloadDesktopShortcut;
  modal.querySelector('#pwaCopyBtn').onclick=copyTrackerLink;
}

async function installTrinergyPwa(){
  if(isStandalonePwa()){
    showToast('Trinergy app is already installed');
    return;
  }
  if(deferredPwaInstallPrompt){
    try{
      deferredPwaInstallPrompt.prompt();
      const choice=await deferredPwaInstallPrompt.userChoice;
      if(choice?.outcome==='accepted'){
        setPwaButton('Installing…');
      }else{
        showPwaInstallHelp();
      }
    }catch{
      showPwaInstallHelp();
    }finally{
      deferredPwaInstallPrompt=null;
    }
    return;
  }
  showPwaInstallHelp();
}
window.installTrinergyPwa=installTrinergyPwa;

function addPwaInstallButton(){
 const bar=document.querySelector('#topbar');
 if(!bar||bar.querySelector('.pwa-install-btn')||isStandalonePwa())return;
 const btn=document.createElement('button');
 btn.className='pwa-install-btn';
 btn.type='button';
 btn.textContent='Install App';
 btn.title='Install Trinergy QR Tracker on this device';
 btn.onclick=installTrinergyPwa;
 bar.appendChild(btn);
}
window.addEventListener('load',()=>setTimeout(addPwaInstallButton,250));

async function checkPublishedAppVersion(){
 try{
   const r=await fetch(`./version.json?_=${Date.now()}`,{cache:'no-store'});
   if(!r.ok)return;
   const j=await r.json();
   const latest=String(j.version||'').trim();
   if(!latest||latest===TQR_APP_VERSION)return;
   const key='trinergy-pending-version';
   if(sessionStorage.getItem(key)===latest)return;
   sessionStorage.setItem(key,latest);
   showUpdateNotice();
   try{
     const reg=await navigator.serviceWorker?.getRegistration('./');
     if(reg){
       await reg.update().catch(()=>{});
       if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
     }
   }catch(e){}
   setTimeout(()=>location.reload(),700);
 }catch(e){}
}
window.addEventListener('load',()=>{
 setTimeout(checkPublishedAppVersion,1200);
 setInterval(checkPublishedAppVersion,15000);
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')checkPublishedAppVersion();
});
window.addEventListener('focus',checkPublishedAppVersion);


window.addEventListener('load',()=>setTimeout(mountVersionBadge,350));

window.addEventListener('DOMContentLoaded',applyPortalViewClass);
