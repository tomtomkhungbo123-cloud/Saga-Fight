const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prelude=fs.readFileSync(path.join(__dirname,'mox.test.cjs'),'utf8');const {run,reset}=new Function('require','__dirname',prelude+';return {run,reset};')(require,__dirname);
for(const hz of [30,60,120]){
 reset('mox');run("fighters[0].dir=1;fighters[1].x=840;fighters[1].y=fighters[0].y;request(fighters[0],'r');");
 const deadline=run('fighters[1].lockBudget.deadline');run(`for(let i=0;i<${Math.ceil(1.56*hz)};i++)step(1/${hz});`);
 assert.equal(run('fighters[1].hp'),600,'exactly one slam');assert.ok(run('fighters[1].stunUntil>time'),'follow-up window is still stunned');assert.equal(run('fighters[1].grabbedBy'),null);
 const hp=run('fighters[1].hp');run("request(fighters[0],'attack')");run(`for(let i=0;i<${Math.ceil(.18*hz)};i++)step(1/${hz});`);
 assert.ok(run('fighters[1].hp')<hp,'normal during slam stun must deal damage');assert.equal(run('fighters[0].combo.count'),2,'slam and normal share combo');assert.ok(run('fighters[1].stunUntil>time'),'follow-up does not cancel slam stun');assert.equal(run('fighters[1].lockBudget.deadline'),deadline,'control deadline is not renewed');
}
// N1 -> full R -> N2 can continue, while N3 still terminates the chain.
reset('mox');run("fighters[0].dir=1;fighters[1].x=750;fighters[1].y=fighters[0].y;request(fighters[0],'attack');for(let i=0;i<21;i++)step(1/120);request(fighters[0],'r');for(let i=0;i<188;i++)step(1/120);");
const afterSlam=run('fighters[1].hp');run("request(fighters[0],'attack');for(let i=0;i<22;i++)step(1/120);");assert.ok(run('fighters[1].hp')<afterSlam);assert.equal(run('fighters[0].combat.normalStep'),2);assert.equal(run('fighters[0].combo.count'),3);
run("request(fighters[0],'attack');for(let i=0;i<24;i++)step(1/120);");assert.ok(run('fighters[0].combat.lastNormal.terminal'));assert.ok(run('fighters[1].escapeUntil>time'),'N3 keeps combo escape protection');
// A late-combo shortened R must still finish, preserving the shared anti-infinite rule.
reset('mox');run("fighters[0].dir=1;fighters[1].x=750;fighters[1].y=fighters[0].y;request(fighters[0],'attack');");run('for(let i=0;i<20;i++)step(1/120);fighters[1].lockBudget.deadline=time+.7;request(fighters[0],\'r\');');assert.ok(run('fighters[0].mox.action.shortFinish'));run('for(let i=0;i<20;i++)step(1/120);');assert.ok(run('fighters[1].escapeUntil>time'),'short finisher retains escape protection');
console.log('PASS full R stun permits damaging normal follow-up at 30/60/120 Hz; original deadline and shortened-finisher escape remain');
