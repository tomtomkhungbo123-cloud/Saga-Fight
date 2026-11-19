const assert=require('node:assert/strict'),M=require('../../web/thunder/model.js');
for(const [x,y] of [[40,-153],[25,-148],[47,-167],[34,-179],[32,-188],[1000,-999]]){const a=M.solveArm(x,y);assert.ok(Math.abs(Math.hypot(a.elbow.x-a.shoulder.x,a.elbow.y-a.shoulder.y)-M.upper)<1e-8);assert.ok(Math.abs(Math.hypot(a.wrist.x-a.elbow.x,a.wrist.y-a.elbow.y)-M.fore)<1e-8);}
console.log('PASS arm bones retain their lengths across every cast target');
const f={x:500,y:940,vx:330,vy:0,dir:1,ground:true,action:null};M.update(f,0,0);const rest=Array.from(M.skin(f,f.thunderModel));
for(const k of ['attack','q','w','e','r']){f.action={k,age:0,startup:.1,duration:1.5};for(let i=0;i<180;i++){f.action.age=i/120;M.update(f,1/120,i/120);const pts=M.skin(f,f.thunderModel);assert.ok(Array.from(pts).every(Number.isFinite));for(let j=0;j<pts.length;j++)assert.ok(Math.abs(pts[j]-rest[j])<50);const m=M.muzzle(f);assert.ok(Number.isFinite(m.x)&&Number.isFinite(m.y));}}
console.log('PASS full silhouette stays finite and bounded across normals and Q/W/E/R');
f.action=null;f.vx=0;for(let i=0;i<360;i++)M.update(f,1/120,i/120);assert.ok(Math.abs(f.thunderModel.wx-40)<1e-7);assert.ok(Math.abs(f.thunderModel.wy+153)<1e-7);assert.ok(Math.abs(f.thunderModel.cloth)<1e-7);
console.log('PASS interrupted / completed casts blend back to idle without sprite crossfades');
let a={...f,thunderModel:undefined,vx:330},b={...f,thunderModel:undefined,vx:330};for(let i=0;i<120;i++)M.update(a,1/120,i/120);for(let i=0;i<60;i++)M.update(b,1/60,i/60);for(const k of ['cloth','hair','lean','wx','wy'])assert.ok(Math.abs(a.thunderModel[k]-b.thunderModel[k])<1e-8);
console.log('PASS spring motion is consistent at 60 and 120 updates per second');
// Direction is a view transform. Physical secondary motion stays in world space.
for(const dir of [-1,1])for(const vx of [-330,330]){
 const still={x:500,y:940,vx:0,vy:0,dir,ground:true,action:null},moving={...still,vx};
 for(let i=0;i<120;i++){M.update(still,1/120,i/120);M.update(moving,1/120,i/120);}
 const rest=Array.from(M.skin(still,still.thunderModel)),posed=Array.from(M.skin(moving,moving.thunderModel));
 assert.ok((M.transform(moving,0,-180).x-moving.x)*vx>0,'body must lean with world velocity, regardless of facing');
 const rearIndex=M.outline.reduce((best,p,i)=>Math.hypot(p[0]+43,p[1]+135)<Math.hypot(M.outline[best][0]+43,M.outline[best][1]+135)?i:best,0);
 assert.ok(dir*(posed[rearIndex*2]-rest[rearIndex*2])*vx<0,'rear sleeve must trail world velocity');
 const tip=M.hairOutline.reduce((best,p,i)=>p[0]<M.hairOutline[best][0]?i:best,0);
 assert.ok(dir*(moving.thunderModel.hairPoints[tip*2]-still.thunderModel.hairPoints[tip*2])*vx<0,'ribbon must trail world velocity');
 const priorLean=moving.thunderModel.lean;moving.dir=-dir;M.update(moving,1/120,1);assert.ok((M.transform(moving,0,-180).x-moving.x)*vx>0,'turning must not reverse the stored body lean');assert.ok(Math.abs(moving.thunderModel.lean-priorLean)<1e-4);
}
assert.ok(M.hairOutline.every(([x])=>x<0),'bun and ribbon belong behind the canonical head');
console.log('PASS bun behind head; body, sleeve and ribbon directions in both facings and reversals');

const ribbonF={x:500,y:940,vx:330,vy:0,dir:1,ground:true,action:null};let ribbonTime=0;
function checkRibbons(){for(let j=0;j<M.ribbonRest.length;j++){const rest=M.ribbonRest[j],nodes=ribbonF.thunderModel.ribbons[j].nodes,root=M.transform(ribbonF,...rest[0]);assert.ok(Math.hypot(nodes[0].x-root.x,nodes[0].y-root.y)<1e-7);for(let i=1;i<nodes.length;i++){assert.ok(Number.isFinite(nodes[i].x+nodes[i].y+nodes[i].vx+nodes[i].vy));assert.ok(Math.abs(Math.hypot(nodes[i].x-nodes[i-1].x,nodes[i].y-nodes[i-1].y)-Math.hypot(rest[i][0]-rest[i-1][0],rest[i][1]-rest[i-1][1])*M.visualScale)<1e-6);}}}
for(let i=0;i<120;i++){ribbonTime+=1/120;ribbonF.x+=ribbonF.vx/120;M.update(ribbonF,1/120,ribbonTime);checkRibbons();}
ribbonF.dir=-1;ribbonF.vx=-330;for(let i=0;i<120;i++){ribbonTime+=1/120;ribbonF.x+=ribbonF.vx/120;M.update(ribbonF,1/120,ribbonTime);checkRibbons();}
ribbonF.x-=310;M.update(ribbonF,1/120,ribbonTime+=1/120);checkRibbons();ribbonF.vx=0;
let settledRootVelocity;for(let i=0;i<600;i++){const previous=ribbonF.thunderModel.ribbons.map(c=>({...c.nodes[0]}));M.update(ribbonF,1/120,ribbonTime+=1/120);checkRibbons();settledRootVelocity=ribbonF.thunderModel.ribbons.map((c,j)=>({x:(c.nodes[0].x-previous[j].x)*120*.95,y:(c.nodes[0].y-previous[j].y)*120*.95}));}
// The hovering body still bobs; only relative tail motion should settle.
assert.ok(ribbonF.thunderModel.ribbons.every((c,j)=>c.nodes.slice(1).every(n=>Math.hypot(n.vx-settledRootVelocity[j].x,n.vy-settledRootVelocity[j].y)<3)));
console.log('PASS tie roots stay pinned, lengths hold through reversal/teleport, and both tails settle after stopping');

const clothF={x:500,y:940,vx:330,vy:0,dir:1,ground:true,action:null};let clothTime=0;
for(let i=0;i<120;i++){clothF.x+=clothF.vx/120;M.update(clothF,1/120,clothTime+=1/120);}
const garment=clothF.thunderModel;assert.ok(garment.capeMid<0&&garment.capeTip<0&&garment.sleeveSwing<0,'fabric must trail travel');
clothF.vx=0;M.update(clothF,1/120,clothTime+=1/120);assert.ok(Math.abs(garment.capeTip)>1&&Math.abs(garment.sleeveSwing)>.5,'hems retain momentum on stop');
const beforeTurn=garment.capeTip;clothF.dir=-1;M.update(clothF,1/120,clothTime+=1/120);assert.ok(Math.abs(garment.capeTip-beforeTurn)<1,'turning must not reset world-space cloth momentum');
for(let i=0;i<600;i++)M.update(clothF,1/120,clothTime+=1/120);
for(const key of ['capeMid','capeTip','capeLift','sleeveSwing','sleeveLift'])assert.ok(Math.abs(garment[key])<.03&&Math.abs(garment[key+'V'])<.03,'fabric must settle: '+key);
console.log('PASS cape and sleeve trail, retain inertia through stopping/turning, and settle smoothly');
