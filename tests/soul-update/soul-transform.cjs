const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={window:{},Math};vm.createContext(c);vm.runInContext(fs.readFileSync('web/soul-motion.js','utf8'),c);const rig=c.window.SoulMotion;
for(const hz of [60,120]){const dt=1/hz,f={vx:0,dir:1,ground:true,runWeight:0,airWeight:0,cloth:0,spinBlend:0,crossBlend:0,spinPhase:0,action:{k:'e',age:0,duration:2.5}};let prev=0;for(let i=0;i<=hz*2.5;i++){f.action.age=i*dt;rig.update(f,dt);const v=rig.transformView(f);assert.ok(v.blend>=prev-1e-10&&v.blend<=1);if(i*dt>=.5)assert.equal(v.blend,1);prev=v.blend;}
 const before=JSON.stringify(f),a=rig.transformView(f),b=rig.transformView(f);assert.equal(JSON.stringify(f),before,'render view is read-only');assert.deepEqual(a,b);
 f.action=null;let mist=a.mist;for(let i=0;i<hz*.8;i++){rig.update(f,dt);const v=rig.transformView(f);assert.ok(v.blend<=prev+1e-10&&v.blend>=0);assert.ok(v.mist<=mist+1e-10);prev=v.blend;mist=v.mist;}assert.equal(rig.transformView(f).blend,0);assert.equal(rig.transformView(f).mist,0);
}
console.log('PASS E smooth entry, hold, post-expiry reveal/mist dissolve and frozen determinism at 60/120 Hz');
