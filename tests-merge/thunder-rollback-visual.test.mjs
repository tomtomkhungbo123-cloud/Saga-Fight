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
 for(const key of ['points','hairPoints','handPoints','sleevePoints']){
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
