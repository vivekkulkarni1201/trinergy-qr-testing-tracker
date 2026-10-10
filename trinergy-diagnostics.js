(async()=>{
  const results=[]; const ok=(name,pass,detail='')=>results.push({Check:name,Result:pass?'PASS':'FAIL',Detail:detail});
  try{
    if(typeof sb==='undefined') throw new Error('Open this script on a Trinergy portal page where shared.js is loaded.');
    const q=async t=>{const r=await sb.from(t).select('*');if(r.error)throw r.error;return r.data||[]};
    const [units,bays,occ,states]=await Promise.all([q('tqr_units'),q('tqr_bays'),q('tqr_bay_occupancy'),q('tqr_stage_state')]);
    const active=occ.filter(o=>!o.released_at), bayMap=Object.fromEntries(bays.map(b=>[b.id,b]));
    const byUnit={};active.forEach(o=>(byUnit[o.unit_id]??=[]).push(o));
    ok('One active location per UPS',Object.values(byUnit).every(a=>a.length<=1),Object.entries(byUnit).filter(([,a])=>a.length>1).map(([u])=>u).join(', '));
    const core=bays.filter(b=>b.bay_kind==='CORE');
    ok('Core bay capacity <= 2',core.every(b=>active.filter(o=>o.bay_id===b.id).length<=2),core.filter(b=>active.filter(o=>o.bay_id===b.id).length>2).map(b=>b.bay_name).join(', '));
    ok('Core uses SLOT1/SLOT2 only',active.filter(o=>bayMap[o.bay_id]?.bay_kind==='CORE').every(o=>['SLOT1','SLOT2'].includes(o.section)),'');
    const badRoute=active.filter(o=>{const u=units.find(x=>x.id===o.unit_id),k=bayMap[o.bay_id]?.bay_kind;if(!u)return false;return u.ups_type==='STS'?k==='CORE':['STS_TEST','STS_HEATRUN'].includes(k)});
    ok('UPS type routing valid',badRoute.length===0,badRoute.map(o=>units.find(u=>u.id===o.unit_id)?.serial_number||o.unit_id).join(', '));
    const missingBay=units.filter(u=>u.status==='UNDER_TESTING'&&!u.parked&&!byUnit[u.id]?.length);
    ok('Active testing UPS has a bay',missingBay.length===0,missingBay.map(u=>u.serial_number||u.qr_code).join(', '));
    const shouldBeFree=units.filter(u=>['RTA','STOCK','COMPLETED'].includes(u.status)&&byUnit[u.id]?.length);
    ok('Fault/Buffer/Completed has no active bay',shouldBeFree.length===0,shouldBeFree.map(u=>u.serial_number||u.qr_code).join(', '));
    const stateMap=Object.fromEntries(states.map(s=>[s.unit_id,s]));
    const multiTimer=units.filter(u=>{const s=stateMap[u.id]||{};return ['core_heatrun','booster_1','booster_2','booster_3'].filter(k=>s[k+'_started']&&!s[k+'_passed']).length>1});
    ok('Only one timed event per UPS',multiTimer.length===0,multiTimer.map(u=>u.serial_number||u.qr_code).join(', '));
    const badStsTimer=units.filter(u=>{if(u.ups_type!=='STS')return false;const s=stateMap[u.id]||{},running=s.core_heatrun_started&&!s.core_heatrun_passed;if(!running)return false;const o=byUnit[u.id]?.[0];return !o||bayMap[o.bay_id]?.bay_kind!=='STS_HEATRUN'});
    ok('STS Heatrun only in STS Heatrun Bay',badStsTimer.length===0,badStsTimer.map(u=>u.serial_number||u.qr_code).join(', '));
    console.table(results);
    const fails=results.filter(x=>x.Result==='FAIL');
    console.log(fails.length?`❌ ${fails.length} invariant check(s) failed`:'✅ All Trinergy go-live invariant checks passed');
    return results;
  }catch(e){console.error('TRINERGY DIAGNOSTIC FAILED:',e);throw e}
})()