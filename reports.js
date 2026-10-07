
mountTopbar('reports');
let data;
function series(month,type){const [Y,M]=month.split('-').map(Number),days=new Date(Y,M,0).getDate(),a=Array(days).fill(0);data.u.filter(u=>monthOf(u.received_at)===month&&u.ups_type===type).forEach(u=>a[Number(u.received_at.slice(8,10))-1]++);return a}
function draw(canvas,ser){
 const dpr=devicePixelRatio||1,W=Math.max(700,canvas.clientWidth)*dpr,H=260*dpr,L=48*dpr,R=18*dpr,T=26*dpr,B=34*dpr,days=ser[0].data.length,max=Math.max(5,...ser.flatMap(s=>s.data)),c=canvas.getContext('2d');
 canvas.width=W;canvas.height=H;c.clearRect(0,0,W,H);c.fillStyle='#061827';c.fillRect(0,0,W,H);c.strokeStyle='#174660';
 for(let y=0;y<=max;y++){let py=T+(H-T-B)*(1-y/max);c.beginPath();c.moveTo(L,py);c.lineTo(W-R,py);c.stroke();c.fillStyle='#8fc4e2';c.font=`${10*dpr}px Arial`;c.fillText(String(y),12*dpr,py+3*dpr)}
 const X=i=>L+i/(days-1)*(W-L-R),Y=v=>T+(H-T-B)*(1-v/max),cols=['#20d8ff','#1fe58f','#bc61ff'];
 ser.forEach((s,j)=>{c.strokeStyle=cols[j];c.lineWidth=2.8*dpr;c.beginPath();s.data.forEach((v,i)=>i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v)));c.stroke();s.data.forEach((v,i)=>{c.beginPath();c.fillStyle=cols[j];c.arc(X(i),Y(v),3*dpr,0,Math.PI*2);c.fill()});c.fillStyle=cols[j];c.fillText(s.name,L+j*90*dpr,14*dpr)});
 c.fillStyle='#8fc4e2';let step=Math.ceil(days/15);for(let i=0;i<days;i+=step)c.fillText(String(i+1),X(i)-3*dpr,H-10*dpr);
}
async function render(){data=await loadCore();const m=$('#reportMonth').value||ym();draw($('#chartCore'),[{name:'3X',data:series(m,'3X')},{name:'2X',data:series(m,'2X')}]);draw($('#chartSts'),[{name:'STS',data:series(m,'STS')}])}
$('#reportMonth').value=ym();$('#reportMonth').onchange=render;render().catch(e=>showToast(e.message));window.addEventListener('resize',()=>data&&render());
