
mountTopbar('bays');
let data;
async function timerText(u){
 const st=stateOf(u);if(!st)return'';const k=runningTimedEvent(u);if(!k)return'';
 const t=await getTimers(),dur=k==='core_heatrun'?(u.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;
 const left=Math.max(0,dur-Math.floor((Date.now()-new Date(st[k+'_started_at']))/1000));
 return left?`⏱ ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`:'Timer Complete';
}
async function render(){
 data=await loadCore();
 const bays=data.b.filter(b=>b.active!==false),core=bays.filter(b=>b.bay_kind==='CORE'),stsTest=bays.filter(b=>b.bay_kind==='STS_TEST'),stsHeat=bays.filter(b=>b.bay_kind==='STS_HEATRUN');
 const slot=(b,sec,isCore)=>{const u=unitForOcc(data,activeOcc(data,b.id,sec)),timed=u?runningTimedEvent(u):null;return `<div class="bay-slot ${u?'occupied':'empty'} ${timed?'timed':''}" ${u?`data-qr="${esc(u.qr_code)}"`:''}><div class="slot-head"><span class="slot-tag">${isCore?coreBayLabel(sec):(sec==='STS_TEST'?'STS TEST':'STS HEATRUN')}</span><i class="slot-dot"></i></div>${u?`<div class="slot-serial${faultSerialClass(u)}">${esc((u.serial_number||'----').slice(-4))}<small>${u.ups_type}</small></div><div class="slot-stage">${esc(u.current_stage||'')}</div><div class="slot-timer" data-t="${u.id}"></div>`:`<div class="available">Available</div>`}</div>`};
 const coreCard=b=>`<div class="bay-card"><div class="bay-title"><h3>${esc(b.bay_name)}</h3><span class="capacity-chip">${bayActiveOccupancy(data,b.id).length}/2</span></div><div class="bay-sections">${['SLOT1','SLOT2'].map(sec=>slot(b,sec,true)).join('')}</div></div>`;
 const group=(kind,title,list)=>{if(!list.length)return'';const sec=kind==='STS_TEST'?'STS_TEST':'STS_HEATRUN',used=list.reduce((n,b)=>n+bayActiveOccupancy(data,b.id).length,0);return `<div class="bay-card sts-group-card"><div class="bay-title"><h3>${title}</h3><span class="capacity-chip">${used}/${list.length}</span></div><div class="sts-bay-grid">${list.map(b=>`<div class="sts-bay-mini"><div class="sts-mini-head"><b>${esc(b.bay_name)}</b><span>${bayActiveOccupancy(data,b.id).length?'1/1':'0/1'}</span></div>${slot(b,sec,false)}</div>`).join('')}</div></div>`};
 $('#bayGrid').innerHTML=core.map(coreCard).join('')+group('STS_TEST','STS Test Bays',stsTest)+group('STS_HEATRUN','STS Heatrun Bays',stsHeat);
 $$('[data-qr]').forEach(x=>x.onclick=()=>directScan(x.dataset.qr));await ticks();
}
async function ticks(){for(const el of $$('[data-t]')){const u=data.u.find(x=>x.id===el.dataset.t);if(el)el.textContent=await timerText(u)}}
render().catch(e=>showToast(e.message));setInterval(()=>data&&ticks(),1000);
realtimeWatch('bays',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],debounceAsync(()=>render().catch(()=>{}),300));
startPolling('bays',()=>render().catch(()=>{}),8000);
