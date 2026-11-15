// Native Saga combat adapter. The arena alone owns physics, HP, input, hit-confirm and KO.
(()=>{
const C={hp:900,speed:330,normalRange:125,qDamage:65,qRange:340,qDuration:.22,qGap:.8,qRecharge:2.5,wFade:.5,wLife:4,wCooldown:6,wDamage:200,wRange:650,eLife:4,eCooldown:9,cloneHP:500,rRange:650,rDamage:150,rCloneDamage:60,rCooldown:12,rDuration:1.05};
const sat=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=sat(v);return v*v*(3-2*v)};
function init(){return {clones:[],group:null,serial:0,stealth:0,wActive:false,eActive:false,events:[]}}
function event(f,env,k,x=f.x,y=f.y){f.fairi.events.push({k,x,y,t:env.time,id:++f.fairi.serial});if(f.fairi.events.length>16)f.fairi.events.shift()}
function finishE(f){let g=f.fairi;if(g.eActive&&!g.clones.length){g.eActive=false;f.cd.e=C.eCooldown}}
function reveal(f,env){let g=f.fairi;if(g.wActive){g.wActive=false;g.stealth=0;f.cd.w=C.wCooldown;event(f,env,'reveal')}}
function cancel(f,env){let a=f.action;if(a?.k==='r'&&env.enemy.grabbedBy===f.id){env.enemy.grabbedBy=null;env.enemy.vy=0}f.action=null;f.normal=null}
function ready(f,k){let g=f.fairi;return k==='q'?f.charges>0&&f.cd.q<=1e-7:k==='w'?!g.wActive&&f.cd.w<=1e-7:k==='e'?!g.eActive&&f.cd.e<=1e-7:f.cd[k]<=1e-7}
function use(f,k,env){let g=f.fairi,e=env.enemy;if(!ready(f,k))return false;if(k==='r'&&(Math.hypot(e.x-f.x,e.y-f.y)>C.rRange||!env.control(e)))return false;let a={k,age:0,duration:k==='q'?C.qDuration:k==='w'?C.wFade:k==='e'?.3:C.rDuration,dir:f.dir,sx:f.x,sy:f.y,use:env.use()};
if(k!=='w')reveal(f,env);
if(k==='q'){f.charges--;f.qRecharge.push(C.qRecharge);f.cd.q=C.qGap;a.end=Math.max(45,Math.min(1555,f.x+f.dir*C.qRange));env.cue('soulblade_slash_1')}
if(k==='w'){g.wActive=true;g.stealth=0;event(f,env,'cast');env.cue('soulblade_w_blink')}
if(k==='e'){g.eActive=true;let seed=(++g.serial*2654435761+f.id*97)>>>0;g.group=FairiClones.plan(seed);let base=env.surface(f.x,f.y);g.clones=Array.from({length:4},(_,i)=>FairiClones.spawn(i,{x:f.x,y:Math.max(0,base-f.y),vy:-f.vy},g.group));event(f,env,'cast');env.cue('soulblade_w_blink')}
if(k==='r'){a.dir=Math.sign(e.x-f.x)||f.dir;f.dir=a.dir;f.cd.r=C.rCooldown;a.tx=e.x;a.ty=e.y;a.base=env.surface(e.x,e.y);a.actors=[{x:f.x,y:a.base-f.y},...g.clones.map(c=>({x:c.x,y:a.base-(env.surface(c.x,f.y)-c.y),dir:c.dir}))];a.count=a.actors.length;env.interrupt(e);e.grabbedBy=f.id;e.vx=e.vy=0;env.cue('soulblade_r_cast')}
f.action=a;return true}
function ambush(f,env){let g=f.fairi,e=env.enemy;if(!g.stealth)return false;reveal(f,env);if(Math.hypot(e.x-f.x,e.y-f.y)>C.wRange)return false;f.normal=null;f.action={k:'ambush',age:0,duration:.78,dir:Math.sign(e.x-f.x)||f.dir,sx:f.x,sy:f.y,tx:e.x,ty:e.y,carryVx:f.vx,use:env.use()};return true}
function strike(f,env,value,key,last=true){let a=f.action,use=a?.use||env.use();return env.damage(f,env.enemy,value,0,false,false,{use,hitId:use.id+':'+key,last,skillHit:true})}
function update(f,dt,env){let g=f.fairi,e=env.enemy;g.events=g.events.filter(v=>env.time-v.t<.7);if(f.hp<=0){cancel(f,env);g.clones=[];g.stealth=0;g.wActive=g.eActive=false;return}
if(g.stealth>0){g.stealth=Math.max(0,g.stealth-dt);if(!g.stealth)reveal(f,env)}
let a=f.action;if(a&&!f.normal){a.age+=dt;let u=sat(a.age/a.duration);
if(a.k==='q'){let old=f.x;f.x=a.sx+(a.end-a.sx)*smooth(u);f.y=a.sy;f.vx=(a.end-a.sx)*6*u*(1-u)/a.duration;f.vy=0;if(!a.hit&&e.x>=Math.min(old,f.x)-45&&e.x<=Math.max(old,f.x)+45&&Math.abs(e.y-f.y)<180){a.hit=true;strike(f,env,C.qDamage,'q')}}
if(a.k==='w'&&a.age>=a.duration)g.stealth=C.wLife;
if(a.k==='r'){if(e.hp<=0||e.grabbedBy!==f.id){cancel(f,env);return}e.x=a.tx;e.y=a.ty;e.vx=e.vy=0;let v=FairiR.travel(a.age);f.x=a.sx+(a.tx-a.dir*55-a.sx)*v;f.y=a.sy+(a.ty-a.sy)*v;f.vx=f.vy=0;if(!a.hit&&a.age>=.78){a.hit=true;for(let i=0;i<a.count;i++)strike(f,env,a.count===1?C.rDamage:C.rCloneDamage,'r:'+i,i===a.count-1);g.clones=[];finishE(f);event(f,env,'vanish',a.tx,a.ty)}}
if(a.k==='ambush'){let path=FairiW.path({...a,sy:-a.sy,ty:-a.ty},a.age);f.x=path.x;f.y=-path.y;f.vx=path.vx;f.vy=-path.vy;f.dir=a.dir;if(!a.hit&&a.age>=.60){a.hit=true;if(Math.hypot(e.x-a.tx,e.y-a.ty)<110)strike(f,env,C.wDamage,'ambush')}}
if(a.age>=a.duration){if(a.k==='r'&&e.grabbedBy===f.id)e.grabbedBy=null;f.action=null;if(['q','r','ambush'].includes(a.k)){f.vx=f.vy=0;f.ground=false}}}
if(!a||a.k!=='r'){FairiClones.prepare(g.group,g.clones);for(let c of g.clones){let old=c.x;FairiClones.step(c,dt,{x:e.x,y:0,attackWindup:e.action?Math.max(0,.2-e.action.age):0,attackIntentId:e.combat.serial},g.group);let bottom=env.surface(c.x,f.y);c.worldY=bottom-c.y;if(c.pose===1&&!c.qHitShown&&e.x>=Math.min(old,c.x)-40&&e.x<=Math.max(old,c.x)+40&&Math.abs(c.worldY-e.y)<180){c.qHitShown=true;env.emit('damage',e.x,e.y-220,'#81e9dd',65,{life:.6,text:'−65'})}}let live=[];for(let c of g.clones){if(c.hp>0&&c.age<C.eLife)live.push(c);else event(f,env,'vanish',c.x,c.worldY??env.surface(c.x,f.y)-c.y)}g.clones=live;finishE(f)}
}
function area(owner,attacker,x,y,range,height,amount,dir,key,env){if(!owner.fairi?.clones.length)return 0;let hits=0;for(let c of owner.fairi.clones){let cy=c.worldY??env.surface(c.x,owner.y)-c.y;if(Math.abs(c.x-x)>range||Math.abs(cy-y)>height||dir&&(c.x-x)*dir<-25)continue;c.hits??=[];if(c.hits.includes(key))continue;hits++;c.hits.push(key);if(c.hits.length>32)c.hits.shift();c.hp=Math.max(0,c.hp-amount);if(!c.hp){event(owner,env,'vanish',c.x,cy)}}owner.fairi.clones=owner.fairi.clones.filter(c=>c.hp>0);finishE(owner);return hits}
function visual(f,dt){let g=f.fairi;g.stealth=Math.max(0,g.stealth-dt);for(let c of g.clones){c.x+=c.vx*dt;c.y=Math.max(0,c.y+c.vy*dt);if(Number.isFinite(c.worldY))c.worldY-=c.vy*dt;if(c.skillKind>=0){c.skillAge+=dt;c.swing=Math.min(1,c.skillAge/c.skillDuration)}c.age+=dt;c.gait+=Math.abs(c.vx)*dt*.05}}
function scripted(f){return !!f.fairi&&['q','r','ambush'].includes(f.action?.k)}
window.FairiCombat={C,init,use,update,cancel,ready,ambush,reveal,area,visual,scripted};
})();
