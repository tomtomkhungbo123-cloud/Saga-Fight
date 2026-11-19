const assert=require('node:assert/strict'),M=require('../../web/thunder/model.js');
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
let frames=0;
for(const dir of [-1,1])for(const velocity of [-330,0,330])for(const skill of ['attack','q','w','e','r']){
 const f={x:500,y:940,vx:velocity,vy:0,dir,ground:true,action:null};let last=null;
 for(let frame=0;frame<300;frame++){
  const t=frame/120;f.action=t<1.6?{k:skill,age:t,startup:.1,duration:skill==='q'?.72:1.55,diving:skill==='w'&&t>.45}:null;
  f.ground=!(t>.25&&t<.8);f.vy=f.ground?0:t<.5?-500:500;
  M.update(f,1/120,t);M.skin(f,f.thunderModel);const s=f.thunderModel,a=s.arm,p=s.sleevePoints;
  assert.ok(Math.abs(Math.hypot(a.elbow.x-a.shoulder.x,a.elbow.y-a.shoulder.y)-M.upper)<1e-8);
  assert.ok(Math.abs(Math.hypot(a.wrist.x-a.elbow.x,a.wrist.y-a.elbow.y)-M.fore)<1e-8);
  assert.ok(s.handPoints.every(Number.isFinite));
  if(last)assert.ok(Math.hypot(a.wrist.x-last.x,a.wrist.y-last.y)<8,'wrist must move continuously through raised/cancelled poses');last={...a.wrist};
  for(let i=0;i<p.length;i++)for(let j=i+2;j<p.length;j++){
   if(i===0&&j===p.length-1)continue;const A=p[i],B=p[(i+1)%p.length],C=p[j],D=p[(j+1)%p.length];
   assert.ok(!(cross(A,B,C)*cross(A,B,D)<-1e-6&&cross(C,D,A)*cross(C,D,B)<-1e-6),'sleeve must not fold through itself in raised or lowering poses');
  }
  const cuffY=a.elbow.y+(a.wrist.y-a.elbow.y)*.28,hem=p[20];assert.ok(hem[1]>=cuffY+28-1e-8&&hem[1]<=cuffY+52+1e-8,'sleeve must hang below the cuff');
  const o=M.orbLocal(a),dx=o.x-a.wrist.x,dy=o.y-a.wrist.y;assert.ok(Math.abs(Math.hypot(dx,dy)-Math.hypot(24,20))<1e-8,'orb must retain its palm offset');
  const fx=(a.wrist.x-a.elbow.x)/M.fore,fy=(a.wrist.y-a.elbow.y)/M.fore;const bindProjection=(24*(M.wrist.x-M.elbow.x)-20*(M.wrist.y-M.elbow.y))/M.fore;assert.ok(Math.abs(dx*fx+dy*fy-bindProjection)<1e-8,'orb must retain its bind-pose projection along the forearm');
  for(let i=0;i<M.palmOutline.length-1;i++){const expected=Math.hypot(M.palmOutline[i+1][0]-M.palmOutline[i][0],M.palmOutline[i+1][1]-M.palmOutline[i][1]);assert.ok(Math.abs(Math.hypot(s.handPoints[(i+1)*2]-s.handPoints[i*2],s.handPoints[(i+1)*2+1]-s.handPoints[i*2+1])-expected)<1e-8);}
  frames++;
 }
}
console.log('PASS '+frames+' arm frames: both facings, moving/airborne, all skills and lowering; fixed joints, rigid palm, gravity sleeve and attached orb');
