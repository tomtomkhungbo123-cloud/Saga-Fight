const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,document:{getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/mox/'+file+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/game.js'),'utf8'),c);
function run(code){return vm.runInContext(code,c)}function reset(type='soul'){run(`$('select0').value='${type}';$('select1').value='thunder';mode='pvp';start();phase='fight';fighters[0].x=600;fighters[1].x=750;fighters.forEach(f=>f.y=floor(f.x));`)}function advance(n){run(`for(let i=0;i<${Math.ceil(n*120)};i++)step(1/120);`)}

function practice(type='soul',distance=100){reset(type);run(`mode='sandbox';sandboxOptions.free=false;sandboxOptions.ai=false;sandboxOptions.defend=true;fighters[1].x=fighters[0].x+${distance};fighters[1].y=fighters[0].y;`);}
function tap(k){run(`request(fighters[0],'${k}')`);}
function near(actual,expected,epsilon=.002){assert.ok(Math.abs(actual-expected)<epsilon,`${actual} != ${expected}`);}
function until(predicate,limit=2){for(let i=0;i<limit*120;i++){if(run(predicate))return;advance(1/120);}throw Error('Timeout '+predicate+' '+run('JSON.stringify({a:fighters[0].action,combo:fighters[0].combo})'));}


const heard=[];c.window.sagaAudio={play:(id,event)=>heard.push({id,...event}),stopCombat:()=>heard.push({id:'stop'})};
const count=id=>heard.filter(e=>e.id===id).length;
function fresh(type='soul',distance=80){practice(type,distance);heard.length=0;}
fresh();tap('attack');advance(.14);assert.equal(count('soulblade_slash_1'),1);assert.equal(heard.filter(e=>e.id.startsWith('hit_')).length,1);advance(.2);assert.equal(heard.filter(e=>e.id.startsWith('hit_')).length,1);
fresh();run('fighters[1].x=1400');tap('attack');advance(.4);assert.equal(count('soulblade_slash_1'),1);assert.equal(heard.filter(e=>e.id.startsWith('hit_')).length,0);
fresh();run("var use=newUse(fighters[0],'attack',1);damage(fighters[0],fighters[1],10,0,false,false,{use,hitId:'same'});damage(fighters[0],fighters[1],10,0,false,false,{use,hitId:'same'});");assert.equal(heard.filter(e=>e.id.startsWith('hit_')).length,1);run("damage(fighters[0],fighters[1],10,0,false,false,{use,dot:true});");assert.equal(heard.filter(e=>e.id.startsWith('hit_')).length,1);
fresh('thunder',150);const castTime=run('time');tap('r');advance(1.3);assert.equal(count('thunder_r_strike'),3);heard.filter(e=>e.id==='thunder_r_strike').forEach((e,i)=>near(e.t-castTime,[.5,.85,1.2][i],.009));advance(.5);assert.equal(count('thunder_r_strike'),3);
fresh();tap('r');until('fighters[1].bleed.length===1');assert.equal(count('soulblade_bleed_apply'),1);advance(3.1);assert.equal(count('soulblade_bleed_explode'),1);advance(.5);assert.equal(count('soulblade_bleed_explode'),1);
fresh('cylast',80);tap('q');until('fighters[0].action===null');assert.equal(count('cylast_q_freeze'),1);run("var use=newUse(fighters[0],'attack',1);damage(fighters[0],fighters[1],65,0,false,false,{use,hitId:'ice-hit'});");assert.equal(count('cylast_ice_shatter'),1);
fresh('mox',80);tap('r');advance(.3);assert.equal(count('mox_r_grab'),1);assert.equal(count('mox_r_slam'),0);advance(1.1);assert.equal(count('mox_r_slam'),1);
fresh('mox',80);run('fighters[0].mox.p.form=1');tap('r');advance(1);assert.equal(count('mox_r_barrage_shot'),4);
fresh();run("for(let i=0;i<16;i++){const use=newUse(fighters[0],'attack',1);damage(fighters[0],fighters[1],1,0,false,false,{use,hitId:'threshold'+i});}");for(const n of [5,10,15])assert.equal(count('combo_'+n),1);
const batch=run('JSON.parse(JSON.stringify(window.riftGame.snapshot()))');heard.length=0;c.batch=batch;run('receivedSfx=0;receiveSound(batch);receiveSound(batch);');const received=heard.length;assert.ok(received>0);run('receiveSound(batch);');assert.equal(heard.length,received);run('receivedSfx=0;batch.time+=1;receiveSound(batch);');assert.equal(heard.length,received);run('menu()');assert.equal(run('sfxEvents.length'),0);assert.equal(heard.at(-1).id,'stop');
console.log('PASS actual hit/miss/dedup/DOT, three Thunder bolts, single bleed/shatter, Mox capture/slam/barrage, one-shot combo thresholds and network replay/stale suppression');

// V2 cue routes and zone lifecycle use the actual combat engine.
fresh('mox',80);run('sandboxOptions.defend=false;fighters[0].mox.p.form=1');tap('r');advance(1.5);
assert.equal(count('mox_r_barrage_shot'),4);assert.equal(count('mox_r_barrage_hit'),4);assert.equal(count('mox_bullet_hit'),0);
fresh('mox',800);run('sandboxOptions.defend=false;fighters[0].mox.p.form=1');tap('r');advance(2);assert.equal(count('mox_r_barrage_hit'),0);
fresh('soul',80);tap('w');advance(.6);tap('w');assert.equal(count('soulblade_w_blink'),1);assert.equal(heard.filter(e=>e.id.startsWith('soulblade_slash_')).length,0);
fresh('soul',80);tap('r');until('fighters[1].bleed.length===1');assert.equal(count('soulblade_r_cast'),1);advance(3.2);assert.equal(count('soulblade_r_cast'),1);assert.equal(count('soulblade_bleed_explode'),1);
let zones=[];c.window.sagaAudio.syncZones=(list,speed)=>{zones=JSON.parse(JSON.stringify(list));};
fresh('cylast',800);run('sandboxOptions.defend=false');tap('w');advance(.6);run('syncZoneSound()');assert.equal(count('cylast_w_rain_cast'),1);assert.equal(zones.length,1);assert.ok(zones[0].life>3);const key=zones[0].key;
advance(1);run('interruptFighter(fighters[0]);syncZoneSound()');assert.equal(zones[0].key,key,'interrupt does not remove released zone');
advance(3.5);run('syncZoneSound()');assert.equal(zones.length,0);
tap('r');advance(.6);run('syncZoneSound()');assert.equal(count('cylast_r_storm'),1);assert.equal(zones.length,1);assert.ok(zones[0].life>2&&zones[0].life<=3);
advance(1.6);run('syncZoneSound()');assert.equal(zones.length,1,'storm outlives 1.5s root reference');
run('fighters[0].frost.zones=[];syncZoneSound()');assert.equal(zones.length,0,'explicit removal ends loop');
run("fighters[0].cd.r=0");tap('r');advance(.6);run('syncZoneSound();pause();syncZoneSound()');assert.equal(zones.length,0);run('pause();syncZoneSound()');assert.equal(zones.length,1);run('menu();syncZoneSound()');assert.equal(zones.length,0);
console.log('PASS V2 Mox hit/whiff routing, Soul blink/cast/burst separation, Cylast actual zone lifetime/interrupt/removal/pause/menu');
