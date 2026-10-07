
mountTopbar('');
let current=null,currentEngineer=null,timerTicker=null;
async function engineers(){
 const r=await sb.from('tqr_engineers').select('*').eq('active',true).order('engineer_name'); return r.data||[];
}
async function liveUnits(){
 const r=await sb.from('tqr_units').select('*').in('status',['RECEIVED','UNDER_TESTING']).order('received_at'); return r.data||[];
}
async function loadDropdown(){
 const s=$('#liveUps'); const list=await liveUnits();
 s.innerHTML='<option value="">Select Live UPS...</option>'+list.map(u=>`<option value="${esc(u.qr_code)}">${esc(u.serial_number||u.qr_code)} · ${u.ups_type} · ${esc(u.current_stage)}</option>`).join('');
}
function sstate(){return stateOf(current)||{}}
function heatDone(s,u){return s.core_heatrun_passed&&(u.ups_type==='STS'||(s.booster_1_passed&&s.booster_2_passed&&(u.ups_type!=='3X'||s.booster_3_passed)))}
async function openQR(){
 const code=$('#qr').value.trim(); if(!code)return;
 const u=await fetchUnitByQr(code); current=u;
 if(!u){renderNew(code);return;} await renderUnit();
}
function renderNew(code){
 $('#unitbox').innerHTML=`<div class="panel"><div class="panel-body"><span class="muted">NEW QR</span><h2>${esc(code)}</h2><p>First scan records Received only.</p><div class="actions">${['3X','2X','STS'].map(t=>`<button onclick="receive('${t}')">${t} — Receive</button>`).join('')}</div></div></div>`;
}
async function receive(type){
 const code=$('#qr').value.trim();
 let r=await sb.from('tqr_units').insert({qr_code:code,ups_type:type,status:'RECEIVED',current_stage:'RECEIVED'});
 if(r.error)return showToast(r.error.message);
 const u=(await sb.from('tqr_units').select('id').eq('qr_code',code).single()).data;
 await sb.from('tqr_stage_history').insert({unit_id:u.id,action:'RECEIVED',stage:'RECEIVED',result:'PASS'});
 showToast(type+' received'); await openQR(); await loadDropdown();
}
async function renderUnit(){
 clearInterval(timerTicker);
 const s=sstate(), eng=await engineers();
 const steps=[['Received',true],['LV',s.lv_passed],['Hi-Pot',s.hipot_passed],['HV',s.hv_passed],['Heatrun',heatDone(s,current)],['480V',s.parameters_480v_saved],['Finish',current.status==='COMPLETED']];
 $('#unitbox').innerHTML=`<div class="panel unit-card">
  <div class="unit-head"><div><span class="muted">${esc(current.qr_code)}</span><div class="serial-big">${esc(current.serial_number||'Serial pending')} <small>• ${current.ups_type}</small></div><div>${esc(current.current_stage)}</div></div>
  <label>Authorized Engineer<br><select id="engineer"><option value="">Select Engineer</option>${eng.map(e=>`<option value="${e.id}" data-name="${esc(e.engineer_name)}">${esc(e.engineer_name)}${e.employee_id?' · '+esc(e.employee_id):''}</option>`).join('')}</select></label></div>
  <div class="steps">${steps.map(x=>`<div class="step ${x[1]?'done':''}">${x[1]?'✓ ':''}${x[0]}</div>`).join('')}</div><div id="actions" class="actions"></div></div>`;
 $('#engineer').onchange=e=>{const o=e.target.selectedOptions[0];currentEngineer=e.target.value?{id:e.target.value,name:o.dataset.name}:null;renderActions()};
 renderActions();
}
function needEng(){if(!currentEngineer){showToast('Select ACTIVE engineer first');return false}return true}
async function log(action,stage,result='PASS'){await sb.from('tqr_stage_history').insert({unit_id:current.id,action,stage,result,engineer_id:currentEngineer?.id||null,engineer_name:currentEngineer?.name||null})}
async function chooseCore(section){
 const d=await loadCore(), free=d.b.filter(b=>b.active!==false&&b.bay_kind==='CORE'&&!d.o.some(o=>o.bay_id===b.id&&o.section===section));
 if(!free.length){showToast('No '+section+' bay available');return null}
 const msg=free.map((b,i)=>`${i+1}. ${b.bay_name}`).join('\n'), n=prompt(`Select ${section} bay:\n${msg}`,'1'); return free[Number(n)-1]||null;
}
async function reload(){current=await fetchUnitByQr(current.qr_code);await renderUnit();await loadDropdown()}
function heatBox(k,label,s){
 if(s[k+'_passed'])return `<div class="action"><h4>${label}</h4><b style="color:#26e798">✓ PASSED</b></div>`;
 if(!s[k+'_started'])return `<div class="action"><h4>${label}</h4><button onclick="heatStart('${k}')">Start Timer</button></div>`;
 return `<div class="action timerbox" data-key="${k}"><h4>${label}</h4><div class="timer-readout">Loading…</div><button class="green timerpass" onclick="heatPass('${k}')" disabled>Timer Running</button></div>`;
}
function renderActions(){
 const s=sstate(), a=[];
 if(current.status==='RECEIVED')a.push(`<div class="action"><h4>Start Testing</h4><button onclick="startLV()">Assign Serial + Start LV</button></div>`);
 else if(!s.lv_passed)a.push(`<div class="action"><h4>LV / Hi-Pot</h4><button class="green" onclick="hipot()">LV Complete + Hi-Pot PASS</button></div>`);
 else if(!s.hv_started)a.push(`<div class="action"><h4>HV</h4><button onclick="startHV()">Select HV Bay & Start</button></div>`);
 else{
  if(!s.hv_passed)a.push(`<div class="action"><h4>HV</h4><button class="green" onclick="hvPass()">Mark HV PASSED</button></div>`);
  a.push(heatBox('core','Core Heatrun',s));
  if(current.ups_type!=='STS'){a.push(heatBox('booster_1','Booster 1',s));a.push(heatBox('booster_2','Booster 2',s));if(current.ups_type==='3X')a.push(heatBox('booster_3','Booster 3',s))}
  if(heatDone(s,current)&&!s.parameters_480v_saved)a.push(`<div class="action"><h4>480V / Parameters</h4><button class="green" onclick="params()">Save / Mark Passed</button></div>`);
  if(s.parameters_480v_saved)a.push(`<div class="action"><h4>Final Exit</h4><button class="green" onclick="exitUnit('COMPLETED')">TO FINISHING</button> <button class="warn" onclick="exitUnit('STOCK')">BUFFER STOCK</button></div>`);
 }
 $('#actions').innerHTML=a.join(''); startTimerUi(s);
}
async function startLV(){if(!needEng())return;const b=await chooseCore('LV');if(!b)return;if(!current.serial_number){const r=await sb.rpc('tqr_assign_serial',{p_unit_id:current.id});if(r.error)return showToast(r.error.message)}
 const now=nowIso();let r=await sb.from('tqr_bay_occupancy').insert({bay_id:b.id,section:'LV',unit_id:current.id});if(r.error)return showToast(r.error.message);
 await sb.from('tqr_units').update({status:'UNDER_TESTING',current_stage:'LV TESTING IN PROGRESS',testing_started_at:now}).eq('id',current.id);await log('START','LV','IN_PROGRESS');reload()}
async function hipot(){if(!needEng())return;const now=nowIso();await sb.from('tqr_stage_state').update({lv_passed:true,lv_passed_at:now,hipot_passed:true,hipot_passed_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HI-POT PASSED'}).eq('id',current.id);await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).eq('section','LV').is('released_at',null);await log('PASS','LV + HI-POT');reload()}
async function startHV(){if(!needEng())return;const b=await chooseCore('HV');if(!b)return;const now=nowIso(),r=await sb.from('tqr_bay_occupancy').insert({bay_id:b.id,section:'HV',unit_id:current.id});if(r.error)return showToast(r.error.message);await sb.from('tqr_stage_state').update({hv_started:true,hv_started_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HV IN PROGRESS'}).eq('id',current.id);await log('START','HV','IN_PROGRESS');reload()}
async function hvPass(){if(!needEng())return;const now=nowIso();await sb.from('tqr_stage_state').update({hv_passed:true,hv_passed_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HV PASSED'}).eq('id',current.id);await log('PASS','HV');reload()}
async function heatStart(k){if(!needEng())return;const p={};p[k+'_started']=true;p[k+'_started_at']=nowIso();let r=await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id).select();if(r.error)return showToast(r.error.message);const label=k==='core'?'CORE HEATRUN':k.replaceAll('_',' ').toUpperCase()+' HEATRUN';await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('START',label,'IN_PROGRESS');reload()}
async function startTimerUi(s){clearInterval(timerTicker);const t=await getTimers(), tick=()=>$$('.timerbox').forEach(box=>{const k=box.dataset.key,start=s[k+'_started_at'];if(!start)return;const dur=k==='core'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds,left=Math.max(0,dur-Math.floor((Date.now()-new Date(start))/1000)),r=box.querySelector('.timer-readout'),b=box.querySelector('.timerpass');r.textContent=left?`Remaining ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`:'Timer Complete — Check UPS';b.disabled=left>0;b.textContent=left?'Timer Running':'Check UPS & Mark Passed'});tick();timerTicker=setInterval(tick,1000)}
async function heatPass(k){if(!needEng())return;const s=sstate(),t=await getTimers(),dur=k==='core'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;if(Date.now()-new Date(s[k+'_started_at'])<dur*1000)return showToast('Timer still running');const p={};p[k+'_passed']=true;p[k+'_passed_at']=nowIso();await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id);const label=k==='core'?'CORE HEATRUN PASSED':k.replaceAll('_',' ').toUpperCase()+' HEATRUN PASSED';await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('PASS',label);reload()}
async function params(){if(!needEng())return;await sb.from('tqr_stage_state').update({parameters_480v_saved:true,parameters_480v_saved_at:nowIso()}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'480V / PARAMETERS SAVED'}).eq('id',current.id);await log('PASS','480V / PARAMETERS');reload()}
async function exitUnit(status){if(!needEng())return;const now=nowIso();await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);const p=status==='COMPLETED'?{status,current_stage:'TO FINISHING / COMPLETED',completed_at:now}:{status,current_stage:'BUFFER STOCK',stock_at:now};await sb.from('tqr_units').update(p).eq('id',current.id);await log('EXIT',status==='COMPLETED'?'TO FINISHING':'BUFFER STOCK');reload()}
Object.assign(window,{receive,startLV,hipot,startHV,hvPass,heatStart,heatPass,params,exitUnit});
$('#loadQr').onclick=openQR;$('#openLive').onclick=()=>{const q=$('#liveUps').value;if(!q)return;$('#qr').value=q;openQR()};$('#qr').onkeydown=e=>{if(e.key==='Enter')openQR()};
(async()=>{await loadDropdown();const q=new URLSearchParams(location.search).get('qr');if(q){$('#qr').value=q;openQR()}})().catch(e=>showToast(e.message));
