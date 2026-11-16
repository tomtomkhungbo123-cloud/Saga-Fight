(()=>{
const {CONFIG,NORMALS,QCRYSTALS}=window.AetherBase;const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};let quality='high';const settings={high:{shards:12},medium:{shards:7},low:{shards:3}};
'use strict';
// Animation-only, canonical facing right. Bone lengths never depend on a pose.
const AETHER_ARM={shoulder:{x:21,y:-143},upper:27,fore:23};
const AETHER_REAR_ARM={shoulder:{x:-15,y:-143},elbow:{x:-29,y:-120},wrist:{x:-6,y:-109}};
function aetherEase(u){u=Math.max(0,Math.min(1,u));return u*u*(3-2*u)}
function aetherArmIK(target){
 const s=AETHER_ARM.shoulder,dx=target.x-s.x,dy=target.y-s.y,raw=Math.hypot(dx,dy);
 const d=Math.max(Math.abs(AETHER_ARM.upper-AETHER_ARM.fore)+.1,Math.min(AETHER_ARM.upper+AETHER_ARM.fore-.4,raw));
 const nx=raw?dx/raw:1,ny=raw?dy/raw:0,w={x:s.x+nx*d,y:s.y+ny*d};
 const a=(AETHER_ARM.upper**2-AETHER_ARM.fore**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,AETHER_ARM.upper**2-a*a));
 // Positive perpendicular keeps the elbow below the casting forearm, in both facings.
 return {shoulder:s,elbow:{x:s.x+nx*a-ny*h,y:s.y+ny*a+nx*h},wrist:w};
}
function aetherPose(action,airborne=false){
 const idle={x:44,y:airborne?-140:-135};let target=idle,cast=0;
 if(action){const u=Math.max(0,Math.min(1,action.t/action.duration));let frames;
  if(action.k==='attack'){
   const n=action.n||1;
   // Ground normals scoop low then flick upward; aerial normals keep the forward shot.
   const wind=airborne?(n===1?[34,-145]:n===2?[33,-166]:[34,-157]):(n===1?[32,-103]:n===2?[28,-99]:[39,-107]);
   const release=airborne?(n===1?[68,-135]:n===2?[60,-163]:[63,-119]):(n===1?[59,-147]:n===2?[46,-169]:[66,-153]);
   const follow=airborne?(n===1?[66,-133]:n===2?[64,-151]:[65,-128]):(n===1?[62,-159]:n===2?[49,-179]:[64,-167]);
   frames=[[0,idle.x,idle.y],[.16,...wind],[.17/.46,...release],[.54,...follow],[1,idle.x,idle.y]];
  }else if(action.k==='q')frames=[[0,idle.x,idle.y],[.46,42,-167],[.72,47,-158],[1,idle.x,idle.y]];
  else if(action.k==='w')frames=[[0,idle.x,idle.y],[.38,34,-158],[.5/.8,59,-124],[.8,58,-124],[1,idle.x,idle.y]];
  else if(action.k==='r')frames=[[0,idle.x,idle.y],[.35,32,-181],[.72,37,-180],[1,idle.x,idle.y]];
  if(frames){for(let i=1;i<frames.length;i++)if(u<=frames[i][0]){const a=frames[i-1],b=frames[i],v=aetherEase((u-a[0])/(b[0]-a[0]));target={x:a[1]+(b[1]-a[1])*v,y:a[2]+(b[2]-a[2])*v};break}}
 }
 const arm=aetherArmIK(target);
 return {front:arm,rear:AETHER_REAR_ARM,palm:{x:arm.wrist.x+4,y:arm.wrist.y-1},crystal:{x:arm.wrist.x+10,y:arm.wrist.y-25}};
}
if(typeof module!=='undefined')module.exports={AETHER_ARM,AETHER_REAR_ARM,aetherArmIK,aetherPose};

'use strict';
const LIQUID_TRAVEL=(()=>{
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},spacing=20,spikeLife=.38;
 let atlas=null;
 function phase(t,c){const end=c.transition+c.duration;if(t<c.transition)return {liquid:ease(t/c.transition),enter:true,exit:false};if(t<end)return {liquid:1,enter:false,exit:false};return {liquid:1-ease((t-end)/c.transition),enter:false,exit:true}}
 function mapHeight(h,liquid){const delay=.35*clamp(h/240),u=clamp((liquid-delay)/(1-delay));return h*Math.pow(1-u,1.25)}
 function advance(travel,x,dt,c){
  travel.spikes=travel.spikes||[];for(const s of travel.spikes)s.age+=dt;travel.spikes=travel.spikes.filter(s=>s.age<spikeLife);
  const old=travel.lastX??x,dx=x-old,dist=Math.abs(dx),dir=Math.sign(dx);travel.lastX=x;
  if(travel.t<c.transition*.6||travel.t>=c.transition+c.duration){travel.distance=0;return}
  let remain=travel.distance||0;
  if(dist>0){let at=spacing-remain;while(at<=dist+1e-9){travel.spikes.push({x:old+dir*at+dir*30,dir,age:0,index:travel.serial||0});travel.serial=(travel.serial||0)+1;at+=spacing}travel.distance=(remain+dist)%spacing;if(travel.distance<1e-7||spacing-travel.distance<1e-7)travel.distance=0;}
  if(travel.spikes.length>12)travel.spikes.splice(0,travel.spikes.length-12);
 }
 function spikeState(s){return {height:(12+s.index%3*3)*ease(s.age/.07)*(1-ease((s.age-.18)/.2)),alpha:1-ease((s.age-.24)/.14)}}
 function ensure(body,p,g,quality){
  if(!atlas){const normal=document.createElement('canvas'),white=document.createElement('canvas');normal.width=white.width=320;normal.height=white.height=280;atlas={normal,white,token:null,quality:null};}
  if(atlas.token!==g.travel||atlas.quality!==quality){
   const pose={...p,x:0,y:0,vx:0,dir:1},base={...g,t:g.t-g.travel.t,action:null,travel:null,q:null};
   for(const [canvas,color] of [[atlas.normal,'#94887c'],[atlas.white,'#fafff3']]){const a=canvas.getContext('2d');a.setTransform(1,0,0,1,0,0);a.clearRect(0,0,320,280);a.save();a.translate(160,258);body(a,pose,{...base,renderColor:color},quality);a.restore();}
   atlas.token=g.travel;atlas.quality=quality;
  }return atlas;
 }
 function pool(c,p,g,quality,liquid){
  if(liquid<=0)return;const speed=clamp(Math.abs(p.vx)/(CONFIG.speed*CONFIG.e.speed)),flow=Math.max(-1,Math.min(1,p.vx/(CONFIG.speed*CONFIG.e.speed))),w=(46+15*speed)*Math.sqrt(liquid);
  c.save();c.translate(p.x,0);c.globalAlpha=liquid;
  if(quality!=='low'){c.globalAlpha=liquid*.65;c.drawImage(glow,-94,-19,188,38);c.globalAlpha=liquid;}
  c.beginPath();c.moveTo(-w,2);c.bezierCurveTo(-w*.9,-3,-w*.5,-7,0,-7-speed*2);c.bezierCurveTo(w*.45,-8,w*.88,-4,w,1);c.bezierCurveTo(w*.5,5,-w*.65,5,-w,2);c.closePath();c.fillStyle='#efffeb';c.fill();
  poly(c,[[-w*.88,1],[-w*.3,-3],[w*.6,-3],[w,1],[w*.3,3]],'#cce6d5');
  c.strokeStyle='#fafff1';c.lineWidth=1.2;c.beginPath();c.moveTo(-w*.85,0);c.quadraticCurveTo(flow*12,-7,w*.9,0);c.stroke();
  if(speed<.12){for(let i=0;i<3;i++){const x=(i-1)*22,h=5+2*Math.sin(g.t*3+i);poly(c,[[x-8,0],[x+2,-h],[x+9,0]],'#f9fff2')}}
  if(liquid>.05&&liquid<.98){for(let i=0;i<(quality==='low'?2:4);i++){const u=(g.travel.t*3.2+i*.27)%1,x=(i-1.5)*13+Math.sin(i+g.t*4)*3,y=-22*(1-u)*(1-u);c.globalAlpha=liquid*(1-liquid)*2.4; c.beginPath();c.moveTo(x,y-5);c.bezierCurveTo(x+4,y,x+3,y+5,x,y+5);c.bezierCurveTo(x-3,y+5,x-4,y,x,y-5);c.fillStyle='#f2ffe9';c.fill();}}
  c.restore();
 }
 function draw(c,p,g,quality,body){const tr=g.travel,s=phase(tr.t,CONFIG.e),liquid=s.liquid;
  // World-anchored ridges stay where they grew; direction reversals only affect new ridges.
  for(const spike of tr.spikes||[]){const v=spikeState(spike);if(v.height<.1)continue;c.save();c.translate(spike.x,0);c.scale(spike.dir,1);c.globalAlpha=v.alpha*.9;
   if(quality==='high'){c.globalAlpha*=.3;c.drawImage(glow,-23,-33,46,46);c.globalAlpha=v.alpha*.9;}
   poly(c,[[-10,1],[17,-v.height],[9,1]],'#f8fff2');poly(c,[[-10,1],[17,-v.height],[1,-v.height*.2]],'#cae4d3');c.restore();
  }
  pool(c,p,g,quality,liquid);
  if(liquid>=.999)return;
  const cached=ensure(body,p,g,quality),step=quality==='low'?12:quality==='medium'?8:6,rootY=(tr.startY||0)*(1-ease(Math.min(1,tr.t/CONFIG.e.transition)));
  c.save();c.translate(p.x,-rootY);c.scale(p.dir,1);c.imageSmoothingEnabled=true;
  for(let row=0;row<258;row+=step){const bottom=Math.min(258,row+step),h=258-row,h2=258-bottom,top=mapHeight(h,liquid),low=mapHeight(h2,liquid);if(top<=5||top-low<.08)continue;
   const ratio=clamp(h/240),progress=clamp(liquid),spread=1+.8*progress*progress*Math.pow(1-ratio,2),shift=Math.sin(h*.065-g.t*7)*7*progress*progress*(1-ratio),tint=ease((clamp(liquid*6)-ratio*.3)/.25),dh=top-low+.35,dx=-160*spread+shift;
   if(tint<.999){c.globalAlpha=1;c.drawImage(cached.normal,0,row,320,bottom-row,dx,-top,320*spread,dh)}
   if(tint>.001){c.globalAlpha=tint;c.drawImage(cached.white,0,row,320,bottom-row,dx,-top,320*spread,dh)}
  }c.restore();
  // The floor surface covers the absorbed rows and joins the body into one liquid mass.
  pool(c,p,g,quality,liquid);
 }
 return {phase,mapHeight,advance,spikeState,draw,spacing,spikeLife};
})();
if(typeof module!=='undefined')module.exports=LIQUID_TRAVEL;

// Body and hair only. Arms are independent jointed silhouettes in rig.js.
const AETHER_BODY_OUTLINE=[[[2.6,-62.4],[1.3,-9.1],[0.0,-76.7],[2.6,-72.8]],[[-23.4,-72.8],[-27.3,-32.5],[-31.2,-14.3],[-18.2,-13.0],[-13.0,-16.9],[-7.8,-16.9],[-2.6,-2.6],[7.8,-2.6],[7.8,-9.1],[13.0,-15.6],[23.4,-18.2],[33.8,-16.9],[33.8,-39.0],[31.2,-46.8],[32.5,-49.4],[24.7,-80.6],[20.8,-114.4],[20,-128],[22,-138],[31.2,-144.3],[31.2,-152.1],[23.4,-149.5],[16.9,-149.5],[14.3,-152.1],[16.9,-154.7],[16.9,-158.6],[20.8,-158.6],[20.8,-165.1],[23.4,-165.1],[28.6,-171.6],[28.6,-192.4],[22.1,-191.1],[20.8,-196.3],[16.9,-197.6],[15.6,-201.5],[10.4,-201.5],[9.1,-196.3],[6.5,-195.0],[5.2,-201.5],[-1.3,-200.2],[-5.2,-195.0],[-6.5,-197.6],[-13.0,-200.2],[-13.0,-193.7],[-15.6,-189.8],[-15.6,-172.9],[-6.5,-153.4],[-23.4,-153.4],[-20.8,-137.8],[-16,-126],[-16,-109],[-18.2,-94.9],[-20.8,-92.3]]];

'use strict';
// All paths are original to Aether. Root at floor, +y points up in simulation.
const crystalPath=new Path2D('M 0 -25 L 15 -8 L 9 18 L -5 25 L -15 6 L -10 -16 Z');
const glow=document.createElement('canvas');glow.width=128;glow.height=128;{const c=glow.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(.25,'rgba(245,250,246,.2)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128)}
const meteorTrail=document.createElement('canvas');meteorTrail.width=96;meteorTrail.height=512;{const c=meteorTrail.getContext('2d'),length=c.createLinearGradient(0,0,0,512);length.addColorStop(0,'rgba(216,255,228,0)');length.addColorStop(.25,'rgba(216,255,228,.04)');length.addColorStop(.65,'rgba(224,255,233,.25)');length.addColorStop(.88,'rgba(243,255,240,.85)');length.addColorStop(1,'rgba(243,255,240,0)');c.fillStyle=length;c.fillRect(0,0,96,512);c.globalCompositeOperation='destination-in';const edge=c.createLinearGradient(0,0,96,0);edge.addColorStop(0,'rgba(255,255,255,0)');edge.addColorStop(.3,'rgba(255,255,255,.2)');edge.addColorStop(.5,'white');edge.addColorStop(.7,'rgba(255,255,255,.2)');edge.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=edge;c.fillRect(0,0,96,512);c.globalCompositeOperation='source-over';}
function drawMeteor(c,b,quality){const speed=Math.hypot(b.vx,b.v),stretch=1+Math.min(.65,speed/2200),angle=-Math.atan2(b.vx,b.v),length=160+Math.min(230,speed*.16),width=quality==='low'?65:100;
 c.save();c.translate(b.x,-b.y);c.rotate(angle);c.globalAlpha=.85;c.drawImage(meteorTrail,-width/2,-length,width,length-12);
 if(quality!=='low'){c.globalAlpha=.3;c.drawImage(meteorTrail,-width*.85,-length*1.06,width*1.7,length*1.06-8);c.globalAlpha=.5;c.drawImage(glow,-73,-93,146,186);}
 c.globalAlpha=1;c.scale(1,stretch);crystal(c,0,0,1.65,0,1,quality);c.restore();}
const impactRing=document.createElement('canvas');impactRing.width=impactRing.height=256;{const c=impactRing.getContext('2d'),g=c.createRadialGradient(128,128,0,128,128,128);for(const [at,alpha] of [[0,0],[.61,0],[.74,.08],[.82,.55],[.86,.85],[.91,.25],[1,0]])g.addColorStop(at,`rgba(229,255,232,${alpha})`);c.fillStyle=g;c.fillRect(0,0,256,256);}
function drawMeteorImpact(c,f,quality){const u=clamp(f.t/f.life,0,1),fade=Math.pow(1-u,1.6),r=f.radius;c.save();c.translate(f.x,0);
 // Brief contact flash flows into soft elliptical pressure waves on the floor.
 const flash=Math.exp(-f.t*20);c.globalAlpha=flash*.9;c.drawImage(glow,-r*.8,-r*.44,r*1.6,r*.88);
 c.globalAlpha=fade*.32;c.drawImage(glow,-r*(.5+u),-20,r*(1+2*u),40);
 const count=quality==='low'?1:quality==='medium'?2:3;
 for(let i=0;i<count;i++){const age=u-i*.14;if(age<0)continue;const v=clamp(age/(1-i*.14),0,1),spread=1-Math.pow(1-v,2.4),rx=r*(.18+1.24*spread),ry=rx*.23;c.globalAlpha=Math.pow(1-v,1.5)*(.85-i*.17)*Math.min(1,age/.045);c.drawImage(impactRing,-rx,-ry,rx*2,ry*2);}
 const shards=quality==='low'?3:quality==='medium'?6:9;
 for(let i=0;i<shards;i++){const a=i*2.39996,age=f.t,vx=Math.cos(a)*(90+(i%3)*35),vy=90+(i%4)*22,x=vx*age,y=-vy*age+210*age*age;if(y>3)continue;c.globalAlpha=fade;crystal(c,x,y,.075*(1-u*.5),a+age*(i%2?5:-5),1,'low');}
 c.restore();}
function poly(c,pts,fill){c.beginPath();for(let i=0;i<pts.length;i++)i?c.lineTo(...pts[i]):c.moveTo(...pts[i]);c.closePath();c.fillStyle=fill;c.fill()}
function crystal(c,x,y,s=1,angle=0,alpha=1,quality='high'){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;if(quality!=='low')c.drawImage(glow,-58*s,-64*s,116*s,128*s);c.scale(s,s);c.fillStyle='#ffffff';c.fill(crystalPath);poly(c,[[0,-25],[15,-8],[9,18],[1,5]],'#f3f5f2');poly(c,[[0,-25],[1,5],[-5,25],[-15,6],[-10,-16]],'#ffffff');c.restore()}
function limb(c,sx,sy,ex,ey,hx,hy,w,color){c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.lineTo(hx,hy);c.stroke()}
function drawQCrystal(c,pose,quality,scale=1,speed=1050,flight=false){
 c.save();c.translate(pose.x,-pose.y);c.rotate(-pose.angle);c.scale(scale,scale);const pts=QCRYSTALS.shape(speed),center=NORMALS.centroid(pts);
 if(quality!=='low')c.drawImage(glow,center.x-65,-center.y-36,130,72);
 if(flight){const tail=Math.min(165,55+speed*.065);c.globalAlpha*=.22;poly(c,[[-23,-7],[-tail,0],[-23,7]],'#efffee');c.globalAlpha/=.22;}
 poly(c,pts.map(p=>[p[0],-p[1]]),'#ffffff');poly(c,[[44*(.9+.2*Math.min(1,speed/1050)),0],[-8,0],[-35,5],[-8,11]],'#d6eadb');c.restore();
}
function drawAetherBody(c,p,g,quality){const t=g.t,a=g.action;
 const bob=Math.sin(t*2.8)*4,lean=clamp(p.vx/CONFIG.speed,-1,1)*.07;const airborne=p.y>1;
 c.save();c.translate(p.x,-p.y);
 c.translate(0,-16-bob);c.scale(p.dir,1);c.rotate(lean*p.dir);// Body outline is independent of the casting arm and the arm tucked behind the back.
 const col=g.renderColor||'#94887c',pose=g.finisherPose?{front:{shoulder:{x:21,y:-143},elbow:{x:8,y:-119},wrist:{x:-14,y:-127}},rear:{shoulder:{x:-15,y:-143},elbow:{x:-13,y:-118},wrist:{x:10,y:-125}}}:aetherPose(a,airborne);
 const sway=Math.sin(t*2.8)*1.4-p.vx*.022;const liftCloth=clamp(p.vy/540,-1,1);
 function vertex(x,y){const cloth=smooth((y+97)/90),edge=.25+.75*clamp(Math.abs(x)/28,0,1);return [x+sway*cloth*edge,y+(airborne?(5+4*liftCloth)*cloth:0)];}
 function armShape(arm,palm=false){
  const s=arm.shoulder,e=arm.elbow,w=arm.wrist;
  // A tapered sleeve and forearm meet at the elbow, without moving torso vertices.
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=col;
  c.lineWidth=11;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(e.x,e.y);c.stroke();
  c.lineWidth=8.5;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(w.x,w.y);c.stroke();
  c.fillStyle=col;c.beginPath();c.arc(e.x,e.y,5.2,0,Math.PI*2);c.fill();
  if(palm){c.beginPath();c.ellipse(w.x+3.5,w.y-1,7,3.5,-.14,0,Math.PI*2);c.fill();}
 }
 // Rear wrist disappears under the torso: the hand stays tucked behind the waist.
 if(!g.finisherPose)armShape(pose.rear);
 c.beginPath();
 for(const outline of AETHER_BODY_OUTLINE){
  const first=vertex(...outline[0]),last=vertex(...outline[outline.length-1]);
  c.moveTo((first[0]+last[0])*.5,(first[1]+last[1])*.5);
  for(let i=0;i<outline.length;i++){
   const pt=vertex(...outline[i]),next=vertex(...outline[(i+1)%outline.length]);
   c.quadraticCurveTo(pt[0],pt[1],(pt[0]+next[0])*.5,(pt[1]+next[1])*.5);
  }c.closePath();
 }
 c.fillStyle=col;c.fill('evenodd');
 if(g.finisherPose){armShape(pose.rear);armShape(pose.front);}else armShape(pose.front,true);
 // Every crystal position is derived from the solved wrist, never from an unbounded target.
 const orb=pose.crystal;if(!g.finisherPose){
 if(a?.k==='attack'&&!a.fired&&airborne){const charge=smooth(a.t/CONFIG.attack.windup);crystal(c,orb.x+charge*9,orb.y,.12+.22*charge,-Math.PI/2,charge*.8,quality);}
 crystal(c,orb.x,orb.y,.47,-.18+Math.sin(t*2)*.08,1,quality);
 crystal(c,orb.x+14,orb.y-13,.105,-.3+Math.sin(t*1.8)*.1,1,quality);
 crystal(c,orb.x+13,orb.y+14,.14,-.5+Math.sin(t*2)*.1,1,quality);

 }c.restore();
}
function drawAether(c,p,g,quality){
 if(g.travel)LIQUID_TRAVEL.draw(c,p,g,quality,drawAetherBody);else drawAetherBody(c,p,g,quality);
 const t=g.t;
 if(g.q){const q=g.q,form=smooth(q.t/CONFIG.q.form),inRange=Math.hypot(g.enemy.x-p.x,g.enemy.y-p.y)<=CONFIG.q.range;for(let i=q.fired||0;i<CONFIG.q.count;i++){const prep=i===(q.fired||0)&&inRange?smooth((q.t-q.next+CONFIG.q.preload)/CONFIG.q.preload):0,target=i===(q.fired||0)&&q.aim?{x:q.aim.x,y:q.aim.y-85}:g.enemy,pose=QCRYSTALS.orbit(p,target,t,i,prep);drawQCrystal(c,pose,quality,QCRYSTALS.scale*form,1050,false)}}
}
function drawEnemy(c,e,g){c.save();c.translate(e.x,-e.y);c.scale(e.dir,1);const gait=Math.sin(g.t*9)*Math.min(1,Math.abs(e.vx)/150);c.fillStyle='#7d989c';c.beginPath();c.ellipse(0,-142,15,21,0,0,Math.PI*2);c.fill();limb(c,-10,-68,-16,-33,-18-gait*14,0,14,'#5d7a80');limb(c,10,-68,16,-33,18+gait*14,0,14,'#6e898d');poly(c,[[-20,-120],[18,-120],[23,-72],[-22,-69]],'#80989a');limb(c,-19,-113,-30,-85,-16,-65,11,'#69868b');limb(c,18,-112,33,-89,38,-103,11,'#8ea7a7');c.restore()}

'use strict';
const CAGE_VFX=(()=>{
 const outline=[[-55,10],[55,10],[64,-30],[48,-72],[18,-84],[-27,-79],[-62,-36]],hub=[0,-34],shatterDuration=.65;
 const clamp01=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp01(x);return x*x*(3-2*x)};
 function phase(age,duration=2){return {rise:1-Math.pow(1-clamp01(age/.22),3),crack:ease((age-duration+.24)/.24),broken:age>=duration,breakAge:Math.max(0,age-duration),fade:1-ease((age-duration-.3)/.35)}}
 function fragment(i,t){const a=outline[i],b=outline[(i+1)%outline.length],cx=(hub[0]+a[0]+b[0])/3,cy=(hub[1]+a[1]+b[1])/3,vx=cx*2.3+(i%2?13:-13),vy=-90-(i%3)*21;return {x:cx+vx*t,y:cy+vy*t+400*t*t,angle:(i%2?1:-1)*(1.1+i*.2)*t,cx,cy,points:[hub,a,b]}}
 function floorDust(c,age,quality,parity){const count=quality==='low'?4:9;for(let i=0;i<count;i++){if(i%2!==parity)continue;const t=age-.018-(i%3)*.018,life=.42+(i%3)*.06;if(t<0||t>life)continue;const side=i%2?-1:1,x=side*(55+(i%3)*7)+side*(35+(i%4)*10)*t,y=-(105+(i%4)*22)*t+390*t*t;if(y>0&&t>.2)continue;const size=3+(i%3);c.save();c.translate(x,y);c.rotate(i+t*(i%2?5:-4));c.globalAlpha*=1-ease((t-life+.1)/.1);poly(c,[[-size,-size*.5],[size*.7,-size],[size,size*.6],[-size*.4,size]],i%3?'#899182':'#aeb3a1');c.restore()}}
 function draw(c,f,time,quality='high',layer='front'){
  const age=Math.max(0,time-f.born),duration=Math.max(0,f.breakAt-f.born),s=phase(age,duration);
  c.save();c.translate(f.x,0);
  if(layer==='back'){
   if(!s.broken){c.globalAlpha=(quality==='low'?.58:.92)*s.rise;if(quality==='low')c.drawImage(glow,-92,-116,184,156);else c.drawImage(glow,-127,-150,254,224);if(quality==='high'){c.globalAlpha=.6*s.rise;c.drawImage(glow,-112,-22,224,44);}c.strokeStyle='#b9cfb3';c.lineWidth=1.4;c.beginPath();c.ellipse(0,0,56,9,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
    c.save();c.beginPath();c.rect(-160,-180,320,180);c.clip();c.translate(0,90*(1-s.rise));poly(c,[[-56,-30],[-47,-76],[-14,-90],[27,-86],[57,-54],[58,-24]],'#d5e7d5');c.restore();floorDust(c,age,quality,0);
   }c.restore();return;
  }
  if(!s.broken&&quality!=='low'){c.globalAlpha=.74*s.rise;c.drawImage(glow,-98,-117,196,158);c.globalAlpha=1;}
  // The foreground base overlaps the floor by 10 units to cover rounded toes and AA edges.
  c.save();c.beginPath();c.rect(-220,-200,440,212);c.clip();
  if(!s.broken){c.translate(0,84*(1-s.rise));poly(c,outline,'#fbfff6');poly(c,[[55,10],[64,-30],[48,-72],[26,-42],[22,10]],'#dfefdf');poly(c,[[-62,-36],[-27,-79],[18,-84],[48,-72],[26,-42],[-14,-37]],'#f0fae9');
   c.globalAlpha=.85;c.strokeStyle='#ffffff';c.lineWidth=1.6;c.beginPath();for(let i=0;i<outline.length;i++)i?c.lineTo(...outline[i]):c.moveTo(...outline[i]);c.closePath();c.stroke();c.globalAlpha=1;
   c.strokeStyle='#ffffff';c.lineWidth=1.2;c.beginPath();c.moveTo(-54,9);c.lineTo(53,9);c.stroke();
   if(s.crack>0){c.globalAlpha=s.crack*.75;c.strokeStyle='#75937f';c.lineWidth=1.1;c.beginPath();c.moveTo(-14,-78);c.lineTo(-5,-55);c.lineTo(-14,-39);c.lineTo(0,-20);c.lineTo(-5,10);c.moveTo(-14,-39);c.lineTo(-44,-35);c.lineTo(-55,-14);c.moveTo(0,-20);c.lineTo(23,-27);c.lineTo(40,0);c.stroke();c.globalAlpha=1;}
   floorDust(c,age,quality,1);
  }else if(s.breakAge<shatterDuration){const t=s.breakAge;c.globalAlpha=s.fade;
   if(quality!=='low'&&t<.16){c.globalAlpha*=.45*(1-t/.16);c.drawImage(glow,-110,-143,220,210);c.globalAlpha=s.fade;}
   for(let i=0;i<outline.length;i++){const part=fragment(i,t);c.save();c.translate(part.x,part.y);c.rotate(part.angle);if(quality==='high'){c.globalAlpha=s.fade*.36;c.drawImage(glow,-43,-43,86,86);c.globalAlpha=s.fade;}poly(c,part.points.map(p=>[p[0]-part.cx,p[1]-part.cy]),i%3===0?'#cbded0':i%3===1?'#fafff6':'#e4efdf');c.restore();}
   for(let i=0;i<(quality==='low'?3:7);i++){const vx=(i-3)*33,vy=-135-(i%3)*28,x=vx*t,y=-16+vy*t+420*t*t,size=2.5+i%3;c.save();c.translate(x,y);c.rotate(i+t*4);poly(c,[[-size,0],[0,-size],[size,0],[0,size*.6]],'#e1eddb');c.restore();}
  }c.restore();c.restore();
 }
 function windup(c,x,progress,quality){const u=clamp01(progress);c.save();c.translate(x,0);c.globalAlpha=.12+.22*u;c.strokeStyle='#d3e3ce';c.lineWidth=1;c.beginPath();c.ellipse(0,0,48,7,0,0,Math.PI*2);c.stroke();if(u>.45){c.beginPath();c.moveTo(-32,0);c.lineTo(-14,-3);c.lineTo(-3,0);c.moveTo(8,0);c.lineTo(19,-3);c.lineTo(35,0);c.stroke();}c.restore();}
 return {outline,phase,fragment,draw,windup,shatterDuration};
})();
if(typeof module!=='undefined')module.exports=CAGE_VFX;

'use strict';
const AETHER_FINISHER=(()=>{
 const duration=3.45,breakAt=3.1,clamp01=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp01(x);return x*x*(3-2*x)};
 const outline=[[0,-160],[103,-113],[126,75],[64,146],[-37,168],[-126,-21]],center=[0,0],satellites=[[-270,-117,.34],[-277,53,.4],[-200,125,.58],[-105,140,.48],[209,-98,.55],[-194,-1,.25],[-440,65,.4]];
 const cracks=[[[0,0],[-38,-31],[-57,-70],[-34,-112]],[[0,0],[44,-36],[59,-80],[103,-113]],[[0,0],[20,50],[64,80],[64,146]],[[0,0],[-44,53],[-37,100],[-37,168]],[[0,0],[-75,-7],[-126,-21]],[[44,-36],[79,-14],[115,11]],[[20,50],[-8,73],[-6,125]],[[-38,-31],[-74,-46],[-86,-70]]];
 let background=null,layer=null;
 function phase(t){return {crack:.28*ease((t-.85)/.23)+.33*ease((t-1.55)/.24)+.39*ease((t-2.28)/.28),burst:ease((t-breakAt)/.65),flash:ease((t-3.23)/.18),fade:t>=duration?0:ease((t-.1)/.18),done:t>=duration}}
 // Melanta's slightly elevated, leading-weapon-side view, shared by hero and crystal.
 function project(p,depth=0){const cy=Math.cos(.24),sy=Math.sin(.24),cp=Math.cos(.22),sp=Math.sin(.22),s=1+depth/360;return {x:(p.x*cy-depth*sy)*s,y:(p.y*cp+(p.x*sy+depth*cy)*sp)*s}}
 function view(c){c.transform(Math.cos(.24),Math.sin(.24)*Math.sin(.22),0,Math.cos(.22),0,0)}
 function bake(){const b=document.createElement('canvas');b.width=960;b.height=400;const c=b.getContext('2d'),g=c.createLinearGradient(0,400,960,0);g.addColorStop(0,'#192321');g.addColorStop(.5,'#35403c');g.addColorStop(1,'#49534a');c.fillStyle=g;c.fillRect(0,0,960,400);const light=c.createRadialGradient(680,95,0,680,95,370);light.addColorStop(0,'#b7c6aa35');light.addColorStop(1,'#a9bca000');c.fillStyle=light;c.fillRect(0,0,960,400);for(let i=0;i<11;i++){const x=-380+i*135,w=16+i%3*20;c.fillStyle=i%3?'#0f1b1930':'#b5c5a818';c.beginPath();c.moveTo(x,410);c.bezierCurveTo(x+260,245,x+460,100,x+700,-15);c.lineTo(x+700+w,-15);c.bezierCurveTo(x+440,155,x+270,310,x+w,410);c.closePath();c.fill()}return b;}
 function scene(c,t,quality,width=960,height=400){const p=phase(t),b=p.burst;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.clearRect(0,0,width,height);c.drawImage(background,0,0,width,height);c.save();c.translate((width-960)/2,(height-400)/2);const push=1+.035*ease((t-.25)/2.8);c.translate(480,200);c.scale(push,push);c.translate(-480,-200);
  if(quality!=='low'){for(let i=0;i<12;i++){c.globalAlpha=.08+.08*Math.sin(t+i);c.fillStyle='#d6e4c6';c.beginPath();c.arc((i*173)%960,30+(i*91)%340,1+i%2,0,Math.PI*2);c.fill()}c.globalAlpha=1;}
  c.save();c.translate(278,600);c.scale(2.45,2.45);view(c);drawAetherBody(c,{x:0,y:0,vx:0,vy:0,dir:1},{t:t*.35,action:null,finisherPose:true},quality);c.restore();
  c.save();c.translate(665,203);view(c);c.scale(1.1,1.1);c.rotate(.12);
  if(quality!=='low'){c.globalAlpha=(.65+.3*p.crack)*(1-b);c.drawImage(glow,-245,-260,490,520);c.globalAlpha=1;}
  if(!b){poly(c,outline,'#fffff8');c.strokeStyle='#718377';c.lineWidth=1.6;for(let i=0;i<cracks.length;i++){const progress=clamp01(p.crack*1.5-i*.07),points=cracks[i];if(!progress)continue;c.beginPath();c.moveTo(...points[0]);const n=progress*(points.length-1);for(let j=1;j<points.length;j++){const v=clamp01(n-j+1);if(v<=0)break;c.lineTo(points[j-1][0]+(points[j][0]-points[j-1][0])*v,points[j-1][1]+(points[j][1]-points[j-1][1])*v)}c.stroke();}}
  else for(let i=0;i<6;i++){const a=outline[i],z=outline[(i+1)%6],cx=(a[0]+z[0])/3,cy=(a[1]+z[1])/3;c.save();c.translate(cx*b*2,cy*b*2+60*b*b);c.rotate((i%2?1:-1)*b*.65);c.globalAlpha=Math.pow(1-b,1.3);poly(c,[center,a,z],'#fffff8');c.restore();}c.restore();
  for(let i=0;i<satellites.length;i++){const [x,y,size]=satellites[i],v=project({x:x*(1+b*.7),y:y*(1+b*.5)},i%2?15:35);crystal(c,665+v.x,203+v.y+Math.sin(t*1.2+i)*2,size*(1-b),i*.6+t*.025,1-b,quality)}c.restore();
 }
 function draw(c,w,h,t,quality='high'){if(!background)background=bake();if(!layer)layer=document.createElement('canvas');const s=Math.min(w/960,h/400),width=Math.ceil(w/s),height=Math.ceil(h/s);if(layer.width!==width||layer.height!==height){layer.width=width;layer.height=height}scene(layer.getContext('2d'),t,quality,width,height);const p=phase(t),veil=t<.1?ease(t/.1):1;c.save();c.clearRect(0,0,w,h);c.globalAlpha=veil;c.fillStyle='#101715';c.fillRect(0,0,w,h);c.globalAlpha=p.fade;c.drawImage(layer,(w-width*s)/2,(h-height*s)/2,width*s,height*s);c.globalAlpha=p.flash;c.fillStyle='white';c.fillRect(0,0,w,h);c.restore();}

 return {duration,breakAt,phase,project,draw};
})();
if(typeof module!=='undefined')module.exports=AETHER_FINISHER;

function drawNormal(c,b,alpha=1){c.save();c.translate(b.x,-b.y);c.scale(b.dir,1);c.globalAlpha*=alpha;const pts=NORMALS.shape(b);if(quality!=='low'){const halo=NORMALS.glowFrame(b);c.drawImage(glow,halo.x-halo.width/2,-halo.y-halo.height/2,halo.width,halo.height)}
 if(b.kind==='bolt'){const tail=Math.min(115,25+b.travel*.2);c.globalAlpha*=.3;poly(c,[[-15,7],[-tail,1],[-tail*1.2,0],[-15,-7]],'#e7fbe9');c.globalAlpha=alpha;}
 poly(c,pts.map(p=>[p[0],-p[1]]),'#fcfff8');
 if(b.kind==='wave'){const h=b.height*smooth(b.t/.12),l=Math.min(b.length,35+b.travel*.9);poly(c,[[-l,0],[0,0],[-l*.42,-h*.25],[-l*.57,-h*.12],[-l*.75,-h*.17]],'#c8dfcc');c.strokeStyle='rgba(236,255,231,.45)';c.lineWidth=1;c.beginPath();c.ellipse(-l*.45,0,l*.52,5,0,0,Math.PI*2);c.stroke();}else poly(c,[[0,0],[-b.length*.32,0],[-b.length,0],[-b.length*.32,b.height]],'#d7e9dc');c.restore();}
function projectile(c,b){if(b.kind==='wave'||b.kind==='bolt'){drawNormal(c,b);}else if(b.kind==='shard'){drawQCrystal(c,b,quality,QCRYSTALS.scale,b.speed,true)}else if(b.kind==='meteor'&&b.t>b.delay){drawMeteor(c,b,quality)}}
function effect(c,f){let u=f.t/f.life;
 if(f.type==='qaim'){c.save();c.translate(f.x,-f.y);c.globalAlpha=.25+.35*u;c.strokeStyle='#edf8df';c.lineWidth=1.2;const r=19-4*u;c.beginPath();c.moveTo(-r,-6);c.lineTo(-r,-r);c.lineTo(-6,-r);c.moveTo(6,-r);c.lineTo(r,-r);c.lineTo(r,-6);c.moveTo(r,6);c.lineTo(r,r);c.lineTo(6,r);c.moveTo(-6,r);c.lineTo(-r,r);c.lineTo(-r,6);c.stroke();c.restore()}

 if(f.type==='normalfade'){const b={...f.shot,x:f.x+f.shot.dir*22*u};drawNormal(c,b,(1-u)*.45)}
 if(f.type==='normalcast'&&f.air){c.save();c.globalAlpha=(1-u)*.55;c.strokeStyle='#f1fff0';c.lineWidth=3*(1-u)+.5;c.beginPath();c.moveTo(f.x,-f.y);c.lineTo(f.x+f.dir*35*u,-f.y);c.stroke();c.restore()}
 if(f.type==='groundflick'){
  c.save();c.translate(f.x,0);c.scale(f.dir,1);c.globalAlpha=(1-u)*.45;c.strokeStyle='#dae8d7';c.lineWidth=1.3;c.beginPath();c.ellipse(0,0,15+38*u,3+3*u,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<(quality==='low'?2:4);i++){const x=(i-1.5)*11+u*20,y=-Math.sin(Math.PI*u)*(13+i*4);poly(c,[[x-2,y],[x+2,y-4*(1-u)],[x+4,y+2]],'#e1edde')}c.restore();
 }

 if(f.type==='normalbreak'){
  c.save();c.translate(f.x,-f.y);const fade=1-smooth((u-.3)/.7),power=f.kind==='wave'?1.15:1;
  // A short flash breaks into angular pieces; the intact projectile is removed on contact.
  if(u<.24){c.globalAlpha=(1-u/.24)*.7;if(quality!=='low')c.drawImage(glow,-38,-38,76,76);c.strokeStyle='#ffffff';c.lineWidth=2*(1-u/.24);c.beginPath();c.moveTo(-12,-5);c.lineTo(-3,0);c.lineTo(2,-14);c.moveTo(-3,0);c.lineTo(13,8);c.moveTo(-3,0);c.lineTo(-9,13);c.stroke();}
  const count=quality==='low'?5:9;
  for(let i=0;i<count;i++){
   const angle=i*2.39996,impulse=55+(i%3)*25,flight=u*(1-.3*u),x=Math.cos(angle)*impulse*flight+f.dir*28*flight,y=Math.sin(angle)*impulse*.8*flight+48*u*u;
   c.save();c.translate(x*power,y*power);c.rotate(angle+(i%2?1:-1)*u*2.7);c.globalAlpha=fade;const size=(8+i%3*3)*power*(1-.35*u);
   if(quality==='high'){c.globalAlpha=fade*.3;c.drawImage(glow,-size*1.5,-size*1.5,size*3,size*3);c.globalAlpha=fade;}
   poly(c,[[-size*.65,-size*.25],[size*.8,-size*.1],[size*.15,size*.5],[-size*.45,size*.2]],'#fbfff9');
   poly(c,[[-size*.65,-size*.25],[size*.8,-size*.1],[-size*.1,0]],'#cde4d4');c.restore();
  }c.restore();
 }

if(f.type==='warning'){c.strokeStyle=`rgba(202,226,185,${.25+.45*u})`;c.lineWidth=2;c.beginPath();c.ellipse(f.x,0,f.radius,11,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(f.x,0,f.radius*u,11*u,0,0,Math.PI*2);c.stroke()}if(f.type==='burst')drawMeteorImpact(c,f,quality);
 if(f.type==='hit'||f.type==='hurt'){c.save();c.globalAlpha=1-u;c.fillStyle=f.type==='hit'?'#edf8df':'#edbd9f';c.textAlign='center';c.font='bold 24px Manrope, sans-serif';c.fillText(f.text,f.x,-f.y-35*u);c.strokeStyle='#eaffdf';c.lineWidth=2;for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;c.beginPath();c.moveTo(f.x+Math.cos(a)*8,-f.y+Math.sin(a)*8);c.lineTo(f.x+Math.cos(a)*(18+u*25),-f.y+Math.sin(a)*(18+u*25));c.stroke()}c.restore()}

 if(f.type==='enemyshot'){c.strokeStyle=`rgba(152,182,194,${1-u})`;c.lineWidth=3;c.beginPath();c.moveTo(f.x,-f.y);c.lineTo(f.x+(f.tx-f.x)*u,-90);c.stroke()}}

let trailCache=new Map();
function level(q){return q==='low'?'low':q==='balanced'?'medium':'high'}
function character(c,f,e,time,surface,q){quality=level(q);const g=f.aether,base=surface(f.x,f.y),p={x:f.x,y:base-f.y,vx:f.vx,vy:-f.vy,dir:f.dir},a=f.action,action=a?{...a,t:a.age,n:a.n||1}:null,travel=g.liquid?{...g.liquid,spikes:[]}:null;
let simTravel=travel;if(travel){let local=trailCache.get(f.id);if(!local||g.liquid.t<local.t){local={lastX:f.x,distance:0,serial:0,spikes:[],t:0,startY:g.liquid.startY};trailCache.set(f.id,local)}const elapsed=Math.max(0,Math.min(.05,travel.t-local.t));local.t=travel.t;LIQUID_TRAVEL.advance(local,f.x,elapsed,CONFIG.e);Object.assign(travel,local);simTravel=local;}else trailCache.delete(f.id);
c.save();c.fillStyle='#07121555';c.beginPath();c.ellipse(f.x,base+5,42/(1+Math.max(0,base-f.y)/200),8/(1+Math.max(0,base-f.y)/200),0,0,Math.PI*2);c.fill();c.restore();const sim={t:time,action,travel:simTravel,q:g.q,enemy:e?{x:e.x,y:base-e.y}:{x:f.x+300,y:0}};c.save();c.translate(0,base);drawAether(c,p,sim,quality);c.restore();}
function front(c,f,e,time,q){quality=level(q);const g=f.aether;if(g.cage){const cage=g.cage;c.save();c.translate(0,cage.base);CAGE_VFX.draw(c,cage,time,quality,'back');CAGE_VFX.draw(c,cage,time,quality,'front');c.restore()}
for(const b of g.shots){c.save();c.translate(0,b.base);projectile(c,b);c.restore()}
for(const v of g.events){const age=time-v.born,life=v.life||.6;if(age<0||age>=life)continue;c.save();c.translate(0,v.y);effect(c,{...v,type:v.kind,t:age,life,y:0});c.restore();}}
window.AetherVisual={character,front,finisher:(c,w,h,t,q)=>AETHER_FINISHER.draw(c,w,h,t,level(q)),reset(){trailCache.clear()}};
})();
