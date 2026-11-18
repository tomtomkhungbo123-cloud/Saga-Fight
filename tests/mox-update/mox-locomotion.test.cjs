const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../../web/mox/visual.js'),'utf8'),a=source.indexOf('const locomotionStates='),b=source.indexOf('function fighter(',a);
const c=vm.createContext({Math,WeakMap});vm.runInContext('const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));'+source.slice(a,b)+';globalThis.api={locomotion,moxLeg};',c);const {locomotion,moxLeg}=c.api;
function walk(hz,dir=1){const f={x:0,vx:370*dir,dir,ground:true,mox:{action:null}},start=locomotion(f,0);for(let i=1;i<=hz;i++){f.x=370*dir*i/hz;locomotion(f,i/hz);}return {f,m:start};}
const a30=walk(30),a120=walk(120),left=walk(60,-1);assert.ok(Math.abs(a30.m.phase-a120.m.phase)<1e-10);assert.ok(a30.m.lean>0&&left.m.lean>0,'body leans forward in local facing both ways');
const phase=a120.m.phase;a120.f.vx=0;for(let i=1;i<=120;i++)locomotion(a120.f,1+i/120);assert.equal(a120.m.phase,phase,'standing still cannot cycle feet');assert.ok(a120.m.mix<1e-5,'run blends back to guard');
const cycle=84/.57;for(const side of [0,1]){const q=side?.58:.08;const phase=q*2*Math.PI,l0=moxLeg(phase,side,1,0,0,0),dx=3,l1=moxLeg(phase+dx/cycle*2*Math.PI,side,1,0,0,0);assert.ok(Math.abs(l1.foot.x-l0.foot.x+dx)<1e-9,'stance foot cancels world displacement');}
const f={x:0,vx:0,dir:1,ground:true,mox:{action:null}};locomotion(f,0);f.ground=false;for(let i=1;i<=30;i++)locomotion(f,i/60);const m=locomotion(f,.5);assert.ok(m.air>.99);f.ground=true;const landed=locomotion(f,.52);assert.ok(landed.land>.5);for(let i=1;i<=60;i++)locomotion(f,.52+i/60);assert.ok(landed.land<1e-5);
console.log('PASS frame-rate-independent gait, planted feet, forward lean both directions, stop blend and air/landing recovery');
