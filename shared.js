
const sb = supabase.createClient(TQR_CONFIG.SUPABASE_URL, TQR_CONFIG.SUPABASE_KEY);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ym = d => (d || new Date()).toISOString().slice(0,7);
const nowIso = () => new Date().toISOString();

function showToast(msg){
  const t = $('#toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'), 2800);
}
function navHtml(active){
  const items = [
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
  return `<div class="brand brand-rich"><div class="brand-watermark"></div><span class="brandmark">◆</span><div><b>TRINERGY</b><small>QR TESTING TRACKER</small></div></div>
  <nav class="navtabs">${items.map(([id,href,icon,label])=>`<a class="navtab ${active===id?'active':''}" href="${href}"><span>${icon}</span>${label}</a>`).join('')}</nav>
  <div class="navright"><span class="live-dot"></span><span class="live-label">Live</span><div class="clockbox"><span id="dateNow"></span><b id="timeNow"></b></div></div>`;
}
function mountTopbar(active){
  const e = $('#topbar'); if(!e) return;
  e.innerHTML = navHtml(active);
  const tick = ()=>{
    const d = new Date();
    const date = $('#dateNow'), time = $('#timeNow');
    if(date) date.textContent = d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    if(time) time.textContent = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };
  tick(); setInterval(tick,1000);
}
async function table(name, select='*'){
  const r = await sb.from(name).select(select);
  if(r.error) throw r.error;
  return r.data || [];
}
async function loadCore(){
  const [u,t,b,o,h] = await Promise.all([
    table('tqr_units'),
    table('tqr_monthly_targets'),
    table('tqr_bays'),
    table('tqr_bay_occupancy'),
    table('tqr_stage_history')
  ]);
  return {u,t,b,o:o.filter(x=>!x.released_at),h};
}
function monthOf(v){ return v ? String(v).slice(0,7) : ''; }
function counts(data,type,m){
  const arr = data.u.filter(x=>x.ups_type===type);
  const target = Number(data.t.find(x=>x.ups_type===type && monthOf(x.month_start)===m)?.target || 0);
  return {
    target,
    received: arr.filter(x=>monthOf(x.received_at)===m).length,
    completed: arr.filter(x=>x.status==='COMPLETED' && monthOf(x.completed_at)===m).length,
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
  const e=$('#topbar'); if(!e)return;
  e.innerHTML=`<div class="brand brand-rich"><div class="brand-watermark"></div><span class="brandmark">◆</span><div><b>TRINERGY</b><small>UPS TEST CONTROL</small></div></div><div class="scan-mini-nav"><a class="navtab" href="index.html">← Dashboard</a><a class="navtab" href="active.html">Active UPS</a></div><div class="navright"><span class="live-dot"></span><span class="live-label">Live</span></div>`;
}
let _rtTimers={};
function realtimeWatch(name,tables,callback,delay=180){
  const ch=sb.channel('rt-'+name+'-'+Math.random().toString(36).slice(2,7));
  tables.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},()=>{clearTimeout(_rtTimers[name]);_rtTimers[name]=setTimeout(callback,delay)}));
  ch.subscribe(); return ch;
}
function faultSerialClass(u){return u?.faulted?' faulted-serial':''}
