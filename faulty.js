
mountTopbar('faulty');document.body.classList.add('faulty-page');let units=[],coreData=null;
function stageOptions(u){
 if(u.ups_type==='STS')return [['STS_TEST','STS Test'],['STS_HEATRUN','STS Heatrun'],['PARAMETERS_480V','480V / Parameters']];
 const a=[['LV','LV / Hi-Pot'],['HV','HV Testing'],['CORE_HEATRUN','Core Heatrun'],['BOOSTER_1','Booster 1'],['BOOSTER_2','Booster 2']];
 if(u.ups_type==='3X')a.push(['BOOSTER_3','Booster 3']);a.push(['PARAMETERS_480V','480V / Parameters']);return a;
}
function destinations(u,stage){
 if(u.ups_type==='STS'){
   const kind=stage==='STS_TEST'?'STS_TEST':'STS_HEATRUN',section=kind;
   return coreData.b.filter(b=>b.active!==false&&b.bay_kind===kind&&!coreData.o.some(o=>o.bay_id===b.id)).map(b=>({bay:b,section,label:b.bay_name}));
 }
 return coreData.b.filter(b=>b.active!==false&&b.bay_kind==='CORE'&&coreBayHasCapacity(coreData,b.id)).map(b=>({bay:b,section:coreBayFreeSlot(coreData,b.id),label:`${b.bay_name} (${bayActiveOccupancy(coreData,b.id).length}/2)`}));
}
function fillBay(id){
 const u=units.find(x=>x.id===id),stage=$('#rs_'+id).value,free=destinations(u,stage),el=$('#rb_'+id);
 el.innerHTML='<option value="">Select compatible bay...</option>'+free.map(x=>`<option value="${x.bay.id}|${x.section}">${esc(x.label)}</option>`).join('');
}
async function boot(){
 coreData=await loadCore();units=coreData.u.filter(u=>u.status==='RTA');
 const body=$('#faultBody'),tableEl=body?.closest('table'),headRow=tableEl?.querySelector('thead tr');
 if(headRow)headRow.innerHTML='<th>Serial</th><th>Type</th><th>Faulted At</th><th>Last Stage</th><th>Fault Remarks</th><th>Re-entry</th>';
 body.innerHTML=units.map(u=>`<tr><td data-label="Serial" class="faulted-serial">${esc(u.serial_number||u.qr_code)}</td><td data-label="Type">${u.ups_type}</td><td data-label="Faulted At">${u.faulted_at?new Date(u.faulted_at).toLocaleString():'—'}</td><td data-label="Last Stage">${esc(u.current_stage)}</td><td data-label="Fault Remarks" class="fault-remarks-cell">${esc(u.fault_remarks||'—')}</td><td data-label="Re-entry" class="fault-reentry-cell"><select id="rs_${u.id}" onchange="fillBay('${u.id}')">${stageOptions(u).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select><select id="rb_${u.id}" class="fault-bay-select"></select><button class="danger" onclick="reenter('${u.id}')">RE-ENTER TESTING</button></td></tr>`).join('')||'<tr><td colspan="6">No faulty UPS.</td></tr>';
 units.forEach(u=>fillBay(u.id));
}
async function reenter(id){
 const u=units.find(x=>x.id===id),stage=$('#rs_'+id).value,bv=$('#rb_'+id).value;
 if(!u)return showToast('Faulty UPS record not found');
 if(!bv)return showToast('Select compatible bay');

 // Re-read live data before movement so a stale page cannot double-book a bay.
 coreData=await loadCore();
 const fresh=coreData.u.find(x=>x.id===id);
 if(!fresh || fresh.status!=='RTA'){
   showToast('UPS is no longer in Faulty Area');
   return boot();
 }

 const [bay_id_raw,section]=bv.split('|');
 const bay=coreData.b.find(b=>String(b.id)===String(bay_id_raw));
 if(!bay)return showToast('Selected bay is no longer available');

 if(fresh.ups_type==='STS'){
   const expectedKind=stage==='STS_TEST'?'STS_TEST':'STS_HEATRUN';
   if(!['STS_TEST','STS_HEATRUN'].includes(expectedKind) || bay.bay_kind!==expectedKind)
     return showToast('Select a compatible STS bay');
   if(coreData.o.some(o=>String(o.bay_id)===String(bay.id)))
     return showToast('Selected STS bay is already occupied');
 }else{
   if(bay.bay_kind!=='CORE')return showToast('2X/3X can re-enter only to Core Test Bays');
   const liveFree=coreBayFreeSlot(coreData,bay.id);
   if(!liveFree)return showToast('Selected Core bay is now full');
   if(section!==liveFree)return showToast('Bay slot changed — reselect destination');
 }

 const bay_id=bay.id,p={},now=nowIso(),zero=k=>{p[k+'_started']=false;p[k+'_started_at']=null;p[k+'_passed']=false;p[k+'_passed_at']=null};
 if(u.ups_type==='STS'){
   if(stage==='STS_TEST'){p.lv_passed=false;p.hipot_passed=false;p.hv_started=false;p.hv_passed=false;zero('core_heatrun');p.parameters_480v_saved=false}
   else if(stage==='STS_HEATRUN'){zero('core_heatrun');p.parameters_480v_saved=false}
   else p.parameters_480v_saved=false;
 }else{
   if(stage==='LV'){p.lv_passed=false;p.hipot_passed=false;p.hv_started=false;p.hv_passed=false;zero('core_heatrun');zero('booster_1');zero('booster_2');zero('booster_3');p.parameters_480v_saved=false}
   else if(stage==='HV'){p.hv_started=false;p.hv_passed=false;zero('core_heatrun');zero('booster_1');zero('booster_2');zero('booster_3');p.parameters_480v_saved=false}
   else if(stage==='CORE_HEATRUN'){zero('core_heatrun');zero('booster_1');zero('booster_2');zero('booster_3');p.parameters_480v_saved=false}
   else if(stage==='BOOSTER_1'){zero('booster_1');zero('booster_2');zero('booster_3');p.parameters_480v_saved=false}
   else if(stage==='BOOSTER_2'){zero('booster_2');zero('booster_3');p.parameters_480v_saved=false}
   else if(stage==='BOOSTER_3'){zero('booster_3');p.parameters_480v_saved=false}
   else p.parameters_480v_saved=false;
 }
 let r=await sb.from('tqr_stage_state').update(p).eq('unit_id',id);if(r.error)return showToast(r.error.message);
 await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',id).is('released_at',null);
 r=await sb.from('tqr_bay_occupancy').insert({bay_id,section,unit_id:id});if(r.error)return showToast(r.error.message);
 const label=u.ups_type==='STS'?(stage==='STS_TEST'?'STS TEST RE-ENTRY':stage==='STS_HEATRUN'?'STS HEATRUN RE-ENTRY':'480V RE-ENTRY'):`RE-ENTRY FROM ${stage}`;
 r=await sb.from('tqr_units')
   .update({status:'UNDER_TESTING',current_stage:label,parked:false})
   .eq('id',id)
   .eq('status','RTA')
   .select('id,status');
 if(r.error)return showToast(r.error.message);
 if(!r.data?.length){
   await sb.from('tqr_bay_occupancy').update({released_at:nowIso()}).eq('unit_id',id).is('released_at',null);
   showToast('Re-entry cancelled — UPS state changed');
   return boot();
 }
 try{await tqrAuditLog(id,'RE-ENTRY',label,'IN_PROGRESS')}catch(e){return showToast(e.message||'Audit log failed')}
 showToast('UPS moved out of Faulty Area and re-entered testing');
 await boot();
}
Object.assign(window,{fillBay,reenter});boot().catch(e=>showToast(e.message));realtimeWatch('faulty',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],debounceAsync(()=>boot().catch(()=>{}),350));
