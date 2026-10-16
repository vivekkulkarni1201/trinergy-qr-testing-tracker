
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
  selectedWeek=null; renderPerformance(); renderWeekly();
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
  const metrics=[
    ['target','🎯 Target',c.target],
    ['received','▣ Received',c.received],
    ['completed','✓ Completed',c.completed],
    ['testing','⚙ Under Testing',c.under]
  ];
  if(!isPublicPortalView()) metrics.push(['stock','◇ Buffer Stock',c.stock]);
  return `<div class="kpi ${cls}">
    <div class="kpi-top">
      <div class="kpi-title"><h1>${type}</h1><b>TRINERGY ${type==='3X'?'T3X':type==='2X'?'T2X':'STS'}</b></div>
      <div class="donut" style="--pct:${Math.min(100,p)}"><div><strong>${p}%</strong><small>Completed</small></div></div>
      <div class="kpi-product">${kpiAssets[type]?`<img src="${esc(kpiAssets[type])}" alt="${type}">`:`<div class="racks"><span class="rack"></span><span class="rack"></span><span class="rack"></span></div>`}</div>
    </div>
    <div class="kpi-stats ${isPublicPortalView()?'public-kpi-stats':''}">
      ${metrics.map(([kind,label,val])=>`<div class="metric ${kind}"><span>${label}</span><b>${val}</b></div>`).join('')}
    </div>
  </div>`;
}
function renderKpis(){
  $('#kpiGrid').innerHTML = kpiHtml('3X','blue')+kpiHtml('2X','green')+kpiHtml('STS','purple');
}
function racingCarSvg(){
  return `<svg viewBox="0 0 216 62" aria-hidden="true" class="f1-car-svg">
    <g class="f1-smoke-group">
      <ellipse class="smoke smoke-1" cx="22" cy="33" rx="15" ry="8"/>
      <ellipse class="smoke smoke-2" cx="10" cy="26" rx="11" ry="6.5"/>
      <ellipse class="smoke smoke-3" cx="31" cy="23" rx="9" ry="5.5"/>
    </g>
    <g class="f1-car-group">
      <path d="M20 41h31l15-7h25l-1 7H20z" class="f1-wing"/>
      <path d="M34 32h27l7-7h22l-3 7H34z" class="f1-body-dark"/>
      <path d="M46 43c8-7 13-13 22-18h29l5 18H46z" class="f1-body"/>
      <path d="M86 22l21-12h24c6 0 11 1 15 4l11 8h20l17 5-8 6h-33l-8 10H91l-2-9H73l4-6h14l4-6z" class="f1-body"/>
      <path d="M103 18l12-8h19l6 2-5 8z" class="f1-body-dark"/>
      <path d="M147 21h21l10 4-4 4h-24z" class="f1-wing"/>
      <path d="M158 42h32l12 4h-39z" class="f1-wing"/>
      <path d="M95 19h24c4 0 7 4 7 8v3H92l3-11z" class="f1-cockpit"/>
      <path d="M112 18l9-6 9 1-2 5z" class="f1-cockpit"/>
      <path d="M118 19h10l8 2h-18z" class="f1-intake"/>
      <rect x="86" y="34" width="32" height="3" rx="1.5" class="f1-white-line"/>
      <rect x="154" y="26" width="16" height="2.5" rx="1.25" class="f1-white-line"/>
      <rect x="60" y="38" width="20" height="2.5" rx="1.25" class="f1-white-line"/>
      <path d="M82 25h35l4 10H78z" class="f1-sidepod-highlight"/>
      <g class="f1-shield-group" transform="translate(108 24)">
        <path d="M0 2 L11 0 L22 2 L20 16 L11 21 L2 16 Z" class="f1-shield"/>
        <path d="M2 3h18l-1 3H3z" class="f1-shield-top"/>
        <text x="11" y="14" text-anchor="middle" class="f1-shield-text">SF</text>
      </g>
      <circle cx="72" cy="46" r="12" class="f1-tire"/>
      <circle cx="72" cy="46" r="5.2" class="f1-rim"/>
      <circle cx="154" cy="46" r="12" class="f1-tire"/>
      <circle cx="154" cy="46" r="5.2" class="f1-rim"/>
      <circle cx="46" cy="46" r="10" class="f1-tire"/>
      <circle cx="46" cy="46" r="4.2" class="f1-rim"/>
      <circle cx="182" cy="46" r="10" class="f1-tire"/>
      <circle cx="182" cy="46" r="4.2" class="f1-rim"/>
      <path d="M66 24h8l-4 6h-8z" class="f1-flash"/>
      <path d="M145 18h11l6 2h-15z" class="f1-flash"/>
    </g>
  </svg>`;
}

function renderPerformance(){
  $('#monthLabel').textContent=monthLabel();
  $('#performance').innerHTML=`<div class="race-board">${['3X','2X','STS'].map(t=>{
    const c=counts(data,t,selectedMonth);
    const p=c.target?Math.min(100,Math.round(c.completed/c.target*100)):0;
    const pending=Math.max(0,c.target-c.completed);
    const cls=t==='3X'?'race-blue':t==='2X'?'race-green':'race-purple';
    const carPos=6+(Math.max(0,Math.min(100,p))*0.86);
    return `<div class="race-row ${cls}">
      <div class="race-type">
        <span class="race-type-name">${t}</span>
        <small>TRINERGY</small>
      </div>
      <div class="race-main">
        <div class="race-numbers"><b>${c.completed}</b><span>/</span><b>${c.target}</b><em>Pending ${pending}</em></div>
        <div class="race-track">
          <div class="race-progress" style="width:${p}%"></div>
          <div class="race-dashes"></div>
          <div class="race-car" data-progress="${p}" style="left:${carPos.toFixed(2)}%">${racingCarSvg()}</div>
          <div class="race-finish">
  <svg class="race-chequered-flag" viewBox="0 0 52 38" aria-label="finish flag" role="img">
    <g class="flag-wave">
      <path class="flag-bg" d="M7 5 C17 1, 27 9, 43 4 L43 25 C29 29, 20 20, 7 25 Z"/>
      <g class="flag-checks">
        <path d="M8 5.5 L16.5 4.1 L16.5 11.6 L8 12.7 Z"/>
        <path d="M25 4.8 L33.5 5.4 L33.5 13 L25 12.1 Z"/>
        <path d="M16.5 11.6 L25 12.1 L25 19.4 L16.5 18.7 Z"/>
        <path d="M33.5 13 L42 11.9 L42 19.1 L33.5 20 Z"/>
        <path d="M8 19.5 L16.5 18.7 L16.5 25.3 L8 25.2 Z"/>
        <path d="M25 19.4 L33.5 20 L33.5 27.1 L25 25.8 Z"/>
      </g>
    </g>
  </svg>
</div>
        </div>
      </div>
      <div class="race-percent">
        <strong>${p}%</strong>
        <small>COMPLETE</small>
        <div><i style="width:${p}%"></i></div>
      </div>
    </div>`;
  }).join('')}</div>`;
}
function localDayKey(value){
 const d=value instanceof Date?value:new Date(value);
 if(Number.isNaN(d.getTime()))return '';
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}

function renderTodayHeader(){
  const head=$('.today-table thead tr');
  if(!head) return;
  head.innerHTML=`<th>Type</th><th class="r">Received</th><th class="c">Completed</th><th class="u">Under Testing</th><th class="h">Under Heatrun</th>${isPublicPortalView()?'':'<th class="s">Buffer Stock</th>'}`;
}
function renderToday(){
 const now=new Date(),today=localDayKey(now);
 $('#todayDate').textContent=now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
 renderTodayHeader();
 $('#todayBody').innerHTML=['3X','2X','STS'].map(t=>{
   const rec=data.u.filter(x=>x.ups_type===t&&localDayKey(x.received_at)===today).length;
   const comp=data.u.filter(x=>x.ups_type===t&&localDayKey(x.completed_at)===today).length;
   const under=data.u.filter(x=>x.ups_type===t&&x.status==='UNDER_TESTING').length;
   const heat=data.u.filter(x=>x.ups_type===t&&x.status==='UNDER_TESTING'&&runningTimedEvent(x)).length;
   const stock=data.u.filter(x=>x.ups_type===t&&x.status==='STOCK').length;
   return `<tr><th>${t}</th><td class="r">${rec}</td><td class="c">${comp}</td><td class="u">${under}</td><td class="h">${heat}</td>${isPublicPortalView()?'':`<td class="s">${stock}</td>`}</tr>`;
 }).join('');
}
async function timerText(u){
  const s=stateOf(u); if(!s) return '';
  const key=['core_heatrun','booster_1','booster_2','booster_3'].find(k=>s[k+'_started']&&!s[k+'_passed']); if(!key)return'';
  const timers=await getTimers(), dur=key==='core_heatrun'?(u.ups_type==='STS'?timers.sts_heatrun_seconds:timers.core_heatrun_seconds):timers.booster_heatrun_seconds;
  const left=Math.max(0,dur-Math.floor((Date.now()-new Date(s[key+'_started_at']).getTime())/1000));
  return `${left? '⏱ '+String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0') : 'Timer Complete'}`;
}
async function renderBays(){
 const bays=data.b.filter(b=>b.active!==false),core=bays.filter(b=>b.bay_kind==='CORE');
 const stsTest=bays.filter(b=>b.bay_kind==='STS_TEST'),stsHeat=bays.filter(b=>b.bay_kind==='STS_HEATRUN');
 const coreCard=b=>{
   const secs=['SLOT1','SLOT2'],cap=`${bayActiveOccupancy(data,b.id).length}/2`;
   return `<div class="bay-card" onclick="location.href='bays.html?bay=${b.id}'"><div class="bay-title"><h3>${esc(b.bay_name)}</h3><span class="capacity-chip">${cap}</span></div><div class="bay-sections">${secs.map(sec=>baySlotHtml(b,sec,true)).join('')}</div></div>`;
 };
 const stsGroup=(kind,title,list)=>{
   if(!list.length)return '';
   const section=kind==='STS_TEST'?'STS_TEST':'STS_HEATRUN',used=list.reduce((n,b)=>n+bayActiveOccupancy(data,b.id).length,0);
   return `<div class="bay-card sts-group-card"><div class="bay-title"><h3>${title}</h3><span class="capacity-chip">${used}/${list.length}</span></div><div class="sts-bay-grid">${list.map(b=>`<div class="sts-bay-mini" onclick="location.href='bays.html?bay=${b.id}'"><div class="sts-mini-head"><b>${esc(b.bay_name)}</b><span>${bayActiveOccupancy(data,b.id).length?'1/1':'0/1'}</span></div>${baySlotHtml(b,section,false)}</div>`).join('')}</div></div>`;
 };
 $('#bayGrid').innerHTML=core.map(coreCard).join('')+stsGroup('STS_TEST','STS Test Bays',stsTest)+stsGroup('STS_HEATRUN','STS Heatrun Bays',stsHeat);
 $$('[data-qr]').forEach(x=>x.onclick=e=>{e.stopPropagation();directScan(x.dataset.qr)});
 await refreshTimers();
}
function baySlotHtml(b,sec,isCore){
 const u=unitForOcc(data,activeOcc(data,b.id,sec)),timed=u?runningTimedEvent(u):null;
 return `<div class="bay-slot ${u?'occupied':'empty'} ${timed?'timed':''}" ${u?`data-qr="${esc(u.qr_code)}"`:''}><div class="slot-head"><span class="slot-tag">${isCore?coreBayLabel(sec):(sec==='STS_TEST'?'STS TEST':'STS HEATRUN')}</span><i class="slot-dot"></i></div>${u?`<div class="slot-serial${faultSerialClass(u)}">${esc((u.serial_number||'----').slice(-4))}<small>${u.ups_type}</small></div><div class="slot-stage">${esc(u.current_stage||'')}</div><div class="slot-timer" data-timer="${u.id}"></div>`:`<div class="available">Available</div>`}</div>`;
}
async function refreshTimers(){
  for(const el of $$('[data-timer]')){
    const u=data.u.find(x=>x.id===el.dataset.timer); el.textContent=await timerText(u);
  }
}

function calendarWeeks(month){const [y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate(),weeks=[];let start=1;while(start<=last){const dow=new Date(y,m-1,start).getDay();const daysToSunday=dow===0?0:7-dow;const end=Math.min(start+daysToSunday,last);weeks.push({start,end});start=end+1}return weeks}
let selectedWeek=null;
async function renderWeekly(){
 const month=selectedMonth,weeks=calendarWeeks(month),[y,m]=month.split('-').map(Number),today=new Date(),same=today.getFullYear()===y&&today.getMonth()+1===m;
 let currentIndex=0;
 if(same){
   const day=today.getDate(),found=weeks.findIndex(w=>day>=w.start&&day<=w.end);
   currentIndex=found>=0?found:Math.max(0,weeks.findLastIndex?weeks.findLastIndex(w=>w.end<day):weeks.map(w=>w.end<day).lastIndexOf(true));
 }
 if(selectedWeek===null||selectedWeek>=weeks.length)selectedWeek=currentIndex;

 const wr=await sb.from('tqr_weekly_targets').select('*').eq('month_start',month+'-01');
 const wm=Object.fromEntries((wr.data||[]).map(x=>[`${x.week_no}_${x.ups_type}`,Number(x.target)||0]));
 const calendarDaysMonth=new Date(y,m,0).getDate();

 const monShort=new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short'});
 const dateLabel=w=>`${w.start}–${w.end} ${monShort}`;

 const monthOptions=[];
 const base=new Date(y,m-1,1);
 for(let d=-6;d<=6;d++){
   const x=new Date(base.getFullYear(),base.getMonth()+d,1);
   const val=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;
   monthOptions.push(`<option value="${val}" ${val===month?'selected':''}>${x.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</option>`);
 }
 const weekOptions=weeks.map((w,i)=>`<option value="${i}" ${i===selectedWeek?'selected':''}>W${i+1} · ${dateLabel(w)}${same&&i===currentIndex?' · Current':''}</option>`).join('');

 if($('#weeklyMonthLabel')){
   $('#weeklyMonthLabel').innerHTML=`<div class="weekly-drop-controls">
     <label class="weekly-select-shell"><span>▣</span><select id="weeklyMonthSelect">${monthOptions.join('')}</select><i>⌄</i></label>
     <label class="weekly-select-shell week-select"><span>W</span><select id="weeklyWeekSelect">${weekOptions}</select><i>⌄</i></label>
   </div>`;
   $('#weeklyMonthSelect').onchange=e=>{
     selectedMonth=e.target.value;
     selectedWeek=null;
     $('#monthLabel').textContent=monthLabel();
     renderPerformance();
     renderWeekly();
   };
   $('#weeklyWeekSelect').onchange=e=>{
     selectedWeek=Number(e.target.value);
     renderWeekly();
   };
 }

 const w=weeks[selectedWeek],weekDays=w.end-w.start+1;

 const cards=['3X','2X','STS'].map(t=>{
   const c=counts(data,t,month);
   const target=wm[`${selectedWeek+1}_${t}`]??Math.round(c.target*weekDays/Math.max(1,calendarDaysMonth));
   const actual=data.u.filter(u=>u.ups_type===t&&u.status==='COMPLETED'&&monthOf(u.completed_at)===month&&Number(u.completed_at.slice(8,10))>=w.start&&Number(u.completed_at.slice(8,10))<=w.end).length;
   const pending=Math.max(0,target-actual),pct=target?Math.round(actual/target*100):(actual?100:0),fill=Math.min(100,pct),cls=t==='3X'?'blue':t==='2X'?'green':'purple';

   return `<article class="weekly-neon-card ${cls}">
      <div class="weekly-neon-top">
        <div class="weekly-neon-name"><span>TRINERGY</span><b>${t}</b></div>
        <div class="weekly-neon-percent"><strong>${pct}%</strong><small>COMPLETED</small></div>
      </div>

      <div class="weekly-neon-content">
        <div class="weekly-tank-wrap">
          <div class="weekly-tank">
            <div class="tank-neck"></div>
            <div class="tank-glass"></div>
            <div class="tank-liquid" style="height:${fill}%"><i></i></div>
            <div class="tank-bubbles" style="height:${fill}%;opacity:${fill>0?.78:0}"></div>
            <div class="tank-value"><b>${actual}/${target}</b><small>COMPLETED</small></div>
          </div>
          <div class="tank-base"></div>
        </div>

        <div class="weekly-stat-stack">
          <div class="weekly-stat-box"><span class="stat-icon">◎</span><span>Weekly<br>Target</span><b>${target}</b></div>
          <div class="weekly-stat-box"><span class="stat-icon">✓</span><span>Completed</span><b>${actual}</b></div>
          <div class="weekly-stat-box"><span class="stat-icon">⌛</span><span>Pending</span><b>${pending}</b></div>
        </div>
      </div>

      <div class="weekly-neon-progress"><i style="width:${fill}%"></i><b>${pct}%</b></div>
   </article>`;
 }).join('');

 $('#weeklyGraph').innerHTML=`<div class="weekly-neon-grid tanks-only">${cards}</div>`;
}
async function boot(){
  const cached=loadPageCache('dashboard',1800000);
  if(cached){try{data=cached;renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly()}catch{}}
  const qr=new URLSearchParams(location.search).get('qr');
  if(qr){ location.replace(`scan.html?qr=${encodeURIComponent(qr)}`); return; }
  data=await loadCore();savePageCache('dashboard',data);const ar=await sb.from('tqr_ui_assets').select('*');if(!ar.error)(ar.data||[]).forEach(x=>{if(x.asset_key.startsWith('kpi_'))kpiAssets[x.asset_key.slice(4)]=x.public_url});renderKpis(); renderPerformance(); renderToday(); await renderBays(); await renderWeekly();
  setInterval(refreshTimers,1000);
}
$('#prevMonth').onclick=()=>shiftMonth(-1); $('#nextMonth').onclick=()=>shiftMonth(1);
boot().catch(e=>showToast(e.message));

async function loadDashboardDynamic(){
  const [u,o,st]=await Promise.all([
    table('tqr_units'),
    table('tqr_bay_occupancy'),
    table('tqr_stage_state')
  ]);
  const sm=Object.fromEntries(st.map(x=>[x.unit_id,x]));
  u.forEach(x=>x.tqr_stage_state=sm[x.id]||null);
  return {...data,u,o:o.filter(x=>!x.released_at),st};
}
async function refreshDashboardDynamic(){
  const fresh=await loadDashboardDynamic();
  data=fresh;
  savePageCache('dashboard',data);
  renderKpis();
  renderPerformance();
  renderToday();
  await renderBays();
  await renderWeekly();
}

// Fast path for normal factory activity: only 3 live tables are fetched.
realtimeWatch('dashboard-fast',['tqr_units','tqr_stage_state','tqr_bay_occupancy'],refreshDashboardDynamic,60);

// Slow/static changes (targets, bay master, opening counts) still perform a full reload.
realtimeWatch('dashboard-static',['tqr_monthly_targets','tqr_month_opening_counts','tqr_bays'],async()=>{
  data=await loadCore();
  savePageCache('dashboard',data);
  renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly();
},120);

let _dashSig='';
startPolling('dashboard',async()=>{try{
  const fresh=await loadDashboardDynamic();
  const sig=JSON.stringify([
    fresh.u.map(x=>[x.id,x.status,x.current_stage,x.received_at,x.completed_at,x.stock_at,x.parked,x.faulted]),
    fresh.o.map(x=>[x.bay_id,x.section,x.unit_id]),
    fresh.st.map(x=>[x.unit_id,x.core_heatrun_started,x.core_heatrun_passed,x.booster_1_started,x.booster_1_passed,x.booster_2_started,x.booster_2_passed,x.booster_3_started,x.booster_3_passed])
  ]);
  if(sig!==_dashSig){
    _dashSig=sig;
    data=fresh;
    renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly();
  }
}catch(e){}},5000);