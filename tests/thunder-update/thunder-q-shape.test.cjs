const assert=require('node:assert/strict'),M=require('../../web/thunder/model.js');
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const dist=(p,i,j)=>Math.hypot(p[i*2]-p[j*2],p[i*2+1]-p[j*2+1]);
for(const dir of [-1,1])for(const cast of [.1,.5,.6]){
 global.ThunderTuning={qCast:cast};
 const base={x:500,y:940,vx:0,vy:0,ground:true,dir},idle={...base},q={...base};
 let minArea=Infinity,maxArea=0;
 for(let frame=0;frame<180;frame++){
  const time=frame/120;q.action=time<.72?{k:'q',age:time,duration:.72}:null;
  M.update(idle,1/120,time);M.update(q,1/120,time);
  const body=M.skin(q,q.thunderModel),rest=M.skin(idle,idle.thunderModel);
  assert.deepEqual(body,rest,'Q must not change chest, collar, neck or robe geometry');
  const p=q.thunderModel.sleevePoints.flat(),n=p.length/2,point=j=>[p[(j%n)*2],p[(j%n)*2+1]];
  assert.ok(Array.from(p).every(Number.isFinite));
  let area=0;for(let i=0;i<n;i++){
   const a=point(i),b=point(i+1);area+=a[0]*b[1]-b[0]*a[1];
   for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;const c=point(j),d=point(j+1);assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-6&&cross(c,d,a)*cross(c,d,b)<-1e-6),'Q sleeve outline must not fold through itself');}
  }
  area=Math.abs(area/2);minArea=Math.min(minArea,area);maxArea=Math.max(maxArea,area);
  for(let i=0;i<M.palmOutline.length-1;i++){const expected=Math.hypot(M.palmOutline[i][0]-M.palmOutline[i+1][0],M.palmOutline[i][1]-M.palmOutline[i+1][1]);assert.ok(Math.abs(dist(q.thunderModel.handPoints,i,i+1)-expected)<1e-8,'forearm and palm must move rigidly');}
 }
 assert.ok(maxArea/minArea<1.15,'sleeve volume must remain stable through charge/release/recovery');
}
delete global.ThunderTuning;
console.log('PASS Q: torso unchanged, palm rigid, sleeve stable and non-intersecting in both facings and cast timings');
