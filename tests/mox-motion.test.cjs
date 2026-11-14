// Exercise the actual arena animation at phase boundaries without render-frame sampling.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prelude=fs.readFileSync(path.join(__dirname,'mox.test.cjs'),'utf8').split('\nfunction mox()')[0];
const harness=new Function('require','__dirname',prelude+';return {run,reset,advance};')(require,__dirname);
const {run,reset,advance}=harness;
function begin(){reset('mox');run("fighters[0].x=600;fighters[1].x=840;fighters.forEach(f=>f.y=floor(f.x));request(fighters[0],'r');");}
function sample(t){begin();return run(`(()=>{const g=fighters[0].mox;g.action.age=${t};g.update(0);return {y:g.p.y,enemyY:g.e.y,turn:g.p.turn,enemyTurn:g.e.turn};})()`);}
const epsilon=1e-5;
for(const boundary of [.22,.32,.68,.78,1.06,1.28,1.46,1.52]){
 const before=sample(boundary-epsilon),after=sample(boundary+epsilon);
 for(const key of ['y','enemyY'])assert.ok(Math.abs(after[key]-before[key])<.06,`${key} snaps at ${boundary}`);
 for(const key of ['turn','enemyTurn'])assert.ok(Math.abs(after[key]-before[key])<.001,`${key} snaps at ${boundary}`);
}
function velocity(t,key='y'){return (sample(t+epsilon)[key]-sample(t-epsilon)[key])/(2*epsilon);}
for(const boundary of [.32,.78,1.06]){
 const left=velocity(boundary-.0001),right=velocity(boundary+.0001);
 assert.ok(Math.abs(left-right)<2,`vertical velocity discontinuity at ${boundary}: ${left}/${right}`);
}
assert.ok(velocity(.78)>89&&velocity(.78)<91,'lift momentum carries into flip');
assert.ok(velocity(1.06)<-119&&velocity(1.06)>-121,'flip momentum carries into dive');
assert.ok(Math.abs(velocity(.68,'turn'))<.001,'rotation starts softly');
assert.ok(Math.abs(velocity(1.46,'turn'))<.001,'rotation finishes softly');
assert.ok(Math.abs(velocity(1.28+.0001))<1,'landing rebound starts without a new upward impulse');
assert.ok(Math.abs(velocity(1.52-.0001))<1,'landing rebound settles before release');
for(const hz of [30,60,120]){
 begin();run(`for(let i=0;i<${Math.floor(1.26*hz)};i++)step(1/${hz});`);
 assert.equal(run('fighters[1].hp'),1000,'no early slam damage');
 run(`for(let i=0;i<${Math.ceil(.06*hz)};i++)step(1/${hz});`);
 assert.equal(run('fighters[1].hp'),600,'one 400-damage slam at original impact time');
 run(`for(let i=0;i<${Math.ceil(.3*hz)};i++)step(1/${hz});`);
 assert.equal(run('fighters[1].hp'),600,'no repeated slam damage');
 assert.equal(run('fighters[1].grabbedBy'),null,'capture releases');
 assert.equal(run('fighters[0].turn'),0);assert.equal(run('fighters[1].turn'),0);
}
begin();run("window.MoxCombat.cancel(fighters[0],{enemy:fighters[1],time,surface:floor});request(fighters[0],'w');");advance(.3);
run("const orb=fighters[0].mox.balls[0];fighters[1].x=orb.x;fighters[1].y=-orb.y+80;fighters[0].mox.e.x=orb.x;fighters[0].mox.e.y=orb.y-80;fighters[0].mox.update(1/120);");
assert.equal(run('fighters[1].knockVx'),320,'W uses stronger launch-direction knockback');
console.log('PASS Mox continuous motion, momentum, soft rotation/settle, 30/60/120Hz impact/release and W knockback');
