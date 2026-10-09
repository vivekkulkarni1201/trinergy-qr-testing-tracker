
mountScanHeader();
let current=null,currentEngineer=null,timerTicker=null;

async function engineers(){const r=await sb.from('tqr_engineers').select('*').eq('active',true).order('engineer_name');return r.data||[]}
async function liveUnits(){const r=await sb.from('tqr_units').select('*').in('status',['RECEIVED','UNDER_TESTING']).order('received_at');return r.data||[]}
async function loadDropdown(){const s=$('#liveUps');if(!s)return;const list=await liveUnits();s.innerHTML='<option value="">Select Live UPS...</option>'+list.map(u=>`<option value="${esc(u.qr_code)}">${esc(u.serial_number||u.qr_code)} · ${u.ups_type} · ${esc(u.current_stage)}</option>`).join('')}
function sstate(){return stateOf(current)||{}}
function runningHeat(s=sstate()){
  return ['core_heatrun','booster_1','booster_2','booster_3'].find(k=>s[k+'_started']&&!s[k+'_passed'])||null;
}
function heatDone(s,u){return s.core_heatrun_passed&&(u.ups_type==='STS'||(s.booster_1_passed&&s.booster_2_passed&&(u.ups_type!=='3X'||s.booster_3_passed)))}
async function lastEngineerForUnit(){
  if(!current)return null;
  const r=await sb.from('tqr_stage_history').select('engineer_id,engineer_name,created_at').eq('unit_id',current.id).not('engineer_name','is',null).order('created_at',{ascending:false}).limit(1);
  if(!r.error&&r.data?.length)return {id:r.data[0].engineer_id,name:r.data[0].engineer_name};
  const saved=localStorage.getItem('tqr_last_engineer');if(saved){try{return JSON.parse(saved)}catch{}}
  return null;
}
async function openQR(){const code=$('#qr').value.trim();if(!code)return;const u=await fetchUnitByQr(code);current=u;if(!u){renderNew(code);return}await renderUnit()}
function renderNew(code){$('#unitbox').innerHTML=`<div class="panel"><div class="panel-body mobile-new"><span class="eyebrow">NEW QR</span><h2>${esc(code)}</h2><p>First scan records Received only.</p><div class="receive-grid">${['3X','2X','STS'].map(t=>`<button onclick="receive('${t}')">${t}<small>Receive UPS</small></button>`).join('')}</div></div></div>`}
async function receive(type){const code=$('#qr').value.trim();let r=await sb.from('tqr_units').insert({qr_code:code,ups_type:type,status:'RECEIVED',current_stage:'RECEIVED'});if(r.error)return showToast(r.error.message);const u=(await sb.from('tqr_units').select('id').eq('qr_code',code).single()).data;await sb.from('tqr_stage_history').insert({unit_id:u.id,action:'RECEIVED',stage:'RECEIVED',result:'PASS'});showToast(type+' received');await openQR();await loadDropdown()}

async function renderUnit(){
 clearInterval(timerTicker);
 const s=sstate(),eng=await engineers(),last=await lastEngineerForUnit();
 if(last && eng.some(e=>e.id===last.id||e.engineer_name===last.name)) currentEngineer=last;
 const isStock=current.status==='STOCK';
 const run=runningHeat(s);
 const steps=[['Received',true],['LV',s.lv_passed],['Hi-Pot',s.hipot_passed],['HV',s.hv_passed],['Heatrun',heatDone(s,current)],['480V',s.parameters_480v_saved],['Buffer Stock',isStock],['Completed',current.status==='COMPLETED']];
 $('#unitbox').innerHTML=`<div class="panel unit-card stage-console">
  <div class="unit-head mobile-unit-head"><div><span class="eyebrow">${esc(current.qr_code)}</span><div class="serial-big${faultSerialClass(current)}">${esc(current.serial_number||'Serial pending')} <small>• ${current.ups_type}</small></div><div class="current-stage-pill">${esc(current.current_stage)}</div></div>
  <label class="engineer-box">Authorized Engineer<select id="engineer"><option value="">Select Engineer</option>${eng.map(e=>`<option value="${e.id}" data-name="${esc(e.engineer_name)}" ${(currentEngineer&&(currentEngineer.id===e.id||currentEngineer.name===e.engineer_name))?'selected':''}>${esc(e.engineer_name)}${e.employee_id?' · '+esc(e.employee_id):''}</option>`).join('')}</select></label></div>
  ${run?`<div class="timer-lock"><b>⏱ Timed Event Running</b><span>${run==='core_heatrun'?'Core Heatrun':run.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())} is active. Other stage changes are locked until timer is completed or UPS is marked faulty.</span></div>`:''}
  ${isStock?`<div class="buffer-banner"><b>◇ BUFFER STOCK</b><span>Testing is complete. Only <strong>To Finishing / Completed</strong> is available.</span></div>`:''}${current.parked?`<div class="parking-banner"><b>P PARKING AREA</b><span>This UPS is temporarily parked. Resume testing to continue from ${esc(current.current_stage||'current stage')}.</span></div>`:''}${current.faulted&&current.status==='RTA'?`<div class="fault-banner"><b>! FAULTY AREA</b><span>UPS is out of testing count. Use Faulty Area page for controlled re-entry.</span></div>`:''}
  <div class="steps mobile-steps">${steps.map(x=>{const locked=!!run&&!x[1]&&x[0]!=='Heatrun';return `<div class="step ${x[1]?'done':''} ${locked?'stage-locked':''}">${x[1]?'✓ ':locked?'🔒 ':''}${x[0]}</div>`}).join('')}</div>
  <div id="actions" class="actions stage-actions"></div></div>`;
 $('#engineer').onchange=e=>{const o=e.target.selectedOptions[0];currentEngineer=e.target.value?{id:e.target.value,name:o.dataset.name}:null;if(currentEngineer)localStorage.setItem('tqr_last_engineer',JSON.stringify(currentEngineer));renderActions()};
 renderActions();
}
function needEng(){if(!currentEngineer){showToast('Select ACTIVE engineer first');return false}return true}
async function log(action,stage,result='PASS',notes=null){await sb.from('tqr_stage_history').insert({unit_id:current.id,action,stage,result,engineer_id:currentEngineer?.id||null,engineer_name:currentEngineer?.name||null,notes})}
async function chooseCore(section){const d=await loadCore(),free=d.b.filter(b=>b.active!==false&&b.bay_kind==='CORE'&&!d.o.some(o=>o.bay_id===b.id&&o.section===section));if(!free.length){showToast('No '+section+' bay available');return null}const msg=free.map((b,i)=>`${i+1}. ${b.bay_name}`).join('\n'),n=prompt(`Select ${section} bay:\n${msg}`,'1');return free[Number(n)-1]||null}
async function reload(){current=await fetchUnitByQr(current.qr_code);await renderUnit();await loadDropdown()}
function heatBox(k,label,s,run){
 if(s[k+'_passed'])return `<div class="action passed"><h4>${label}</h4><b>✓ PASSED</b></div>`;
 if(s[k+'_started'])return `<div class="action timerbox active-timer" data-key="${k}"><h4>${label}</h4><div class="timer-readout">Loading…</div><button class="green timerpass" onclick="heatPass('${k}')" disabled>Timer Running</button></div>`;
 const locked=!!run;
 return `<div class="action ${locked?'locked':''}"><h4>${label}</h4><button ${locked?'disabled':''} onclick="heatStart('${k}')">${locked?'Locked by Running Timer':'Start Timer'}</button></div>`;
}
function renderActions(){
 const s=sstate(),a=[],run=runningHeat(s);
 if(current.status==='RTA'){a.push(`<div class="action fault-card final-only"><h4>Faulty Area</h4><p>This UPS is removed from Under Testing.</p><a class="btn danger" href="faulty.html">OPEN FAULTY AREA</a></div>`);$('#actions').innerHTML=a.join('');return;}
 if(current.parked){a.push(`<div class="action parking-card final-only"><h4>Parking Area</h4><p>Select an empty compatible bay before resuming.</p><a class="btn green big-action" href="parking.html">OPEN PARKING AREA</a></div>`);$('#actions').innerHTML=a.join('');return;}
 if(current.status==='STOCK'){
   a.push(`<div class="action final-only"><h4>Buffer Stock Exit</h4><button class="green big-action" onclick="finishFromStock()">TO FINISHING / COMPLETED</button></div>`);
   $('#actions').innerHTML=a.join('');return;
 }
 if(run){
   a.push(heatBox(run,run==='core_heatrun'?'Core Heatrun':run.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),s,run));
   a.push(`<div class="action fault-card"><h4>Fault / RTA</h4><p>Only fault action is available while timer is running.</p><button class="danger" onclick="markFaulty()">MARK UPS FAULTY</button></div>`);
   $('#actions').innerHTML=a.join('');startTimerUi(s);return;
 }
 if(current.status==='RECEIVED')a.push(`<div class="action primary-stage"><h4>Start Testing</h4><button onclick="startLV()">Assign Serial + Start LV</button></div>`);
 else if(!s.lv_passed)a.push(`<div class="action"><h4>LV / Hi-Pot</h4><button class="green" onclick="hipot()">LV Complete + Hi-Pot PASS</button></div>`);
 else if(!s.hv_started)a.push(`<div class="action"><h4>HV Testing</h4><button onclick="startHV()">Select HV Bay & Start</button></div>`);
 else{
  if(!s.hv_passed)a.push(`<div class="action"><h4>HV Testing</h4><button class="green" onclick="hvPass()">Mark HV PASSED</button></div>`);
  a.push(heatBox('core_heatrun','Core Heatrun',s,run));
  if(current.ups_type!=='STS'){a.push(heatBox('booster_1','Booster 1',s,run));a.push(heatBox('booster_2','Booster 2',s,run));if(current.ups_type==='3X')a.push(heatBox('booster_3','Booster 3',s,run))}
  if(heatDone(s,current)&&!s.parameters_480v_saved)a.push(`<div class="action"><h4>480V / Parameters</h4><button class="green" onclick="params()">Save / Mark Passed</button></div>`);
  if(s.parameters_480v_saved)a.push(`<div class="action final-actions"><h4>Final Exit</h4><button class="green" onclick="exitUnit('COMPLETED')">TO FINISHING / COMPLETED</button><button class="warn" onclick="exitUnit('STOCK')">BUFFER STOCK</button></div>`);
 }
 if(current.status==='UNDER_TESTING'&&!run&&!current.parked)a.push(`<div class="action parking-card"><h4>Temporary Parking</h4><p>Free the current bay without losing testing history.</p><button class="purple" onclick="moveToParking()">MOVE TO PARKING AREA</button></div>`);
 $('#actions').innerHTML=a.join('');startTimerUi(s);
}
async function startLV(){if(!needEng())return;const b=await chooseCore('LV');if(!b)return;if(!current.serial_number){const r=await sb.rpc('tqr_assign_serial',{p_unit_id:current.id});if(r.error)return showToast(r.error.message)}const now=nowIso();let r=await sb.from('tqr_bay_occupancy').insert({bay_id:b.id,section:'LV',unit_id:current.id});if(r.error)return showToast(r.error.message);await sb.from('tqr_units').update({status:'UNDER_TESTING',current_stage:'LV TESTING IN PROGRESS',testing_started_at:now}).eq('id',current.id);await log('START','LV','IN_PROGRESS');reload()}
async function hipot(){if(!needEng())return;const now=nowIso();await sb.from('tqr_stage_state').update({lv_passed:true,lv_passed_at:now,hipot_passed:true,hipot_passed_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HI-POT PASSED'}).eq('id',current.id);await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).eq('section','LV').is('released_at',null);await log('PASS','LV + HI-POT');reload()}
async function startHV(){if(!needEng())return;const b=await chooseCore('HV');if(!b)return;const now=nowIso(),r=await sb.from('tqr_bay_occupancy').insert({bay_id:b.id,section:'HV',unit_id:current.id});if(r.error)return showToast(r.error.message);await sb.from('tqr_stage_state').update({hv_started:true,hv_started_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HV IN PROGRESS'}).eq('id',current.id);await log('START','HV','IN_PROGRESS');reload()}
async function hvPass(){if(!needEng())return;const now=nowIso();await sb.from('tqr_stage_state').update({hv_passed:true,hv_passed_at:now}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'HV PASSED'}).eq('id',current.id);await log('PASS','HV');reload()}
async function heatStart(k){if(!needEng())return;const s=sstate(),already=runningHeat(s);if(already)return showToast('Timed event already running — other stages are locked');const p={};p[k+'_started']=true;p[k+'_started_at']=nowIso();let r=await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id).select();if(r.error)return showToast(r.error.message);const label=k==='core_heatrun'?'CORE HEATRUN':k.replaceAll('_',' ').toUpperCase()+' HEATRUN';await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('START',label,'IN_PROGRESS');reload()}
async function startTimerUi(s){clearInterval(timerTicker);const t=await getTimers(),tick=()=>$$('.timerbox').forEach(box=>{const k=box.dataset.key,start=s[k+'_started_at'];if(!start)return;const dur=k==='core_heatrun'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds,left=Math.max(0,dur-Math.floor((Date.now()-new Date(start))/1000)),r=box.querySelector('.timer-readout'),b=box.querySelector('.timerpass');r.textContent=left?`Remaining ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`:'Timer Complete — Check UPS';b.disabled=left>0;b.textContent=left?'Timer Running':'Check UPS & Mark Passed'});tick();timerTicker=setInterval(tick,1000)}
async function heatPass(k){if(!needEng())return;const s=sstate(),t=await getTimers(),dur=k==='core_heatrun'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;if(Date.now()-new Date(s[k+'_started_at'])<dur*1000)return showToast('Timer still running');const p={};p[k+'_passed']=true;p[k+'_passed_at']=nowIso();await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id);const label=k==='core_heatrun'?'CORE HEATRUN PASSED':k.replaceAll('_',' ').toUpperCase()+' HEATRUN PASSED';await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('PASS',label);reload()}
async function params(){if(!needEng())return;await sb.from('tqr_stage_state').update({parameters_480v_saved:true,parameters_480v_saved_at:nowIso()}).eq('unit_id',current.id);await sb.from('tqr_units').update({current_stage:'480V / PARAMETERS SAVED'}).eq('id',current.id);await log('PASS','480V / PARAMETERS');reload()}
async function exitUnit(status){if(!needEng())return;const now=nowIso();await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);const p=status==='COMPLETED'?{status,current_stage:'TO FINISHING / COMPLETED',completed_at:now}:{status,current_stage:'BUFFER STOCK',stock_at:now};await sb.from('tqr_units').update(p).eq('id',current.id);await log('EXIT',status==='COMPLETED'?'TO FINISHING':'BUFFER STOCK');reload()}
async function finishFromStock(){if(!needEng())return;const now=nowIso();await sb.from('tqr_units').update({status:'COMPLETED',current_stage:'TO FINISHING / COMPLETED',completed_at:now}).eq('id',current.id);await log('EXIT','TO FINISHING FROM BUFFER STOCK');showToast('Moved to Finishing');reload()}
async function markFaulty(){if(!needEng())return;if(!confirm('Mark this UPS as Faulty / RTA?'))return;const now=nowIso();await sb.from('tqr_units').update({status:'RTA',current_stage:'FAULTY LOCATION',parked:false,faulted:true,faulted_at:now}).eq('id',current.id);await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);await log('FAULT','FAULTY LOCATION','FAIL');showToast('UPS marked Faulty / RTA');reload()}

async function moveToParking(){if(!needEng())return;const now=nowIso();await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);const r=await sb.from('tqr_units').update({parked:true,parked_at:now,parked_from_stage:current.current_stage}).eq('id',current.id);if(r.error)return showToast(r.error.message);await log('MOVE','PARKING AREA','PASS');showToast('UPS moved to Parking Area');reload()}
async function resumeFromParking(){showToast('Resume from Parking Area and select an empty compatible bay first')}

Object.assign(window,{receive,startLV,hipot,startHV,hvPass,heatStart,heatPass,params,exitUnit,finishFromStock,markFaulty,moveToParking,resumeFromParking});
$('#loadQr').onclick=openQR;$('#openLive').onclick=()=>{const q=$('#liveUps').value;if(!q)return;$('#qr').value=q;openQR()};$('#qr').onkeydown=e=>{if(e.key==='Enter')openQR()};
(async()=>{await loadDropdown();const q=new URLSearchParams(location.search).get('qr');if(q){$('#qr').value=q;openQR()}})().catch(e=>showToast(e.message));

realtimeWatch('scan',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],async()=>{if(current){const q=current.qr_code;const eng=currentEngineer;current=await fetchUnitByQr(q);currentEngineer=eng;await renderUnit()}await loadDropdown()});

startPolling('scan',async()=>{try{if(current){const q=current.qr_code,eng=currentEngineer;current=await fetchUnitByQr(q);currentEngineer=eng;await renderUnit()}await loadDropdown()}catch(e){}},2200);
