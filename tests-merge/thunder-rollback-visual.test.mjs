import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const load = path => fs.readFileSync(new URL('../web/' + path, import.meta.url), 'utf8');
const context = vm.createContext({window:{}});
for (const path of ['thunder/design.js', 'thunder/model.js', 'rollback-core.js']) {
 vm.runInContext(load(path), context, {filename:path});
}
const model = context.window.ThunderModel;
const rollback = context.window.SagaRollback;
const fighter = () => ({type:'thunder', x:1000, y:580, dir:1, vx:0, vy:0, ground:true, action:null});

test('Thunder render-only typed arrays do not affect rollback hashes or become plain objects', () => {
 const a=fighter(), b=fighter();
 for(let tick=0;tick<120;tick++){
  model.update(a,1/120,tick/120);
  model.update(b,1/120,tick/120);
  if(tick%3===0)model.skin(a,a.thunderModel);
  if(tick%7===0)model.skin(b,b.thunderModel);
 }
 assert.equal(rollback.hash(rollback.pack({fighters:[a]})),rollback.hash(rollback.pack({fighters:[b]})));
 for(const key of ['points','hairPoints','handPoints','sleevePoints','ribbons']){
  assert.equal(Object.keys(a.thunderModel).includes(key),false,key+' must not enter deterministic snapshots');
 }
 const restored=rollback.unpack(rollback.pack({fighters:[a]})).fighters[0];
 assert.equal(restored.thunderModel.points,undefined);
 const points=model.skin(restored,restored.thunderModel);
 assert.equal(ArrayBuffer.isView(points),true);
 assert.equal(points.length,model.outline.length*2);
 assert.equal([...points].every(Number.isFinite),true);
 const calls={fill:0,lines:0};
 const canvas={
  save(){},restore(){},translate(){},scale(){},rotate(){},
  beginPath(){},moveTo(){},lineTo(){calls.lines++},closePath(){},
  fill(){calls.fill++},stroke(){},arc(){},fillRect(){},
  createRadialGradient(){return {addColorStop(){}};}
 };
 model.draw(canvas,restored,1,false,canvas);
 assert.ok(calls.fill>=5 && calls.lines>100,'restored fighter must render a complete silhouette');
});

function isolatedModel(perturb=false){
 const ctx=vm.createContext({window:{}});
 for(const path of ['thunder/design.js','thunder/model.js','rollback-core.js'])vm.runInContext(load(path),ctx,{filename:path});
 if(perturb)vm.runInContext(`{
  const sin=Math.sin,cos=Math.cos;
  Math.sin=x=>sin(x)*(1+Number.EPSILON);
  Math.cos=x=>x===0?1:cos(x)*(1-Number.EPSILON);
 }`,ctx);
 return {model:ctx.window.ThunderModel,rollback:ctx.window.SagaRollback,f:fighter()};
}

test('Thunder hair stays local under engine rounding, different render rates and checkpoint restores',()=>{
 const a=isolatedModel(),b=isolatedModel(true),clients=[a,b];
 for(let tick=0;tick<1600;tick++){
  for(const c of clients){
   const f=c.f;
   f.vx=tick%240<120?330:-330;f.x+=f.vx/120;f.dir=Math.sign(f.vx);
   f.ground=tick%160<100;f.vy=f.ground?0:220;f.y=f.ground?580:520;
   f.action={k:['attack','q','w','e','r'][Math.floor(tick/120)%5],age:(tick%120)/120,duration:1};
   c.model.update(f,1/120,tick/120);c.rollback.canonicalize(f);
  }
  if(tick%3===0)a.model.skin(a.f,a.f.thunderModel);
  if(tick%7===0)b.model.skin(b.f,b.f.thunderModel);
  assert.equal(a.rollback.hash(a.rollback.pack(a.f)),b.rollback.hash(b.rollback.pack(b.f)),'confirmed state at tick '+tick);
  if(tick%97===50){
   const c=clients[Math.floor(tick/97)%2];
   c.f=c.rollback.unpack(c.rollback.pack(c.f));
   assert.equal(c.f.thunderModel.ribbons,undefined,'checkpoint carries no local hair physics');
   const points=c.model.skin(c.f,c.f.thunderModel);
   assert.ok([...points].every(Number.isFinite),'silhouette rebuilds before the next simulation tick');
  }
 }
 for(const c of clients){
  const state=c.rollback.unpack(c.rollback.pack(c.f));
  for(const key of ['wx','wy','lean','clock','arm'])assert.ok(Object.hasOwn(state.thunderModel,key),key+' remains authoritative');
  assert.ok(c.f.thunderModel.ribbons.every(chain=>chain.nodes.every(p=>Number.isFinite(p.x+p.y))),'local hair rebuilds after restore');
  const before=c.model.muzzle(c.f);c.f.thunderModel.arm=c.model.solveArm(50,-180);const after=c.model.muzzle(c.f);
  assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>1,'arm still controls the projectile origin');
 }
});
