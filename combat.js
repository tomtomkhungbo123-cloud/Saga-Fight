(()=>{
const {CONFIG:C,NORMALS:N,QCRYSTALS:Q,METEOR_RAIN:R}=window.AetherBase;
const point=(f,base=0)=>({x:f.x,y:base-f.y,vx:f.vx,vy:-f.vy,dir:f.dir});
function init(){return {q:null,cage:null,liquid:null,hover:null,rain:null,shots:[],events:[],serial:0,seed:31251,normalStep:0,lastNormal:-9}}
function rand(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296}
function fx(f,env,kind,x,y,extra={}){const g=f.aether;g.events.push({kind,x,y,born:env.time,...extra});if(g.events.length>24)g.events.shift()}
function ready(f,k){const g=f.aether;return !g.liquid&&f.cd[k]<=1e-7&&!(k==='q'&&g.q)&&!(k==='w'&&g.cage&&g.cage.breakAt>g.clock)}
function use(f,k,env){if(!ready(f,k))return false;const g=f.aether,u=env.use();f.action={k,age:0,duration:k==='q'?C.q.form:k==='w'?.8:k==='r'?C.r.windup:C.e.transition,dir:f.dir,use:u};
if(k==='q'){g.q={t:0,count:C.q.count,idle:0,fired:0,next:C.q.form,aim:null,use:u};}
if(k==='w')f.action.fired=false;
if(k==='e'){g.hover=null;g.liquid={t:0,startY:env.surface(f.x,f.y)-f.y};f.y=env.surface(f.x,f.y);f.vy=0;f.cd.e=C.e.cd;f.invulnUntil=Math.max(f.invulnUntil,env.time+C.e.duration+2*C.e.transition);f.immuneUntil=Math.max(f.immuneUntil,env.time+C.e.duration+2*C.e.transition);}
if(k==='r'){g.hover={t:0,height:null};f.vy=Math.min(f.vy,-C.r.liftVelocity);f.ground=false;g.rain={t:0,next:C.r.windup,index:0,zones:[],lastX:null,use:u};f.cd.r=C.r.cd;}
env.cue('aether_cast');return true;}
function normal(f,a,env){const g=f.aether,base=env.surface(f.x,f.y),air=!f.ground,b=N.create({...point(f,base),y:air?Math.max(2,base-f.y):0}, {n:a.n,dir:a.dir},env.time,C.attack);Object.assign(b,{base,use:a.use,n:a.n,kind:b.kind});g.shots.push(b);env.cue('aether_launch');}
function root(f,e,d,env,use){if(env.control(e,use))e.rootUntil=Math.max(e.rootUntil,env.time+d)}
function strike(f,b,env,value,last=true){const e=env.enemy,amount=env.damage(f,e,value,0,false,false,{use:b.use,hitId:b.use.id+':'+b.key,last,skillHit:true});if(amount>0)env.cue('aether_break',e.x);return amount;}
function update(f,dt,env){const g=f.aether,e=env.enemy;g.clock=env.time;g.events=g.events.filter(v=>env.time-v.born<1);if(f.hp<=0){g.q=g.rain=g.liquid=g.hover=g.cage=null;g.shots=[];return;}
if(g.cage&&env.time>=g.cage.breakAt&&!g.cage.broken){g.cage.broken=true;f.cd.w=C.w.cd;env.cue('aether_break',e.x)}if(g.cage&&env.time>=g.cage.breakAt+.7)g.cage=null;
if(g.liquid){g.liquid.t+=dt;if(g.liquid.t>=C.e.duration+2*C.e.transition)g.liquid=null;}
if(g.hover){g.hover.t+=dt;if(g.hover.t>=C.r.hoverDuration||env.stunned(f))g.hover=null;}
const a=f.action;if(a&&a.k!=='attack'){a.age+=dt;if(a.k==='w'&&!a.fired&&a.age>=C.w.windup){a.fired=true;if(Math.hypot(e.x-f.x,e.y-f.y)<=C.w.range&&env.control(e,a.use)){root(f,e,C.w.root,env,a.use);g.cage={x:e.x,base:e.y,born:env.time,breakAt:env.time+C.w.root,broken:false};env.cue('aether_break',e.x)}else f.cd.w=C.w.cd;}if(a.age>=a.duration)f.action=null;}
if(g.q){const q=g.q;q.t+=dt;q.idle=(q.idle||0)+dt;if(q.idle+1e-9>=C.q.idleTimeout){g.q=null;f.cd.q=C.q.cd;}else{const valid=env.targetable?.(e)!==false&&e.hp>0&&Math.hypot(e.x-f.x,e.y-f.y)<=C.q.range;if(!valid)q.aim=null;if(valid&&!q.aim&&q.t+1e-9>=q.next-C.q.preload)q.aim={x:e.x,y:-e.y+85};if(valid&&q.t+1e-9>=q.next){const aim=q.aim||{x:e.x,y:-e.y+85},b=Q.create(point(f),{x:aim.x,y:aim.y-85},env.time,q.fired,C.q);Object.assign(b,{base:0,use:q.use,key:'q'+q.fired});g.shots.push(b);env.cue('aether_zip');q.idle=0;q.fired++;q.count--;q.next=q.t+C.q.interval;q.aim=null;if(!q.count){g.q=null;f.cd.q=C.q.cd;}}}}
if(g.rain){const r=g.rain;r.t+=dt;while(r.index<C.r.count&&r.t+1e-9>=r.next){const arena=(env.bounds.max+45),cfg={...C.r},place=R.place(r,{x:env.targetable?.(e)===false?arena/2:e.x,targetable:env.targetable?.(e)!==false},cfg,arena,()=>rand(g)),b=R.create(place,cfg,()=>rand(g));Object.assign(b,{base:env.surface(b.targetX,e.y),use:r.use,key:'r'+r.index});g.shots.push(b);fx(f,env,'warning',b.targetX,b.base,{life:C.r.warning+C.r.fall,radius:75});r.index++;r.next=C.r.windup+r.index*C.r.duration/C.r.count;}if(r.index===C.r.count)g.rain=null;}
for(const b of g.shots){const old={x:b.x,y:b.y};b.t+=dt;b.life-=dt;const foe={x:e.x,y:b.base-e.y};if(b.kind==='wave'||b.kind==='bolt'){const before=N.snapshot({...b,t:b.t-dt});N.advance(b,C.attack);if(b.kind==='wave')b.base=env.surface(b.x,b.base);const at=N.contact(before,b,foe);if(at){b.life=0;b.key='n';if(strike(f,b,env,C.attack.damage[b.n-1])>0&&b.n===3)root(f,e,.2,env,b.use);fx(f,env,'normalbreak',at.x,b.base-at.y,{dir:b.dir,life:.46});}}
if(b.kind==='shard'){const before=Q.vertices({...b,x:old.x,y:old.y});Q.advance(b,C.q);const at=N.contactSweep(before,Q.vertices(b),foe);if(at){b.life=0;strike(f,b,env,C.q.damage,false);fx(f,env,'normalbreak',at.x,b.base-at.y,{dir:Math.sign(b.ux),life:.46});}}
if(b.kind==='meteor'&&b.t>b.delay){if(!b.released){b.released=true;env.cue('aether_whoosh',b.x)}R.advance(b,C.r);if(!b.hit&&R.contact(old,b,foe,75)){b.hit=true;if(strike(f,b,env,C.r.damage,false)>0)env.stun(e,C.r.stun,b.use);fx(f,env,'normalbreak',e.x,e.y-85,{dir:1,life:.46});}if(b.y<=0){b.life=0;fx(f,env,'burst',b.x,b.base,{radius:75,life:.7});env.cue('aether_break',b.x);if(!b.hit&&foe.y>=-10&&foe.y<100&&Math.abs(e.x-b.x)<=C.r.radius){b.hit=true;if(strike(f,b,env,C.r.damage,false)>0)env.stun(e,C.r.stun,b.use);}}}
}g.shots=g.shots.filter(b=>b.life>0);}
function vertical(f,dt,env){const g=f.aether;if(g.liquid){f.y=env.surface(f.x,f.y);f.vy=0;f.ground=true;return true;}if(!g.hover)return false;const h=g.hover;f.ground=false;if(h.height===null){f.vy+=C.r.liftGravity*dt;f.y+=f.vy*dt;if(f.vy>=0){h.height=f.y;h.apex=h.t;f.vy=0;}}else{const target=h.height-Math.sin((h.t-h.apex)*3)*2;f.vy+=(55*(target-f.y)-15*f.vy)*dt;f.y+=f.vy*dt;}return true;}
function visual(f,dt){const g=f.aether;if(g.q)g.q.t+=dt;if(g.liquid)g.liquid.t+=dt;if(g.hover)g.hover.t+=dt;for(const b of g.shots){b.t+=dt;b.life-=dt;if(b.kind==='shard')Q.advance(b,C.q);else if(b.kind==='meteor')R.advance(b,C.r);else N.advance(b,C.attack);}g.shots=g.shots.filter(b=>b.life>0);}
window.AetherCombat={init,ready,use,normal,update,vertical,visual,config:C};
})();
