
mountTopbar('active');
function latestHistoryForUnit(d,unitId){
  return (d.h||[]).filter(h=>String(h.unit_id)===String(unitId)&&tqrIsActualUpdateEvent(h)).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0]||null;
}
async function boot(){
  const d=await loadCore(), rows=d.u.filter(x=>x.status==='UNDER_TESTING'||x.status==='RECEIVED');
  const head=document.querySelector('.table thead tr');
  if(head)head.innerHTML='<th>Serial</th><th>Type</th><th>Current Stage</th><th>Bay</th><th>Latest Updated By</th><th>Received</th>';
  $('#activeBody').innerHTML=rows.map(u=>{
    const o=d.o.find(x=>x.unit_id===u.id), b=d.b.find(x=>x.id===o?.bay_id), last=latestHistoryForUnit(d,u.id);
    const who=last?.engineer_name||'—';
    const when=last?.created_at?new Date(last.created_at).toLocaleString():'';
    return `<tr><td><a class="serial-link" href="scan.html?qr=${encodeURIComponent(u.qr_code)}"><span class="${faultSerialClass(u)}">${esc(fullSerial(u)||u.qr_code)}</span></a></td><td>${u.ups_type}</td><td>${esc(u.current_stage||u.status)}</td><td>${esc(b?.bay_name||'—')}${b?.bay_kind==='CORE'?'':o?.section?' · '+esc(o.section.replace('_',' ')):''}</td><td><span class="latest-updater">${esc(who)}</span>${when?`<small class="latest-updated-at">${esc(when)}</small>`:''}</td><td>${new Date(u.received_at).toLocaleString()}</td></tr>`;
  }).join('')||'<tr><td colspan="6">No active UPS.</td></tr>';
}
boot().catch(e=>showToast(e.message));
realtimeWatch('active',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],()=>boot());
startPolling('active',()=>boot().catch(()=>{}),5000);
