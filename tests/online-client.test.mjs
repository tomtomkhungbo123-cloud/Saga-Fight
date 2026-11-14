import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {api} from '../worker/index.mjs';import {localDB} from '../scripts/local-db.mjs';
const peers=new WeakMap();
function client(DB,link=null,netSource=null){let serial=0;const timers=new Map(),elements=new Map();function node(id=''){const classes=new Set();return {id,value:id==='select0'?'thunder':id==='select1'?'soul':'normal',textContent:'',style:{},hidden:false,disabled:false,dataset:{},children:[],listeners:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,b){b??=!classes.has(x);b?classes.add(x):classes.delete(x);return b;}},firstChild:{textContent:''},parentElement:{firstChild:{textContent:''}},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},querySelector(k){return this.parts[k]??=(node('part'));},parts:{},closest(s){if(s==='[data-do]')return this.dataset.do?this:null;if(s==='[data-hold]')return this.dataset.hold?this:null;if(s==='.touch-move')return this.dataset.hold?this:null;return null;},focus(){},setPointerCapture(){},getContext(){return {};},getBoundingClientRect(){return {width:1200,height:800};},click(){return this.onclick?.();}};}
const el=id=>{if(!elements.has(id))elements.set(id,node(id));return elements.get(id);};const hold=['KeyA','KeyD'].map(k=>Object.assign(node(k),{dataset:{hold:k}})),actions=['jump','drop','attack','q','w','e','r'].map(k=>Object.assign(node(k),{dataset:{do:k}})),modes=['pve','pvp','online'].map(k=>Object.assign(node(k),{dataset:{mode:k}}));
const document={hidden:false,body:node('body'),activeElement:null,hit:null,elementFromPoint(){return this.hit;},getElementById:el,addEventListener(){},querySelectorAll(s){if(s==='.fighterhud')return [el('fighter0'),el('fighter1')];if(s==='[data-hold]')return hold;if(s==='[data-do]')return actions;if(s==='[data-mode]')return modes;if(s==='.touch-skills [data-do]')return actions.filter(b=>['q','w','e','r'].includes(b.dataset.do));return [];},querySelector(s){return s.includes('data-mode="online"')?modes[2]:el(s);}};
const ctx=vm.createContext({console,Math,Map,Set,Date,JSON,URL,performance:link?{now:()=>link.now}:performance,AbortController,document,navigator:{},location:{href:'http://duel.test/'},window:{addEventListener(){}},Image:class{},devicePixelRatio:1,requestAnimationFrame(){},setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout(id){timers.delete(id);},setInterval(fn,ms){return ++serial;},clearInterval(){},async fetch(path,opts){return api(new Request('http://duel.test'+path,opts),{DB});}});
for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(new URL('../web/cylast/'+file+'.js',import.meta.url),'utf8'),ctx);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(new URL('../web/mox/'+file+'.js',import.meta.url),'utf8'),ctx);vm.runInContext(fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8'),ctx);vm.runInContext(fs.readFileSync(new URL('../web/net-codec.js',import.meta.url),'utf8'),ctx);vm.runInContext((netSource||fs.readFileSync(new URL('../web/online.js',import.meta.url),'utf8')).replace('window.riftNet={','window.testTransport={channel,send,sendState,sendInput,fast,inspectRoute,connectionGuard,connectSocket,queues:()=>({frames:frames.length,events:pending.length,hostFrames:hostFrames.length}),session:()=>session};window.riftNet={'),ctx);
const result={ctx,el,hold,actions,expireDirect(){const pair=[...timers].find(([id,t])=>t.ms===4000);assert.ok(pair,'direct timeout exists');timers.delete(pair[0]);pair[1].fn();},reconnect(){const pair=[...timers].find(([id,t])=>t.ms>=500&&t.ms<701);assert.ok(pair,'production backoff timer exists');timers.delete(pair[0]);pair[1].fn();},setHit(b){document.hit=b;},run:s=>vm.runInContext(s,ctx),async poll(){let pair;for(let i=0;i<200&&!pair;i++){await new Promise(r=>setTimeout(r,1));pair=[...timers].find(([id,t])=>t.ms===120||t.ms===1600);}assert.ok(pair,'poll timer exists');timers.delete(pair[0]);await pair[1].fn();await new Promise(setImmediate);
 const list=peers.get(DB)||[],active=list.filter(c=>c.run('!!window.testTransport.session()'));if(active.length===2){for(const c of active){const other=active.find(v=>v!==c);if(!c.run('!!window.testTransport.session().channel')){const sender=c.run('window.testTransport.session().role');const dc={readyState:'open',get bufferedAmount(){return link?.buffered?.(sender)||0;},send:text=>{const dest=other.run('window.testTransport.session()?.channel');if(link)link.send(()=>dest?.onmessage?.({data:text}),text,sender);else dest?.onmessage?.({data:text});},close(){this.readyState='closed';}};c.ctx.testDC=dc;c.run('window.testTransport.channel(testDC)');}}for(let i=0;i<2;i++)for(const c of active)c.run('window.riftNet.frame(1/120);window.testTransport.fast(window.testTransport.session());if(window.testTransport.session().role==="host")window.testTransport.sendState();else window.testTransport.sendInput();');}
 },fire(button,name,id){for(const fn of button.listeners[name]||[])fn({pointerId:id,preventDefault(){}});}};(peers.get(DB)||peers.set(DB,[]).get(DB)).push(result);return result;}
const flush=()=>new Promise(setImmediate);
test('multitouch independent fingers, release/cancel and repeated hold pointers',()=>{const DB=localDB(),c=client(DB);try{c.run("mode='pve';start();phase='fight'");c.fire(c.hold[1],'pointerdown',1);c.fire(c.actions[0],'pointerdown',2);assert.equal(c.run('keys.KeyD'),true);assert.equal(c.run('fighters[0].jumps'),1);c.fire(c.actions[0],'pointerup',2);assert.equal(c.run('keys.KeyD'),true);c.fire(c.hold[1],'lostpointercapture',1);assert.equal(c.run('keys.KeyD'),false);c.fire(c.hold[0],'pointerdown',5);c.fire(c.hold[0],'pointerdown',6);c.fire(c.hold[0],'pointercancel',5);assert.equal(c.run('keys.KeyA'),true);c.fire(c.hold[0],'pointerup',6);assert.equal(c.run('keys.KeyA'),false);}finally{DB.close();}});
test('two independent clients: DataChannel sync, guest controls/skill, both ready and leave',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{
 host.run("mode='online'");guest.run("mode='online'");await host.el('createRoom').onclick();await flush();const code=host.el('lobbyCode').textContent;assert.match(code,/^[A-Z2-9]{6}$/);guest.el('roomCode').value=code;guest.el('select0').value='soul';await guest.el('joinRoom').onclick();await flush();await host.poll();host.run('for(let i=0;i<390;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run('phase'),'fight');assert.equal(guest.run('fighters[1].type'),'soul');
 guest.run("keydown({code:'KeyA',repeat:false,preventDefault(){}});localAction('q')");await guest.poll();await host.poll();host.run('for(let i=0;i<35;i++)step(1/120)');assert.equal(host.run('fighters[1].charges'),1);assert.ok(host.run('fighters[1].x')<1230);assert.equal(guest.run('fighters[0].x'),340);await host.poll();await guest.poll();assert.equal(guest.run('fighters[1].charges'),1);
 host.run("var koFilter=false;$('arena').classList.toggle=(k,v)=>{if(k==='ko-scene')koFilter=v;};");guest.run("var koFilter=false;$('arena').classList.toggle=(k,v)=>{if(k==='ko-scene')koFilter=v;};");host.run('fighters[1].hp=0;step(1/120);for(let i=0;i<130;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run('phase'),'finishing');assert.ok(guest.run('finishLeft')>1.8);assert.equal(host.run('koFilter'),false);assert.equal(guest.run('koFilter'),true);host.run('for(let i=0;i<250;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run('phase'),'roundover');host.run('window.riftNet.confirm()');assert.equal(host.run('phase'),'roundover');guest.run('window.riftNet.confirm()');await guest.poll();await host.poll();assert.equal(host.run('phase'),'countdown');assert.equal(host.run('round'),2);await host.poll();await guest.poll();assert.equal(guest.run('phase'),'countdown');
 assert.equal(host.run('koFilter'),false);assert.equal(guest.run('koFilter'),false);
 host.run('for(let i=0;i<390;i++)step(1/120);fighters[0].hp=0;step(1/120)');await host.poll();await guest.poll();assert.equal(host.run('koFilter'),true);assert.equal(guest.run('koFilter'),false);
 host.run('pause()');await host.poll();await guest.poll();assert.equal(guest.run('phase'),'paused');assert.equal(host.run('koFilter'),true);assert.equal(guest.run('koFilter'),false);
 host.run('pause();setupRound()');await host.poll();await guest.poll();assert.equal(host.run('koFilter'),false);assert.equal(guest.run('koFilter'),false);
 host.run('window.riftNet.leave()');await flush();await guest.poll();assert.equal(guest.run('phase'),'menu');assert.equal(guest.run('window.riftNet.room'),null);await flush();
 }finally{DB.close();}});

test('movement slide and skill sweep keep one next input without duplicate casts',()=>{const DB=localDB(),c=client(DB);try{c.run("mode='pvp';start();phase='fight'");c.fire(c.hold[0],'pointerdown',1);c.setHit(c.hold[1]);c.fire(c.hold[0],'pointermove',1);assert.equal(c.run('keys.KeyA'),false);assert.equal(c.run('keys.KeyD'),true);const q=c.actions.find(b=>b.dataset.do==='q'),w=c.actions.find(b=>b.dataset.do==='w'),e=c.actions.find(b=>b.dataset.do==='e');c.fire(q,'pointerdown',2);c.setHit(w);c.fire(q,'pointermove',2);c.setHit(e);c.fire(q,'pointermove',2);c.setHit(w);c.fire(q,'pointermove',2);assert.equal(c.run("fighters[0].action.k"),'q');assert.equal(c.run("fighters[0].combat.buffer.k"),'e');assert.equal(c.run("fighters[0].queue.length"),0);assert.equal(c.run('keys.KeyD'),true);c.fire(q,'pointercancel',2);assert.equal(c.run('actionPointers.size'),0);c.fire(c.hold[0],'pointerup',1);assert.equal(c.run('keys.KeyD'),false);}finally{DB.close();}});
test('home button is in pause menu, control pad disappears until resume',()=>{const DB=localDB(),c=client(DB);try{const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');assert.ok(!html.includes('id="touchMenu"'));c.run("mode='pve';start();phase='fight';pause()");assert.equal(c.el('back').textContent,'VỀ TRANG CHỦ');assert.equal(c.run("document.body.classList.contains('paused')"),true);c.run('pause()');assert.equal(c.run("document.body.classList.contains('paused')"),false);}finally{DB.close();}});
test('pause guide follows the player, live charges and local PvP selection',()=>{const DB=localDB(),c=client(DB);try{c.run("mode='pve';$('select0').value='soul';start();phase='fight';fighters[0].charges=1;fighters[0].qRecharge=[2.7];pause()");assert.equal(c.el('pauseSkills').hidden,false);assert.equal(c.el('pauseCharacter').textContent,'SOULBLADE');assert.ok(c.el('pauseSkillList').innerHTML.includes('1/2 lượt · +1 sau 2.7s'));assert.ok(c.el('pauseSkillList').innerHTML.includes('Huyết nguyệt'));assert.ok(!c.el('pauseSkillList').innerHTML.includes('Thiên phạt'));assert.equal(c.el('pauseTabs').hidden,true);c.run("mode='pvp';fighters[1].type='thunder';renderPauseSkills(1)");assert.equal(c.el('pauseCharacter').textContent,'THUNDER STANCE · P2');assert.ok(c.el('pauseSkillList').innerHTML.includes('Thiên phạt'));assert.ok(c.el('pauseSkillList').innerHTML.includes('<kbd>4</kbd>'));assert.equal(c.el('pauseTabs').hidden,false);c.run("mode='online';window.riftNet={room:'ABCDEF',role:'guest'};renderPauseSkills(0)");assert.equal(c.el('pauseCharacter').textContent,'THUNDER STANCE');assert.equal(c.el('pauseTabs').hidden,true);c.run("phase='roundover';showMessage('TEST','WIN','','NEXT')");assert.equal(c.el('pauseSkills').hidden,true);}finally{DB.close();}});

test('Cylast online selection, host casts and guest receives full frost state',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{host.el('select0').value='cylast';guest.el('select0').value='cylast';host.run("mode='online'");guest.run("mode='online'");await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run('for(let i=0;i<390;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run('fighters[0].type'),'cylast');assert.equal(guest.run('fighters[1].type'),'cylast');guest.run("localAction('e')");await guest.poll();await host.poll();host.run('for(let i=0;i<65;i++)step(1/120)');assert.equal(host.run('fighters[1].shield'),300);await host.poll();await guest.poll();assert.equal(guest.run('fighters[1].shield'),300);assert.equal(guest.run('fighters[1].frost.ward.phase'),'active');guest.run("pause()");await guest.poll();await host.poll();await host.poll();await guest.poll();assert.ok(guest.el('pauseSkillList').innerHTML.includes('Bão tuyết'));}finally{DB.close();}});

test('Mox online character, form, immunity and native pose survive host/guest sync',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{host.el('select0').value='mox';guest.el('select0').value='mox';host.run("mode='online'");guest.run("mode='online'");await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run('for(let i=0;i<390;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run('fighters[0].type'),'mox');assert.equal(guest.run('fighters[1].type'),'mox');guest.run("localAction('q')");await guest.poll();await host.poll();host.run('for(let i=0;i<10;i++)step(1/120)');assert.equal(host.run('fighters[1].mox.p.form'),1);await host.poll();await guest.poll();assert.equal(guest.run('fighters[1].mox.p.form'),1);assert.ok(guest.run('fighters[1].immuneUntil-time')>.8);guest.run('advanceGuest(.03)');assert.ok(guest.run('fighters[1].mox.anim.t')>0);assert.ok(Number.isFinite(guest.run('fighters[1].mox.punchPose.front')));}finally{DB.close();}});
test('mirror identity and combo counts remain consistent for host and guest',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{host.el('select0').value='soul';guest.el('select0').value='soul';host.run("mode='online'");guest.run("mode='online'");await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run('for(let i=0;i<390;i++)step(1/120);for(let i=0;i<5;i++)damage(fighters[1],fighters[0],1,0)');await host.poll();await guest.poll();for(const c of [host,guest]){assert.equal(c.run('alternateFighter(fighters[0])'),false);assert.equal(c.run('alternateFighter(fighters[1])'),true);assert.equal(c.run('fighters[1].combo.count'),5);c.run('comboHUD()');assert.equal(c.el('comboCount1').textContent,'5');assert.equal(c.el('combo1').hidden,false);}}finally{DB.close();}});
test('keyboard and iOS pointer taps share the same confirmed chain/cancel engine',()=>{const DB=localDB();try{const results=[];for(const input of ['keyboard','touch']){const c=client(DB);c.run("$('select0').value='soul';mode='sandbox';start();sandboxOptions.free=false;sandboxOptions.defend=true;fighters[0].x=600;fighters[1].x=680;fighters.forEach(f=>f.y=floor(600));");let pointer=10;for(const [k,dt] of [['attack',.14],['q',.61],['attack',.16],['q',.61],['attack',.2]]){if(input==='touch'){const b=c.actions.find(b=>b.dataset.do===k);c.fire(b,'pointerdown',pointer);c.fire(b,'pointerup',pointer++);}else c.run(`keydown({code:'${k==='attack'?'Space':'KeyQ'}',repeat:false,preventDefault(){}});keyup({code:'${k==='attack'?'Space':'KeyQ'}'})`);c.run(`for(let i=0;i<${Math.ceil(dt*120)};i++)step(1/120)`);}assert.equal(c.run('fighters[0].combo.display'),11,input);assert.equal(c.run('fighters[0].charges'),0);assert.equal(c.run('sandboxStats.gaps||0'),0);results.push(c.run('fighters[0].combo.displayDamage'));}assert.equal(results[0],results[1]);}finally{DB.close();}});
test('online guest eleven-hit chain uses host-confirmed scaling, charges and extension budget',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{for(const c of [host,guest]){c.el('select0').value='soul';c.run("mode='online';sandboxTuning.extensions=4;");}await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run("for(let i=0;i<390;i++)step(1/120);fighters[1].x=600;fighters[1].dir=1;fighters[0].x=680;fighters[0].dir=-1;fighters.forEach(f=>f.y=floor(600));");await host.poll();await guest.poll();for(const [k,dt] of [['attack',.14],['q',.61],['attack',.16],['q',.61],['attack',.2]]){guest.run(`localAction('${k}')`);await guest.poll();await host.poll();host.run(`for(let i=0;i<${Math.ceil(dt*120)};i++)step(1/120)`);await host.poll();await guest.poll();}for(const c of [host,guest]){assert.equal(c.run('fighters[1].combo.display'),11);assert.equal(c.run('fighters[1].combo.points'),0);assert.equal(c.run('fighters[1].combo.moves.q'),2);assert.equal(c.run('fighters[1].charges'),0);c.run('comboHUD()');assert.equal(c.el('combo1').classList.contains('combo-ten'),true);}assert.equal(host.run('fighters[1].combo.displayDamage'),guest.run('fighters[1].combo.displayDamage'));assert.equal(host.run('fighters[0].hp'),guest.run('fighters[0].hp'));assert.equal(host.run('COMBAT_CONFIG.extensions'),2);}finally{DB.close();}});
test('owned freeze/shatter and its single bonus hit synchronize from host to guest',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{host.el('select0').value='cylast';guest.el('select0').value='mox';for(const c of [host,guest])c.run("mode='online'");await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run("for(let i=0;i<390;i++)step(1/120);fighters[0].x=600;fighters[1].x=680;fighters.forEach(f=>f.y=floor(600));request(fighters[0],'q');for(let i=0;i<80;i++)step(1/120)");await host.poll();await guest.poll();assert.equal(guest.run('fighters[1].freezeBy.owner'),0);host.run("request(fighters[0],'attack');for(let i=0;i<36;i++)step(1/120)");await host.poll();await guest.poll();for(const c of [host,guest]){assert.equal(c.run('fighters[1].freezeUntil'),0);assert.equal(c.run('fighters[1].freezeBy'),null);assert.equal(c.run('fighters[0].frost.ice'),null);assert.ok(Math.abs(c.run('fighters[1].hp')-782.075)<.001);assert.equal(c.run('fighters[0].combo.count'),2);}}finally{DB.close();}});
test('bleed stacks, captured factor and independent burst remain host authoritative',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{host.el('select0').value='soul';for(const c of [host,guest])c.run("mode='online'");await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run("for(let i=0;i<390;i++)step(1/120);fighters[0].x=600;fighters[1].x=750;fighters.forEach(f=>f.y=floor(600));request(fighters[0],'r');for(let i=0;i<240&&!fighters[1].bleed.length;i++)step(1/120);for(let i=0;i<96;i++)step(1/120);fighters[0].x=fighters[1].x-100;fighters[0].y=floor(fighters[0].x);request(fighters[0],'attack');for(let i=0;i<18;i++)step(1/120)");await host.poll();await guest.poll();assert.equal(guest.run('fighters[1].bleed[0].stacks'),1);assert.equal(guest.run('fighters[1].bleed[0].scale'),1);const hp=host.run('fighters[1].hp');host.run('var untilBurst=fighters[1].bleed[0].until;while(time<untilBurst+.02)step(1/120)');await host.poll();await guest.poll();for(const c of [host,guest]){assert.equal(c.run('fighters[1].bleed.length'),0);assert.ok(Math.abs(c.run('fighters[1].hp')-(hp-61.8))<.001);assert.equal(c.run('fighters[0].combat.lastBurst.hits'),1);assert.equal(c.run('fighters[0].combat.lastBurst.comboId'),null);assert.equal(c.run('fighters[0].combo.count'),0);}}finally{DB.close();}});

test('combat audio is host-confirmed and duplicate snapshots do not replay it',async()=>{const DB=localDB(),host=client(DB),guest=client(DB);try{
 for(const c of [host,guest])c.run("mode='online';var heard=[];window.sagaAudio={play:(id,event)=>heard.push({id,...event}),stopCombat(){}};");
 guest.el('select0').value='soul';await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();host.run("for(let i=0;i<390;i++)step(1/120);fighters[0].x=600;fighters[1].x=680;fighters.forEach(f=>f.y=floor(600));");await host.poll();await guest.poll();
 guest.run("heard=[];localAction('attack')");assert.equal(guest.run('heard.length'),0);await guest.poll();await host.poll();host.run('for(let i=0;i<18;i++)step(1/120)');await host.poll();await guest.poll();assert.equal(guest.run("heard.filter(e=>e.id==='soulblade_slash_1').length"),1);assert.equal(guest.run("heard.filter(e=>e.id.startsWith('hit_')).length"),1);
 assert.ok(host.run('shake')>0);assert.equal(host.run('shake'),guest.run('shake'));assert.equal(host.run('JSON.stringify(fighters[1].hitMeter)'),guest.run('JSON.stringify(fighters[1].hitMeter)'));const meterBefore=guest.run('JSON.stringify(fighters[1].hitMeter)');const total=guest.run('heard.length');await host.poll();await guest.poll();assert.equal(guest.run('heard.length'),total);assert.equal(guest.run('JSON.stringify(fighters[1].hitMeter)'),meterBefore);
 }finally{DB.close();}});

test('no relay connection means no combat over HTTP',async()=>{const DB=localDB(),c=client(DB);try{await c.el('createRoom').onclick();await flush();await c.poll();assert.equal(c.run('phase'),'lobby');assert.equal(c.run('window.riftNet.blocked'),true);}finally{DB.close();}});

function simulatedLink(rtt,jitter=0){return {now:0,rtt,jitter,serial:0,queue:[],outage:false,dropEvery:0,bytes:0,send(deliver,text){this.bytes+=text.length;const id=++this.serial;if(this.outage||this.dropEvery&&id%this.dropEvery===0)return;this.queue.push({at:this.now+rtt/2+(jitter?Math.sin(id*7)*jitter:0),deliver});},flush(){this.queue.sort((a,b)=>a.at-b.at);let n=0;while(this.queue[0]?.at<=this.now&&n++<1000)this.queue.shift().deliver();}};}
async function paired(link,type='soul',netSource=null){const DB=localDB(),host=client(DB,link,netSource),guest=client(DB,link,netSource);for(const c of [host,guest]){c.el('select0').value=type;c.run("mode='online'");}await host.el('createRoom').onclick();await flush();guest.el('roomCode').value=host.el('lobbyCode').textContent;await guest.el('joinRoom').onclick();await flush();await host.poll();await guest.poll();function advance(ms){for(let i=0;i<Math.ceil(ms/(1000/120));i++){link.now+=1000/120;link.flush();host.run("if(!window.riftNet.blocked&&!['paused','roundover','matchover'].includes(phase))step(1/120)");guest.run('window.riftNet.frame(1/120)');if(i%2===0)for(const c of [host,guest])c.run('window.testTransport.fast(window.testTransport.session())');link.flush();}}advance(4500);assert.equal(host.run('phase'),'fight');assert.equal(guest.run('phase'),'fight');return {DB,host,guest,advance};}
for(const rtt of [50,100,150,200])test(`simulated RTT ${rtt}ms: immediate guest movement, jump, authority, bounded reconciliation`,async()=>{const link=simulatedLink(rtt),{DB,host,guest,advance}=await paired(link);try{
 const x=guest.run('predicted.x'),hp=guest.run('fighters[0].hp');guest.run('keys.KeyA=true;window.riftNet.frame(1/120)');assert.ok(guest.run('predicted.x')<x);assert.equal(guest.run('fighters[1].x'),x);assert.equal(guest.run('fighters[0].hp'),hp);
 guest.run("localAction('jump')");assert.ok(guest.run('predicted.vy')<0);advance(300);guest.run('keys.KeyA=false');advance(1800);
 assert.ok(Math.abs(guest.run('predicted.x')-host.run('fighters[1].x'))<1);assert.equal(guest.run('fighters[1].hp'),host.run('fighters[1].hp'));
 assert.ok(Math.abs(guest.run('window.testTransport.session().peerPing')-rtt)<20);assert.ok(guest.run('window.testTransport.queues().frames')<60);
 console.log(JSON.stringify({scenario:'simulated movement',configuredRTT:rtt,measuredRTT:guest.run('window.testTransport.session().peerPing'),localResponseUpperMs:1000/120,bytes:link.bytes,elapsedMs:link.now}));
 }finally{DB.close();}});
test('simulated jitter/reordering/drop, interruption and acknowledged epoch recovery',async()=>{const link=simulatedLink(100,30),{DB,host,guest,advance}=await paired(link);try{link.dropEvery=11;guest.run("keys.KeyA=true;localAction('jump')");advance(400);guest.run('keys.KeyA=false');advance(1500);assert.ok(guest.run('window.testTransport.queues().frames')<80);assert.equal(guest.run('fighters[1].hp'),host.run('fighters[1].hp'));const old=host.run('window.testTransport.session().epoch');link.outage=true;advance(1800);assert.equal(host.run('window.riftNet.blocked'),true);assert.equal(guest.run('window.riftNet.blocked'),true);const t=host.run('time');advance(500);assert.equal(host.run('time'),t);link.outage=false;link.dropEvery=0;advance(2000);assert.equal(host.run('window.riftNet.blocked'),false);assert.equal(guest.run('window.riftNet.blocked'),false);assert.ok(host.run('window.testTransport.session().epoch')>old);assert.equal(guest.run('fighters[1].hp'),host.run('fighters[1].hp'));assert.equal(guest.run('window.testTransport.queues().events'),0);
 }finally{DB.close();}});
test('server relay route shows measured RTT without IP addresses',async()=>{const {DB,host}=await paired(simulatedLink(50));try{await host.run('window.testTransport.inspectRoute(window.testTransport.session())');const route=host.run('JSON.stringify(window.riftNet.metrics().route)');assert.ok(route.includes('SERVER WS'));assert.ok(!route.includes('address'));}finally{DB.close();}});

test('snapshot codec: bounded baselines, duplicate/out-of-order rejection and measured payload comparison',()=>{const DB=localDB(),c=client(DB);try{c.run("mode='pvp';start();phase='fight';var encoder=new window.SagaNetCodec(),decoder=new window.SagaNetCodec();var seq=0;");let oldBytes=0,newBytes=0;const cost=[];
 for(let i=0;i<960;i++){if(i%180===0)c.run("fighters.forEach(f=>{f.hp=1000;f.cd.r=0;request(f,'r')})");c.run('step(1/120)');if(i%6===0)oldBytes+=c.run("JSON.stringify({type:'state',value:{...window.riftGame.snapshot(),tick:seq,ack:0,ready:[false,false]}}).length");if(i%2===0){const at=performance.now();c.run("var packet=encoder.encode({...window.riftGame.snapshot(),tick:++seq});var decoded=decoder.decode(JSON.parse(JSON.stringify(packet)));encoder.ack=decoder.last;");cost.push(performance.now()-at);newBytes+=c.run('JSON.stringify({type:"state",epoch:1,value:packet}).length');assert.equal(c.run('decoded.fighters[0].hp'),c.run('fighters[0].hp'));assert.equal(c.run('decoder.decode(packet)'),null);}}
 assert.ok(c.run('encoder.sent.size')<=64);assert.ok(c.run('decoder.received.size')<=64);cost.sort((a,b)=>a-b);console.log(JSON.stringify({scenario:'same 8s dual ultimates, snapshot only',old20HzBytes:oldBytes,new60HzBytes:newBytes,codecRoundtripMeanMs:cost.reduce((a,b)=>a+b)/cost.length,codecRoundtripP95Ms:cost[Math.floor(cost.length*.95)]}));assert.ok(newBytes<oldBytes);
 }finally{DB.close();}});



test('two full game clients use real WebSocket relay for combat and recover a disconnected guest',async()=>{
 const {default:http}=await import('node:http');const {WebSocket}=await import('ws');const {attachRelay}=await import('../scripts/relay.mjs');
 const DB=localDB(),server=http.createServer(),relay=attachRelay(server,DB);server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const sockets=[];
 class BrowserSocket extends WebSocket{constructor(){super(origin.replace('http:','ws:')+'/ws',{origin});sockets.push(this);}}
 const host=client(DB),guest=client(DB);
 for(const c of [host,guest]){c.ctx.window.WebSocket=c.ctx.WebSocket=BrowserSocket;c.run("mode='online'");}
 const wait=async(check,pump=false)=>{const until=Date.now()+4000;while(!check()){
  if(Date.now()>until)throw Error('Game relay condition timed out');
  if(pump)for(const c of [host,guest])c.run('if(window.testTransport.session())window.testTransport.fast(window.testTransport.session())');
  await new Promise(r=>setTimeout(r,10));
 }};
 try{
  await host.el('createRoom').onclick();guest.el('roomCode').value=host.el('lobbyCode').textContent;guest.el('select0').value='soul';await guest.el('joinRoom').onclick();
  await wait(()=>host.run('phase')==='countdown',true);
  host.run('for(let i=0;i<390;i++)step(1/120)');await wait(()=>guest.run('phase')==='fight',true);
  host.run("fighters[0].x=680;fighters[1].x=600;fighters[1].dir=1;fighters.forEach(f=>f.y=floor(600));");
  for(let i=0;i<5;i++){for(const c of [host,guest])c.run('window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,10));}
  guest.run("localAction('q')");await wait(()=>host.run('fighters[1].charges')===1,true);
  host.run('for(let i=0;i<50;i++)step(1/120)');await wait(()=>guest.run('fighters[0].hp')<1000,true);
  assert.equal(guest.run('fighters[0].hp'),host.run('fighters[0].hp'));
  const previousEpoch=host.run('window.testTransport.session().epoch');
  guest.run('window.testTransport.session().socket.terminate()');
  await wait(()=>host.run('window.riftNet.blocked')&&guest.run('window.riftNet.blocked'));
  // Test the production reconnect callback without waiting on fake UI timers.
  guest.reconnect();
  await wait(()=>!host.run('window.riftNet.blocked')&&!guest.run('window.riftNet.blocked'),true);
  assert.ok(host.run('window.testTransport.session().epoch')>previousEpoch);
  assert.equal(guest.run('fighters[0].hp'),host.run('fighters[0].hp'));
  assert.equal(guest.run('window.testTransport.queues().events'),0);
  assert.equal(guest.run('window.riftNet.metrics().transport'),'websocket');
  const recoveredEpoch=host.run('window.testTransport.session().epoch');
  host.run('window.testTransport.session().socket.terminate()');
  await wait(()=>host.run('window.riftNet.blocked')&&guest.run('window.riftNet.blocked'));
  host.reconnect();
  await wait(()=>!host.run('window.riftNet.blocked')&&!guest.run('window.riftNet.blocked'),true);
  assert.ok(host.run('window.testTransport.session().epoch')>recoveredEpoch);
  assert.equal(guest.run('fighters[0].hp'),host.run('fighters[0].hp'));
 }finally{
  for(const c of [host,guest])c.run('window.riftNet.leave()');await flush();for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();
 }
});

test('WS2 reduces traffic against WS1 at 200ms RTT and keeps input processing recent',async()=>{
 const baseline=fs.readFileSync('tests/fixtures/ws1-online.js','utf8');const measured=[];
 for(const source of [baseline,null]){
  const link=simulatedLink(200),{DB,host,guest,advance}=await paired(link,'soul',source);
  try{
   for(const c of [host,guest])c.run('window.testTransport.session().reliable=true');
   link.bytes=0;let maxHostBacklog=0;
   for(let i=0;i<40;i++){
    guest.run(i%2?'keys.KeyA=false;keys.KeyD=true':'keys.KeyD=false;keys.KeyA=true');
    if(i%8===0)guest.run("localAction('jump')");advance(200);
    maxHostBacklog=Math.max(maxHostBacklog,host.run('window.testTransport.queues().hostFrames'));
   }
   const bytes=link.bytes;guest.run('keys.KeyA=false;keys.KeyD=false');advance(1500);
   assert.equal(host.run('window.riftNet.blocked'),false);assert.equal(guest.run('window.riftNet.blocked'),false);
   assert.ok(Math.abs(guest.run('predicted.x')-host.run('fighters[1].x'))<1);
   measured.push({version:source?'6.18':'6.19',bytes,maxHostBacklog,staleMovesSkipped:host.run('window.riftNet.metrics().staleMovesSkipped||0')});
  }finally{DB.close();}
 }
 console.log(JSON.stringify({scenario:'8s alternating movement at simulated RTT 200ms; JSON payload only',measured}));
 assert.ok(measured[1].bytes<measured[0].bytes*.7,'at least 30% less payload');
 assert.ok(measured[1].maxHostBacklog<=3,'old movement queue stays bounded');
});

test('WS2 never requeues sent TCP input events and measures direct server RTT',async()=>{
 const link=simulatedLink(200),{DB,host,guest,advance}=await paired(link);try{
  for(const c of [host,guest])c.run('window.testTransport.session().reliable=true');
  guest.run("localAction('jump')");const queued=guest.run('window.testTransport.queues().events');assert.equal(queued,1);
  guest.run('window.testTransport.sendInput();window.testTransport.sendInput()');
  advance(1000);assert.equal(guest.run('window.testTransport.queues().events'),0);assert.equal(host.run('window.riftNet.blocked'),false);
  assert.ok(guest.run('window.testTransport.session().sentInputSeq')>0);
 }finally{DB.close();}
});

test('WS2 stays playable on a bandwidth-limited ordered link and bounds TCP queues',async()=>{
 const link=simulatedLink(200);link.next={host:0,guest:0};link.bytesPerSecond=24000;
 link.buffered=function(role){return Math.max(0,(this.next[role]-this.now)*this.bytesPerSecond/1000);};
 link.send=function(deliver,text,role){this.bytes+=text.length;const start=Math.max(this.now,this.next[role]||0);this.next[role]=start+text.length/this.bytesPerSecond*1000;this.queue.push({at:this.next[role]+this.rtt/2,deliver});};
 const {DB,host,guest,advance}=await paired(link);try{
  for(const c of [host,guest])c.run('window.testTransport.session().reliable=true');
  let maxBuffered=0;
  for(let i=0;i<30;i++){guest.run(i%2?'keys.KeyA=true;keys.KeyD=false':'keys.KeyD=true;keys.KeyA=false');advance(200);maxBuffered=Math.max(maxBuffered,link.buffered('host'),link.buffered('guest'));}
  guest.run('keys.KeyA=false;keys.KeyD=false');advance(2000);
  assert.equal(host.run('window.riftNet.blocked'),false);assert.equal(guest.run('window.riftNet.blocked'),false);
  assert.ok(link.buffered('host')<8192);assert.ok(guest.run('window.testTransport.queues().frames')<120);
  console.log(JSON.stringify({scenario:'WS2 ordered 24KB/s per direction, RTT 200ms, alternating movement',maxBufferedBytes:Math.round(maxBuffered),hostBlocked:host.run('window.riftNet.blocked')}));
 }finally{DB.close();}
});

test('guest display interpolates opponent position while gameplay state remains authoritative',async()=>{
 const {DB,host,guest}=await paired(simulatedLink(50));try{
  const actual=guest.run('fighters[0].x');guest.ctx.targetX=actual+80;
  guest.run('var update=window.riftGame.snapshot();update.fighters[0]={...update.fighters[0],x:targetX};window.riftGame.receive(update)');
  assert.equal(guest.run('fighters[0].x'),actual+80);assert.ok(guest.run('fighters[0].netDrawX')<actual+80);
  guest.run('advanceGuest(1/60)');assert.ok(guest.run('fighters[0].netDrawX')>actual);
  assert.equal(guest.run('fighters[0].x'),actual+80);
 }finally{DB.close();}
});

async function hybridPair(connects=true){
 const {default:http}=await import('node:http');const {WebSocket}=await import('ws');const {attachRelay}=await import('../scripts/relay.mjs');
 const DB=localDB(),server=http.createServer(),relay=attachRelay(server,DB);server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const origin='http://127.0.0.1:'+server.address().port,sockets=[],pcs=new Map(),wireCounts={wsCombat:0,directCombat:0};let serial=0;
 class DirectChannel{
  constructor(){this.readyState='connecting';this.bufferedAmount=0;}
  send(data){if(this.readyState!=='open')throw Error('closed');const message=JSON.parse(data);if(['state','input'].includes(message.type))wireCounts.directCombat++;queueMicrotask(()=>{if(this.other?.readyState==='open')this.other.onmessage?.({data});});}
  close(){if(this.readyState==='closed')return;this.readyState='closed';const other=this.other;if(other)other.readyState='closed';queueMicrotask(()=>{this.onclose?.();other?.onclose?.();});}
 }
 class Peer{
  constructor(config){assert.equal(config.iceServers.length,0);this.id=++serial;pcs.set(this.id,this);this.iceConnectionState='new';this.remoteDescription=null;this.candidates=[];}
  createDataChannel(name,config){assert.equal(config.ordered,true);return this.dc=new DirectChannel();}
  async createOffer(){return {type:'offer',sdp:'offer:'+this.id};}
  async createAnswer(){return {type:'answer',sdp:'answer:'+this.id};}
  async setLocalDescription(description){this.localDescription={...description,toJSON:()=>description};queueMicrotask(()=>this.onicecandidate?.({candidate:{candidate:'candidate:fake 1 udp 1 host.local 5000 typ host',sdpMid:'0',sdpMLineIndex:0}}));}
  async setRemoteDescription(description){
   this.remoteDescription=description;
   if(description.type==='offer')this.host=pcs.get(Number(description.sdp.split(':')[1]));
   else if(connects){const guest=pcs.get(Number(description.sdp.split(':')[1]));const remote=new DirectChannel();guest.dc=remote;guest.ondatachannel?.({channel:remote});this.dc.other=remote;remote.other=this.dc;this.dc.readyState=remote.readyState='open';this.iceConnectionState=guest.iceConnectionState='connected';queueMicrotask(()=>this.dc.onopen?.());queueMicrotask(()=>remote.onopen?.());}
  }
  async addIceCandidate(candidate){assert.ok(this.remoteDescription,'candidate waits for remote description');this.candidates.push(candidate);}
  async getStats(){return new Map([['transport',{type:'transport',selectedCandidatePairId:'pair'}],['pair',{localCandidateId:'local',remoteCandidateId:'remote'}],['local',{candidateType:'host',protocol:'udp'}],['remote',{candidateType:'host',protocol:'udp'}]]);}
  close(){this.dc?.close();this.iceConnectionState='closed';}
 }
 class BrowserSocket extends WebSocket{
  constructor(){super(origin.replace('http:','ws:')+'/ws',{origin});sockets.push(this);}
  send(text,...args){const message=JSON.parse(text);if(['state','input'].includes(message.type))wireCounts.wsCombat++;return super.send(text,...args);}
 }
 const host=client(DB),guest=client(DB);
 for(const c of [host,guest]){c.ctx.window.WebSocket=c.ctx.WebSocket=BrowserSocket;c.ctx.window.RTCPeerConnection=c.ctx.RTCPeerConnection=Peer;c.run("mode='online'");}
 const wait=async(check)=>{const end=Date.now()+4000;while(!check()){if(Date.now()>end)throw Error('Hybrid condition timed out');for(const c of [host,guest])c.run('if(window.testTransport.session())window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,5));}};
 await host.el('createRoom').onclick();guest.el('roomCode').value=host.el('lobbyCode').textContent;guest.el('select0').value='soul';await guest.el('joinRoom').onclick();
 return {DB,host,guest,wait,pcs,wireCounts,async close(){for(const c of [host,guest])c.run('window.riftNet.leave()');await flush();for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();}};
}

test('hybrid selects DIRECT after both probes; combat bypasses real WebSocket relay then safely falls back',async()=>{
 const f=await hybridPair();const {host,guest}=f;try{
  await f.wait(()=>host.run('phase')==='countdown');assert.equal(host.run('window.riftNet.metrics().transport'),'webrtc-direct');assert.equal(guest.run('window.riftNet.metrics().transport'),'webrtc-direct');
  assert.ok([...f.pcs.values()].every(pc=>pc.candidates.length>0));
  host.run('for(let i=0;i<390;i++)step(1/120)');await f.wait(()=>guest.run('phase')==='fight');
  host.run('fighters[0].x=680;fighters[1].x=600;fighters[1].dir=1;fighters.forEach(f=>f.y=floor(600))');
  host.run('window.testTransport.sendState()');await flush();guest.run("localAction('q')");await f.wait(()=>host.run('fighters[1].charges')===1);
  host.run('for(let i=0;i<50;i++)step(1/120)');await f.wait(()=>guest.run('fighters[0].hp')<1000);
  const hp=host.run('fighters[0].hp');assert.equal(guest.run('fighters[0].hp'),hp);assert.equal(f.wireCounts.wsCombat,0);assert.ok(f.wireCounts.directCombat>0);
  const epoch=host.run('window.testTransport.session().epoch');guest.run('window.testTransport.session().directChannel.close()');
  await f.wait(()=>host.run('window.riftNet.metrics().transport')==='websocket'&&guest.run('window.riftNet.metrics().transport')==='websocket'&&!host.run('window.riftNet.blocked')&&!guest.run('window.riftNet.blocked'));
  assert.ok(host.run('window.testTransport.session().epoch')>epoch);assert.equal(host.run('fighters[0].hp'),hp);assert.equal(guest.run('fighters[0].hp'),hp);assert.equal(guest.run('window.testTransport.queues().events'),0);assert.ok(f.wireCounts.wsCombat>0);
  for(const c of [host,guest])assert.equal(c.run('window.testTransport.session().pendingRoute||null'),null);
 }finally{await f.close();}
});

test('blocked direct connection times out to WebSocket and starts the same room without ICE error',async()=>{
 const f=await hybridPair(false);try{
  await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));
  assert.equal(f.host.run('phase'),'lobby');f.host.expireDirect();await f.wait(()=>f.host.run('phase')==='countdown');
  assert.equal(f.host.run('window.riftNet.metrics().transport'),'websocket');assert.equal(f.guest.run('window.riftNet.metrics().transport'),'websocket');
  assert.equal(f.host.el('netError').textContent,'');assert.equal(f.guest.el('netError').textContent,'');assert.equal(f.wireCounts.directCombat,0);
 }finally{await f.close();}
});

test('WebSocket reconnect during direct negotiation completes in server mode instead of stranding lobby',async()=>{
 const f=await hybridPair(false);try{
  await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));
  f.host.run('window.testTransport.session().socket.terminate()');
  await f.wait(()=>f.host.run('window.testTransport.session().reconnectAt>0'));
  f.host.reconnect();await f.wait(()=>f.host.run('phase')==='countdown');
  assert.equal(f.host.run('window.riftNet.metrics().transport'),'websocket');
  assert.equal(f.guest.run('window.riftNet.metrics().transport'),'websocket');
 }finally{await f.close();}
});
