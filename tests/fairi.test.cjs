const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,Path2D:require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas').Path2D,document:{createElement(){return require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas').createCanvas(16,16)},getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/mox/'+file+'.js'),'utf8'),c);for(const name of ['visual','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/melanta/'+name+'.js'),'utf8'),c);for(const name of ['w-skill','normal-combo','reference-shape','run-preset','rig','dash-vfx','r-visual','clone-motion','combat','visual'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/fairi/'+name+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/game.js'),'utf8'),c);

const run=s=>vm.runInContext(s,c),advance=t=>run(`for(let i=0;i<${Math.ceil(t*120)};i++)step(1/120)`);
function reset(){run("$('select0').value='fairi';$('select1').value='thunder';mode='pvp';start();phase='fight';fighters[0].x=600;fighters[1].x=900;fighters.forEach(f=>f.y=floor(f.x));");}
reset();assert.equal(run('fighters[0].hp'),900);assert.equal(run('fighters[0].charges'),3);run("request(fighters[0],'q')");advance(.25);assert.equal(run('fighters[1].hp'),925);assert.equal(run('fighters[0].charges'),2);advance(2.4);assert.equal(run('fighters[0].charges'),3);
reset();run("request(fighters[0],'w')");advance(.6);assert(run('fighters[0].fairi.stealth')>3.8);assert.equal(run('fighters[0].cd.w'),0);run("request(fighters[0],'attack')");advance(.8);assert.equal(run('fighters[1].hp'),800);assert(run('fighters[0].cd.w')>5);assert.equal(run('fighters[0].stunUntil'),0);
reset();run("request(fighters[0],'e')");advance(.35);assert.equal(run('fighters[0].fairi.clones.length'),4);assert.equal(run('fighters[0].fairi.clones[0].hp'),500);assert.equal(run('fighters[0].cd.e'),0);advance(4);assert.equal(run('fighters[0].fairi.clones.length'),0);assert(run('fighters[0].cd.e')>8);
reset();run("request(fighters[0],'e')");advance(.35);run("request(fighters[0],'r')");advance(1.1);assert.equal(run('fighters[1].hp'),700);assert.equal(run('fighters[1].grabbedBy'),null);assert.equal(run('fighters[0].fairi.clones.length'),0);assert(run('fighters[0].cd.e')>8);
reset();run("request(fighters[0],'r')");advance(1.1);assert.equal(run('fighters[1].hp'),850);
reset();run("request(fighters[0],'e')");advance(.35);run("var c0=fighters[0].fairi.clones[0];window.FairiCombat.area(fighters[0],fighters[1],c0.x,c0.worldY,1,1,499,0,'test1',moxEnv(fighters[0]))");assert.equal(run('fighters[0].fairi.clones[0].hp'),1);run("window.FairiCombat.area(fighters[0],fighters[1],c0.x,c0.worldY,1,1,1,0,'test2',moxEnv(fighters[0]))");assert.equal(run('fighters[0].fairi.clones.length'),3);assert.equal(run('fighters[0].hp'),900);
reset();run("request(fighters[0],'q');damage(fighters[1],fighters[0],25)");assert.equal(run('fighters[0].action.k'),'q');assert.equal(run('fighters[0].hp'),875);
reset();run("request(fighters[0],'e')");advance(.35);run("request(fighters[0],'r')");advance(.2);let packet=run('JSON.stringify(window.riftGame.snapshot())');assert(!packet.includes('bitmap'));assert(!packet.includes('particle'));run("window.riftNet={room:'TEST'}");run('window.riftGame.receive(JSON.parse('+JSON.stringify(packet)+'))');assert.equal(run('fighters[0].action.k'),'r');
console.log('PASS Fairi native Q, W ambush, post-effect cooldown, E 500 HP/zero player damage, R150/300, noninterruptible damage, serializable snapshots');
reset();run("$('select0').value='thunder';$('select1').value='fairi';mode='pve';start();phase='fight';difficulty='hell'");advance(12);assert(run('fighters.every(f=>Number.isFinite(f.x+f.y+f.hp))'));assert(run('fighters[1].pveAI.stats.decisions')>0);
reset();run("request(fighters[0],'e')");advance(.35);const canvasAPI=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');c.renderCtx=canvasAPI.createCanvas(1600,1117).getContext('2d');for(let i=0;i<10;i++){run("window.FairiVisual.character(renderCtx,fighters[0],fighters[1],time,{surface:(x,y)=>cylastEnv(fighters[0]).surface(x,y),viewer:'enemy',bodyColor:'#446c78'})");advance(.02)}run("request(fighters[0],'r')");for(let i=0;i<60;i++){run("window.FairiVisual.character(renderCtx,fighters[0],fighters[1],time,{surface:(x,y)=>cylastEnv(fighters[0]).surface(x,y),viewer:'enemy'})");advance(1/60)}assert.equal(run('fighters[1].hp'),700);
reset();run("mode='sandbox';sandboxOptions.free=true;request(fighters[0],'e')");advance(.4);assert.equal(run('fighters[0].fairi.clones.length'),4);assert.equal(run('fighters[0].hp'),900);run('resetSandbox()');assert.equal(run('fighters[0].fairi.clones.length'),0);assert.equal(run('fighters[0].charges'),3);
console.log('PASS native Fairi Hell AI, real canvas E/R frames and palette, sandbox active lifetime and reset');

// Body uses the concept silhouette palette, not the bright HUD/weapon accent.
assert.equal(run('window.FairiVisual.bodyColor({hp:900})'),run('FairiRig.reference.color'));assert.notEqual(run('window.FairiVisual.bodyColor({hp:900})'),'#81e9dd');assert.equal(run('window.FairiVisual.bodyColor({hp:0})'),'#999999');
run("var colorCanvas=document.createElement('canvas');colorCanvas.width=500;colorCanvas.height=550;var colorCtx=colorCanvas.getContext('2d');FairiRig.draw(colorCtx,250,200,1,0,'idle',0,1,0,false,{...FairiRig.motion(),bodyColor:window.FairiVisual.bodyColor({hp:900})},'high');var rgba=colorCtx.getImageData(250,260,1,1).data;");
const expected=run('FairiRig.reference.color');assert.deepEqual(Array.from(run('rgba')).slice(0,3),[1,3,5].map(i=>parseInt(expected.slice(i,i+2),16)));assert.equal(run('rgba[3]'),255);console.log('PASS concept body pixel matches reference exactly; bright HUD accent is separate; KO gray preserved');
// Untargetable is separate from invulnerable: locked attacks fail, physical areas still hit.
reset();run("request(fighters[0],'w')");advance(.55);assert.equal(run('canTarget(fighters[0])'),false);assert.equal(run('canHit(fighters[0])'),true);run("fighters[1]=makeFighter('cylast',1);fighters[1].x=900;fighters[1].y=fighters[0].y;request(fighters[1],'q')");assert.equal(run('fighters[1].frost.qLight'),null);advance(.6);assert.equal(run('fighters[0].hp'),900);run('damage(fighters[1],fighters[0],20)');assert.equal(run('fighters[0].hp'),880);
reset();run("request(fighters[0],'w')");advance(.55);run("request(fighters[0],'attack');keys.KeyL=true");advance(.65);assert.equal(run('fighters[1].hp'),800,'ambush follows ordinary movement');
reset();run("request(fighters[0],'w')");advance(.55);run("request(fighters[0],'attack')");advance(.5);run('fighters[1].x+=400');advance(.2);assert.equal(run('fighters[1].hp'),1000,'late teleport can evade committed stab');
console.log('PASS Fairi stealth blocks targeting without granting invulnerability; ambush tracks movement with a dodge window');


const approved=run('FAIRI_RUN_PRESET.runRig');
assert.equal(JSON.stringify(run('FairiRig.runRigSettings(FAIRI_RUN_PRESET.runRig)')),JSON.stringify(approved));
const rig=run('FairiRig');
const transition=rig.motion();
const at=()=>rig.pose(0,transition.run>.12?'run':'idle',0,0,0,transition,1);
const meshOffset=(pose,region,index)=>Array.from(pose.mesh[region].offsets[index]);
assert.deepEqual(meshOffset(at(),'body',4),Array.from(approved.mesh.idle.body[4]));
assert.equal(at().skeleton,null);
for(let i=0;i<120;i++){
  rig.update(transition,{vx:330,vy:0,y:0,dir:1},1/120);
  const p=at();
  assert(p.wrists.flat().every(Number.isFinite));
  for(const leg of [0,1]){
    const sole=rig.limbGeometry(p,'leg',leg).lower;
    assert(Math.max(...sole.map(point=>point[1]))<.15);
  }
}
const running=at();
assert.deepEqual(meshOffset(running,'head',73),Array.from(approved.mesh.run.head[73]));
assert.deepEqual(meshOffset(running,'body',4),Array.from(approved.mesh.run.body[4]));
assert(running.skeleton);
for(let i=0;i<120;i++)rig.update(transition,{vx:0,vy:0,y:0,dir:1},1/120);
assert.deepEqual(meshOffset(at(),'body',4),Array.from(approved.mesh.idle.body[4]));
console.log('PASS Fairi loads the approved renderer preset and transitions between the two authored meshes');
