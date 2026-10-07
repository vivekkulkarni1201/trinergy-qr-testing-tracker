
mountTopbar('buffer');
async function finish(id){
 const now=nowIso();
 let r=await sb.from('tqr_units').update({status:'COMPLETED',current_stage:'TO FINISHING / COMPLETED',completed_at:now}).eq('id',id);
 if(r.error)return showToast(r.error.message);
 await sb.from('tqr_stage_history').insert({unit_id:id,action:'EXIT',stage:'TO FINISHING FROM STOCK',result:'PASS'});
 showToast('Moved to Finishing'); boot();
}
async function boot(){
 const d=await loadCore(), rows=d.u.filter(x=>x.status==='STOCK');
 $('#bufferBody').innerHTML=rows.map(u=>`<tr><td>${esc(u.serial_number||u.qr_code)}</td><td>${u.ups_type}</td><td>${esc(u.current_stage)}</td><td>${u.stock_at?new Date(u.stock_at).toLocaleString():'—'}</td><td><button class="green" onclick="finish('${u.id}')">To Finishing</button></td></tr>`).join('')||'<tr><td colspan="5">Buffer stock empty.</td></tr>';
}
window.finish=finish; boot().catch(e=>showToast(e.message));
