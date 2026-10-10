
mountTopbar('faulty');let units=[],coreData=null;
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
 coreData=await loadCore();units=coreData.u.filter(u=>u.status==='RTA'||u.faulted);
 $('#faultBody').innerHTML=units.map(u=>`<tr><td class="faulted-serial">${esc(u.serial_number||u.qr_code)}</td><td>${u.ups_type}</td><td>${u.faulted_at?new Date(u.faulted_at).toLocaleString():'—'}</td><td>${esc(u.current_stage)}</td><td><select id="rs_${u.id}" onchange="fillBay('${u.id}')">${stageOptions(u).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select><select id="rb_${u.id}" class="fault-bay-select"></select><button class="danger" onclick="reenter('${u.id}')">RE-ENTER TESTING</button></td></tr>`).join('')||'<tr><td colspan="5">No faulty UPS.</td></tr>';
 units.forEach(u=>fillBay(u.id));
}
async function reenter(id){
 const u=units.find(x=>x.id===id),stage=$('#rs_'+id).value,bv=$('#rb_'+id).value;if(!bv)return showToast('Select compatible bay');
 const [bay_id,section]=bv.split('|'),p={},now=nowIso(),zero=k=>{p[k+'_started']=false;p[k+'_started_at']=null;p[k+'_passed']=false;p[k+'_passed_at']=null};
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
 r=await sb.from('tqr_units').update({status:'UNDER_TESTING',current_stage:label,parked:false}).eq('id',id);if(r.error)return showToast(r.error.message);
 await sb.from('tqr_stage_history').insert({unit_id:id,action:'RE-ENTRY',stage:label,result:'IN_PROGRESS'});
 showToast('UPS re-entered testing');await boot();
}
Object.assign(window,{fillBay,reenter});boot().catch(e=>showToast(e.message));realtimeWatch('faulty',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],debounceAsync(()=>boot().catch(()=>{}),350));
