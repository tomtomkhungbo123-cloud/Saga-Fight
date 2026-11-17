(()=>{
const CONFIG={hp:1500,enemyHp:5000,speed:330,jump:680,gravity:1800,arena:1600,attack:{damage:[60,65,80],range:650,speed:820,initialSpeed:280,accelerationTime:.12,airInitialSpeed:360,airAccelerationTime:.08,waveHeight:64,waveLength:180,boltHeight:11,boltLength:45,windup:.17,recovery:.46,chainReset:1.05,root:.2},q:{count:6,damage:100,range:900,form:.65,interval:.5,speed:2600,initialSpeed:1600,accelerationTime:.025,preload:.16,idleTimeout:5,cd:4},w:{range:600,windup:.5,root:2,cd:6},e:{duration:4,transition:.35,speed:1.6,cd:6},r:{liftVelocity:540,liftGravity:900,hoverDuration:7,windup:1,duration:6,count:24,damage:300,stun:.3,cd:18,radius:75,fall:.9,warning:.38,height:700,initialSpeed:120,drift:90,sectors:6,targetSpread:100}};
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
const NORMAL_POSE_NODE=typeof module!=='undefined'?require('./aether-pose.js').aetherPose:null;
const NORMALS=(()=>{
 const ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u)};
 function muzzle(p,a,time){const pose=(NORMAL_POSE_NODE||aetherPose)(a,p.y>1),orb=pose.crystal,lean=Math.max(-1,Math.min(1,p.vx/330))*.07*a.dir,c=Math.cos(lean),s=Math.sin(lean);return {x:p.x+a.dir*(orb.x*c-orb.y*s),y:p.y+16+Math.sin(time*2.8)*4-orb.x*s-orb.y*c}}
 function create(p,a,time,c){const air=p.y>1||p.vy>0,m=muzzle(p,a,time),x=air?m.x:p.x+a.dir*65;return {kind:air?'bolt':'wave',x,y:air?m.y:0,startX:x,rangeRoot:p.x,dir:a.dir,n:a.n,t:0,travel:0,life:1.6,speed0:(air?c.airInitialSpeed:c.initialSpeed)+Math.max(0,p.vx*a.dir)*.25,tau:air?c.airAccelerationTime:c.accelerationTime,maxSpeed:c.speed,height:air?c.boltHeight:c.waveHeight,length:air?c.boltLength:c.waveLength,muzzle:m}}
 function distance(b,t){return b.speed0*t+(b.maxSpeed-b.speed0)*(t-b.tau*(1-Math.exp(-t/b.tau)))}
 function advance(b,c){const limit=Math.max(0,c.range-b.dir*(b.startX-b.rangeRoot));b.travel=Math.min(limit,distance(b,b.t));b.x=b.startX+b.dir*b.travel;b.speed=b.maxSpeed-(b.maxSpeed-b.speed0)*Math.exp(-b.t/b.tau);if(b.travel>=limit)b.life=0}
 function shape(b){
  if(b.kind==='bolt'){const l=b.length,h=b.height*ease(b.t/.045);return [[0,0],[-l*.32,h],[-l*.86,h*.6],[-l,0],[-l*.86,-h*.6],[-l*.32,-h]]}
  const grow=ease(b.t/.12),l=Math.min(b.length,35+b.travel*.9),h=b.height*grow,x=v=>v*l/180;
  return [[-l,0],[0,0],[x(-10),h*.7],[x(-40),h*.2],[x(-29),h],[x(-76),h*.34],[x(-62),h*.88],[x(-109),h*.27],[x(-97),h*.65],[x(-142),h*.17],[x(-135),h*.3]];
 }
 function snapshot(b){return shape(b).map(v=>({x:b.x+b.dir*v[0],y:b.y+v[1]}))}
 function inside(p,r){return p.x>=r.l&&p.x<=r.r&&p.y>=r.b&&p.y<=r.t}
 function segment(a,b,r){let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q] of [[-dx,a.x-r.l],[dx,r.r-a.x],[-dy,a.y-r.b],[dy,r.t-a.y]]){if(Math.abs(p)<1e-12){if(q<0)return false}else{const u=q/p;if(p<0)lo=Math.max(lo,u);else hi=Math.min(hi,u);if(lo>hi)return false}}return true}
 function inPoly(p,v){let yes=false;for(let i=0,j=v.length-1;i<v.length;j=i++){const a=v[i],b=v[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
 function overlap(v,r){if(v.some(p=>inside(p,r)))return true;for(let i=0;i<v.length;i++)if(segment(v[i],v[(i+1)%v.length],r))return true;return [{x:r.l,y:r.b},{x:r.l,y:r.t},{x:r.r,y:r.b},{x:r.r,y:r.t}].some(p=>inPoly(p,v))}
 function rect(e){return {l:e.x-22,r:e.x+22,b:e.y,t:e.y+(e.height??150)}}
 function swept(before,after,r){if(overlap(before,r)||overlap(after,r))return true;for(let i=0;i<after.length;i++){const j=(i+1)%after.length;if(overlap([before[i],before[j],after[j],after[i]],r))return true}return false}
 function hit(before,b,e){return swept(before,snapshot(b),rect(e))}
 function centroid(v){let area=0,x=0,y=0;for(let i=0;i<v.length;i++){const p=v[i],q=v[(i+1)%v.length],a=p[0]*q[1]-q[0]*p[1];area+=a;x+=(p[0]+q[0])*a;y+=(p[1]+q[1])*a}if(Math.abs(area)<1e-9)return {x:v.reduce((n,p)=>n+p[0],0)/v.length,y:v.reduce((n,p)=>n+p[1],0)/v.length};return {x:x/(3*area),y:y/(3*area)}}
 function glowFrame(b){const pts=shape(b),center=centroid(pts),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return {...center,width:(Math.max(...xs)-Math.min(...xs))*1.55+16,height:(Math.max(...ys)-Math.min(...ys))*2.3+18}}
 function contactSweep(before,after,e){const r=rect(e);if(!swept(before,after,r))return null;let lo=0,hi=1;for(let i=0;i<10;i++){const u=(lo+hi)/2,v=after.map((p,j)=>({x:before[j].x+(p.x-before[j].x)*u,y:before[j].y+(p.y-before[j].y)*u}));if(swept(before,v,r))hi=u;else lo=u}const v=after.map((p,j)=>[before[j].x+(p.x-before[j].x)*hi,before[j].y+(p.y-before[j].y)*hi]),center=centroid(v);return {x:Math.max(r.l,Math.min(r.r,center.x)),y:Math.max(r.b,Math.min(r.t,center.y))}}

 function contact(before,b,e){return contactSweep(before,snapshot(b),e)}
 return {create,muzzle,distance,advance,shape,snapshot,hit,contact,contactSweep,centroid,glowFrame};
})();
if(typeof module!=='undefined')module.exports=NORMALS;

'use strict';
const QCRYSTALS=(()=>{
 const size=.7,outline=[[44,0],[-8,11],[-35,5],[-42,0],[-35,-5],[-8,-11]];
 function orbit(p,e,time,index,prep=0){const row=Math.floor(index/2),side=index%2?-1:1,x=p.x+side*(58+row*13),y=p.y+155-row*40-Math.sin(time*3+index)*4,dx=e.x-x,dy=e.y+85-y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;return {x:x-ux*13*prep,y:y-uy*13*prep,ux,uy,angle:Math.atan2(uy,ux)}}
 function create(p,e,time,index,c){const o=orbit(p,e,time,index,1),tx=e.x,ty=e.y+85,dx=tx-o.x,dy=ty-o.y,dist=Math.hypot(dx,dy)||1;return {kind:'shard',x:o.x,y:o.y,sx:o.x,sy:o.y,tx,ty,ux:dx/dist,uy:dy/dist,angle:Math.atan2(dy,dx),distance:dist,travel:0,speed:c.initialSpeed,t:0,life:2.5,index}}
 function advance(b,c){b.travel=Math.min(b.distance,c.initialSpeed*b.t+(c.speed-c.initialSpeed)*(b.t-c.accelerationTime*(1-Math.exp(-b.t/c.accelerationTime))));b.speed=c.speed-(c.speed-c.initialSpeed)*Math.exp(-b.t/c.accelerationTime);b.x=b.sx+b.ux*b.travel;b.y=b.sy+b.uy*b.travel;if(b.travel>=b.distance)b.life=0}
 function shape(speed=1050){const stretch=.9+.2*Math.max(0,Math.min(1,speed/1050));return outline.map(p=>[p[0]*stretch,p[1]])}
 function vertices(b){return shape(b.speed).map(([x,y])=>({x:b.x+size*(b.ux*x-b.uy*y),y:b.y+size*(b.uy*x+b.ux*y)}))}
 return {scale:size,orbit,create,advance,shape,vertices};
})();
if(typeof module!=='undefined')module.exports=QCRYSTALS;

'use strict';
const METEOR_RAIN=(()=>{
 function place(rain,enemy,c,arena,rand){
  const targeted=enemy.targetable!==false&&rain.index%2===0,margin=65,width=arena-2*margin,sector=width/c.sectors;let x,zone=null;
  if(targeted)x=Math.max(margin,Math.min(arena-margin,enemy.x+(rand()-.5)*c.targetSpread));
  else{
   if(!rain.zones.length)rain.zones=Array.from({length:c.sectors},(_,i)=>i);
   // Pick among unused strata, favoring space away from the previous landing point.
   const scores=rain.zones.map(z=>({z,score:Math.abs(margin+(z+.5)*sector-(rain.lastX??enemy.x))+rand()*sector*.25}));
   scores.sort((a,b)=>b.score-a.score);zone=scores[0].z;rain.zones.splice(rain.zones.indexOf(zone),1);
   x=margin+(zone+.22+rand()*.56)*sector;
  }
  rain.lastX=x;return {x,targeted,zone};
 }
 function create(placement,c,rand){const vx=(rand()<.5?-1:1)*c.drift,startX=placement.x-vx*c.fall;
  return {kind:'meteor',x:startX,sx:startX,targetX:placement.x,targeted:placement.targeted,zone:placement.zone,y:c.height,v:c.initialSpeed,vx,t:0,delay:c.warning,life:c.warning+c.fall+.15,hit:false,released:false,radius:c.radius};
 }
 function advance(b,c){const t=Math.max(0,Math.min(c.fall,b.t-b.delay)),a=2*(c.height-c.initialSpeed*c.fall)/(c.fall*c.fall);b.x=b.sx+b.vx*t;b.y=Math.max(0,c.height-c.initialSpeed*t-.5*a*t*t);b.v=c.initialSpeed+a*t;}
 function vertices(b){const stretch=1+Math.min(.65,Math.hypot(b.vx,b.v)/2200),angle=-Math.atan2(b.vx,b.v),co=Math.cos(angle),si=Math.sin(angle);return [[0,-25],[15,-8],[9,18],[-5,25],[-15,6],[-10,-16]].map(([x,y])=>{x*=1.65;y*=1.65*stretch;return {x:b.x+x*co-y*si,y:b.y-x*si-y*co}});}
 function contact(before,b,e,radius){return !!NORMALS.contactSweep(vertices({...b,...before}),vertices(b),{...e,height:220});}

 return {place,create,advance,contact,vertices};
})();
if(typeof module!=='undefined')module.exports=METEOR_RAIN;


window.AetherBase={CONFIG,NORMALS,QCRYSTALS,METEOR_RAIN,aetherPose};})();
