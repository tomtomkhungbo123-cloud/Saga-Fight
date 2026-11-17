const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('web/game.js','utf8');
function camera(map,mode='classic',aspect=16/9){const c=vm.createContext({Math,Number,Object,activeMap:map,W:map==='forest'?3200:1600,H:map==='forest'?1600:1117,mode:'pvp',localId:()=>0,cameraMode:mode,worldCamera:{ready:false,last:0,x:0,y:0,width:2200,height:1500},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});vm.runInContext(source.slice(source.indexOf('function updateWorldCamera('),source.indexOf('function drawForestScenery')),c);return {c,view(scene,t=0){c.scene=scene;return {...vm.runInContext(`updateWorldCamera(scene,${t},${aspect})`,c)};}};}
for(const map of ['cavern','forest'])for(const aspect of [16/9,4/3,9/16,21/9]){
 test(`${map} Fix fits full map and ceiling, constant across movement and jumps at ${aspect}`,()=>{const a=camera(map,'fix',aspect),one=a.view([{id:0,x:100,y:900},{id:1,x:1500,y:950}]);const two=a.view([{id:0,x:0,y:-650},{id:1,x:3200,y:1500}],100);for(const k of ['x','y','width','height'])assert.equal(one[k],two[k]);assert.ok(one.x<=0&&one.x+one.width>=a.c.W);assert.ok(one.y<=(map==='forest'?0:-736)+1e-9&&one.y+one.height>=a.c.H);assert.equal(one.width/one.height,aspect);});
 test(`${map} Hybrid wider than Classic at ${aspect}`,()=>{const scene=[{id:0,x:800,y:900},{id:1,x:1000,y:900}],a=camera(map,'classic',aspect).view(scene),b=camera(map,'hybrid',aspect).view(scene);assert.ok(b.width>a.width);});
}
test('Classic zooms out for separated fighters; smoothing stays finite through resize and reset',()=>{const a=camera('forest'),near=a.view([{id:0,x:1200,y:1300},{id:1,x:1350,y:1300}]);const far=a.view([{id:0,x:100,y:400},{id:1,x:3100,y:1350}],.016);assert.ok(far.width>near.width);assert.ok(far.width>=3200);a.c.worldCamera.ready=false;for(const v of Object.values(a.view([],10)))if(typeof v==='number')assert.ok(Number.isFinite(v));});
test('camera preference survives reload and storage denial, invalid saved values fall back to Classic',()=>{const code=source.slice(source.indexOf('const CAMERA_NOTES='),source.indexOf('function invalidateViewport()'));const storage=new Map(),nodes={cameraMode:{addEventListener(){}},cameraNote:{}};const context=()=>vm.createContext({$:id=>nodes[id],localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});let c=context();vm.runInContext(code,c);vm.runInContext("setCameraMode('action')",c);c=context();vm.runInContext(code,c);assert.equal(nodes.cameraMode.value,'action');storage.set('saga.camera.v1','invalid');vm.runInContext(code,context());assert.equal(nodes.cameraMode.value,'classic');const denied=context();denied.localStorage={getItem(){throw Error()},setItem(){throw Error()}};vm.runInContext(code,denied);vm.runInContext("setCameraMode('fix')",denied);assert.equal(nodes.cameraMode.value,'fix');});

for(const map of ['cavern','forest'])for(const mode of ['classic','hybrid','action'])for(const playMode of ['pve','pvp','online','sandbox'])for(const aspect of [16/9,4/3,9/16,21/9]){
 test(`${map}/${mode}/${playMode}/${aspect}: all players stay inside final eased view after separation, teleport and high jump`,()=>{
  const a=camera(map,mode,aspect);a.c.mode=playMode;
  const positions=[[[800,900],[900,900]],[[0,950],[a.c.W,950]],[[a.c.W,1300],[0,-900]],[[200,900],[300,900]],[[0,-650],[a.c.W,1500]]];
  let now=0;for(const pair of positions){const scene=pair.map(([x,y],id)=>({id,x,y})),view=a.view(scene,now+=.008);
   for(const f of scene){assert.ok(f.x-120>=view.x+view.width*.06-1e-8);assert.ok(f.x+120<=view.x+view.width*.94+1e-8);assert.ok(f.y-300>=view.y+view.height*.18-1e-8);assert.ok(f.y+80<=view.y+view.height*.92+1e-8);}
  }
 });
}
test('Online host and guest frame both fighters identically, independently of local role',()=>{for(const mode of ['classic','hybrid','action']){const host=camera('forest',mode),guest=camera('forest',mode);host.c.mode=guest.c.mode='online';guest.c.localId=()=>1;const scene=[{id:0,x:100,y:-400},{id:1,x:3100,y:1300}];assert.deepEqual(host.view(scene),guest.view(scene));}});

for(const map of ['forest','cavern'])for(const aspect of [16/9,4/3,9/16,21/9])test(`${map}/Action/${aspect}: closer when near, returns to Classic framing when far`,()=>{
 const near=[{id:0,x:800,y:900},{id:1,x:950,y:900}],far=[{id:0,x:100,y:900},{id:1,x:1500,y:900}];
 assert.ok(camera(map,'action',aspect).view(near).width<camera(map,'classic',aspect).view(near).width);
 assert.equal(camera(map,'action',aspect).view(far).width,camera(map,'classic',aspect).view(far).width);
});
test('Action increases hit recoil with a cap; respects reduced motion, pause, and Fix',()=>{
 const c=vm.createContext({Math,SHAKE_CONFIG:{limit:18},cameraOffset:{x:0,y:0},shakeMotion:{matches:false},phase:'fight',time:.25,shake:10,moxShake:0,cameraMode:'classic',fighters:[{flash:.13},{flash:0}]});
 vm.runInContext(source.slice(source.indexOf('function cameraShake()'),source.indexOf('function onlineActive()')),c);
 const offset=()=>vm.runInContext('cameraShake();Math.hypot(cameraOffset.x,cameraOffset.y)',c);
 const classic=offset();c.cameraMode='action';assert.ok(offset()>classic);
 c.shake=0;assert.ok(offset()>0);c.fighters[0].flash=0;assert.equal(offset(),0);
 c.shake=100;vm.runInContext('cameraShake()',c);assert.ok(Math.abs(c.cameraOffset.x)<=26&&Math.abs(c.cameraOffset.y)<=26*.6);
 c.shakeMotion.matches=true;assert.equal(offset(),0);c.shakeMotion.matches=false;c.phase='paused';assert.equal(offset(),0);c.phase='fight';c.cameraMode='fix';assert.equal(offset(),0);
});

for(const map of ['forest','cavern'])for(const aspect of [16/9,4/3,9/16,21/9])for(const role of [0,1])test(`${map}/Action/${aspect}/viewer${role}: hidden opponent position cannot change zoom or pan`,()=>{
 const a=camera(map,'action',aspect),b=camera(map,'action',aspect);a.c.mode=b.c.mode='online';a.c.localId=b.c.localId=()=>role;
 const visible=[{id:role,x:800,y:900},{id:1-role,x:950,y:900,fairi:{stealth:0}}];
 const initial=a.view(visible);b.view(visible);let lastWidth=initial.width;
 for(let i=1;i<=30;i++){
  const mine={id:role,x:800+i*3,y:900};
  const near=[mine,{id:1-role,x:mine.x+10,y:900,fairi:{stealth:.6}}];
  const far=[mine,{id:1-role,x:i%2?3200:0,y:i%2?-900:1500,fairi:{stealth:.6}}];
  const va=a.view(near,i*.016),vb=b.view(far,i*.016);assert.deepEqual(va,vb);assert.ok(va.width>=lastWidth-1e-9);lastWidth=va.width;
 }
 const revealed=a.view(visible,1);assert.ok(revealed.width<lastWidth);
});
test('shared PvP conceals either player while the stealth owner keeps normal Action framing',()=>{
 for(const id of [0,1]){
  const scene=[{id:0,x:800,y:900},{id:1,x:950,y:900}];scene[id].fairi={stealth:.6};
  const shared=camera('forest','action'),owner=camera('forest','action');shared.c.mode='pvp';owner.c.mode='online';owner.c.localId=()=>id;
  assert.ok(shared.view(scene).width>owner.view(scene).width);
 }
});
