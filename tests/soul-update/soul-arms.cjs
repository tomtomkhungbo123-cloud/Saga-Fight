const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {Path2D}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const env={window:{},Math,Path2D,Image:class{constructor(){this.width=281;}set src(v){}}};vm.createContext(env);
for(const f of ['soul-design-data','soul-design','soul-motion','soul-render'])vm.runInContext(fs.readFileSync('web/'+f+'.js','utf8'),env);
const D=env.window.SoulDesign,P=env.window.SoulDesignData.points;
const apply=(m,p)=>({x:m.a*p[0]+m.c*p[1]+m.e,y:m.b*p[0]+m.d*p[1]+m.f});
for(let i=0;i<80;i++)for(const air of [0,1])for(const skill of [null,{k:'w',age:i/79*.52}]){
 const f={x:300,y:400,dir:1,gait:i/80*Math.PI*2,runWeight:1-air,airWeight:air,lean:.1,vy:-500,action:skill,soulMotion:{swing:Math.sin(i/80*Math.PI*2)*.36,arm:4}};
 const pose=D.deformed(f,D.motionOptions(f)),outline=D.outlineFor(pose);
 for(const b of D.armBindings)for(let j=b.first;j<=b.last;j++){const q=apply(pose.parts[b.part].matrix,P[j]);assert.ok(Math.hypot(outline[j].x-q.x,outline[j].y-q.y)<1e-9,'both edges of each arm use the same rigid transform');}
 for(let j=0;j<P.length;j++)if(P[j][1]<145&&!D.armBindings.some(b=>j>=b.first&&j<=b.last)){const q=apply(pose.root,P[j]);assert.ok(Math.hypot(outline[j].x-q.x,outline[j].y-q.y)<1e-9,'swing cannot pull torso/hair vertices');}
}
// Capture actual Canvas drawImage transforms from held and released W frames.
function context(){let m=[1,0,0,1,0,0],stack=[],images=[];return {images,save(){stack.push(m.slice());},restore(){m=stack.pop();},transform(a,b,c,d,e,f){const [A,B,C,D,E,F]=m;m=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];},translate(x,y){this.transform(1,0,0,1,x,y);},scale(x,y){this.transform(x,0,0,y,0,0);},rotate(a){this.transform(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);},drawImage(...args){images.push({matrix:m.slice(),args:args.slice(1)});},fill(){},beginPath(){},arc(){}};}
const drawBladeSource=fs.readFileSync('web/game.js','utf8').split('\n').find(l=>l.startsWith('function drawBlade('));
for(const dir of [-1,1])for(const lean of [-.23,0,.23]){
 const f={x:300,y:400,dir,gait:1.8,runWeight:.3,airWeight:.9,vy:-400,lean,action:{k:'w',age:.18},spinPhase:0,spinBlend:0,soulMotion:{arm:3,swing:.1,bounce:2,weapon:.1}};
 const held=context();env.window.drawSoul(held,f,0,false);const launch=D.weaponLaunch(f);f.blade={from:launch.tip.x,fromY:launch.tip.y,fromAngle:launch.angle,dir:launch.dir,x:f.x+dir*600,y:500,age:0};
 const released=context();Object.assign(env,{ctx:released,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),colors:{soul:'#651d1e'},line(){}});vm.runInContext(drawBladeSource,env);env.drawBlade(f);
 assert.equal(held.images.length,1);assert.equal(released.images.length,1);
 held.images[0].matrix.forEach((n,i)=>assert.ok(Math.abs(n-released.images[0].matrix[i])<1e-7,'W release must preserve held sword transform, including facing'));
 assert.deepEqual(held.images[0].args,released.images[0].args);
}
console.log('PASS 320 arm poses preserve source limb shape without pulling torso; W release matches held image in both facings');
// E rotates one sword rather than cross-fading two separate held blades.
for(const dir of [-1,1])for(const age of [0,.1,.25,.5,2.49]){const f={x:300,y:400,dir,gait:0,runWeight:0,airWeight:0,lean:0,spinBlend:0,spinPhase:0,action:{k:'e',age,duration:2.5},soulMotion:{}};const ctx=context();env.window.drawSoul(ctx,f,age,false);assert.equal(ctx.images.length,1,'one sword throughout E entry/hold');if(age>=.5){const m=ctx.images[0].matrix,d=env.window.SoulDesignData,dx=d.tip[0]-d.wrist[0],dy=d.tip[1]-d.wrist[1];assert.ok(Math.abs(m[0]*dx+m[2]*dy)<1e-7,'full E blade is vertical');assert.ok(m[1]*dx+m[3]*dy<0,'full E blade points upward');}}
for(const eTail of [.1,.35,.65]){const f={x:300,y:400,dir:1,gait:0,runWeight:0,airWeight:0,lean:0,spinBlend:0,action:null,soulMotion:{eTail,eRelease:1,eFog:.56}};const ctx=context();env.window.drawSoul(ctx,f,eTail,false);assert.equal(ctx.images.length,1,'one sword throughout E reveal');}
console.log('PASS E single-sword entry/exit and upright direction in both facings');
