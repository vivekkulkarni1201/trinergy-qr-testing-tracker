
mountTopbar('parking');let rows=[],coreData=null;
function freeDestinations(d,u){
 const opts=[];
 if(u.ups_type==='STS'){
   [['STS_TEST','STS_TEST'],['STS_HEATRUN','STS_HEATRUN']].forEach(([kind,section])=>{
     d.b.filter(b=>b.active!==false&&b.bay_kind===kind&&!d.o.some(o=>o.bay_id===b.id)).forEach(b=>opts.push({bay:b,section,label:`${b.bay_name} · ${section.replace('_',' ')}`}));
   });
 }else{
   d.b.filter(b=>b.active!==false&&b.bay_kind==='CORE'&&coreBayHasCapacity(d,b.id)).forEach(b=>opts.push({bay:b,section:coreBayFreeSlot(d,b.id),label:`${b.bay_name} (${bayActiveOccupancy(d,b.id).length}/2)`}));
 }
 return opts;
}
async function boot(){
 const prev={};$$('[id^="pb_"]').forEach(x=>prev[x.id]=x.value);
 coreData=await loadCore();rows=coreData.u.filter(u=>u.parked);
 $('#parkingBody').innerHTML=rows.map(u=>{const free=freeDestinations(coreData,u);return `<tr><td><a class="serial-link${faultSerialClass(u)}" href="scan.html?qr=${encodeURIComponent(u.qr_code)}">${esc(u.serial_number||u.qr_code)}</a></td><td>${u.ups_type}</td><td>${esc(u.parked_from_stage||u.current_stage)}</td><td>${u.parked_at?new Date(u.parked_at).toLocaleString():'—'}</td><td><select id="pb_${u.id}"><option value="">Select destination...</option>${free.map(x=>`<option value="${x.bay.id}|${x.section}">${esc(x.label)}</option>`).join('')}</select> <button onclick="resume('${u.id}')">Move & Resume</button></td></tr>`}).join('')||'<tr><td colspan="5">Parking area empty.</td></tr>';
 Object.entries(prev).forEach(([id,v])=>{const el=$('#'+id);if(el&&[...el.options].some(o=>o.value===v))el.value=v});
}
async function resume(id){
 const u=rows.find(x=>x.id===id),v=$('#pb_'+id).value;if(!u)return;if(!v)return showToast('Select destination');
 const [bay_id,section]=v.split('|'),now=nowIso();
 const bay=coreData.b.find(b=>b.id===bay_id);if(!bay)return showToast('Bay not found');
 if(u.ups_type==='STS'&&!['STS_TEST','STS_HEATRUN'].includes(section))return showToast('TST/STS can move only to STS bays');
 if(u.ups_type!=='STS'&&bay.bay_kind!=='CORE')return showToast('2X/3X can move only to Core Test Bays');
 await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',id).is('released_at',null);
 const ins=await sb.from('tqr_bay_occupancy').insert({bay_id,section,unit_id:id});if(ins.error)return showToast(ins.error.message);
 const r=await sb.from('tqr_units').update({parked:false,parked_at:null,status:'UNDER_TESTING',current_stage:u.parked_from_stage||u.current_stage}).eq('id',id);
 if(r.error)return showToast(r.error.message);
 await sb.from('tqr_stage_history').insert({unit_id:id,action:'RE-ENTRY',stage:'FROM PARKING AREA',result:'IN_PROGRESS',notes:`Moved to ${bay.bay_name}`});
 showToast('UPS moved to selected bay');await boot();
}
window.resume=resume;boot().catch(e=>showToast(e.message));realtimeWatch('parking',['tqr_units','tqr_bay_occupancy','tqr_stage_history'],debounceAsync(()=>boot().catch(()=>{}),350));
