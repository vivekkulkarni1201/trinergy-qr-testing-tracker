mountTopbar('parking');let rows=[],coreData=null;
function secFor(u){const st=(u.parked_from_stage||u.current_stage||'').toUpperCase();if(u.ups_type==='STS')return st.includes('HEATRUN')?'STS_HEATRUN':'STS_TEST';return st.includes('LV')||st.includes('HI-POT')?'LV':'HV'}
function freeBays(d,u){const sec=secFor(u);return d.b.filter(b=>b.active!==false&&((sec==='LV'||sec==='HV')?b.bay_kind==='CORE':sec==='STS_TEST'?b.bay_kind==='STS_TEST':b.bay_kind==='STS_HEATRUN')&&!d.o.some(o=>o.bay_id===b.id&&o.section===sec)).map(b=>({...b,section:sec}))}
async function boot(){
 const prev={};$$('[id^="pb_"]').forEach(x=>prev[x.id]=x.value);
 coreData=await loadCore();rows=coreData.u.filter(u=>u.parked);
 $('#parkingBody').innerHTML=rows.map(u=>{const free=freeBays(coreData,u);return `<tr><td><a class="serial-link${faultSerialClass(u)}" href="scan.html?qr=${encodeURIComponent(u.qr_code)}">${esc(u.serial_number||u.qr_code)}</a></td><td>${u.ups_type}</td><td>${esc(u.parked_from_stage||u.current_stage)}</td><td>${u.parked_at?new Date(u.parked_at).toLocaleString():'—'}</td><td><select id="pb_${u.id}"><option value="">Select empty compatible bay...</option>${free.map(b=>`<option value="${b.id}|${b.section}">${esc(b.bay_name)} · ${b.section}</option>`).join('')}</select> <button onclick="resume('${u.id}')">Move to Bay & Resume</button></td></tr>`}).join('')||'<tr><td colspan="5">Parking area empty.</td></tr>';
 Object.entries(prev).forEach(([id,v])=>{const el=$('#'+id);if(el&&[...el.options].some(o=>o.value===v))el.value=v});
}
async function resume(id){
 const u=rows.find(x=>x.id===id),v=$('#pb_'+id).value;
 if(!u)return;
 if(!v)return showToast('Select an empty compatible bay');
 const [bay_id,section]=v.split('|'),now=nowIso();

 // Safety: a parked UPS must not still have an active occupancy.
 const clr=await sb.from('tqr_bay_occupancy')
   .update({released_at:now})
   .eq('unit_id',id)
   .is('released_at',null);
 if(clr.error)return showToast(clr.error.message);

 const ins=await sb.from('tqr_bay_occupancy').insert({bay_id,section,unit_id:id});
 if(ins.error)return showToast('Bay assignment failed: '+ins.error.message);

 const r=await sb.from('tqr_units')
   .update({parked:false,parked_at:null,status:'UNDER_TESTING',current_stage:u.parked_from_stage||u.current_stage})
   .eq('id',id);
 if(r.error){
   // rollback the just-created active occupancy if the unit update fails
   await sb.from('tqr_bay_occupancy').update({released_at:nowIso()}).eq('unit_id',id).is('released_at',null);
   return showToast(r.error.message);
 }

 await sb.from('tqr_stage_history').insert({
   unit_id:id,action:'RE-ENTRY',stage:'FROM PARKING AREA',result:'IN_PROGRESS',
   notes:`Assigned to ${section}`
 });
 showToast('UPS assigned to selected bay');
 await boot();
}
window.resume=resume;boot().catch(e=>showToast(e.message));realtimeWatch('parking',['tqr_units','tqr_bay_occupancy','tqr_stage_history'],boot);