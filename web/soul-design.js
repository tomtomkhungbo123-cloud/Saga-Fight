// One approved contour across idle, running, and airborne poses.
(()=>{'use strict';
const D=window.SoulDesignData,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),pivot=155,visualScale=.8;
const body=new Path2D();D.points.forEach((p,i)=>i?body.lineTo(...p):body.moveTo(...p));body.closePath();
const blade=new Image(),ready=new Promise(resolve=>{blade.onload=resolve;blade.onerror=resolve;});blade.src='soul-design-blade.png?v=approved1';
const point=a=>({x:a[0],y:a[1]}),SOURCE_GRIP=point(D.wrist),S={x:130.5,y:108.5},H=point(D.freeWrist),FS={x:85.7,y:108},FH=point(D.wrist);
const weaponTipOffset={x:SOURCE_GRIP.x-D.tip[0],y:D.tip[1]-SOURCE_GRIP.y};
const rest=D.rest.map(r=>({hip:point(r.hip),knee:point(r.knee),ankle:point(r.ankle)}));
function rigid(a,b,A,B){const angle=Math.atan2(B.y-A.y,B.x-A.x)-Math.atan2(b.y-a.y,b.x-a.x),c=Math.cos(angle),s=Math.sin(angle);return {a:c,b:s,c:-s,d:c,e:A.x-c*a.x+s*a.y,f:A.y-s*a.x-c*a.y};}
function apply(m,p){return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};}
function rotation(p,angle){const c=Math.cos(angle),s=Math.sin(angle);return {a:c,b:s,c:-s,d:c,e:p.x-c*p.x+s*p.y,f:p.y-s*p.x-c*p.y};}
function armWrist(target,shoulder=S,wrist=H){const dx=target.x-shoulder.x,dy=target.y-shoulder.y,l=Math.hypot(dx,dy)||1,len=Math.hypot(wrist.x-shoulder.x,wrist.y-shoulder.y);return {x:shoulder.x+dx/l*len,y:shoulder.y+dy/l*len};}
function weapon(ctx,wrist=H,angle=0,bloom=true){if(!blade.width)return;const [x,y,w,h]=D.weaponRect;ctx.save();ctx.translate(wrist.x,wrist.y);ctx.rotate(angle);ctx.scale(-1,1);ctx.translate(-SOURCE_GRIP.x,-SOURCE_GRIP.y);if(bloom){ctx.shadowColor='#ef5268';ctx.shadowBlur=2;}ctx.drawImage(blade,x,y,w,h);ctx.restore();}
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function turnPoint(p,pivot,angle){const c=Math.cos(angle),s=Math.sin(angle),x=p.x-pivot.x,y=p.y-pivot.y;return {x:pivot.x+x*c-y*s,y:pivot.y+x*s+y*c};}
// Contour intervals follow each complete arm from shoulder to armpit.
// Spatial thresholds must not select the torso or leave the inner arm behind.
const armBindings=[{first:1605,last:1930,pivot:FS,hand:FH,part:6},{first:270,last:555,pivot:S,hand:H,part:5}];
function throwAngle(age){if(age<.075)return -.16*smooth(age/.075);if(age<.18)return -.16+1.21*smooth((age-.075)/.105);if(age<.27)return 1.05+.08*smooth((age-.18)/.09);return 1.13*(1-smooth((age-.27)/.25));}
// Right-hand combo: descending cut, returning rising cut, straight thrust.
function normalArc(n,q){q=clamp(q,0,1);if(n===3){const hx=118-21.5*q,hy=116,angle=Math.PI-Math.atan2(weaponTipOffset.y,weaponTipOffset.x),armAngle=Math.atan2(hy-S.y,hx-S.x)-Math.atan2(H.y-S.y,H.x-S.x),dx=weaponTipOffset.x,dy=weaponTipOffset.y;return {hx,hy,armAngle,angle,thrust:true,tip:[hx+dx*Math.cos(angle)-dy*Math.sin(angle),hy+dx*Math.sin(angle)+dy*Math.cos(angle)]};}const cuts={1:[2.40,1.00,3.10,1.45],2:[1.00,2.40,1.45,3.10],3:[2.65,.85,3.40,1.15]},v=cuts[n]||cuts[1],armAngle=v[0]+(v[1]-v[0])*q,angle=v[2]+(v[3]-v[2])*q,wrist=turnPoint(H,S,armAngle),dx=weaponTipOffset.x,dy=weaponTipOffset.y;return {hx:wrist.x,hy:wrist.y,armAngle,angle,tip:[wrist.x+dx*Math.cos(angle)-dy*Math.sin(angle),wrist.y+dx*Math.sin(angle)+dy*Math.cos(angle)]};}
function normalFrame(f){const a=f.action;if(a?.k!=='attack')return {hx:H.x,hy:H.y,armAngle:0,angle:0,q:0,trail:0};
 const startup=a.startup??[.12,.13,.18][(a.n||1)-1],duration=a.duration??[.32,.35,.50][(a.n||1)-1],start=startup*.65,end=startup+.07,age=a.age||0,q=smooth((age-start)/(end-start)),cut=normalArc(a.n,q);
 let armAngle=cut.armAngle,angle=cut.angle;
 if(a.n===3){let hx=cut.hx,hy=cut.hy;if(age<start){const from=a.poseFrom||{hx:H.x,hy:H.y,angle:0},b=smooth(age/start);hx=from.hx+(cut.hx-from.hx)*b;hy=from.hy+(cut.hy-from.hy)*b;angle=from.angle+(cut.angle-from.angle)*b;}else if(age>end){const b=smooth((age-end)/Math.max(.01,duration-end));hx+=(H.x-hx)*b;hy+=(H.y-hy)*b;angle*=1-b;}const dx=weaponTipOffset.x,dy=weaponTipOffset.y;return {hx,hy,armAngle:Math.atan2(hy-S.y,hx-S.x)-Math.atan2(H.y-S.y,H.x-S.x),angle,q,thrust:true,trail:age<start?0:1-smooth((age-end)/.10),tip:[hx+dx*Math.cos(angle)-dy*Math.sin(angle),hy+dx*Math.sin(angle)+dy*Math.cos(angle)]};}
 if(age<start){const from=a.poseFrom||{armAngle:0,angle:0},blend=smooth(age/start);armAngle=from.armAngle+(cut.armAngle-from.armAngle)*blend;angle=from.angle+(cut.angle-from.angle)*blend;}
 else if(age>end){const recover=smooth((age-end)/Math.max(.01,duration-end));armAngle*=1-recover;angle*=1-recover;}
 let wrist=turnPoint(H,S,armAngle);if(age<start&&a.poseFrom?.thrust){const b=smooth(age/start),prepared=normalArc(a.n,0);wrist={x:a.poseFrom.hx+(prepared.hx-a.poseFrom.hx)*b,y:a.poseFrom.hy+(prepared.hy-a.poseFrom.hy)*b};}
 const dx=weaponTipOffset.x,dy=weaponTipOffset.y;
 return {hx:wrist.x,hy:wrist.y,armAngle,angle,q,trail:age<start?0:1-smooth((age-end)/.10),tip:[wrist.x+dx*Math.cos(angle)-dy*Math.sin(angle),wrist.y+dx*Math.sin(angle)+dy*Math.cos(angle)]};
}
function armArticulation(wrist){const elbow={x:(S.x+H.x)*.5,y:(S.y+H.y)*.5},length=Math.hypot(H.x-S.x,H.y-S.y)*.5,dx=wrist.x-S.x,dy=wrist.y-S.y,d=Math.max(.001,Math.hypot(dx,dy)),bend=Math.sqrt(Math.max(0,length*length-d*d*.25)),joint={x:(S.x+wrist.x)*.5+dy/d*bend,y:(S.y+wrist.y)*.5-dx/d*bend};return {elbow,joint,wrist,upper:rigid(S,elbow,S,joint),lower:rigid(elbow,H,joint,wrist)};}
function armVertex(p,rig){const dx=H.x-S.x,dy=H.y-S.y,u=((p.x-S.x)*dx+(p.y-S.y)*dy)/(dx*dx+dy*dy),C={x:S.x+u*dx,y:S.y+u*dy},a=apply(rig.upper,C),b=apply(rig.lower,C),t=smooth((u-.34)/.32),aa=Math.atan2(rig.upper.b,rig.upper.a),bb=Math.atan2(rig.lower.b,rig.lower.a),angle=aa+Math.atan2(Math.sin(bb-aa),Math.cos(bb-aa))*t,px=p.x-C.x,py=p.y-C.y;return {x:a.x+(b.x-a.x)*t+px*Math.cos(angle)-py*Math.sin(angle),y:a.y+(b.y-a.y)*t+px*Math.sin(angle)+py*Math.cos(angle)};}
function motionOptions(f){const en=window.SoulMotion?.spinView(f).amount??0,weight=(f.runWeight||0)*(1-en*.65),gait=f.gait||0;return {weight,air:f.airWeight||0,bob:f.soulMotion?.bounce??(6+1.2*Math.sin(gait*2))*weight+(f.soulMotion?.land||0)*2.5,run:Math.sin(gait)*weight,en};}
function deformed(f,o){const weight=o.weight||0,air=o.air||0,lean=clamp(f.lean||0,-.30,.30)*(1-(o.en||0)*.85),bob=o.bob||0,en=o.en||0,run=o.run||0,a=f.action,age=a?.age||0,rig=f.soulMotion||{};
 const root=rotation({x:110,y:pivot},-lean);root.f+=bob;
 const attack=o.attack??(a?.k==='attack'?normalFrame(f):null),throwing=a?.k==='w',swing=rig.swing??run*.3;
 const heldAngle=throwing?throwAngle(age):-swing*.42+(rig.arm||0)*.006;
 const target=throwing?turnPoint(H,S,heldAngle):attack?{x:attack.hx,y:attack.hy}:turnPoint(H,S,heldAngle-en*1.10-(o.slam||0)*.3);
 const wrist=attack?target:armWrist(target),armRig=attack?armArticulation(wrist):null,free=turnPoint(FH,FS,swing+(rig.arm||0)*.012+air*.10+en*.55);
 const poses=rest.map((r,side)=>weight+air<.003?{hip:apply(root,r.hip),knee:apply(root,r.knee),ankle:apply(root,r.ankle)}:window.SoulMotion.solveLeg(side,f.gait||0,weight,air,lean,bob,f.vy||0,rig.airPose));
 const parts=[];for(const side of [1,0]){const p=poses[side],r=rest[side];parts.push({matrix:rigid(r.knee,r.ankle,p.knee,p.ankle)});parts.push({matrix:rigid(r.hip,r.knee,p.hip,p.knee)});}
 parts.push({matrix:root});

 parts.push({matrix:rigid(S,H,apply(root,S),apply(root,wrist))});parts.push({matrix:rigid(FS,FH,apply(root,FS),apply(root,free))});
 return {parts,poses,root,wrist,armRig,points:poses.flatMap(p=>[p.hip,p.knee,p.ankle]).concat([apply(root,wrist),apply(root,free)]),freeWrist:free,weaponAngle:throwing?throwAngle(age):attack?attack.angle:-1.05*en+run*.07+(rig.weapon||0)*(1-en)-(o.slam||0)*.8};
}
// Use the approved outline in every pose. Rotate cross-sections around the
// fixed-length skeleton; unlike weighted XY skinning, widths never collapse.
function outlineFor(pose){
 const angles=pose.poses.map((p,i)=>{const r=rest[i];return [Math.atan2(p.knee.y-p.hip.y,p.knee.x-p.hip.x)-Math.atan2(r.knee.y-r.hip.y,r.knee.x-r.hip.x),Math.atan2(p.ankle.y-p.knee.y,p.ankle.x-p.knee.x)-Math.atan2(r.ankle.y-r.knee.y,r.ankle.x-r.knee.x)];});
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
 return D.points.map(([x,y],index)=>{
  const p={x,y},base=apply(pose.root,p);
  const binding=armBindings.find(b=>index>=b.first&&index<=b.last);
  if(binding){if(binding.part===5&&pose.armRig)return apply(pose.root,armVertex(p,pose.armRig));return apply(pose.parts[binding.part].matrix,p);}
  if(y<145)return base;
  const side=x<110.4+(y-158)*.215?0:1,r=rest[side],a=angles[side];
  const lower=smooth((y-r.knee.y+12)/24),anchor=y<r.knee.y?r.hip:r.knee,end=y<r.knee.y?r.knee:r.ankle,t=(y-anchor.y)/(end.y-anchor.y),cx=mix(anchor.x,end.x,t),C={x:cx,y};
  const m1=pose.parts[side?1:3].matrix,m2=pose.parts[side?0:2].matrix;
  const A=apply(m1,C),B=apply(m2,C),angle=mix(a[0],a[1],lower),width=x-cx;
  const joint={x:mix(A.x,B.x,lower)+Math.cos(angle)*width,y:mix(A.y,B.y,lower)+Math.sin(angle)*width};
  const hipBlend=smooth((y-145)/20);
  return {x:mix(base.x,joint.x,hipBlend),y:mix(base.y,joint.y,hipBlend)};
 });
}
function weaponLaunch(f){
 const o=motionOptions(f),pose=deformed(f,o),en=o.en,outer=Math.sin(f.spinPhase||0)*en*.045,rootAngle=Math.atan2(pose.root.b,pose.root.a);
 const local=apply(pose.root,pose.wrist),grip0=turnPoint(local,{x:110,y:240},outer),dir=f.dir||1;
 const grip={x:f.x-visualScale*dir*(1+en*.08)*(grip0.x-110),y:f.y+visualScale*(en*4+(1-en*.13)*(grip0.y-240))},angle=pose.weaponAngle+rootAngle+outer,dx=weaponTipOffset.x,dy=weaponTipOffset.y;
 const tx=dx*Math.cos(angle)-dy*Math.sin(angle),ty=dx*Math.sin(angle)+dy*Math.cos(angle);
 return {grip,tip:{x:grip.x-visualScale*dir*tx,y:grip.y+visualScale*ty},angle,dir};
}
// Rigid 3D yaw of the approved outline with a shallow extruded volume.
// A side view keeps thickness instead of scaling the whole character to zero.
function projectSpin(p,angle,z=0){const c=Math.cos(angle),s=Math.sin(angle),x=p.x-110;return {x:110+x*c+z*s,y:p.y,z:-x*s+z*c};}
// Project separate anatomical contours as elliptical cross-sections. The former
// front/back extrusion joined rotated arms across the torso and enlarged diagonals.
// sqrt(cos² + ratio² sin²) is bounded by 1, so a turn cannot inflate a section.
function spinContour(points,angle,ratio=.65,limb=false){
 const c=Math.cos(angle),ys=points.map(p=>p.y),lo=Math.min(...ys),hi=Math.max(...ys),rows=[];
 for(let top=lo;top<hi;top+=.5){const h=Math.min(.5,hi-top),y=top+h*.5,cuts=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y))cuts.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));}cuts.sort((a,b)=>a-b);
  for(let i=0;i+1<cuts.length;i+=2){const center=(cuts[i]+cuts[i+1])*.5,radius=(cuts[i+1]-cuts[i])*.5,cap=limb?5.5:20-7*smooth((y-90)/25)-5.5*smooth((y-155)/35),half=Math.hypot(radius*c,Math.min(radius*ratio,cap)*Math.sin(angle));rows.push({x:110+(center-110)*c-half,y:top,w:half*2,h:h+.015});}
 }
 return rows;
}
// Simplify only the spin sampling boundary once; idle keeps every approved point.
const spinParts=(()=>{const groups=[D.points.map((p,i)=>i).filter(i=>!armBindings.some(b=>i>=b.first&&i<=b.last)),...armBindings.map(b=>Array.from({length:b.last-b.first+1},(_,i)=>b.first+i))];return groups.map(indices=>{const keep=new Set([0,indices.length-1]),stack=[[0,indices.length-1]];while(stack.length){const [a,b]=stack.pop(),A=D.points[indices[a]],B=D.points[indices[b]],dx=B[0]-A[0],dy=B[1]-A[1],length=dx*dx+dy*dy;let best=.12**2,hit=-1;for(let j=a+1;j<b;j++){const P=D.points[indices[j]],t=length?clamp(((P[0]-A[0])*dx+(P[1]-A[1])*dy)/length,0,1):0,d=(P[0]-A[0]-t*dx)**2+(P[1]-A[1]-t*dy)**2;if(d>best){best=d;hit=j;}}if(hit>=0){keep.add(hit);stack.push([a,hit],[hit,b]);}}return [...keep].sort((a,b)=>a-b).map(i=>indices[i]);});})();
function spinShapes(f,o,angle){
 const pose=deformed(f,o),all=outlineFor(pose),torso=spinParts[0].map(i=>all[i]),shapes=[spinContour(torso,angle,.70)];
 for(let part=0;part<armBindings.length;part++){const binding=armBindings[part],arm=spinParts[part+1].map(i=>all[i]);shapes.push(spinContour(arm,angle,.80,true));const q=apply(pose.root,binding.pivot),joint=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;joint.push({x:q.x+6*Math.cos(a),y:q.y+6*Math.sin(a)});}shapes.push(spinContour(joint,angle,.80,true));}
 return {pose,shapes};
}
function drawSpin(ctx,f,o,angle){const {pose,shapes}=spinShapes(f,o,angle);
 const m=pose.root,w=apply(m,pose.wrist),depth=projectSpin(w,angle).z;
 function blade(){if(f.blade)return;const c=Math.cos(angle);if(Math.abs(c)>.035){ctx.save();ctx.translate(110,0);ctx.scale(c,1);ctx.translate(-110,0);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);weapon(ctx,pose.wrist,pose.weaponAngle,o.bloom);ctx.restore();}else{const q=projectSpin(w,angle);ctx.save();ctx.fillStyle='#ff6485';ctx.beginPath();ctx.ellipse(q.x,q.y,2.2,8,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
 if(depth<0)blade();ctx.fillStyle=D.bodyColor;
 for(const points of shapes){const shape=new Path2D();for(const p of points)shape.rect(p.x,p.y,p.w,p.h);ctx.fill(shape);}
 if(depth>=0)blade();
}
function draw(ctx,f,o={}){
 const pose=deformed(f,o),points=outlineFor(pose);ctx.fillStyle=D.bodyColor;
 const rootAngle=Math.atan2(pose.root.b,pose.root.a),separate=armBindings.some(b=>Math.abs(Math.atan2(pose.parts[b.part].matrix.b,pose.parts[b.part].matrix.a)-rootAngle)>1e-7);
 const shape=new Path2D();let started=false;
 points.forEach((p,i)=>{if(separate&&armBindings.some(b=>i>=b.first&&i<=b.last))return;if(started)shape.lineTo(p.x,p.y);else{shape.moveTo(p.x,p.y);started=true;}});shape.closePath();ctx.fill(shape);
 for(const binding of separate?armBindings:[]){const arm=new Path2D();for(let i=binding.first;i<=binding.last;i++){const p=points[i];if(i===binding.first)arm.moveTo(p.x,p.y);else arm.lineTo(p.x,p.y);}arm.closePath();ctx.fill(arm);const q=apply(pose.root,binding.pivot);ctx.beginPath();ctx.arc(q.x,q.y,6,0,Math.PI*2);ctx.fill();}
 if(!f.blade){const m=pose.root;ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);weapon(ctx,pose.wrist,pose.weaponAngle,o.bloom);ctx.restore();}
}
window.SoulDesign={draw,drawSpin,projectSpin,spinContour,spinShapes,weapon,deformed,outlineFor,armWrist,armBindings,normalArc,normalFrame,motionOptions,weaponLaunch,weaponTipOffset,heldWrist:H,visualScale,ready,data:D,bodyPath:body};
})();
