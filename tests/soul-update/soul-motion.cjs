const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{},Math};vm.createContext(c);vm.runInContext(fs.readFileSync('web/soul-motion.js','utf8'),c);const rig=c.window.SoulMotion;
function fighter(){return {vx:0,dir:1,ground:true,gait:0,runWeight:0,airWeight:0,lean:0,hair:0,cloth:0,spinBlend:0,spinPhase:0,crossBlend:0,action:null};}
for(const hz of [60,120]){const f=fighter(),dt=1/hz;for(let i=0;i<hz;i++)rig.update(f,dt);assert.equal(f.gait,0);f.vx=430;for(let i=0;i<hz;i++)rig.update(f,dt);assert.ok(f.lean>.20&&f.lean<.26);assert.ok(f.soulMotion.hair< -8);f.vx=0;const phase=f.gait;for(let i=0;i<3*hz;i++)rig.update(f,dt);assert.equal(f.gait,phase,'idle does not march');assert.ok(Math.abs(f.lean)<.001);assert.ok(Math.abs(f.soulMotion.hair)<.01);assert.ok(Math.abs(f.soulMotion.weapon)<.001);f.vx=-430;f.dir=-1;for(let i=0;i<hz;i++)rig.update(f,dt);assert.ok(f.soulMotion.hair>8);assert.ok(f.lean>0);}
for(let i=0;i<200;i++){const phase=i/200*Math.PI*2,a=rig.foot(phase,0,1,0),b=rig.foot(phase,1,1,0);assert.ok(a.y<=240&&b.y<=240);assert.ok(a.stance||b.stance);}
// Stance travels backward in local space (the model faces local -X).
assert.ok(rig.foot(Math.PI*.8,0,1,0).x>rig.foot(Math.PI*.2,0,1,0).x);
console.log('PASS: directional inertia, spring settling, distance gait, grounded feet at 60/120 Hz');

for(let i=0;i<120;i++)for(const w of [0,.2,.5,1])for(const air of [0,1])for(const side of [0,1]){
 const p=rig.solveLeg(side,i*Math.PI/60,w,air,.23,w*9);
 const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 assert.ok(Math.abs(length(p.hip,p.knee)-p.upper)<1e-7,'thigh length invariant');
 assert.ok(Math.abs(length(p.knee,p.ankle)-p.lower)<1e-7,'calf length invariant');
 if(!air)assert.ok(p.ankle.y<=239.001,'grounded feet never sink below ground');
}
console.log('PASS: 1,920 leg poses preserve bone lengths through run/air/blend transitions');

// Contact/swing is C1: no velocity jump at toe-off or phase wrap.
for(const phase of [0,.43*Math.PI*2]){const eps=1e-5;for(const side of [0]){const a=rig.solveLeg(side,phase-eps,1,0,.08,3).ankle,b=rig.solveLeg(side,phase,1,0,.08,3).ankle,c=rig.solveLeg(side,phase+eps,1,0,.08,3).ankle;assert.ok(Math.hypot(c.x-b.x-(b.x-a.x),c.y-b.y-(b.y-a.y))<1e-5);}}
// Air poses vary with vertical velocity and keep the knees softly bent.
for(const side of [0,1])for(const vy of [-900,-450,0,450,900]){const p=rig.solveLeg(side,0,0,1,0,0,vy),a=Math.atan2(p.knee.x-p.hip.x,p.knee.y-p.hip.y),b=Math.atan2(p.ankle.x-p.knee.x,p.ankle.y-p.knee.y);assert.ok(b-a>=0&&b-a<1.15,'air knee flexion stays controlled under 66 degrees');}
console.log('PASS smooth contact/recovery boundaries and controlled takeoff/apex/descent poses');

for(const hz of [60,120]){const f=fighter(),dt=1/hz;f.vx=430;rig.update(f,dt);assert.ok(f.soulMotion.bounce<1,'body must ease into the running drop');for(let i=0;i<hz;i++)rig.update(f,dt);f.vx=0;const before=f.soulMotion.bounce;rig.update(f,dt);assert.ok(f.soulMotion.bounce>before*.75,'body must retain inertia on stop');for(let i=0;i<hz*3;i++)rig.update(f,dt);assert.ok(Math.abs(f.soulMotion.swing)<.001&&Math.abs(f.soulMotion.bounce)<.001,'arms and body settle without idle jitter');}
console.log('PASS spring-driven arm counter-swing and body start/stop inertia at 60/120 Hz');

for(const hz of [60,120]){const f=fighter(),dt=1/hz;f.vx=430;for(let i=0;i<hz;i++)rig.update(f,dt);const worldBefore=f.lean*f.dir;f.dir=-1;rig.update(f,dt);assert.ok(Math.abs(f.lean*f.dir-worldBefore)<.002,'facing flip must not reverse physical lean');assert.ok(f.lean<0,'body keeps leaning with actual velocity while braking into reversal');f.vx=-430;for(let i=0;i<hz;i++)rig.update(f,dt);assert.ok(f.lean*f.dir<-.20,'body eventually follows reversed velocity');f.ground=false;for(let i=0;i<hz;i++)rig.update(f,dt);assert.ok(Math.abs(f.lean)<.14,'air lean is restrained');}
console.log('PASS visible forward lean, world-space facing reversal and restrained air lean');
for(const hz of [60,120]){const f=fighter(),dt=1/hz;for(let i=0;i<hz;i++)rig.update(f,dt);let min=Infinity,max=-Infinity,asymmetric=0;
 for(let i=1;i<=Math.round(hz*1.3);i++){const t=i*dt;f.ground=t>=900/950;f.vy=f.ground?0:-900+1900*t;rig.update(f,dt);for(const side of [0,1]){const p=rig.solveLeg(side,f.gait,f.runWeight,f.airWeight,f.lean,f.soulMotion.bounce,f.vy,f.soulMotion.airPose);assert.ok(Math.abs(Math.hypot(p.knee.x-p.hip.x,p.knee.y-p.hip.y)-p.upper)<1e-7);assert.ok(Math.abs(Math.hypot(p.ankle.x-p.knee.x,p.ankle.y-p.knee.y)-p.lower)<1e-7);}if(t>.15&&t<.85){const bend=f.soulMotion.airPose.b[1]-f.soulMotion.airPose.a[1];min=Math.min(min,bend);max=Math.max(max,bend);asymmetric=Math.max(asymmetric,Math.abs(f.soulMotion.airPose.b[1]-f.soulMotion.airPose.b[0]));}}
 assert.ok(max-min>.15,'airborne knee pose changes across ascent/apex/descent');assert.ok(asymmetric>.25,'legs must not lock into the same pose');}
console.log('PASS complete jump/landing cycle: asymmetric delayed leg motion and fixed bone lengths at 60/120 Hz');
