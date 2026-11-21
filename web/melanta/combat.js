// Arena authority owns damage/status/results; lab paths own weapon and pose timing.
(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
// At 30 fps these are the frames of peak combined blade travel following each damage check.
const rSwingFrames=[17,23,35,41,46,59,64,79,88,90,100,112,117];
function init(){window.MelantaRSlash?.preload();return {t:0,p:{x:0,y:0,vx:0,vy:0,dir:1,hp:1000,max:1000,speed:0},e:{x:0,y:0,hp:1000,bind:0,stun:0},a:null,fx:[],events:[],rHealVisual:null,healed:0,ground:0,speedUntil:0,scriptedTick:false};}
function pull(f,env){const g=f.melanta,e=env.enemy;if(!g.a)g.ground=env.surface(f.x,f.y);Object.assign(g.p,{x:f.x,y:g.ground-f.y,vx:f.vx,vy:-f.vy,dir:f.dir,hp:f.hp,max:1000,speed:Math.max(0,g.speedUntil-env.time)});Object.assign(g.e,{x:e.x,y:g.ground-e.y,hp:e.hp,bind:Math.max(0,e.rootUntil-env.time),stun:Math.max(0,e.stunUntil-env.time)});return g;}
function effect(g,k,x,y,data={}){g.fx.push({k,x,y,t:0,life:.55,...data});if(g.fx.length>100)g.fx.shift();}
function rGroundImpact(g,a,env,x,worldY,radius){
 effect(g,'qslam',x,g.ground-worldY,{dir:a.dir,worldY,radius,t:window.MelantaQImpact?.leadIn??.08,life:window.MelantaQImpact?.duration??1.2});
 env.cue?.('melanta_q_impact',x);
}
function unbind(f,env){const e=env.enemy,b=e.melantaBind;if(b?.owner===f.id){if(Math.abs((e.rootUntil||0)-b.until)<1e-6)e.rootUntil=Math.max(0,b.prior||0);e.melantaBind=null;}f.melanta.e.bind=0;}
function cancel(f,env){if(!f.melanta)return;unbind(f,env);f.melanta.a=null;f.melanta.scriptedTick=false;f.melanta.rHealVisual=null;f.action=null;f.normal=null;f.combat.buffer=null;f.turn=0;}
function mirror(f){const a=f.melanta.a;f.action=a?{k:a.k,age:a.t,duration:a.phase==='plunge'?4+(a.plungeTime||0):a.duration,cancel:a.duration,use:a.use,dir:a.dir}:null;}
function use(f,k,env){const g=pull(f,env),L=window.MelantaLab;if(g.a?.k==='attack'&&!f.normal)g.a=null;if(!L.SKILLS[k]||g.a)return false;const spec=L.SKILLS[k],a={k,t:0,duration:spec.duration,sx:f.x,sy:g.p.y,dir:f.dir,hit:false,ticks:0,locked:false,tx:env.enemy.x,use:env.use?.()||f.combat.launching};g.a=a;f.cd[k]=spec.cd;if(k==='q'){a.boundsMin=env.bounds?.min??45;a.boundsMax=env.bounds?.max??1555;a.castY=f.y;a.impactX=clamp(a.sx+a.dir*L.Q_REACH,a.boundsMin,a.boundsMax);}
 if(k==='q'&&(!a.use?.aimDir||(env.enemy.x-f.x)*a.use.aimDir>=0)&&env.targetable?.(env.enemy)!==false&&env.enemy.hp>0&&Math.hypot(env.enemy.x-f.x,env.enemy.y-f.y)<=L.Q_REACH+L.Q_RADIUS){a.targetId=env.enemy.id;a.impactX=clamp(env.enemy.x,a.boundsMin,a.boundsMax);a.dir=f.dir=Math.sign(env.enemy.x-f.x)||f.dir;}
 if(k==='q'){a.impactWorldY=env.surface(a.impactX,a.castY);a.impactY=a.impactWorldY-g.ground;}
 if(k==='e'){a.airborne=!f.ground;a.startVy=f.vy;a.airTime=(-f.vy+Math.sqrt(f.vy*f.vy+3800*Math.max(0,g.p.y)))/1900;g.speedUntil=env.time+2;}
 if(k==='r'){a.phase=!f.ground?'plunge':'dance';a.plungeTime=0;f.vx=0;if(a.phase==='plunge')f.vy=Math.max(f.vy,600);}
 mirror(f);return true;}
function landHit(f,env,n,a,index=0,x=env.enemy.x,y=env.enemy.y-90,angle){const g=f.melanta,e=env.enemy;const actual=env.damage(f,e,n,0,false,false,{use:a.use,hitId:a.use.id+':'+a.k+':'+index,last:a.k!=='r'||index===13});if(actual<=0)return 0;if(a.k==='r')env.cue?.('melanta_r_cut',e.x);effect(g,'cut',x,g.ground-y,{life:a.k==='r'?.23:.32,angle:angle??(a.k==='q'?Math.atan2(140,a.dir*45):a.dir*-.7),source:a.k,seed:index,targetX:e.x,targetY:g.ground-e.y,size:a.k==='q'?1.16:a.k==='r'?.72:1});if(a.k==='r'&&f.hp>0){const heal=Math.min(10,1000-f.hp);f.hp+=heal;g.healed+=heal;if(heal){g.rHealVisual??={since:g.t};Object.assign(g.rHealVisual,{lastAt:g.t,until:g.t+.65,amount:heal});}}return actual;}
function inheritFlip(f,flip){
 const next=f.melanta.a;
 next.flipExit={k:'e',t:flip.t,airTime:flip.airTime,airborne:flip.airborne,duration:flip.duration,dir:flip.aimDir||flip.dir};
}
function startNormal(f,n,use){const g=f.melanta;g.ground=typeof window.riftGame?.surface==='function'?window.riftGame.surface(f.x,f.y):f.y;g.a={k:'attack',t:0,duration:.5,n,sx:f.x,sy:g.ground-f.y,dir:f.dir,hit:false,use,motion:[{t:0,x:f.x,y:g.ground-f.y}]};g.previousEnemy=null;}
function normal(f,dt,env){const g=pull(f,env),a=g.a,n=f.normal;if(!n||!a||a.k!=='attack')return;const old=a.t;a.t=n.age;
 if(old<window.MelantaLab.ATTACK_START&&a.t>=window.MelantaLab.ATTACK_START)env.cue?.('melanta_normal_swing',f.x);
 if(a.t<window.MelantaLab.ATTACK_START&&f.move){a.dir=n.dir=f.dir=f.move;}a.motion.push({t:a.t,x:f.x,y:g.ground-f.y});if(a.motion.length>80)a.motion.shift();const e=env.enemy,target={x:e.x,y:g.ground-e.y};if(!a.hit){const c=window.MelantaLab.sweepNormal(a,old,a.t,target,g.previousEnemy||target);if(c){a.hit=true;landHit(f,env,60,a,0,c.x,g.ground+c.y);}}g.previousEnemy=target;if(n.age>=n.duration)g.a=null;}
function visual(f,dt,enemy){const g=f.melanta;g.t+=dt;g.fx=g.fx.filter(e=>(e.t+=dt)<e.life);if(g.rHealVisual?.until<=g.t)g.rHealVisual=null;Object.assign(g.p,{x:f.x,y:g.ground-f.y,vx:f.vx,vy:-f.vy,dir:f.dir,hp:f.hp});if(enemy)Object.assign(g.e,{x:enemy.x,y:g.ground-enemy.y,hp:enemy.hp});}
function update(f,dt,env){const g=pull(f,env),e=env.enemy;visual(f,dt,e);g.scriptedTick=false;if(f.hp<=0){cancel(f,env);g.fx=[];return;}const a=g.a;if(!a||a.k==='attack')return;g.scriptedTick=true;const L=window.MelantaLab;if(a.k==='r'&&a.phase==='plunge'){a.plungeTime+=dt;f.vx=0;f.vy+=3000*dt;f.y+=f.vy*dt;const floor=env.surface(f.x,f.y);if(f.y>=floor){f.y=floor;g.ground=floor;f.vy=0;f.ground=true;a.phase='dance';a.t=0;rGroundImpact(g,a,env,f.x,floor,190);}mirror(f);return;}
 a.t+=dt;const u=a.t/a.duration;
 if(a.k==='q'){f.x=a.sx;f.y=g.ground-a.sy-L.qHop(a.t);f.vy=0;f.ground=a.sy<=.01&&a.t>=.92;if(!a.impactVfx&&a.t+1e-8>=.72-(window.MelantaQImpact?.leadIn??.08)){a.impactVfx=true;const impact=L.qTip(a,.72);effect(g,'qslam',impact.x,-impact.y,{dir:a.dir,worldY:a.impactWorldY,life:window.MelantaQImpact?.duration??1.2,power:1,radius:190});}if(!a.hit&&a.t+1e-8>=.72){a.hit=true;const impact=L.qTip(a,.72);env.cue?.('melanta_q_impact',impact.x);if(Math.hypot(e.x-impact.x,e.y-g.ground-impact.y)<190){const actual=landHit(f,env,100,a);if(actual>0&&e.hp>0){env.stun?.(e,1,a.use);if(e.stunUntil>env.time)e.melantaStunVfx={owner:f.id,startedAt:env.time};}}}}
 if(a.k==='w'){const recovering=a.hit;if(!a.checked&&a.t+1e-8>=.28){a.checked=true;const valid=e.hp>0&&(e.x-a.sx)*a.dir>=0&&Math.hypot(e.x-a.sx,e.y-(g.ground-a.sy))<=L.SKILLS.w.range;a.throwX=valid?e.x:a.sx+a.dir*L.SKILLS.w.range;a.throwY=valid?g.ground-e.y:a.sy;if(valid&&env.canControl(e,a.use)){a.locked=true;a.tx=e.x;a.ty=g.ground-e.y;a.stop=Math.min(72,Math.abs(e.x-a.sx)*.45);}}
 if(a.locked&&!a.hit){if(e.hp<=0){a.locked=false;unbind(f,env);}else{const until=env.time+Math.max(0,.8-a.t);const prior=e.melantaBind?.owner===f.id?e.melantaBind.prior:(e.rootUntil||0);e.rootUntil=Math.max(prior,until);e.melantaBind={owner:f.id,useId:a.use.id,prior,until:e.rootUntil};g.e.bind=Math.max(0,.8-a.t);a.tx=e.x;a.ty=g.ground-e.y;
 if(a.t+1e-8>=.4){
  if(a.dashX==null){
   a.dashX=f.x;a.dashY=f.y;a.exitSpeed=f.move===a.dir?350*(g.speedUntil>env.time?1.35:1):0;
   a.stop=Math.min(72,Math.max(0,(e.x-f.x)*a.dir)*.45);
  }
  const v=clamp((a.t-.4)/.4,0,1),ease=v*v*v*(v*(v*6-15)+10);
  const destination=clamp(e.x-a.dir*a.stop,45,env.bounds?.max??1555);
  const distance=destination-a.dashX;
  const carry=Math.sign(distance)*Math.min(Math.abs(distance),.4*(a.exitSpeed||0));
  const x=a.dashX+distance*ease+carry*v*v*v*(v-1);
  const landing=env.surface(destination,Math.min(a.dashY,e.y));
  const endY=e.ground?landing:Math.min(e.y,landing);
  const y=a.dashY+(endY-a.dashY)*ease-18*Math.sin(Math.PI*v)**2;
  if(dt>0){f.vx=(x-f.x)/dt;f.vy=(y-f.y)/dt;}f.x=x;f.y=y;f.ground=false;
  if(a.t+1e-8>=.8){
   f.ground=Math.abs(f.y-landing)<.01;
   if(f.ground){f.y=landing;f.vy=0;f.jumps=0;}
   a.hit=true;unbind(f,env);landHit(f,env,80,a);
  }
 }
 }}if(!a.locked||a.t+1e-8<.4||recovering)g.scriptedTick=false;}

 if(a.k==='e'){if(f.move)a.aimDir=f.dir=f.move;f.x=clamp(a.sx+a.dir*L.SKILLS.e.range*smooth(u),45,env.bounds?.max??1555);if(a.airborne){f.vy+=1900*dt;f.y+=f.vy*dt;const floor=env.surface(f.x,f.y);if(f.y>=floor&&f.vy>=0){f.y=floor;f.vy=0;f.ground=true;}}else{f.y=g.ground-a.sy-Math.sin(Math.PI*clamp(u,0,1))*115;f.vy=-115*Math.PI/a.duration*Math.cos(Math.PI*clamp(u,0,1));f.ground=false;}if(!a.hit&&e.hp>0&&Math.abs(e.x-f.x)<85&&Math.abs(e.y-f.y)<160){a.hit=true;landHit(f,env,50,a);}}
 if(a.k==='r'){env.stepMovement?.(dt);if(f.ground)g.ground=f.y;a.sx=f.x;a.sy=g.ground-f.y;while(a.ticks<13&&a.t+1e-8>=(a.ticks+1)*.3){a.ticks++;const tip=window.MelantaRSlash?.bladeTip(a,a.ticks*.3,(a.ticks-1)%2);
  const x=clamp(tip?.x??L.rImpactX(a,a.ticks),env.bounds?.min??45,env.bounds?.max??1555);
  rGroundImpact(g,a,env,x,env.surface(x,f.y),95);
  const inRange=e.hp>0&&Math.hypot(e.x-f.x,e.y-f.y)<=L.SKILLS.r.range;
  const dealt=inRange?landHit(f,env,65,a,a.ticks):0;
  a.swingFrame=dealt>0?null:rSwingFrames[a.ticks-1];
 }
 if(a.swingFrame!=null&&a.t+1e-8>=a.swingFrame/30){
  const tip=window.MelantaRSlash?.bladeTip(a,a.swingFrame/30,(a.ticks-1)%2);
  env.cue?.('melanta_r_swing',tip?.x??f.x);
  a.swingFrame=null;
 }}
 if(a.t>=a.duration){if(a.k==='w')unbind(f,env);if(a.k==='q'||a.k==='e'&&!a.airborne){f.y=g.ground-a.sy;f.vy=0;f.ground=a.sy<=.01;}g.a=null;}mirror(f);}
window.MelantaCombat={init,use,inheritFlip,begin:use,update,cancel,startNormal,normal,visual,scripted:f=>!!f.melanta?.scriptedTick};
})();
