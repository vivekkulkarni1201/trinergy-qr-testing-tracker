
mountScanHeader();
let current=null,currentEngineer=null,timerTicker=null,_scanStateSig='';

async function engineers(){
  const r=await sb.from('tqr_engineers').select('*').eq('active',true).order('engineer_name');
  if(r.error)throw r.error; return r.data||[];
}
async function liveUnits(){
  const r=await sb.from('tqr_units').select('*').in('status',['RECEIVED','UNDER_TESTING']).order('received_at');
  if(r.error)throw r.error; return r.data||[];
}
async function loadDropdown(){
  const el=$('#liveUps'); if(!el)return;
  const old=el.value,list=await liveUnits();
  el.innerHTML='<option value="">Select Live UPS...</option>'+list.map(u=>`<option value="${esc(u.qr_code)}">${esc(fullSerial(u)||u.qr_code)} · ${u.ups_type} · ${esc(u.current_stage||u.status)}</option>`).join('');
  if([...el.options].some(o=>o.value===old))el.value=old;
}
function sstate(){return stateOf(current)||{}}
function runningHeat(st=sstate()){return ['core_heatrun','booster_1','booster_2','booster_3'].find(k=>st[k+'_started']&&!st[k+'_passed'])||null}
function heatDone(st,u){return !!st.core_heatrun_passed&&(u.ups_type==='STS'||(st.booster_1_passed&&st.booster_2_passed&&(u.ups_type!=='3X'||st.booster_3_passed)))}
async function lastEngineerForUnit(){
  if(!current)return null;
  const r=await sb.from('tqr_stage_history').select('engineer_id,engineer_name,created_at').eq('unit_id',current.id).not('engineer_name','is',null).order('created_at',{ascending:false}).limit(1);
  if(!r.error&&r.data?.length)return {id:r.data[0].engineer_id,name:r.data[0].engineer_name};
  try{return JSON.parse(localStorage.getItem('tqr_last_engineer')||'null')}catch{return null}
}
async function activeOccupancy(){
  if(!current)return null;
  const r=await sb.from('tqr_bay_occupancy').select('*,tqr_bays(*)').eq('unit_id',current.id).is('released_at',null).maybeSingle();
  if(r.error){showToast(r.error.message);return null}
  return r.data;
}
async function loadUnit(qr){
  try{
    const u=await fetchUnitByQr(qr);
    if(!u)return null;
    return u;
  }catch(e){
    $('#unitbox').innerHTML=`<div class="panel"><div class="panel-body"><h3>Unable to open UPS</h3><p>${esc(e.message)}</p></div></div>`;
    return null;
  }
}
async function openQR(){
  const code=$('#qr').value.trim();if(!code)return;
  current=await loadUnit(code);
  if(!current){renderNew(code);return}
  await renderUnit();
}
function renderNew(code){
  $('#unitbox').innerHTML=`<div class="panel"><div class="panel-body mobile-new"><span class="eyebrow">NEW QR</span><h2>${esc(code)}</h2><p>First scan records Received only.</p><div class="receive-grid">${['3X','2X','STS'].map(t=>`<button onclick="receive('${t}')">${t}<small>Receive UPS</small></button>`).join('')}</div></div></div>`;
}
async function receive(type){
  const code=$('#qr').value.trim();
  let r=await sb.from('tqr_units').insert({qr_code:code,ups_type:type,status:'RECEIVED',current_stage:'RECEIVED'});
  if(r.error)return showToast(r.error.message);
  const u=(await sb.from('tqr_units').select('id').eq('qr_code',code).single()).data;
  await sb.from('tqr_stage_history').insert({unit_id:u.id,action:'RECEIVED',stage:'RECEIVED',result:'PASS'});
  showToast(type+' received');await openQR();await loadDropdown();
}
async function log(action,stage,result='PASS',notes=null){
  await sb.from('tqr_stage_history').insert({unit_id:current.id,action,stage,result,engineer_id:currentEngineer?.id||null,engineer_name:currentEngineer?.name||null,notes});
}
function needEng(){if(!currentEngineer){showToast('Select ACTIVE engineer first');return false}return true}
function isCompleted(){return !!current&&current.status==='COMPLETED'}
function blockCompleted(){
  if(!isCompleted())return false;
  showToast('UPS already COMPLETED — no further action allowed');
  return true;
}

async function chooseCoreBay(){
  const d=await loadCore();
  const free=d.b.filter(b=>b.active!==false&&b.bay_kind==='CORE'&&coreBayHasCapacity(d,b.id));
  if(!free.length){showToast('All Core Test Bays are full');return null}
  const msg=free.map((b,i)=>`${i+1}. ${b.bay_name} (${bayActiveOccupancy(d,b.id).length}/2 occupied)`).join('\n');
  const n=Number(prompt(`Select Core Test Bay:\n${msg}`,'1'))-1;
  const bay=free[n]; if(!bay)return null;
  return {bay,section:coreBayFreeSlot(d,bay.id)};
}
async function chooseStsBay(kind){
  const d=await loadCore(),section=kind==='STS_HEATRUN'?'STS_HEATRUN':'STS_TEST';
  const free=d.b.filter(b=>b.active!==false&&b.bay_kind===kind&&!d.o.some(o=>o.bay_id===b.id));
  if(!free.length){showToast(kind==='STS_HEATRUN'?'STS Heatrun Bay is occupied':'STS Test Bay is occupied');return null}
  const msg=free.map((b,i)=>`${i+1}. ${b.bay_name}`).join('\n');
  const n=Number(prompt(`Select ${kind==='STS_HEATRUN'?'STS Heatrun':'STS Test'} Bay:\n${msg}`,'1'))-1;
  const bay=free[n];return bay?{bay,section}:null;
}
async function assignOccupancy(pick){
  const r=await sb.from('tqr_bay_occupancy').insert({bay_id:pick.bay.id,section:pick.section,unit_id:current.id});
  if(r.error){showToast(r.error.message);return false}
  return true;
}
async function requireCompatibleBay(mode='CORE'){
  const occ=await activeOccupancy();
  if(!occ){showToast('Physical bay allocation required before stage change');return null}
  const kind=occ.tqr_bays?.bay_kind;
  if(mode==='CORE' && (current.ups_type==='STS'||kind!=='CORE')){showToast('2X/3X testing requires a Core Test Bay');return null}
  if(mode==='STS_TEST' && (current.ups_type!=='STS'||kind!=='STS_TEST')){showToast('TST/STS must be in STS Test Bay');return null}
  if(mode==='STS_HEATRUN' && (current.ups_type!=='STS'||kind!=='STS_HEATRUN')){showToast('Move TST/STS to STS Heatrun Bay first');return null}
  return occ;
}
async function assignBayOnly(){
  if(blockCompleted())return;
  if(!needEng())return;
  let pick;
  if(current.ups_type==='STS'){
    const st=(current.current_stage||'').toUpperCase(),ss=sstate();
    pick=(st.includes('HEATRUN')||ss.core_heatrun_started||ss.core_heatrun_passed)?await chooseStsBay('STS_HEATRUN'):await chooseStsBay('STS_TEST');
  }else pick=await chooseCoreBay();
  if(!pick)return;
  if(await assignOccupancy(pick)){
    await log('ASSIGN','BAY ALLOCATION','IN_PROGRESS',pick.bay.bay_name);
    showToast('Bay assigned');await reload();
  }
}
async function reload(){
  if(!current)return;
  current=await loadUnit(current.qr_code);if(current)await renderUnit();await loadDropdown();
}

function heatBox(k,label,st,run){
  if(st[k+'_passed'])return `<div class="action passed"><h4>${label}</h4><b>✓ PASSED</b></div>`;
  if(st[k+'_started'])return `<div class="action timerbox active-timer" data-key="${k}"><h4>${label}</h4><div class="timer-readout">Starting timer…</div><button class="green timerpass" onclick="heatPass('${k}')" disabled>Timer Running</button></div>`;
  return `<div class="action ${run?'locked':''}"><h4>${label}</h4><button ${run?'disabled':''} onclick="heatStart('${k}')">${run?'🔒 Locked':'Start Timer'}</button></div>`;
}
async function renderUnit(){
  clearInterval(timerTicker);
  if(!current)return;
  if(current.status==='COMPLETED'){
    const doneAt=current.completed_at?new Date(current.completed_at).toLocaleString():'Recorded';
    $('#unitbox').innerHTML=`<div class="panel unit-card completed-terminal">
      <div class="completed-lock-icon">✓</div>
      <span class="eyebrow">${esc(current.qr_code)}</span>
      <div class="serial-big${faultSerialClass(current)}">${esc(fullSerial(current)||'Serial')} <small>• ${current.ups_type}</small></div>
      <h2>UPS COMPLETED</h2>
      <p>This UPS has already been marked Completed and is permanently closed for testing updates.</p>
      <div class="completed-meta"><span>Status <b>COMPLETED</b></span><span>Completed At <b>${esc(doneAt)}</b></span></div>
      <div class="completed-scan-note">QR scan is read-only. Buffer Stock, Parking, Fault, bay assignment and all stage actions are disabled.</div>
      <a class="btn secondary" href="index.html">BACK TO DASHBOARD</a>
    </div>`;
    return;
  }
  const st=sstate(),eng=await engineers(),last=await lastEngineerForUnit(),occ=await activeOccupancy(),run=runningHeat(st);
  if(last&&eng.some(e=>e.id===last.id||e.engineer_name===last.name))currentEngineer=last;
  const isStock=current.status==='STOCK';
  const bayName=occ?.tqr_bays?.bay_name||'No Bay Allocated';
  const steps=current.ups_type==='STS'
    ? [['Received',true],['STS Test',!!st.hv_passed],['STS Heatrun',!!st.core_heatrun_passed],['480V',!!st.parameters_480v_saved],['Buffer Stock',isStock],['Completed',current.status==='COMPLETED']]
    : [['Received',true],['LV',!!st.lv_passed],['Hi-Pot',!!st.hipot_passed],['HV',!!st.hv_passed],['Heatrun',heatDone(st,current)],['480V',!!st.parameters_480v_saved],['Buffer Stock',isStock],['Completed',current.status==='COMPLETED']];
  $('#unitbox').innerHTML=`<div class="panel unit-card stage-console">
    <div class="unit-head mobile-unit-head"><div><span class="eyebrow">${esc(current.qr_code)}</span><div class="serial-big${faultSerialClass(current)}">${esc(fullSerial(current)||'Serial pending')} <small>• ${current.ups_type}</small></div><div class="current-stage-pill">${esc(current.current_stage||current.status)}</div><div class="bay-pill ${occ?'allocated':'missing'}">▦ ${esc(bayName)}</div></div>
    <label class="engineer-box">Authorized Engineer<select id="engineer"><option value="">Select Engineer</option>${eng.map(e=>`<option value="${e.id}" data-name="${esc(e.engineer_name)}" ${(currentEngineer&&(currentEngineer.id===e.id||currentEngineer.name===e.engineer_name))?'selected':''}>${esc(e.engineer_name)}${e.employee_id?' · '+esc(e.employee_id):''}</option>`).join('')}</select></label></div>
    ${run?`<div class="timer-lock"><b>⏱ Timed Event Running</b><span>${timedEventLabel(run)} is active. Pending stages are locked. Only timer completion or Fault is allowed.</span></div>`:''}
    ${!occ&&current.status==='UNDER_TESTING'&&!current.parked?`<div class="bay-warning"><b>⚠ NO PHYSICAL BAY ALLOCATION</b><span>Stage changes are blocked until a compatible bay is assigned.</span></div>`:''}
    ${isStock?`<div class="buffer-banner"><b>◇ BUFFER STOCK</b><span>Testing is complete. Only Completed is available.</span></div>`:''}
    ${current.parked?`<div class="parking-banner"><b>P PARKING AREA</b><span>Resume through Parking Area and select a destination bay.</span></div>`:''}
    ${current.status==='RTA'?`<div class="fault-banner"><b>! FAULTY AREA</b><span>Use Faulty Area for controlled re-entry.</span></div>`:''}
    <div class="steps mobile-steps">${steps.map(x=>{const locked=!!run&&!x[1]&&!['STS Heatrun','Heatrun'].includes(x[0]);return `<div class="step ${x[1]?'done':''} ${locked?'stage-locked':''}">${x[1]?'✓ ':locked?'🔒 ':''}${x[0]}</div>`}).join('')}</div>
    <div id="actions" class="actions stage-actions"></div></div>`;
  $('#engineer').onchange=e=>{const o=e.target.selectedOptions[0];currentEngineer=e.target.value?{id:e.target.value,name:o.dataset.name}:null;if(currentEngineer)localStorage.setItem('tqr_last_engineer',JSON.stringify(currentEngineer));renderActions(occ)};
  renderActions(occ);
}
function renderActions(occ){
  const st=sstate(),a=[],run=runningHeat(st);
  if(current.status==='COMPLETED'){$('#actions').innerHTML='';return}
  if(current.status==='RTA'){a.push(`<div class="action fault-card final-only"><h4>Faulty Area</h4><a class="btn danger" href="faulty.html">OPEN FAULTY AREA</a></div>`);$('#actions').innerHTML=a.join('');return}
  if(current.parked){a.push(`<div class="action parking-card final-only"><h4>Parking Area</h4><a class="btn green big-action" href="parking.html">OPEN PARKING AREA</a></div>`);$('#actions').innerHTML=a.join('');return}
  if(current.status==='STOCK'){a.push(`<div class="action final-only"><h4>Buffer Stock</h4><button class="green big-action" onclick="finishFromStock()">MARK COMPLETED</button></div>`);$('#actions').innerHTML=a.join('');return}
  if(current.status==='UNDER_TESTING'&&!occ){
    $('#actions').innerHTML=`<div class="action bay-required"><h4>Physical Bay Required</h4><button onclick="assignBayOnly()">ASSIGN BAY TO CONTINUE</button></div><div class="action fault-card"><h4>Fault / RTA</h4><button class="danger" onclick="markFaulty()">MARK UPS FAULTY</button></div>`;return;
  }
  if(run){
    a.push(heatBox(run,timedEventLabel(run),st,run));
    a.push(`<div class="action fault-card"><h4>Fault / RTA</h4><button class="danger" onclick="markFaulty()">MARK UPS FAULTY</button></div>`);
    $('#actions').innerHTML=a.join('');startTimerUi(st);return;
  }
  if(current.status==='RECEIVED'){
    a.push(`<div class="action primary-stage"><h4>Start Testing</h4><button onclick="startTesting()">Assign Serial + Select Bay</button></div>`);
  }else if(current.ups_type==='STS'){
    if(!st.hv_passed)a.push(`<div class="action"><h4>STS Test</h4><button class="green" onclick="passStsTest()">MARK STS TEST PASSED</button></div>`);
    else if(!st.core_heatrun_started&&!st.core_heatrun_passed){
      if(occ?.tqr_bays?.bay_kind==='STS_HEATRUN')a.push(heatBox('core_heatrun','STS Heatrun',st,null));
      else a.push(`<div class="action"><h4>Move for Heatrun</h4><button onclick="moveStsToHeatrun()">MOVE TO STS HEATRUN BAY</button></div>`);
    }else a.push(heatBox('core_heatrun','STS Heatrun',st,null));
    if(st.core_heatrun_passed&&!st.parameters_480v_saved)a.push(`<div class="action"><h4>480V / Parameters</h4><button class="green" onclick="params()">SAVE / PASS</button></div>`);
    if(st.parameters_480v_saved)a.push(`<div class="action"><h4>Final Exit</h4><button class="green" onclick="exitUnit('COMPLETED')">COMPLETED</button><button class="warn" onclick="exitUnit('STOCK')">BUFFER STOCK</button></div>`);
  }else{
    if(!st.lv_passed)a.push(`<div class="action"><h4>LV / Hi-Pot</h4><button class="green" onclick="hipot()">LV COMPLETE + HI-POT PASS</button></div>`);
    else if(!st.hv_started)a.push(`<div class="action"><h4>HV Testing</h4><button onclick="startHV()">START HV TESTING</button></div>`);
    else{
      if(!st.hv_passed)a.push(`<div class="action"><h4>HV Testing</h4><button class="green" onclick="hvPass()">MARK HV PASSED</button></div>`);
      a.push(heatBox('core_heatrun','Core Heatrun',st,null));
      a.push(heatBox('booster_1','Booster 1',st,null));
      a.push(heatBox('booster_2','Booster 2',st,null));
      if(current.ups_type==='3X')a.push(heatBox('booster_3','Booster 3',st,null));
      if(heatDone(st,current)&&!st.parameters_480v_saved)a.push(`<div class="action"><h4>480V / Parameters</h4><button class="green" onclick="params()">SAVE / PASS</button></div>`);
      if(st.parameters_480v_saved)a.push(`<div class="action"><h4>Final Exit</h4><button class="green" onclick="exitUnit('COMPLETED')">COMPLETED</button><button class="warn" onclick="exitUnit('STOCK')">BUFFER STOCK</button></div>`);
    }
  }
  if(current.status==='UNDER_TESTING'){
    a.push(`<div class="action parking-card"><h4>Temporary Parking</h4><button class="purple" onclick="moveToParking()">MOVE TO PARKING AREA</button></div>`);
  }
  if(!['COMPLETED','STOCK','RTA'].includes(current.status)){
    a.push(`<div class="action fault-card"><h4>Fault / RTA</h4><button class="danger" onclick="markFaulty()">MARK UPS FAULTY</button></div>`);
  }
  $('#actions').innerHTML=a.join('');startTimerUi(st);
}
async function startTesting(){
  if(blockCompleted())return;
  if(!needEng())return;
  let pick=current.ups_type==='STS'?await chooseStsBay('STS_TEST'):await chooseCoreBay();if(!pick)return;
  if(!current.serial_number){
    const r=await sb.rpc('tqr_assign_serial',{p_unit_id:current.id});
    if(r.error)return showToast(r.error.message);
    const rr=await sb.from('tqr_units').select('*').eq('id',current.id).single();
    if(!rr.error&&rr.data){
      const fs=fullSerial(rr.data);
      if(fs&&fs!==rr.data.serial_number){
        const ur=await sb.from('tqr_units').update({serial_number:fs}).eq('id',current.id);
        if(ur.error)return showToast(ur.error.message);
      }
    }
  }
  if(!await assignOccupancy(pick))return;
  const now=nowIso(),stage=current.ups_type==='STS'?'STS TESTING IN PROGRESS':'LV TESTING IN PROGRESS';
  await sb.from('tqr_units').update({status:'UNDER_TESTING',current_stage:stage,testing_started_at:now}).eq('id',current.id);
  await log('START',current.ups_type==='STS'?'STS TEST':'LV','IN_PROGRESS',pick.bay.bay_name);await reload();
}
async function hipot(){
  if(blockCompleted())return;
  if(!needEng())return;if(!await requireCompatibleBay('CORE'))return;
  const now=nowIso();await sb.from('tqr_stage_state').update({lv_passed:true,lv_passed_at:now,hipot_passed:true,hipot_passed_at:now}).eq('unit_id',current.id);
  await sb.from('tqr_units').update({current_stage:'HI-POT PASSED'}).eq('id',current.id);await log('PASS','LV + HI-POT');await reload();
}
async function startHV(){
  if(blockCompleted())return;
  if(!needEng())return;if(!await requireCompatibleBay('CORE'))return;
  const now=nowIso();await sb.from('tqr_stage_state').update({hv_started:true,hv_started_at:now}).eq('unit_id',current.id);
  await sb.from('tqr_units').update({current_stage:'HV IN PROGRESS'}).eq('id',current.id);await log('START','HV','IN_PROGRESS');await reload();
}
async function hvPass(){
  if(blockCompleted())return;
  if(!needEng())return;if(!await requireCompatibleBay('CORE'))return;
  const now=nowIso();await sb.from('tqr_stage_state').update({hv_passed:true,hv_passed_at:now}).eq('unit_id',current.id);
  await sb.from('tqr_units').update({current_stage:'HV PASSED'}).eq('id',current.id);await log('PASS','HV');await reload();
}
async function passStsTest(){
  if(blockCompleted())return;
  if(!needEng())return;if(!await requireCompatibleBay('STS_TEST'))return;
  const now=nowIso();
  await sb.from('tqr_stage_state').update({lv_passed:true,lv_passed_at:now,hipot_passed:true,hipot_passed_at:now,hv_started:true,hv_started_at:now,hv_passed:true,hv_passed_at:now}).eq('unit_id',current.id);
  await sb.from('tqr_units').update({current_stage:'STS TEST PASSED'}).eq('id',current.id);await log('PASS','STS TEST');await reload();
}
async function moveStsToHeatrun(){
  if(blockCompleted())return;
  if(!needEng())return;if(current.ups_type!=='STS')return;
  const pick=await chooseStsBay('STS_HEATRUN');if(!pick)return;
  const now=nowIso();await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);
  if(!await assignOccupancy(pick))return;
  await sb.from('tqr_units').update({current_stage:'STS HEATRUN BAY'}).eq('id',current.id);
  await log('MOVE','STS HEATRUN BAY','IN_PROGRESS',pick.bay.bay_name);await reload();
}
async function heatStart(k){
  if(blockCompleted())return;
  if(!needEng())return;
  const st=sstate();if(runningHeat(st))return showToast('Timed event already running');
  if(current.ups_type==='STS'){if(k!=='core_heatrun'||!await requireCompatibleBay('STS_HEATRUN'))return}
  else if(!await requireCompatibleBay('CORE'))return;
  const p={};p[k+'_started']=true;p[k+'_started_at']=nowIso();
  const r=await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id);if(r.error)return showToast(r.error.message);
  const label=k==='core_heatrun'?(current.ups_type==='STS'?'STS HEATRUN':'CORE HEATRUN'):k.replaceAll('_',' ').toUpperCase()+' HEATRUN';
  await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('START',label,'IN_PROGRESS');await reload();
}
async function startTimerUi(st){
  clearInterval(timerTicker);const t=await getTimers();
  const tick=()=>$$('.timerbox').forEach(box=>{
    const k=box.dataset.key,start=st[k+'_started_at'];if(!start)return;
    const dur=k==='core_heatrun'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;
    const left=Math.max(0,dur-Math.floor((Date.now()-new Date(start))/1000)),r=box.querySelector('.timer-readout'),b=box.querySelector('.timerpass');
    if(r)r.textContent=left?`Remaining ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`:'Timer Complete — Check UPS';
    if(b){b.disabled=left>0;b.textContent=left?'Timer Running':'Check UPS & Mark Passed'}
  });tick();timerTicker=setInterval(tick,1000);
}
async function heatPass(k){
  if(blockCompleted())return;
  if(!needEng())return;
  if(current.ups_type==='STS'){if(!await requireCompatibleBay('STS_HEATRUN'))return}else if(!await requireCompatibleBay('CORE'))return;
  const st=sstate(),t=await getTimers(),dur=k==='core_heatrun'?(current.ups_type==='STS'?t.sts_heatrun_seconds:t.core_heatrun_seconds):t.booster_heatrun_seconds;
  if(Date.now()-new Date(st[k+'_started_at'])<dur*1000)return showToast('Timer still running');
  const p={};p[k+'_passed']=true;p[k+'_passed_at']=nowIso();await sb.from('tqr_stage_state').update(p).eq('unit_id',current.id);
  const label=k==='core_heatrun'?(current.ups_type==='STS'?'STS HEATRUN PASSED':'CORE HEATRUN PASSED'):k.replaceAll('_',' ').toUpperCase()+' HEATRUN PASSED';
  await sb.from('tqr_units').update({current_stage:label}).eq('id',current.id);await log('PASS',label);await reload();
}
async function params(){
  if(blockCompleted())return;
  if(!needEng())return;
  if(current.ups_type==='STS'){if(!await requireCompatibleBay('STS_HEATRUN'))return}else if(!await requireCompatibleBay('CORE'))return;
  await sb.from('tqr_stage_state').update({parameters_480v_saved:true,parameters_480v_saved_at:nowIso()}).eq('unit_id',current.id);
  await sb.from('tqr_units').update({current_stage:'480V / PARAMETERS SAVED'}).eq('id',current.id);await log('PASS','480V / PARAMETERS');await reload();
}
async function exitUnit(status){
  if(blockCompleted())return;
  if(!needEng())return;const now=nowIso();
  const p=status==='COMPLETED'?{status,current_stage:'COMPLETED',completed_at:now,parked:false}:{status,current_stage:'BUFFER STOCK',stock_at:now,parked:false};
  const r=await sb.from('tqr_units').update(p).eq('id',current.id).neq('status','COMPLETED').select('id,status').maybeSingle();
  if(r.error)return showToast(r.error.message);
  if(!r.data)return showToast('UPS already COMPLETED — no further action allowed');
  await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);
  await log('EXIT',status==='COMPLETED'?'COMPLETED':'BUFFER STOCK');
  showToast(status==='COMPLETED'?'UPS Completed — record locked':'Moved to Buffer Stock');
  await reload();
}
async function finishFromStock(){
  if(blockCompleted())return;
  if(!needEng())return;const now=nowIso();
  const r=await sb.from('tqr_units').update({status:'COMPLETED',current_stage:'COMPLETED',completed_at:now,parked:false}).eq('id',current.id).eq('status','STOCK').select('id').maybeSingle();
  if(r.error)return showToast(r.error.message);
  if(!r.data)return showToast('UPS is no longer in Buffer Stock');
  await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);
  await log('EXIT','COMPLETED FROM BUFFER STOCK');showToast('UPS Completed — record locked');await reload();
}
async function markFaulty(){
  if(blockCompleted())return;
  if(!needEng())return;if(!confirm('Mark this UPS as Faulty / RTA?'))return;
  const now=nowIso(),st=sstate(),run=runningHeat(st);
  if(run){const stop={};stop[run+'_started']=false;stop[run+'_started_at']=null;const rr=await sb.from('tqr_stage_state').update(stop).eq('unit_id',current.id);if(rr.error)return showToast(rr.error.message)}
  const ur=await sb.from('tqr_units').update({status:'RTA',current_stage:'FAULTY LOCATION',parked:false,faulted:true,faulted_at:now}).eq('id',current.id);
  if(ur.error)return showToast(ur.error.message);
  await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);
  await log('FAULT','FAULTY LOCATION','FAIL',run?`Stopped ${run}`:'Fault during testing');clearInterval(timerTicker);showToast('Moved to Faulty Area');await reload();
}
async function moveToParking(){
  if(blockCompleted())return;
  if(!needEng())return;const now=nowIso(),occ=await activeOccupancy();if(!occ)return showToast('UPS has no physical bay to release');
  await sb.from('tqr_bay_occupancy').update({released_at:now}).eq('unit_id',current.id).is('released_at',null);
  const r=await sb.from('tqr_units').update({parked:true,parked_at:now,parked_from_stage:current.current_stage}).eq('id',current.id);if(r.error)return showToast(r.error.message);
  await log('MOVE','PARKING AREA','PASS');showToast('Moved to Parking Area');await reload();
}

Object.assign(window,{receive,startTesting,hipot,startHV,hvPass,passStsTest,moveStsToHeatrun,heatStart,heatPass,params,exitUnit,finishFromStock,markFaulty,moveToParking,assignBayOnly});
$('#loadQr').onclick=openQR;
$('#openLive').onclick=()=>{const q=$('#liveUps').value;if(!q)return;$('#qr').value=q;openQR()};
$('#qr').onkeydown=e=>{if(e.key==='Enter')openQR()};
(async()=>{await loadDropdown();const q=new URLSearchParams(location.search).get('qr');if(q){$('#qr').value=q;await openQR()}})().catch(e=>showToast(e.message));

const refreshCurrent=debounceAsync(async()=>{
  if(!current)return;
  const fresh=await loadUnit(current.qr_code);if(!fresh)return;
  const fs=stateOf(fresh)||{},sig=JSON.stringify([fresh.status,fresh.current_stage,fresh.parked,fresh.faulted,fs]);
  if(sig!==_scanStateSig){_scanStateSig=sig;const eng=currentEngineer;current=fresh;currentEngineer=eng;await renderUnit()}
  await loadDropdown();
},300);
realtimeWatch('scan',['tqr_units','tqr_stage_state','tqr_bay_occupancy','tqr_stage_history'],refreshCurrent);
startPolling('scan',refreshCurrent,8000);
