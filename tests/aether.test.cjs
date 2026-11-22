const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,Path2D:require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas').Path2D,document:{createElement(){return require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas').createCanvas(16,16)},getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/mox/'+file+'.js'),'utf8'),c);for(const name of ['visual','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/melanta/'+name+'.js'),'utf8'),c);for(const name of ['w-skill','normal-combo','reference-shape','rig','dash-vfx','r-visual','clone-motion','combat','visual'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/fairi/'+name+'.js'),'utf8'),c);for(const file of ['base','combat','visual'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/aether/'+file+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/game.js'),'utf8'),c);

const run=s=>vm.runInContext(s,c),advance=t=>run(`for(let i=0;i<${Math.ceil(t*120)};i++)step(1/120)`);
function reset(){run("$('select0').value='aether';$('select1').value='thunder';mode='pvp';start();phase='fight';fighters[0].x=600;fighters[1].x=900;fighters.forEach(f=>f.y=floor(f.x));");}

reset();assert.equal(run('fighters[0].hp'),900);run("request(fighters[0],'q')");advance(4.3);console.log('Q damage',run('1000-fighters[1].hp'));assert.equal(run('fighters[1].hp'),400);assert.equal(run('fighters[0].aether.q'),null);
reset();run("request(fighters[0],'w')");advance(.6);assert(run('fighters[1].rootUntil>time'));assert.equal(run('isStunned(fighters[1])'),false);assert.equal(run('fighters[0].cd.w'),0);advance(2);assert(run('fighters[0].cd.w')>5.8);
reset();run("request(fighters[0],'e');damage(fighters[1],fighters[0],100)");assert.equal(run('fighters[0].hp'),900);run("request(fighters[0],'jump');request(fighters[0],'q')");assert.equal(run('fighters[0].aether.q'),null);assert.equal(run('fighters[0].vy'),0);advance(4.8);assert.equal(run('fighters[0].aether.liquid'),null);
reset();run("request(fighters[0],'r');keys.KeyD=true;fighters[1].hp=10000");advance(2);assert(run('fighters[0].x')>1100);assert(run('fighters[0].aether.hover.height')!==null);advance(6);assert.equal(run('fighters[0].aether.rain'),null);assert.equal(run('fighters[0].aether.hover'),null);
reset();run("request(fighters[0],'attack')");advance(1.2);assert.equal(run('fighters[1].hp'),940);
reset();run("fighters[1].hp=1;request(fighters[0],'q')");advance(1.5);assert.equal(run('phase'),'finishing');assert.equal(run('aetherKiller'),0);advance(3.5);assert(['roundover','matchover'].includes(run('phase')));
reset();run("selectArena('forest');fighters[0].x=2500;fighters[0].y=floor(2500);fighters[1].x=3100;fighters[1].y=floor(3100);request(fighters[0],'q')");advance(4);assert.equal(run('fighters[1].hp'),400);
console.log('PASS main-game Aether Q/W/E/R/normals, authority damage/status, KO and wide-map bounds');

for(const hz of [30,60,120]){reset();run("fighters[1].hp=10000;request(fighters[0],'q')");run(`for(let i=0;i<${hz*5};i++)step(1/${hz})`);assert.equal(run('fighters[1].hp'),9400);}
reset();run("mode='pve';difficulty='hell';fighters[1]=makeFighter('aether',1);fighters[0].hp=10000;fighters[0].x=600;fighters[1].x=1000;fighters.forEach(f=>f.y=floor(f.x))");advance(8);assert(run('fighters[1].combat.serial')>0);assert(run('fighters[0].hp')<10000);
const native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');c.paint=native.createCanvas(800,600).getContext('2d');for(const quality of ['low','balanced','high'])for(const skill of ['q','w','e','r']){reset();run(`request(fighters[0],'${skill}')`);advance(.8);run(`window.AetherVisual.character(paint,fighters[0],fighters[1],time,moxEnv(fighters[0]).surface,'${quality}');window.AetherVisual.front(paint,fighters[0],fighters[1],time,'${quality}',worldSurface)`);}reset();const snap=run('JSON.stringify(window.riftGame.snapshot())');assert(!snap.includes('spikes'));console.log('PASS 30/60/120Hz Q damage, native Hell AI casts/damages, all skills render in three quality profiles, no network particles');
reset();run("fighters[1].x=1550;request(fighters[0],'q')");advance(2.9);assert(run('fighters[0].aether.q'));advance(.12);assert.equal(run('fighters[0].aether.q'),null);assert(run('fighters[0].cd.q')>3.9);
reset();run("fighters[1].x=1550;request(fighters[0],'q')");advance(2);run('fighters[1].x=900');advance(.02);assert.equal(run('fighters[0].aether.q.count'),5);run('fighters[1].x=1550');advance(2.9);assert(run('fighters[0].aether.q'));advance(.12);assert.equal(run('fighters[0].aether.q'),null);
run("var meteorCues=0;var previousCombatSound= combatSound;combatSound=(id,...args)=>{if(id==='aether_whoosh')meteorCues++;return previousCombatSound(id,...args)}");for(const hz of [30,60,120]){reset();run("meteorCues=0;fighters[1].hp=10000;request(fighters[0],'r')");run(`for(let i=0;i<${hz*8};i++)step(1/${hz})`);assert.equal(run('meteorCues'),24);assert.equal(run('window.AetherBase.CONFIG.r.count'),24);assert.equal(run('fighters[0].aether.rain'),null);}
console.log('PASS Aether crystals expire after 3 idle seconds, launching resets timeout; 24-meteor rain at 30/60/120Hz');

for (const height of [0, 230]) {
  reset();
  run(`
     {
      const [aether, target] = fighters;
      target.y = floor(target.x) - ${height};
      target.ground = ${height === 0};
      const {CONFIG: {r}, METEOR_RAIN: meteor} = window.AetherBase;
      const shot = meteor.create({x:target.x},r,()=>1);
      shot.t = r.warning + .35;
      meteor.advance(shot,r);
      shot.sx += target.x - shot.x;
      meteor.advance(shot,r);
      shot.base = target.y - 200 + shot.y;
      shot.use = newUse(aether,'r');
      shot.key = 'damage-test';
      aether.aether.shots = [shot];
      step(1/120);
    }
  `);
  assert.equal(run('fighters[1].hp'), 900, 'One meteor deals 100 on contact');
  advance(1.5);
  assert.equal(run('fighters[1].hp'), 900, 'No second hit on ground impact');
}
console.log('PASS 100 damage per meteor against grounded and airborne targets');
