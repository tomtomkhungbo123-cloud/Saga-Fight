// Arena bridge over the canonical Mox actions. No second physics or input loop.
(()=>{
const {MoxGame,MOX,MOX_W_RANGE,moxArcPoint,clamp}=window.MoxBase,contexts=new WeakMap();
// Swept orb collision, rather than only testing the end of its curve.
function crossesOrb(x0,y0,x1,y1,x,y){const dx=x1-x0,dy=y1-y0,t=clamp(((x-x0)*dx+(y-y0)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x0+dx*t-x,y0+dy*t-y)<=65;}
class ArenaMox extends MoxGame{
 effect(k,...args){super.effect(k,...args);const env=contexts.get(this);if(k==='grab'||k==='slam')env?.cue?.(k==='grab'?'mox_r_grab':'mox_r_slam');}

 use(k){const accepted=super.use(k);if(accepted&&k==='q'){const env=contexts.get(this);if(env)env.fighter.immuneUntil=env.time+1;}return accepted;}
 release(a){const first=this.balls.length;super.release(a);if(a.k==='w')for(const [i,b] of this.balls.slice(first).entries()){b.dir=this.p.dir;b.use=a.use;b.hitId=a.use.id+':w:'+i;}}

 hit(n,knock=0,burn=false,direction=this.p.dir,meta={}){const env=contexts.get(this),e=env.enemy;if(e.hp<=0||!env.hittable(e))return false;const use=meta.use||this.action?.use||env.use();const actual=env.damage(env.fighter,e,n,0,false,false,{...meta,use});this.e.hp=e.hp;this.damage+=actual;this.combo++;this.effect('impact',e.x,-e.y+80,.28);if(knock&&!this.action?.grab&&!env.damageArmored?.(e)&&env.control(e))e.knockVx=direction*knock;if(burn){this.e.burn=3;this.e.burnClock=0;this.burnUse=use;}if(!e.hp)this.e.burn=0;return true;}
 update(dt,input={}){dt=Math.min(dt,.0334);this.t+=dt;const p=this.p,e=this.e;
 this.anim.t+=dt;this.updatePunchPose(dt);
 const a=this.action;
 if(a){a.age=(a.age||0)+dt;a.remaining-=dt;
 if(a.shortFinish){if(!a.released&&a.age>=.12){a.released=true;if(e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=300){this.hit(400,0,false,p.dir,{use:a.use,hitId:a.use.id+':short-slam',last:true});this.effect('slam',e.x,e.y,.65);this.emit('slam');}}}
 else if(a.k==='e'){p.vx=a.dir*1000;p.x=clamp(p.x+p.vx*dt,45,contexts.get(this).bounds?.max??1555);if(Math.floor(a.age*35)!==Math.floor((a.age-dt)*35))this.effect('ghost',p.x,p.y,.23,{dir:p.dir,form:p.form});}
 else if(a.grab){
 const t=a.age,smooth=v=>{v=clamp(v,0,1);return v*v*v*(v*(v*6-15)+10);},
 // Shared end velocities preserve lift momentum through the flip and into the dive.
 hermite=(u,y0,y1,v0,v1,d)=>{u=clamp(u,0,1);const u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*y0+(u3-2*u2+u)*v0*d+(-2*u3+3*u2)*y1+(u3-u2)*v1*d;};
 if(t<.22){const u=smooth(t/.22);p.x=a.origin+(a.catchX-a.origin)*u;p.y=a.startY+(a.enemyStartY-a.startY)*u+Math.sin(u*Math.PI)*10;p.turn=-.08*Math.sin(u*Math.PI);e.x=a.enemyStartX;e.y=a.enemyStartY;}
 else {
 if(!a.caught){a.caught=true;this.effect('grab',e.x,e.y+95,.25);this.last='Tóm mục tiêu · cất lên';}
 p.x=a.catchX;e.x=p.x+p.dir*a.grabOffset;if(!a.slammed)e.stun=Math.max(e.stun,.08);
 if(t<.32){p.y=a.enemyStartY-7*Math.sin(smooth((t-.22)/.1)*Math.PI);p.turn=0;e.y=a.enemyStartY;}
 else if(t<.78){const u=(t-.32)/.46;p.y=a.enemyStartY+hermite(u,0,230,0,90,.46);e.y=p.y+12*smooth(u);}
 else if(t<1.06){const u=(t-.78)/.28;p.y=a.enemyStartY+hermite(u,230,230,90,-120,.28);e.y=p.y+12;}
 else if(t<1.28){const u=clamp((t-1.06)/.22,0,1);p.y=hermite(u,a.enemyStartY+230,a.groundY,-120,-2400,.22);e.y=p.y+12*(1-smooth(u));if(Math.floor(t*45)!==Math.floor((t-dt)*45))this.effect('diveTrail',e.x,e.y+90,.16,{dir:p.dir});}
 else {if(!a.slammed){a.slammed=true;p.y=a.groundY;e.y=a.groundY;this.hit(400,0,false,p.dir,{use:a.use,hitId:a.use.id+':slam',last:true});if(e.hp>0)contexts.get(this).stun(contexts.get(this).enemy,1,a.use);this.effect('slam',e.x,a.groundY,1.05);this.effect('debris',e.x,a.groundY,1.05);this.emit('slam');this.last='THIÊN GIÁNG · 400 sát thương · choáng 1s';}const u=clamp((t-1.28)/.24,0,1);p.y=a.groundY+11*16*u*u*(1-u)*(1-u);e.y=a.groundY;}
 }
 // One continuous turn: ease into rotation while rising, carry it through
 // the dive, then settle upright. No angular snap or fast extra flip at impact.
 if(t>=.32){const turn=2*Math.PI*smooth((t-.68)/.78);p.turn=-turn;e.turn=turn;}
 if(a.remaining<=0){p.turn=0;e.turn=0;p.y=a.groundY;e.y=a.groundY;p.vy=0;}
 }
 else if(a.k==='r'&&a.form){for(let i=0;i<4;i++){let key='shot'+i;if(a.age>=.15+i*.22&&!a[key]){a[key]=true;contexts.get(this).cue?.('mox_r_barrage_shot');this.balls.push({k:'r',sx:p.x+p.dir*84,sy:p.y+113,x:p.x+p.dir*84,y:p.y+113,age:0,duration:.62,bend:(i%2?1:-1)*(95+i*32),damage:87.5,trail:[],use:a.use,hitId:a.use.id+':r:'+i,last:i===3});this.effect('muzzle',p.x+p.dir*84,p.y+113,.2);}}}
 else if(!a.released&&a.age>=(a.k==='w'?.18:.12)){a.released=true;this.release(a);}
 if(a.remaining<=0)this.action=null;
 }
 if(e.burn>0&&e.hp>0){let elapsed=Math.min(dt,e.burn);e.burn-=elapsed;e.burnClock+=elapsed;if(e.burnClock>=1-1e-7){e.burnClock-=1;this.hit(50,0,false,p.dir,{use:this.burnUse,dot:true});}}
 for(const b of this.balls){let oldX=b.x,oldY=b.y;if(b.k==='w'||b.k==='r'){b.age+=dt;if(b.age<0)continue;if(b.k==='w'&&!b.audioLaunched){b.audioLaunched=true;contexts.get(this).cue?.('mox_shot');}let t=clamp(b.age/b.duration,0,1);if(b.k==='r'){b.tx=e.x;b.ty=e.y+80;}const point=moxArcPoint(b,t);b.x=point.x;b.y=point.y;
 if(contexts.get(this).projectile?.(oldX,-oldY,b.x,-b.y,b.damage,b.hitId)){b.dead=true;continue;}const collision=e.hp>0&&(b.k==='w'?b.valid&&crossesOrb(oldX,oldY,b.x,b.y,e.x,e.y+80):t>=1&&Math.hypot(e.x-b.x,e.y+80-b.y)<65);
 if(collision||t>=1){b.dead=true;this.effect('ribbon',0,0,.24,{ball:{...b,progress:t,trail:[]}});if(collision){const landed=this.hit(b.damage,b.k==='w'?320:0,b.burn,b.dir??p.dir,{use:b.use,hitId:b.hitId,last:b.k==='r'?b.last:true});if(landed&&b.k==='r')this.effect('sparks',e.x,e.y+80,.65,{dir:p.dir,seed:this.combo,power:2.2});}}}
 else {b.x+=b.vx*dt;if(b.k!=='enemy'&&contexts.get(this).projectile?.(oldX,-oldY,b.x,-b.y,b.damage,b.hitId)){b.dead=true;continue;}b.traveled+=Math.abs(b.vx*dt);let target=b.k==='enemy'?p:e;const crossed=Math.min(oldX,b.x)-28<=target.x&&Math.max(oldX,b.x)+28>=target.x;if(target.hp>0&&crossed&&Math.abs(target.y+80-b.y)<70&&(b.k!=='basic'||Math.hypot(target.x-b.originX,target.y-(b.originY??p.y))<=700)){b.dead=true;if(b.k==='enemy')this.hurt(100,.8);else {const landed=this.hit(b.damage,b.use?.n<3?0:70,false,Math.sign(b.vx),{use:b.use,hitId:b.hitId,last:true});if(landed)this.effect('sparks',target.x,b.y,.48,{dir:Math.sign(b.vx),seed:this.combo});}}if(b.traveled>=b.range)b.dead=true;}
 b.trail.push({x:oldX,y:oldY});if(b.trail.length>18)b.trail.shift();}
 this.balls=this.balls.filter(b=>!b.dead);for(let f of this.fx)f.life-=dt;this.fx=this.fx.filter(f=>f.life>0);if(this.fx.length>140)this.fx.splice(0,this.fx.length-140);
 }}
function pull(f,env){const g=f.mox,e=env.enemy;contexts.set(g,{...env,fighter:f});g.cd=f.cd;Object.assign(g.p,{x:f.x,y:-f.y,vx:f.vx,vy:-f.vy,dir:f.dir,turn:f.turn||0,hp:f.hp,max:1000,cc:env.stunned(f)?1:0,immune:Math.max(0,(f.immuneUntil||0)-env.time),invuln:Math.max(0,(f.invulnUntil||0)-env.time)});Object.assign(g.e,{x:e.x,y:-e.y,vx:e.vx,turn:e.turn||0,hp:e.hp,max:1000});return g;}
function action(f){const a=f.mox.action;f.action=a?{k:a.k,age:a.age||0,duration:a.total,cancel:a.total-.16,grab:a.grab,form:a.form,use:a.use}:null;}
function cancel(f,env){const g=f.mox;if(!g)return;const a=g.action;if(a?.grab){const e=env.enemy;if(e.grabbedBy===f.id){e.grabbedBy=null;if(!a.slammed){e.hitstunUntil=Math.min(e.hitstunUntil||0,env.time);if(e.lockBudget?.owner===f.id)e.lockBudget.reservedUntil=env.time;}e.turn=0;e.y=env.surface(e.x,e.y);e.vy=0;e.ground=true;}f.turn=0;f.y=env.surface(f.x,f.y);f.vy=0;f.ground=true;g.p.turn=0;g.e.turn=0;}g.action=null;g.buffer=null;f.action=null;f.queue=[];}
function use(f,k,env){const g=pull(f,env),e=env.enemy;if(k==='r'&&!g.p.form&&(!env.control(e)||e.grabbedBy!=null))return false;g.buffer=null;const accepted=g.use(k);g.buffer=null;if(accepted){if(k==='r'&&g.action?.grab&&env.use()?.shortGrab){g.action.grab=false;g.action.shortFinish=true;g.action.total=.45;g.action.remaining=.45;}f.dir=g.p.dir;if(k==='q')f.immuneUntil=env.time+1;if(k==='e')f.invulnUntil=env.time+.5;if(g.action?.grab){f.vx=f.vy=0;env.interrupt(e);e.grabbedBy=f.id;e.vx=e.vy=0;g.action.groundY=-env.surface(e.x,e.y);g.action.catchX=clamp(e.x-f.dir*g.action.grip,45,env.bounds?.max??1555);g.action.grabOffset=Math.min(64,Math.abs(e.x-g.action.catchX));}action(f);}return accepted;}
function update(f,dt,env){const g=pull(f,env),e=env.enemy;if(f.hp<=0){cancel(f,env);g.balls=[];return;}if(g.action?.grab&&(e.hp<=0||e.grabbedBy!==f.id)){cancel(f,env);return;}
// The arena owns the single 150ms buffer; native lab input is disabled.
g.buffer=null;
const before=g.action;g.update(dt);g.buffer=null;g.scriptedTick=!!before&&(before.k==='e'||before.grab);
f.dir=g.p.dir;f.turn=g.p.turn;const a=g.action||before;
if(a?.k==='e'||a?.grab){f.x=g.p.x;f.y=-g.p.y;f.vx=g.p.vx;f.vy=-g.p.vy;f.ground=false;}
if(a?.grab&&e.grabbedBy===f.id){e.x=g.e.x;e.y=-g.e.y;e.turn=g.e.turn;e.vx=e.vy=0;e.ground=false;if(!g.action||e.hp<=0){cancel(f,env);e.grabbedBy=null;e.turn=0;f.turn=0;}}
for(let i=0;i<g.balls.length;i++){const b=g.balls[i];if(b.k==='basic'&&b.originY===undefined)b.originY=-f.y;}
e.burn=g.e.burn>0?{owner:f.id,remaining:g.e.burn}:null;
for(const event of g.events)if(event.k==='slam')env.slam();g.events.length=0;action(f);
}
function visual(f,dt,enemy){const g=f.mox;if(g.action){g.action.age=(g.action.age||0)+dt;g.action.remaining-=dt;}g.t+=dt;g.anim.t+=dt;MoxGame.prototype.updatePunchPose.call(g,dt);for(const fx of g.fx)fx.life-=dt;g.fx=g.fx.filter(fx=>fx.life>0);for(const b of g.balls){if(b.k==='w'||b.k==='r'){if(b.k==='r'&&enemy){b.tx=enemy.x;b.ty=-enemy.y+80;}b.age+=dt;if(b.age>=0){const p=moxArcPoint(b,Math.min(1,b.age/b.duration));b.x=p.x;b.y=p.y;}}else{b.trail.push({x:b.x,y:b.y});if(b.trail.length>18)b.trail.shift();b.x+=b.vx*dt;b.traveled+=Math.abs(b.vx*dt);}}}
window.MoxCombat={init:()=>new ArenaMox(),use,update,cancel,visual,scripted:f=>f.grabbedBy!=null||f.mox?.scriptedTick||!!f.mox?.action?.grab||f.mox?.action?.k==='e'};
})();
