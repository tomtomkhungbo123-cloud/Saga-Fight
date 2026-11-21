import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Test the actual visual functions without loading browser canvas assets.
const source=fs.readFileSync(new URL('../web/mox/visual.js',import.meta.url),'utf8');
const from=source.indexOf('function locomotion(');
const to=source.indexOf('function drawMoxLeg(',from);
assert.ok(from>=0&&to>from);
const scope=vm.createContext({});
vm.runInContext("const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\n"+source.slice(from,to)+"\nglobalThis.moxPose=locomotion;globalThis.moxLegPose=moxLeg;",scope);
const moving=(tick)=>({id:0,type:'mox',x:700+tick*3.1,y:500,dir:1,
 vx:370,vy:0,ground:true,gait:tick*.106,runWeight:.86,lean:.09,airWeight:0,mox:{action:null}});

test('Mox legs keep stepping when rollback replaces fighter objects each frame',()=>{
 const phases=[],feet=[];
 for(let tick=0;tick<90;tick++){
  // Deliberately discard the object, as rollback restore does.
  const f=moving(tick),snapshot=JSON.stringify(f);
  const pose=scope.moxPose(f,tick/120);
  assert.equal(JSON.stringify(f),snapshot,'visual animation does not mutate simulation state');
  assert.ok(pose.mix>.65,'run pose remains active after every restored snapshot');
  phases.push(pose.phase);
  feet.push(scope.moxLegPose(pose.phase,0,pose.mix,pose.air,0,0).foot.x);
 }
 assert.ok(phases.every((p,i)=>!i||p>phases[i-1]),'stride phase advances on every snapshot');
 assert.ok(Math.max(...feet)-Math.min(...feet)>40,'running foot visibly alternates across its gait');
});
test('Mox is idle on the ground and tucks the legs in the air',()=>{
 const still={...moving(50),vx:0,runWeight:0};
 assert.equal(scope.moxPose(still,1).mix,0);
 const jumping={...moving(50),ground:false,vy:-400,airWeight:1};
 const pose=scope.moxPose(jumping,1);
 assert.equal(pose.mix,0);
 assert.equal(pose.air,1);
});
