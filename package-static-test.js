const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
for(const f of fs.readdirSync('.').filter(x=>x.endsWith('.js')&&x!=='trinergy-diagnostics.js'&&x!=='package-static-test.js')){new vm.Script(fs.readFileSync(f,'utf8'),{filename:f})}
const d=fs.readFileSync('dashboard.js','utf8');
assert(d.includes("STS Test Bays"),'combined STS Test card missing');
assert(d.includes("STS Heatrun Bays"),'combined STS Heatrun card missing');
assert(!d.includes('function monthWeeks('),'1-7 week chunk function still present');
assert(d.includes('calendarWeeks(month)'),'calendar week function not used');
assert(d.includes('weekly-energy-card'),'new weekly card UI missing');
const sh=fs.readFileSync('shared.js','utf8');
assert(sh.includes("'SLOT1'" )&&sh.includes("'SLOT2'"),'Core Slot1/Slot2 helper missing');
console.log('PASS: all JS parses; combined STS cards, calendar weeks and weekly polish markers present.');