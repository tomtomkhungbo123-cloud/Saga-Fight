const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const {Path2D}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const env={window:{},Math,Path2D,Image:class{set src(v){}}};vm.createContext(env);for(const f of ['soul-design-data','soul-design','soul-motion'])vm.runInContext(fs.readFileSync('web/'+f+'.js','utf8'),env);const D=env.window.SoulDesign;
assert.equal(D.armBindings.find(b=>b.part===5).first,270,'weapon binds to the opposite, right-side source arm');
const lengths=[.32,.35,.5],startups=[.12,.13,.18];
for(let n=1;n<=3;n++){
 const f={x:300,y:400,dir:1,gait:0,runWeight:0,airWeight:0,lean:0,soulMotion:{},action:{k:'attack',n,age:0,startup:startups[n-1],duration:lengths[n-1]}};
 const start=D.normalFrame(f);assert.equal(start.hx,D.heldWrist.x);assert.equal(start.hy,D.heldWrist.y);assert.equal(start.angle,0);
 for(let i=0;i<=120;i++){f.action.age=i/120*lengths[n-1];const frame=D.normalFrame(f),pose=D.deformed(f,D.motionOptions(f));assert.ok(Math.hypot(frame.hx-pose.wrist.x,frame.hy-pose.wrist.y)<1e-8,'normal and body use the same wrist');const q=D.normalArc(n,frame.q);if(f.action.age>=f.action.startup*.65&&f.action.age<=f.action.startup+.07)assert.ok(Math.hypot(frame.tip[0]-q.tip[0],frame.tip[1]-q.tip[1])<1e-8,'active trail endpoint follows actual sword tip');}
 assert.ok(Math.abs(D.normalFrame(f).angle)<1e-8,'recover sword to neutral');f.action.age=f.action.startup;assert.ok(D.normalFrame(f).tip[0]<110,'blade points toward opponent on hit frame');
 f.action.age=.23;const previous=D.normalFrame(f);f.action={k:'attack',n:n%3+1,age:0,poseFrom:previous};const next=D.normalFrame(f);assert.equal(next.hx,previous.hx);assert.equal(next.hy,previous.hy);assert.equal(next.angle,previous.angle,'buffered combo starts from current pose');
}
console.log('PASS right-hand grip, shared wrist/tip for all 3 normal cuts, forward hit frames and seamless buffered combo handoff');

// N3 translates a level blade forward while fixed-length upper/forearm bones unfold.
const thrustStart=D.normalArc(3,0),thrustEnd=D.normalArc(3,1);assert.ok(thrustEnd.hx<thrustStart.hx-20);assert.ok(Math.abs(thrustEnd.tip[1]-thrustStart.tip[1])<1e-8);assert.equal(thrustStart.angle,thrustEnd.angle);
for(let i=0;i<=120;i++){const f={action:{k:'attack',n:3,age:i/120*.5},soulMotion:{}};const pose=D.deformed(f,{}),r=pose.armRig,S=D.armBindings.find(b=>b.part===5).pivot,H=D.heldWrist,upper=Math.hypot(r.elbow.x-S.x,r.elbow.y-S.y),lower=Math.hypot(H.x-r.elbow.x,H.y-r.elbow.y);assert.ok(Math.abs(Math.hypot(r.joint.x-S.x,r.joint.y-S.y)-upper)<1e-7);assert.ok(Math.abs(Math.hypot(r.wrist.x-r.joint.x,r.wrist.y-r.joint.y)-lower)<1e-7);}
console.log('PASS level N3 thrust path and fixed-length articulated arm through preparation/extension/recovery');
