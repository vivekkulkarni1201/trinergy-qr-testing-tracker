
mountTopbar('admin');
function showPane(id){$$('.admin-pane,.admin-tab').forEach(x=>x.classList.remove('active'));$('#pane-'+id)?.classList.add('active');$(`.admin-tab[data-pane="${id}"]`)?.classList.add('active');loadPane(id)}
$$('.admin-tab[data-pane]').forEach(b=>b.onclick=()=>showPane(b.dataset.pane));

async function loadTargets(){const d=await loadCore(),m=$('#targetMonth').value||ym();for(const t of ['3X','2X','STS']){const v=d.t.find(x=>x.ups_type===t&&monthOf(x.month_start)===m)?.target||0;$('#tg'+t.replace('X','x').toLowerCase()).value=v}}
async function saveTargets(){const m=$('#targetMonth').value+'-01',rows=[['3X','#tg3x'],['2X','#tg2x'],['STS','#tgsts']].map(([ups_type,id])=>({month_start:m,ups_type,target:Number($(id).value)||0}));const r=await sb.from('tqr_monthly_targets').upsert(rows,{onConflict:'month_start,ups_type'});showToast(r.error?r.error.message:'Targets saved')}

async function loadHistorical(){
 const m=$('#histMonth').value||ym(),r=await sb.from('tqr_historical_months').select('*').eq('month_start',m+'-01');
 if(r.error)return showToast(r.error.message);
 const mp=Object.fromEntries((r.data||[]).map(x=>[x.ups_type,x]));
 const set=(t,p)=>{const x=mp[t]||{};$('#h'+p+'Target').value=x.target||0;$('#h'+p+'Received').value=x.received||0;$('#h'+p+'Completed').value=x.completed||0};
 set('3X','3');set('2X','2');set('STS','s');$('#histNotes').value=(r.data||[])[0]?.notes||'';
 const all=await sb.from('tqr_historical_months').select('*').order('month_start',{ascending:false});
 const groups={};(all.data||[]).forEach(x=>{(groups[x.month_start]??=[]).push(x)});
 $('#historicalList').innerHTML=`<table class="table"><thead><tr><th>Month</th><th>3X T/R/C</th><th>2X T/R/C</th><th>STS T/R/C</th><th>Notes</th></tr></thead><tbody>${Object.entries(groups).map(([m,rows])=>{const g=Object.fromEntries(rows.map(x=>[x.ups_type,x])),fmt=t=>{const x=g[t]||{};return `${x.target||0} / ${x.received||0} / ${x.completed||0}`};return `<tr><td>${m.slice(0,7)}</td><td>${fmt('3X')}</td><td>${fmt('2X')}</td><td>${fmt('STS')}</td><td>${esc(rows[0]?.notes||'')}</td></tr>`}).join('')}</tbody></table>`;
}
async function saveHistorical(){
 const month_start=$('#histMonth').value+'-01',notes=$('#histNotes').value.trim();
 const rows=[['3X','3'],['2X','2'],['STS','s']].map(([ups_type,p])=>({month_start,ups_type,target:Number($('#h'+p+'Target').value)||0,received:Number($('#h'+p+'Received').value)||0,completed:Number($('#h'+p+'Completed').value)||0,notes}));
 const r=await sb.from('tqr_historical_months').upsert(rows,{onConflict:'month_start,ups_type'});showToast(r.error?r.error.message:'Historical month saved');if(!r.error)loadHistorical();
}

async function loadSerials(){const d=await table('tqr_serial_counters');$('#serials').innerHTML=d.map(x=>`<div class="admin-tile"><h3>${x.ups_type}</h3><label>Next Serial<input id="s_${x.ups_type}" type="number" value="${x.next_number}"></label><p class="muted">Next preview: ${x.ups_type==='3X'?'T3X':x.ups_type==='2X'?'T2X':'TST'}${String(x.next_number).padStart(4,'0')}</p><button onclick="saveSerial('${x.ups_type}')">Save</button></div>`).join('')}
async function saveSerial(t){const v=Number($('#s_'+t).value);const r=await sb.from('tqr_serial_counters').update({next_number:v}).eq('ups_type',t);showToast(r.error?r.error.message:'Serial counter saved')}

function toggleHtml(id,on,fn){return `<label class="switch"><input type="checkbox" ${on?'checked':''} onchange="${fn}('${id}',this.checked)"><span class="slider"></span></label>`}
async function loadEngineers(){const d=await table('tqr_engineers');$('#engineerTable').innerHTML=d.map(e=>`<tr><td>${esc(e.engineer_name)}</td><td>${esc(e.employee_id||'—')}</td><td>${toggleHtml(e.id,e.active,'toggleEngineer')}</td></tr>`).join('')}
async function addEngineer(){
 const engineer_name=$('#engName').value.trim(),employee_id=$('#engId').value.trim();if(!engineer_name)return showToast('Enter engineer name');
 const existing=await sb.from('tqr_engineers').select('*').ilike('engineer_name',engineer_name).limit(1);
 let r;if(existing.error)return showToast(existing.error.message);
 if(existing.data?.length)r=await sb.from('tqr_engineers').update({employee_id,active:true}).eq('id',existing.data[0].id);
 else r=await sb.from('tqr_engineers').insert({engineer_name,employee_id,active:true});
 showToast(r.error?r.error.message:'Engineer saved');if(!r.error){$('#engName').value='';$('#engId').value='';loadEngineers()}
}
async function toggleEngineer(id,active){const r=await sb.from('tqr_engineers').update({active}).eq('id',id);if(r.error)showToast(r.error.message)}

async function loadBays(){const d=await table('tqr_bays');$('#bayMasterBody').innerHTML=d.sort((a,b)=>a.bay_name.localeCompare(b.bay_name)).map(b=>`<tr><td><input id="bn_${b.id}" value="${esc(b.bay_name)}"></td><td>${b.bay_kind}</td><td>${b.bay_kind==='CORE'?'LV + HV':'Single'}</td><td>${toggleHtml(b.id,b.active!==false,'toggleBay')}</td><td><button onclick="saveBayName('${b.id}')">Save Name</button></td></tr>`).join('')}
async function addBay(){const bay_name=$('#newBayName').value.trim(),bay_kind=$('#newBayKind').value;if(!bay_name)return showToast('Enter bay name');const r=await sb.from('tqr_bays').insert({bay_name,bay_kind,active:true});showToast(r.error?r.error.message:'Bay added');if(!r.error){$('#newBayName').value='';loadBays()}}
async function toggleBay(id,active){const r=await sb.from('tqr_bays').update({active}).eq('id',id);if(r.error)showToast(r.error.message)}
async function saveBayName(id){const bay_name=$('#bn_'+id).value.trim();if(!bay_name)return showToast('Bay name required');const r=await sb.from('tqr_bays').update({bay_name}).eq('id',id);showToast(r.error?r.error.message:'Bay name updated');if(!r.error)loadBays()}
async function saveBayName(id){const bay_name=$('#bn_'+id).value.trim();if(!bay_name)return showToast('Bay name required');const r=await sb.from('tqr_bays').update({bay_name}).eq('id',id);showToast(r.error?r.error.message:'Bay name updated');if(!r.error)loadBays()}

async function loadStages(){const r=await sb.from('tqr_stage_master').select('*').order('sort_order');if(r.error)return showToast(r.error.message);$('#stageMasterBody').innerHTML=(r.data||[]).map(s=>`<tr><td>${esc(s.stage_code)}</td><td><input id="stn_${s.stage_code}" value="${esc(s.stage_name)}"></td><td><select id="str_${s.stage_code}"><option value="true" ${s.required?'selected':''}>Required</option><option value="false" ${!s.required?'selected':''}>Optional</option></select></td><td>${toggleHtml(s.stage_code,s.active!==false,'toggleStage')}</td><td><button onclick="saveStage('${s.stage_code}')">Save</button></td></tr>`).join('')}
async function addStage(){const stage_code=$('#newStageCode').value.trim().toUpperCase().replace(/\s+/g,'_'),stage_name=$('#newStageName').value.trim(),required=$('#newStageReq').value==='true';if(!stage_code||!stage_name)return showToast('Enter stage code and name');const r=await sb.from('tqr_stage_master').insert({stage_code,stage_name,required,active:true,sort_order:100});showToast(r.error?r.error.message:'Stage added');if(!r.error)loadStages()}
async function toggleStage(code,active){const r=await sb.from('tqr_stage_master').update({active}).eq('stage_code',code);if(r.error)showToast(r.error.message)}
async function saveStage(code){const r=await sb.from('tqr_stage_master').update({stage_name:$('#stn_'+code).value,required:$('#str_'+code).value==='true'}).eq('stage_code',code);showToast(r.error?r.error.message:'Stage saved')}

async function loadTimers(){const t=await getTimers();$('#coreTimer').value=t.core_heatrun_seconds;$('#boostTimer').value=t.booster_heatrun_seconds;$('#stsTimer').value=t.sts_heatrun_seconds}
async function saveTimers(){const rows=[['core_heatrun_seconds','#coreTimer'],['booster_heatrun_seconds','#boostTimer'],['sts_heatrun_seconds','#stsTimer']].map(([setting_key,id])=>({setting_key,setting_value:Number($(id).value)||0}));const r=await sb.from('tqr_settings').upsert(rows,{onConflict:'setting_key'});showToast(r.error?r.error.message:'Timers saved')}

async function saveOldSerial(){
 const serial_number=$('#oldSerial').value.trim();if(!serial_number)return showToast('Serial number required');
 const qr_code=$('#oldQr').value.trim()||('OLD-'+serial_number),status=$('#oldStatus').value,current_stage=$('#oldStage').value.trim()||status;
 const received_at=$('#oldReceived').value?new Date($('#oldReceived').value+'T08:00:00').toISOString():nowIso();
 const p={qr_code,serial_number,ups_type:$('#oldType').value,status,current_stage,received_at};
 const d=$('#oldCompleted').value?new Date($('#oldCompleted').value+'T17:00:00').toISOString():null;
 if(status==='COMPLETED')p.completed_at=d||nowIso();if(status==='STOCK')p.stock_at=d||nowIso();
 const r=await sb.from('tqr_units').insert(p);showToast(r.error?r.error.message:'Till-date UPS added');
}
async function loadHistory(){const d=await loadCore(),term=$('#historySearch').value.trim().toLowerCase();let rows=[...d.h].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));if(term)rows=rows.filter(h=>{const u=d.u.find(x=>x.id===h.unit_id);return [u?.serial_number,u?.qr_code,h.stage,h.engineer_name].some(v=>String(v||'').toLowerCase().includes(term))});$('#historyBody').innerHTML=rows.slice(0,200).map(h=>{const u=d.u.find(x=>x.id===h.unit_id);return `<tr><td>${new Date(h.created_at).toLocaleString()}</td><td>${esc(u?.serial_number||u?.qr_code)}</td><td>${esc(h.stage)}</td><td>${esc(h.engineer_name||'—')}</td><td>${esc(h.result||'')}</td></tr>`}).join('')}


async function loadKpiImages(){const r=await sb.from('tqr_ui_assets').select('*');if(r.error)return showToast(r.error.message);for(const type of ['3X','2X','STS']){const row=(r.data||[]).find(x=>x.asset_key==='kpi_'+type);const p=$('#prev'+type);if(p)p.innerHTML=row?.public_url?`<img src="${esc(row.public_url)}" alt="${type}">`:'<span class="muted">No image uploaded</span>'}}
async function uploadKpiImage(type,inputId){const f=$('#'+inputId).files?.[0];if(!f)return showToast('Select an image first');const ext=(f.name.split('.').pop()||'png').replace(/[^a-z0-9]/gi,'');const path=`kpi/${type}-${Date.now()}.${ext}`;let r=await sb.storage.from('tqr-assets').upload(path,f,{upsert:true});if(r.error)return showToast(r.error.message);const url=sb.storage.from('tqr-assets').getPublicUrl(path).data.publicUrl;r=await sb.from('tqr_ui_assets').upsert({asset_key:'kpi_'+type,public_url:url,updated_at:new Date().toISOString()},{onConflict:'asset_key'});showToast(r.error?r.error.message:type+' image uploaded');if(!r.error)loadKpiImages()}


async function loadWeekly(){const m=$('#weekMonth').value||ym(),w=Number($('#weekNo').value||1),r=await sb.from('tqr_weekly_targets').select('*').eq('month_start',m+'-01').eq('week_no',w);if(r.error)return showToast(r.error.message);const g=Object.fromEntries((r.data||[]).map(x=>[x.ups_type,x.target]));$('#w3').value=g['3X']||0;$('#w2').value=g['2X']||0;$('#ws').value=g['STS']||0}
async function saveWeekly(){const month_start=$('#weekMonth').value+'-01',week_no=Number($('#weekNo').value),rows=[['3X','#w3'],['2X','#w2'],['STS','#ws']].map(([ups_type,id])=>({month_start,week_no,ups_type,target:Number($(id).value)||0}));const r=await sb.from('tqr_weekly_targets').upsert(rows,{onConflict:'month_start,week_no,ups_type'});showToast(r.error?r.error.message:'Weekly targets saved')}
async function importHistorical(){const f=$('#histExcel').files?.[0];if(!f)return showToast('Select Excel file');const buf=await f.arrayBuffer(),wb=XLSX.read(buf),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''}),up=[];for(const r of rows){let mv=String(r.Month||r.month||'').trim();if(!mv)continue;let m;if(/^\d{4}-\d{2}$/.test(mv))m=mv+'-01';else{const d=new Date(mv);if(isNaN(d))continue;m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}if(Number(m.slice(0,4))<2024)continue;for(const [t,p] of [['3X','3X'],['2X','2X'],['STS','STS']])up.push({month_start:m,ups_type:t,target:Number(r[p+' Target']||0),received:Number(r[p+' Received']||0),completed:Number(r[p+' Completed']||0),notes:String(r.Notes||'')})}if(!up.length)return showToast('No valid rows found');const rr=await sb.from('tqr_historical_months').upsert(up,{onConflict:'month_start,ups_type'});showToast(rr.error?rr.error.message:`Imported ${up.length} records`);if(!rr.error)loadHistorical()}

async function loadReasons(){const r=await sb.from('tqr_gap_reasons').select('*').order('reason_code');if(r.error)return showToast(r.error.message);$('#reasonBody').innerHTML=(r.data||[]).map(x=>`<tr><td><b>${esc(x.reason_code)}</b></td><td><input id="rt_${x.reason_code}" value="${esc(x.reason_text)}"></td><td>${toggleHtml(x.reason_code,x.active!==false,'toggleReason')}</td><td><button onclick="saveReason('${x.reason_code}')">Save</button></td></tr>`).join('')}
async function addReason(){const reason_code=$('#reasonCode').value.trim().toUpperCase(),reason_text=$('#reasonText').value.trim();if(!reason_code||!reason_text)return showToast('Enter code and reason');const r=await sb.from('tqr_gap_reasons').upsert({reason_code,reason_text,active:true},{onConflict:'reason_code'});showToast(r.error?r.error.message:'Reason saved');if(!r.error)loadReasons()}
async function toggleReason(code,active){const r=await sb.from('tqr_gap_reasons').update({active}).eq('reason_code',code);if(r.error)showToast(r.error.message)}
async function saveReason(code){const r=await sb.from('tqr_gap_reasons').update({reason_text:$('#rt_'+code).value.trim()}).eq('reason_code',code);showToast(r.error?r.error.message:'Reason updated')}

async function loadPane(id){({targets:loadTargets,historical:loadHistorical,weekly:loadWeekly,serials:loadSerials,engineers:loadEngineers,bays:loadBays,stages:loadStages,timers:loadTimers,images:loadKpiImages,reasons:loadReasons,history:loadHistory}[id]||(()=>{}))()}
$('#targetMonth').value=ym();$('#histMonth').value=ym();$('#weekMonth').value=ym();$('#targetMonth').onchange=loadTargets;$('#histMonth').onchange=loadHistorical;$('#weekMonth').onchange=loadWeekly;$('#weekNo').onchange=loadWeekly;
$('#saveTargets').onclick=saveTargets;$('#saveHistorical').onclick=saveHistorical;$('#saveWeekly').onclick=saveWeekly;$('#importHistorical').onclick=importHistorical;$('#addEngineer').onclick=addEngineer;$('#addBay').onclick=addBay;$('#addStage').onclick=addStage;$('#saveTimers').onclick=saveTimers;$('#saveOldSerial').onclick=saveOldSerial;$('#addReason').onclick=addReason;$('#searchHistory').onclick=loadHistory;
Object.assign(window,{saveSerial,toggleEngineer,toggleBay,saveBayName,toggleStage,saveStage,uploadKpiImage});
showPane('targets');
