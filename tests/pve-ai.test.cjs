// Exercise the actual game simulation/controller, not a second AI model.
const fs=require('fs');let src=fs.readFileSync(require('node:path').join(__dirname,'melanta.test.cjs'),'utf8').split('function mel()')[0].replaceAll('__dirname',JSON.stringify(__dirname));
src+=`
run("var seed=731;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};");
function bot(type='soul',level='hard',opponent='thunder',form=0){reset(opponent);run("$('select1').value='"+type+"';$('difficulty').value='"+level+"';mode='pve';start();phase='fight';fighters[0].x=550;fighters[1].x=1100;fighters.forEach(f=>f.y=floor(f.x));"+(form?"fighters[1].mox.p.form=1;":""));}
// Startup observation delays apply to a new visible attack, without consulting input.
for(const level of ['easy','normal','hard','hell']){bot('soul',level);run("ai(1/120)");const bounds=run('AI_CONFIG[difficulty].reaction');assert.equal(run('fighters[1].move'),0);assert.equal(run('fighters[1].pveAI.seen'),null);run("time+=AI_CONFIG[difficulty].reaction[0]-.01;ai(1/120)");assert.equal(run('fighters[1].pveAI.seen'),null);advance(bounds[1]+.15);assert.ok(run('fighters[1].pveAI.seen!==null'));assert.ok(run('fighters[1].pveAI.observations.length')<=24);}
console.log('PASS all four reaction ranges, bounded delayed perception');
// Never accumulate commands while incapacitated; no privileged defensive action.
bot('mox','hell');run("fighters[1].stunUntil=time+1;fighters[1].combat.buffer={k:'r',until:time+3};fighters[1].mox.buffer='r';");advance(.7);assert.equal(run('fighters[1].combat.buffer'),null);assert.equal(run('fighters[1].mox.buffer'),null);assert.equal(run('fighters[1].combat.serial'),0);
console.log('PASS stunned bot clears only its own inputs and cannot escape stun');
// Missing with a normal never unlocks AI followups; engine remains the gatekeeper.
bot('soul','hell');run("fighters[0].x=1400;fighters[1].x=300;request(fighters[1],'attack');");advance(.34);assert.equal(run('fighters[1].pveAI.stats.links'),0);assert.ok(run('fighters[1].pveAI.restUntil')>run('time'));
// Exact confirmed normal window can chain immediately without adding perception delay.
bot('soul','hell');run("fighters[0].x=700;fighters[1].x=850;fighters[0].y=fighters[1].y=floor(850);var s=aiState(fighters[1]);s.seen={x:700,y:floor(850),vx:0,k:null};s.burst=1;request(fighters[1],'attack');");advance(.15);assert.ok(run('fighters[1].pveAI.stats.links')>=1);assert.ok(run('fighters[1].combat.serial')>=2);
console.log('PASS whiff stops sequence, confirmed legal window links without reaction penalty');
// Data adapter follows live normal range and existing skill exports.
bot('thunder');const original=run('COMBAT_CONFIG.normals.thunder.range');run('COMBAT_CONFIG.normals.thunder.range=500');assert.equal(run('aiRanges(fighters[1]).attack'),500);run('COMBAT_CONFIG.normals.thunder.range='+original);
bot('cylast');assert.equal(run('aiRanges(fighters[1]).q'),run('window.CylastBase.CYLAST_SKILLS.q.range'));
bot('mox','hell');run('var seededRandom=Math.random;Math.random=()=>.1');advance(1.2);assert.equal(run('fighters[1].mox.p.form'),1);run('Math.random=seededRandom');
console.log('PASS live range adapters and Mox long-range form transition');
// Debug is optional, bounded and reset with every new fighter/round.
run('window.SagaAI.setDebug(true)');advance(1);assert.equal(run("$('aiDebug').hidden"),false);assert.ok(run('fighters[1].pveAI.trace.length')<=64);run('setupRound()');assert.equal(run('fighters[1].pveAI'),undefined);run('window.SagaAI.setDebug(false)');assert.equal(run("$('aiDebug').hidden"),true);
console.log('PASS debug toggle and round reset');
bot('soul','hell');run('setupRound()');assert.equal(run('difficulty'),'hell');assert.ok(run("$('modeTag').textContent").includes('HELLMODE'));run("$('select1').value='melanta';start();phase='fight'");advance(.3);assert.equal(run('difficulty'),'hell');assert.equal(run('fighters[1].type'),'melanta');assert.equal(run('fighters[1].hp'),1000);
reset('soul');advance(.7);assert.equal(run('fighters[1].pveAI'),undefined);
console.log('PASS HELLMODE survives next round/restart/character change; PvP never runs bot controller');
bot('soul','hell');run('var savedRng=Math.random;Math.random=()=>.1;fighters[0].x=700;fighters[1].x=850;fighters.forEach(f=>f.y=floor(850));fighters[1].charges=0;fighters[1].qRecharge=[];fighters[1].cd.q=fighters[1].cd.w=fighters[1].cd.r=99;');
let started=false;for(let i=0;i<120;i++){advance(1/120);if(run('!!fighters[1].normal')){started=true;break;}}assert.ok(started);run("fighters[0].dir=-1;request(fighters[0],'e')");advance(.32);assert.equal(run('fighters[0].hp'),1000);assert.equal(run('fighters[1].pveAI.stats.links'),0);assert.ok(run('fighters[1].pveAI.restUntil')>run('time'));run('Math.random=savedRng');
console.log('PASS a genuinely selected bot normal can be baited/evaded by player teleport; no phantom chain after miss');


`;
eval(src);
