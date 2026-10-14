
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
 const u=rows.find(x=>String(x.id)===String(id)),v=$('#pb_'+id)?.value;
 if(!u)return showToast('UPS record not found');
 if(!v)return showToast('Select destination');
 const [selectedBayId,section]=v.split('|'),now=nowIso();

 // HTML <select> values are always strings, while Supabase may return bay IDs as numbers.
 // Compare normalized IDs, then use the real DB bay.id for the occupancy insert.
 let bay=coreData.b.find(b=>String(b.id)===String(selectedBayId));
 if(!bay){
   const freshBays=await table('tqr_bays');
   bay=freshBays.find(b=>String(b.id)===String(selectedBayId));
 }
 if(!bay)return showToast('Selected bay could not be resolved — refresh and try again');

 if(u.ups_type==='STS'&&!['STS_TEST','STS_HEATRUN'].includes(section))return showToast('TST/STS can move only to STS bays');
 if(u.ups_type!=='STS'&&bay.bay_kind!=='CORE')return showToast('2X/3X can move only to Core Test Bays');

 // Re-check the destination immediately before moving so a stale screen cannot double-book a slot.
 const occ=await sb.from('tqr_bay_occupancy').select('id,unit_id').eq('bay_id',bay.id).eq('section',section).is('released_at',null);
 if(occ.error)return showToast(occ.error.message);
 if((occ.data||[]).some(x=>String(x.unit_id)!==String(id)))return showToast('Selected bay slot was just occupied. Please choose another bay.');

 await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',id).is('released_at',null);
 const ins=await sb.from('tqr_bay_occupancy').insert({bay_id:bay.id,section,unit_id:id});if(ins.error)return showToast(ins.error.message);
 const r=await sb.from('tqr_units').update({parked:false,parked_at:null,status:'UNDER_TESTING',current_stage:u.parked_from_stage||u.current_stage}).eq('id',id);
 if(r.error){
   await sb.from('tqr_bay_occupancy').update({released_at:nowIso()}).eq('unit_id',id).is('released_at',null);
   return showToast(r.error.message);
 }
 await sb.from('tqr_stage_history').insert({unit_id:id,action:'RE-ENTRY',stage:'FROM PARKING AREA',result:'IN_PROGRESS',notes:`Moved to ${bay.bay_name}`});
 showToast(`UPS moved to ${bay.bay_name}`);await boot();
}
window.resume=resume;boot().catch(e=>showToast(e.message));realtimeWatch('parking',['tqr_units','tqr_bay_occupancy','tqr_stage_history'],debounceAsync(()=>boot().catch(()=>{}),350));
