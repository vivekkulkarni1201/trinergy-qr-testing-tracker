
mountTopbar('dashboard');
let data, selectedMonth = ym(), kpiAssets={};
function monthParts(){const [y,m]=selectedMonth.split('-').map(Number);return {y,m};}
function monthLabel(){const {y,m}=monthParts();return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});}
function shiftMonth(delta){
  let {y,m}=monthParts();
  m += delta;
  while(m<1){m+=12;y--}
  while(m>12){m-=12;y++}
  selectedMonth=`${y}-${String(m).padStart(2,'0')}`;
  $('#monthLabel').textContent=monthLabel();
  renderPerformance();
}
function flagSvg(){
 return `<svg class="flag-svg" viewBox="0 0 90 64" aria-label="finish flag">
 <path d="M12 58V6" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
 <path d="M15 7 C27 1 36 13 48 7 C60 1 69 13 81 7 L81 38 C69 44 60 32 48 38 C36 44 27 32 15 38 Z" fill="#fff"/>
 <defs><pattern id="chk" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="white"/><rect width="6" height="6" fill="#111"/><rect x="6" y="6" width="6" height="6" fill="#111"/></pattern></defs>
 <path d="M15 7 C27 1 36 13 48 7 C60 1 69 13 81 7 L81 38 C69 44 60 32 48 38 C36 44 27 32 15 38 Z" fill="url(#chk)"/>
 </svg>`;
}
function kpiHtml(type, cls){
  const c=counts(data,type,ym()), p=c.target?Math.round(c.completed/c.target*100):0;
  return `<div class="kpi ${cls}">
    <div class="kpi-top">
      <div class="kpi-title"><h1>${type}</h1><b>TRINERGY ${type==='3X'?'T3X':type==='2X'?'T2X':'STS'}</b></div>
      <div class="donut" style="--pct:${Math.min(100,p)}"><div><strong>${p}%</strong><small>Completed</small></div></div>
      <div class="kpi-product">${kpiAssets[type]?`<img src="${esc(kpiAssets[type])}" alt="${type}">`:`<div class="racks"><span class="rack"></span><span class="rack"></span><span class="rack"></span></div>`}</div>
    </div>
    <div class="kpi-stats">
      <div class="metric target"><span>🎯 Target</span><b>${c.target}</b></div>
      <div class="metric received"><span>▣ Received</span><b>${c.received}</b></div>
      <div class="metric completed"><span>✓ Completed</span><b>${c.completed}</b></div>
      <div class="metric testing"><span>⚙ Under Testing</span><b>${c.under}</b></div>
      <div class="metric stock"><span>◇ Buffer Stock</span><b>${c.stock}</b></div>
    </div>
  </div>`;
}
function renderKpis(){
  $('#kpiGrid').innerHTML = kpiHtml('3X','blue')+kpiHtml('2X','green')+kpiHtml('STS','purple');
}
function renderPerformance(){
  $('#monthLabel').textContent=monthLabel();
  $('#performance').innerHTML=['3X','2X','STS'].map(t=>{
    const c=counts(data,t,selectedMonth), p=c.target?Math.min(100,Math.round(c.completed/c.target*100)):0;
    return `<div class="prog-row"><strong>${t}</strong><div class="prog-wrap">
      <div class="prog-meta"><span>Completed <b>${c.completed}</b> / Target <b>${c.target}</b></span><span>${p}%</span></div>
      <div class="bar"><i style="width:${p}%"></i></div></div><div class="flag">${flagSvg()}</div></div>`;
  }).join('');
}
function renderToday(){
  const d=new Date(), day=d.toISOString().slice(0,10);
  $('#todayDate').textContent=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  $('#todayBody').innerHTML=['3X','2X','STS'].map(t=>{
    const rec=data.u.filter(x=>x.ups_type===t && x.received_at?.slice(0,10)===day).length;
    const comp=data.u.filter(x=>x.ups_type===t && x.completed_at?.slice(0,10)===day).length;
    const under=data.u.filter(x=>x.ups_type===t && x.status==='UNDER_TESTING').length;
    const stock=data.u.filter(x=>x.ups_type===t && x.status==='STOCK').length;
    return `<tr><th>${t}</th><td class="r">${rec}</td><td class="c">${comp}</td><td class="u">${under}</td><td class="s">${stock}</td></tr>`;
  }).join('');
}
async function timerText(u){
  const s=stateOf(u); if(!s) return '';
  const key=['core','booster_1','booster_2','booster_3'].find(k=>s[k+'_started']&&!s[k+'_passed']); if(!key)return'';
  const timers=await getTimers(), dur=key==='core'?(u.ups_type==='STS'?timers.sts_heatrun_seconds:timers.core_heatrun_seconds):timers.booster_heatrun_seconds;
  const left=Math.max(0,dur-Math.floor((Date.now()-new Date(s[key+'_started_at']).getTime())/1000));
  return `${left? '⏱ '+String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0') : 'Timer Complete'}`;
}
async function renderBays(){
  const bays=data.b.filter(b=>b.active!==false);
  $('#bayGrid').innerHTML=bays.map(b=>{
    const secs=b.bay_kind==='CORE'?['LV','HV']:[b.bay_kind==='STS_TEST'?'STS_TEST':'STS_HEATRUN'];
    return `<div class="bay-card" onclick="location.href='bays.html?bay=${b.id}'"><div class="bay-title"><h3>${esc(b.bay_name)}</h3></div><div class="bay-sections">${
      secs.map(sec=>{
        const u=unitForOcc(data,activeOcc(data,b.id,sec));
        return `<div class="bay-slot ${u?'occupied':'empty'}" ${u?`data-qr="${esc(u.qr_code)}"`:''}>
          <div class="slot-head"><span class="slot-tag">${sec.replace('_',' ')}</span><i class="slot-dot"></i></div>
          ${u?`<div class="slot-serial${faultSerialClass(u)}">${esc((u.serial_number||'----').slice(-4))}<small>${u.ups_type}</small></div><div class="slot-stage">${esc(u.current_stage||'')}</div><div class="slot-timer" data-timer="${u.id}"></div>`:`<div class="available">Available<br><small>Ready for assignment</small></div>`}
        </div>`;
      }).join('')
    }</div></div>`;
  }).join('');
  $$('[data-qr]').forEach(x=>x.onclick=e=>{e.stopPropagation();directScan(x.dataset.qr)});
  await refreshTimers();
}
async function refreshTimers(){
  for(const el of $$('[data-timer]')){
    const u=data.u.find(x=>x.id===el.dataset.timer); el.textContent=await timerText(u);
  }
}

function weekBounds(month,w){const [y,m]=month.split('-').map(Number),start=(w-1)*7+1,end=Math.min(w*7,new Date(y,m,0).getDate());return {start,end}}
function renderWeekly(){const month=ym(),w=Number($('#weekSelect')?.value||1),{start,end}=weekBounds(month,w);const types=['3X','2X','STS'];$('#weeklyGraph').innerHTML=types.map(t=>{const monthly=counts(data,t,month),target=Math.round(monthly.target/5),actual=data.u.filter(u=>u.ups_type===t&&u.status==='COMPLETED'&&monthOf(u.completed_at)===month&&Number(u.completed_at.slice(8,10))>=start&&Number(u.completed_at.slice(8,10))<=end).length,max=Math.max(target,actual,1),tp=Math.round(target/max*100),ap=Math.round(actual/max*100);return `<div class=\"week-type\"><div class=\"week-name\">${t}<small>${start}-${end}</small></div><div class=\"week-bars\"><div class=\"weekbar target\" style=\"--h:${tp}%\"><span>${target}</span></div><div class=\"weekbar actual\" style=\"--h:${ap}%\"><span>${actual}</span></div></div><div class=\"week-legend\"><span>Target</span><span>Completed</span></div></div>`}).join('')}

async function boot(){
  const qr=new URLSearchParams(location.search).get('qr');
  if(qr){ location.replace(`scan.html?qr=${encodeURIComponent(qr)}`); return; }
  data=await loadCore();const ar=await sb.from('tqr_ui_assets').select('*');if(!ar.error)(ar.data||[]).forEach(x=>{if(x.asset_key.startsWith('kpi_'))kpiAssets[x.asset_key.slice(4)]=x.public_url});renderKpis(); renderPerformance(); renderToday(); await renderBays(); await renderWeekly();
  setInterval(refreshTimers,1000);
}
$('#prevMonth').onclick=()=>shiftMonth(-1); $('#nextMonth').onclick=()=>shiftMonth(1); $('#weekSelect').onchange=renderWeekly;
boot().catch(e=>showToast(e.message));

realtimeWatch('dashboard',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history','tqr_monthly_targets'],async()=>{data=await loadCore();renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly()});
