
mountTopbar('active');
async function boot(){
  const d=await loadCore(), rows=d.u.filter(x=>x.status==='UNDER_TESTING'||x.status==='RECEIVED');
  $('#activeBody').innerHTML=rows.map(u=>{
    const o=d.o.find(x=>x.unit_id===u.id), b=d.b.find(x=>x.id===o?.bay_id);
    return `<tr><td><a class="serial-link" href="scan.html?qr=${encodeURIComponent(u.qr_code)}">${esc(u.serial_number||u.qr_code)}</a></td><td>${u.ups_type}</td><td>${esc(u.current_stage||u.status)}</td><td>${esc(b?.bay_name||'—')} ${o?.section||''}</td><td>${new Date(u.received_at).toLocaleString()}</td></tr>`;
  }).join('')||'<tr><td colspan="5">No active UPS.</td></tr>';
}
boot().catch(e=>showToast(e.message));
