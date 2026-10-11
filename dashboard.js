
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
function racingCarSvg(){
  return `<svg viewBox="0 0 120 48" aria-hidden="true">
    <path d="M18 31h5l8-13h38l13 7h18c6 0 10 4 10 9v2H18z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="38" cy="37" r="8" fill="#061827" stroke="currentColor" stroke-width="4"/>
    <circle cx="88" cy="37" r="8" fill="#061827" stroke="currentColor" stroke-width="4"/>
    <path d="M43 18l8-9h22l13 16" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
  </svg>`;
}
function renderPerformance(){
  $('#monthLabel').textContent=monthLabel();
  $('#performance').innerHTML=`<div class="race-board">${['3X','2X','STS'].map(t=>{
    const c=counts(data,t,selectedMonth);
    const p=c.target?Math.min(100,Math.round(c.completed/c.target*100)):0;
    const pending=Math.max(0,c.target-c.completed);
    const cls=t==='3X'?'race-blue':t==='2X'?'race-green':'race-purple';
    const carPos=Math.max(2,Math.min(94,p));
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
          <div class="race-car" style="left:${carPos}%">${racingCarSvg()}</div>
          <div class="race-finish"><div class="race-wave-flag" aria-label="finish flag"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>
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
function renderToday(){
 const d=new Date(),day=d.toISOString().slice(0,10);$('#todayDate').textContent=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
 $('#todayBody').innerHTML=['3X','2X','STS'].map(t=>{const rec=data.u.filter(x=>x.ups_type===t&&x.received_at?.slice(0,10)===day).length,comp=data.u.filter(x=>x.ups_type===t&&x.completed_at?.slice(0,10)===day).length,under=data.u.filter(x=>x.ups_type===t&&x.status==='UNDER_TESTING').length,heat=data.u.filter(x=>x.ups_type===t&&x.status==='UNDER_TESTING'&&runningTimedEvent(x)).length,stock=data.u.filter(x=>x.ups_type===t&&x.status==='STOCK').length;return `<tr><th>${t}</th><td class="r">${rec}</td><td class="c">${comp}</td><td class="u">${under}</td><td class="h">${heat}</td><td class="s">${stock}</td></tr>`}).join('');
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

function calendarWeeks(month){const [y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate(),w=[];let d=1;while(d<=last){if(new Date(y,m-1,d).getDay()===0){d++;continue}const dow=new Date(y,m-1,d).getDay(),end=Math.min(d+(6-dow),last);w.push({start:d,end});d=end+1;if(d<=last&&new Date(y,m-1,d).getDay()===0)d++}return w}
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
 const workdaysMonth=Array.from({length:new Date(y,m,0).getDate()},(_,i)=>i+1).filter(d=>new Date(y,m-1,d).getDay()!==0).length;

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

 const w=weeks[selectedWeek],wd=Array.from({length:w.end-w.start+1},(_,k)=>w.start+k).filter(d=>new Date(y,m-1,d).getDay()!==0).length;

 const cards=['3X','2X','STS'].map(t=>{
   const c=counts(data,t,month);
   const target=wm[`${selectedWeek+1}_${t}`]??Math.round(c.target*wd/Math.max(1,workdaysMonth));
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
            <div class="tank-bubbles"></div>
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

realtimeWatch('dashboard',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history','tqr_monthly_targets'],async()=>{data=await loadCore();savePageCache('dashboard',data);renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly()});

let _dashSig='';
startPolling('dashboard',async()=>{try{
  const fresh=await loadCore();
  const sig=JSON.stringify([fresh.u.map(x=>[x.id,x.status,x.current_stage,x.completed_at,x.stock_at,x.parked,x.faulted]),fresh.o.map(x=>[x.bay_id,x.section,x.unit_id]),fresh.st.map(x=>[x.unit_id,x.core_heatrun_started,x.core_heatrun_passed,x.booster_1_started,x.booster_1_passed,x.booster_2_started,x.booster_2_passed,x.booster_3_started,x.booster_3_passed])]);
  if(sig!==_dashSig){_dashSig=sig;data=fresh;renderKpis();renderPerformance();renderToday();await renderBays();await renderWeekly()}
}catch(e){}},5000);