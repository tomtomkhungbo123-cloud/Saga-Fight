const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,Path2D:require('@napi-rs/canvas').Path2D,document:{createElement(){return require('@napi-rs/canvas').createCanvas(16,16)},getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/mox/'+file+'.js'),'utf8'),c);for(const name of ['visual','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/melanta/'+name+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(process.env.SAGA_AI_SOURCE||require('node:path').join(__dirname,'../web/game.js'),'utf8'),c);
function run(code){return vm.runInContext(code,c)}function reset(type='soul'){run(`$('select0').value='${type}';$('select1').value='thunder';mode='pvp';start();phase='fight';fighters[0].x=600;fighters[1].x=750;fighters.forEach(f=>f.y=floor(f.x));`)}function advance(n){run(`for(let i=0;i<${Math.ceil(n*120)};i++)step(1/120);`)}

run("var aiSeed=908;Math.random=()=>{aiSeed=(Math.imul(aiSeed,1664525)+1013904223)>>>0;return aiSeed/4294967296;};window.SagaAI.setDebug(true);");
const types=['thunder','soul','cylast','mox','melanta'],levels=['easy','normal','hard','hell'],scenarios=['still','flee','rush','jump','whiff','corner','projectile','repeat','platform'];
const results=[];
function scenario(bot,level,opponent,kind,form=0,hz=120){
 reset(opponent);run("$('select1').value='"+bot+"';$('difficulty').value='"+level+"';mode='pve';start();phase='fight';fighters[0].x=500;fighters[1].x=1100;fighters.forEach(f=>f.y=floor(f.x));"+(form?"fighters[1].mox.p.form=1;":"")+(kind==='corner'?"fighters[1].x=65;fighters[0].x=310;fighters.forEach(f=>f.y=floor(f.x));":"")+(kind==='platform'?"fighters[0].x=platforms[0].x+20;fighters[0].y=platforms[0].y;fighters[0].ground=true;fighters[1].x=platforms[0].x-100;fighters[1].y=floor(fighters[1].x);":""));
 const data=run(`(()=>{let idle=0,steps=0,closest=2000,cornerEscaped=false,gaps=0,lastAttack=-99,actions=0,outside=0;const originalTry=aiTry;aiTry=function(f,s,k,link){const geometry=aiRanges(f),valid=['e','jump'].includes(k)||k==='q'&&f.type==='mox'||aiInRange(f,s.seen,k,geometry);const ok=originalTry(f,s,k,link);if(ok){actions++;if(!valid)outside++;if(time-lastAttack>.5)gaps++;lastAttack=time;}return ok;};
 try{for(let i=0;i<8*${hz}&&phase==='fight';i++){const p=fighters[0],b=fighters[1],dist=b.x-p.x;keys={};
 const kind='${kind}';
 if(kind==='flee'){if(p.x>1480)p.dir=-1;else if(p.x<110)p.dir=1;keys[p.dir>0?'KeyD':'KeyA']=true;}
 if(kind==='rush'||kind==='corner')keys[dist>0?'KeyD':'KeyA']=true;
 if(kind==='jump'&&i%${hz}===0)request(p,'jump');
 if(kind==='whiff'&&i%${Math.round(hz*.8)}===0){p.dir=Math.sign(dist)||1;request(p,'attack');}
 if(kind==='projectile'){p.dir=Math.sign(dist)||1;if(p.cd.q===0)request(p,'q');if(Math.abs(dist)<300)keys[dist>0?'KeyA':'KeyD']=true;}
 if(kind==='repeat'&&i%${Math.round(hz*.25)}===0){p.dir=Math.sign(dist)||1;request(p,'attack');}
 step(1/${hz});steps++;if(!b.move&&!aiBusy(b)&&!isStunned(b))idle++;closest=Math.min(closest,Math.abs(b.x-p.x));if(b.x>200&&b.x<1400)cornerEscaped=true;
 if(!fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)&&Number.isFinite(f.vx)&&Number.isFinite(f.turn)&&f.hp>=0&&f.hp<=1000))throw Error('invalid fighter state');
 if(b.pveAI?.observations.length>24||b.pveAI?.trace.length>64)throw Error('unbounded state');
 if(isStunned(b)&&b.combat.buffer)throw Error('bot retained a buffered command in stun');
 }}finally{aiTry=originalTry;}
 return {damage:1000-fighters[0].hp,taken:1000-fighters[1].hp,idle:idle/Math.max(1,steps),closest,cornerEscaped,gaps,actions,outside,stats:fighters[1].pveAI?.stats,phase};})()`);
 assert.equal(data.outside,0,bot+' '+kind+' chose out of effective range');if(kind==='still')assert.ok(data.actions>0,bot+' '+level+' never acted');if(kind==='platform'&&['hard','hell'].includes(level))assert.ok(data.damage>0,bot+' did not reach or threaten platform target');if(kind==='corner')assert.ok(data.cornerEscaped||data.actions>0,bot+' stuck in corner');
 results.push({bot,level,opponent,kind,form,hz,...data});return data;
}
for(const type of types)for(const level of levels)for(const kind of scenarios)scenario(type,level,'thunder',kind);
for(const level of levels)for(const kind of scenarios)scenario('mox',level,'thunder',kind,1);
for(const bot of types)for(const opponent of types)for(const level of ['hard','hell'])scenario(bot,level,opponent,'repeat');
for(const hz of [30,60])for(const type of types)scenario(type,'hell','thunder','still',0,hz);
const paired=[];
for(const bot of types)for(const kind of ['still','projectile','repeat'])for(const seed of [101,202,303])for(const level of ['hard','hell']){run('aiSeed='+seed);paired.push({level,...scenario(bot,level,'thunder',kind)});}
for(const level of ['hard','hell']){const rows=paired.filter(r=>r.level===level);console.log(JSON.stringify({pairedLevel:level,cases:rows.length,meanDamage:+(rows.reduce((n,r)=>n+r.damage,0)/rows.length).toFixed(2),meanTaken:+(rows.reduce((n,r)=>n+r.taken,0)/rows.length).toFixed(2),links:rows.reduce((n,r)=>n+r.stats.links,0),defenses:rows.reduce((n,r)=>n+r.stats.defenses,0)}));assert.ok(rows.some(r=>r.taken>0),'bot must remain hittable');assert.ok(rows.some(r=>r.idle>.1),'must retain readable openings');}
for(const level of levels){const subset=results.filter(r=>r.level===level);console.log(JSON.stringify({level,cases:subset.length,meanActions:+(subset.reduce((s,r)=>s+r.actions,0)/subset.length).toFixed(2),meanDamage:+(subset.reduce((s,r)=>s+r.damage,0)/subset.length).toFixed(2),meanIdle:+(subset.reduce((s,r)=>s+r.idle,0)/subset.length).toFixed(2),links:subset.reduce((s,r)=>s+(r.stats?.links||0),0),defenses:subset.reduce((s,r)=>s+(r.stats?.defenses||0),0),directionChanges:subset.reduce((s,r)=>s+(r.stats?.directionChanges||0),0)}));}
fs.writeFileSync('/tmp/saga-pve-scenarios.json',JSON.stringify(results,null,2));fs.writeFileSync('/tmp/saga-pve-paired.json',JSON.stringify(paired,null,2));
console.log('PASS '+results.length+' real simulation scenarios, every character/form/difficulty; finite state, range gates, stun buffer, corner action; all25matchups hard/hell and30/60/120Hz');
