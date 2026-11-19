const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,document:{getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../web/mox/'+file+'.js'),'utf8'),c);for(const file of ['design','model'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../web/thunder/'+file+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../web/game.js'),'utf8'),c);

function run(code){return vm.runInContext(code,c)}
function reset(){run("$('select0').value='thunder';$('select1').value='soul';mode='sandbox';sandboxOptions.free=false;start();phase='fight';platforms=[];floorPoints=[[0,940],[1600,940]];fighters[0].x=500;fighters[1].x=650;fighters.forEach(f=>{f.y=940;f.ground=true;});");}
function advance(n){run(`for(let i=0;i<${Math.ceil(n*120)};i++)step(1/120);`)}
reset();run("request(fighters[0],'r')");advance(1.3);assert.equal(run('sandboxStats.hits'),3);assert.equal(run('sandboxStats.total'),300);console.log('PASS R: 3 hits / 300 damage');
reset();run("COMBAT_CONFIG.normals.thunder.range=100;request(fighters[0],'attack')");advance(.2);assert.equal(run('sandboxStats.hits'),0);console.log('PASS normal range miss');
reset();run("COMBAT_CONFIG.normals.thunder.range=600;COMBAT_CONFIG.normals.thunder.damage[0]=50;request(fighters[0],'attack')");advance(.2);assert.equal(run('sandboxStats.total'),50);console.log('PASS normal damage tuning');
reset();run("COMBAT_CONFIG.specials.thunder.e.travel=420;request(fighters[0],'e')");assert.equal(run('fighters[0].x'),920);console.log('PASS teleport distance tuning');

reset();run("keys.KeyD=true");advance(1);assert.ok(run('fighters[0].vx')>329);assert.ok(run('fighters[0].vx')<=330);run("keys.KeyD=false");const coastX=run('fighters[0].x');advance(1/120);assert.ok(run('fighters[0].vx')>250);assert.ok(run('fighters[0].x')>coastX);advance(1);assert.equal(run('fighters[0].vx'),0);console.log('PASS Aether-style 330 speed and continuous deceleration');
reset();run("keys.KeyD=true");advance(.4);run("keys.KeyD=false;keys.KeyA=true");advance(1/120);assert.ok(run('fighters[0].vx')>0);advance(.2);assert.ok(run('fighters[0].vx')<0);console.log('PASS reversal brakes before accelerating in the opposite direction');

// Regression: a W landing on an elevated platform must keep every VFX at that contact height.
reset();run("platforms=[{x:400,r:800,y:491}];fighters[0].x=500;fighters[0].y=491;fighters[0].ground=true;request(fighters[0],'w')");advance(.7);
assert.equal(run("effects.find(e=>e.type==='thunderWField').y"),491);
assert.equal(run("effects.find(e=>e.type==='thunderImpact').surface"),'platform');
assert.equal(run("effects.find(e=>e.type==='thunderWField').surface"),'platform');
for(const x of [200,500,850])assert.equal(run(`thunderImpactGround(effects.find(e=>e.type==='thunderWField'),${x})`),491);
assert.equal(run("thunderImpactGround(effects.find(e=>e.type==='thunderImpact'),600)"),491);
console.log('PASS W platform contact: lightning and debris stay on impact plane at y=491, not terrain y=940');

for(const skill of ['q','w','e']){
 reset();run("keys.KeyD=true");advance(.4);run(`request(fighters[0],'${skill}')`);advance(.2);
 assert.ok(run('fighters[0].vx')>329,skill+' must preserve running speed');
 run('keys.KeyD=false;keys.KeyA=true');advance(.2);assert.equal(run('fighters[0].dir'),-1);assert.ok(run('fighters[0].vx')<0);
 console.log('PASS '+skill.toUpperCase()+': full movement speed and reversal during cast');
}
assert.equal(run('thunderOrbMotion(.1).speed'),210);assert.equal(run('thunderOrbMotion(.4).speed'),1450);
assert.ok(run('thunderOrbMotion(.3).speed')>run('thunderOrbMotion(.2).speed'));
const flightA=run("(()=>{const s={kind:'thunderOrb',dir:1,x:0,y:0,vx:210,age:0};for(let i=0;i<120;i++)advanceShot(s,1/120);return s.x;})()");
const flightB=run("(()=>{const s={kind:'thunderOrb',dir:1,x:0,y:0,vx:210,age:0};for(let i=0;i<30;i++)advanceShot(s,1/30);return s.x;})()");
assert.ok(Math.abs(flightA-flightB)<1e-8);console.log('PASS Q slow launch, fast acceleration and timestep-independent travel');
reset();run("fighters[1].x=650;shots=[{kind:'thunderOrb',dir:1,owner:0,x:540,y:830,vx:1450,age:.5,damage:90}];step(.15)");
assert.equal(run('fighters[1].hp'),910);console.log('PASS accelerated Q swept collision hits a crossed target');

reset();run("request(fighters[0],'q')");
assert.equal(run('shots.length'),1);assert.equal(run('shots[0].age'),0);assert.ok(run('shots[0].use.id'));assert.equal(run('fighters[0].action.fired'),true);advance(.1);assert.equal(run('shots.length'),1);advance(.14);assert.equal(run('fighters[0].action'),null);console.log('PASS instant Q: projectile exists on input, fires once and has only post-release recovery');

reset();run("request(fighters[0],'attack')");advance(.13);
assert.equal(run("effects.find(e=>e.type==='thunderNormal').connected"),true);assert.equal(run("effects.find(e=>e.type==='thunderNormal').toX"),run('fighters[1].x'));assert.equal(run("effects.find(e=>e.type==='thunderNormal').toY"),run('fighters[1].y-96'));
reset();run("fighters[1].x=1400;request(fighters[0],'attack')");advance(.13);
assert.equal(run("effects.find(e=>e.type==='thunderNormal').connected"),false);assert.equal(run("effects.find(e=>e.type==='thunderNormal').toX"),1100);assert.equal(run("effects.find(e=>e.type==='thunderNormal').toY-effects.find(e=>e.type==='thunderNormal').y"),0);console.log('PASS normal lightning ends at hit contact, or at configured reach and orb height on whiff');

reset();run("request(fighters[0],'q')");assert.equal(run("sfxEvents.filter(e=>e.id==='thunder_q_bolt').length"),1);assert.equal(run("sfxEvents.find(e=>e.id==='thunder_q_bolt').t-time"),0);
reset();run("request(fighters[0],'w')");assert.equal(run("sfxEvents.filter(e=>e.id==='thunder_w_orb').length"),1);assert.equal(run("sfxEvents.filter(e=>e.id==='thunder_w_stomp').length"),0);advance(.7);assert.equal(run("sfxEvents.filter(e=>e.id==='thunder_w_stomp').length"),1);
reset();run("request(fighters[0],'r')");advance(1.3);assert.equal(run("sfxEvents.filter(e=>e.id==='thunder_r_strike').length"),3);
console.log('PASS sound events: Q on release, W on actual landing, R exactly once per strike');

// Threats must use delayed visible orb acceleration in either direction, never Q input.
for(const dir of [-1,1]){
 reset();run(`fighters[1].x=800;fighters[1].vx=0;fighters[1].vy=0;var seenOrb={id:'visible-orb',kind:'thunderOrb',age:.1,dir:${dir},x:800-(${dir})*300,y:830,vx:${dir}*210,vy:0};var visibleThreat=aiThreat(fighters[1],{seen:{at:time-.1,bullets:[seenOrb]}},{});`);
 assert.ok(run('visibleThreat&&visibleThreat.arrival>0&&visibleThreat.arrival<.5'));
 const predictedMiss=run(`Math.abs(seenOrb.x+${dir}*(thunderOrbMotion(seenOrb.age+.1+visibleThreat.arrival).distance-thunderOrbMotion(seenOrb.age).distance)-fighters[1].x)`);
 assert.ok(predictedMiss<1,'accelerating threat intercept must match actual flight');
}
reset();assert.equal(run("aiThreat(fighters[1],{seen:{at:time,type:'thunder',k:'q',bullets:[]}}, {})"),null);
console.log('PASS delayed visible Q acceleration prediction in both directions; no nonexistent cast warning');
