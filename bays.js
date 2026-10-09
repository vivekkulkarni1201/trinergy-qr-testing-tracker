
mountTopbar('bays');
let data;
async function timerText(u){
  const s=stateOf(u); if(!s)return'';
  const k=['core_heatrun','booster_1','booster_2','booster_3'].find(k=>s[k+'_started']&&!s[k+'_passed']); if(!k)return'';
  const t=await getTimers(), dur=k==='core_heatrun'?(u.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;
  const left=Math.max(0,dur-Math.floor((Date.now()-new Date(s[k+'_started_at']))/1000));
  return left?`⏱ ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`:'Timer Complete';
}
async function render(){
  data=await loadCore();
  $('#bayGrid').innerHTML=data.b.filter(b=>b.active!==false).map(b=>{
    const secs=b.bay_kind==='CORE'?['LV','HV']:[b.bay_kind==='STS_TEST'?'STS_TEST':'STS_HEATRUN'];
    return `<div class="bay-card"><div class="bay-title"><h3>${esc(b.bay_name)}</h3></div><div class="bay-sections">${secs.map(sec=>{
      const u=unitForOcc(data,activeOcc(data,b.id,sec));
      const timed=u?runningTimedEvent(u):null;return `<div class="bay-slot ${u?'occupied':'empty'} ${timed?'timed':''}" ${u?`data-qr="${esc(u.qr_code)}"`:''}><div class="slot-head"><span class="slot-tag">${sec.replace('_',' ')}</span><i class="slot-dot"></i></div>${u?`<div class="slot-serial${faultSerialClass(u)}">${esc((u.serial_number||'----').slice(-4))}<small>${u.ups_type}</small></div><div class="slot-stage">${esc(u.current_stage||'')}</div><div class="slot-timer" data-t="${u.id}"></div>`:`<div class="available">Available<br><small>Ready for assignment</small></div>`}</div>`;
    }).join('')}</div></div>`;
  }).join('');
  $$('[data-qr]').forEach(x=>x.onclick=()=>directScan(x.dataset.qr));
  await ticks();
}
async function ticks(){for(const el of $$('[data-t]')){const u=data.u.find(x=>x.id===el.dataset.t);el.textContent=await timerText(u)}}
render().catch(e=>showToast(e.message)); setInterval(()=>data&&ticks(),1000);

realtimeWatch('bays',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],()=>render());

startPolling('bays',()=>render().catch(()=>{}),5000);
