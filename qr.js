
mountTopbar('qrgen');
async function getNext(){const r=await sb.from('tqr_settings').select('*').eq('setting_key','qr_next_number').maybeSingle();if(r.error)return showToast(r.error.message);$('#nextQr').value=Number(r.data?.setting_value)||1}
async function saveNext(){const n=Math.max(1,Number($('#nextQr').value)||1);const r=await sb.from('tqr_settings').upsert({setting_key:'qr_next_number',setting_value:n},{onConflict:'setting_key'});showToast(r.error?r.error.message:'Next QR number saved')}
async function generate(){
 const start=Math.max(1,Number($('#nextQr').value)||1),qty=Math.max(1,Math.min(100,Number($('#qrQty').value)||1)),grid=$('#qrGrid');grid.innerHTML='';
 for(let i=0;i<qty;i++){const n=start+i,code=`TQR-${String(n).padStart(4,'0')}`,card=document.createElement('div');card.className='qr-card';card.innerHTML=`<div class="qr-canvas"></div><b>${code}</b><small>${location.origin}${location.pathname.replace('qr.html','')}?qr=${code}</small>`;grid.appendChild(card);new QRCode(card.querySelector('.qr-canvas'),{text:`${location.origin}${location.pathname.replace('qr.html','')}?qr=${encodeURIComponent(code)}`,width:150,height:150,correctLevel:QRCode.CorrectLevel.M})}
 const next=start+qty;$('#nextQr').value=next;$('#qrSummary').innerHTML=`<div class="summary-chip">Generated <b>${qty}</b> labels: <b>TQR-${String(start).padStart(4,'0')}</b> → <b>TQR-${String(next-1).padStart(4,'0')}</b></div>`;
 const r=await sb.from('tqr_settings').upsert({setting_key:'qr_next_number',setting_value:next},{onConflict:'setting_key'});if(r.error)showToast(r.error.message)
}
$('#saveNextQr').onclick=saveNext;$('#generateQr').onclick=generate;getNext();
