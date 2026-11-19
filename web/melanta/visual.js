// Melanta Build 4.9 source, isolated from Saga globals. Original vector/rig/VFX retained.
(()=>{
let modelSize=1;'use strict';
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const SKILLS={attack:{cd:.48,duration:.5},q:{cd:3,duration:1.32},w:{cd:6,duration:1.05,range:700},e:{cd:3,duration:.78,range:400},r:{cd:14,duration:4,range:500}};
const Q_IMPACT_TIME=.72,Q_REACH=375,Q_RADIUS=190;
const R_SWING_PERIOD=.6,R_HIT_INTERVAL=R_SWING_PERIOD/2;
function qHop(t){if(t<.14)return 0;if(t<.39)return 112*smooth((t-.14)/.25);if(t<.76)return 112+(14-112)*smooth((t-.39)/.37);if(t<.92)return 14*(1-smooth((t-.76)/.16));return 0}
function qTip(a,t){const origin={x:a.sx,y:-a.sy-qHop(t)},dir=a.dir,impact={x:clamp(a.impactX??(a.sx+dir*Q_REACH),a.boundsMin??80,a.boundsMax??1520),y:a.impactY??0};if(t<.44){const u=smooth(t/.44);return {x:origin.x-dir*(40+50*u),y:origin.y-125-105*u}}if(t<Q_IMPACT_TIME){const u=Math.pow(clamp((t-.44)/.28,0,1),1.65),h=1-u,startY=-a.sy-qHop(.44);return {x:h*h*h*(origin.x-dir*90)+3*h*h*u*(origin.x+dir*140)+3*h*u*u*(impact.x-dir*25)+u*u*u*impact.x,y:h*h*h*(startY-230)+3*h*h*u*(startY-295)+3*h*u*u*(-150)+u*u*u*impact.y}}if(t<.86)return impact;const u=smooth((t-.86)/.46);return {x:impact.x+(origin.x+dir*23-impact.x)*u,y:impact.y+(origin.y-127-impact.y)*u}}
function qTrailSamples(a,t){const end=t,start=Math.min(end,Math.max(.44,end-.19)),points=[];for(let i=0;i<=32;i++){const at=start+(end-start)*i/32;points.push({...qTip(a,at),age:end-at})}return points}
// Skill 4 visual contacts share the original thirteen impact positions/times.
function rImpactX(a,index){return a.sx+Math.sin(index*2.4)*420}
// Alternate the existing ground impacts between both ends of one weapon.
// Each dart has 0.6s to swing; adding the second end never adds combat ticks.
// Opposed diagonal lobes exchange left/right every half-turn. Their influence
// and its velocity vanish at every existing 0.3s contact: impacts stay exact.
function rCrossTip(a,t,end,base){
 if(t>=3.9)return base;
 const phase=2*Math.PI*t/R_SWING_PERIOD,side=end?-1:1,weight=Math.sin(phase)**2;
 const cross={x:a.sx+a.dir*side*350*Math.sin(phase),y:-125+side*85*Math.cos(phase*2)};
 return {x:base.x+(cross.x-base.x)*weight,y:base.y+(cross.y-base.y)*weight};
}
function rTip(a,t,end=0){
 t=clamp(t,0,4);const home={x:a.sx+a.dir*(end?-47:23),y:end?-7:-127},rest=a.rStartTips?.[end]||home,first=end?2:1,last=end?12:13;
 if(t>=last*R_HIT_INTERVAL){const from={x:rImpactX(a,last),y:0},u=smooth((t-last*R_HIT_INTERVAL)/(4-last*R_HIT_INTERVAL));return rCrossTip(a,t,end,{x:from.x+(home.x-from.x)*u,y:home.y*u})}
 let previous=first-2;while((previous+2)*R_HIT_INTERVAL<=t+1e-9)previous+=2;
 const start=previous<first?rest:{x:rImpactX(a,previous),y:0},next=previous<first?first:previous+2,startTime=previous<first?0:previous*R_HIT_INTERVAL,span=next*R_HIT_INTERVAL-startTime,u=clamp((t-startTime)/span,0,1),travel=smooth(u),height=185+35*Math.sin(next*1.7)**2;
 return rCrossTip(a,t,end,{x:start.x+(rImpactX(a,next)-start.x)*travel+a.dir*(end?-1:1)*Math.sin(Math.PI*2*u)*40*Math.sin(Math.PI*u),y:start.y*(1-travel)-height*Math.pow(Math.sin(Math.PI*u),1.5)})
}
const ATTACK_REACH=300,ATTACK_START=.10,ATTACK_END=.34,ENEMY_HITBOX={halfWidth:22,bottom:24,top:164};
// The renderer and combat both use this exact blade outline (local units).
const BLADE_OUTLINE=(()=>{const out=[{x:-4,y:-3}],cubic=(a,b,c,d)=>{for(let i=1;i<=8;i++){const t=i/8,h=1-t;out.push({x:h*h*h*a.x+3*h*h*t*b.x+3*h*t*t*c.x+t*t*t*d.x,y:h*h*h*a.y+3*h*h*t*b.y+3*h*t*t*c.y+t*t*t*d.y})}},quad=(a,b,c)=>{for(let i=1;i<=8;i++){const t=i/8,h=1-t;out.push({x:h*h*a.x+2*h*t*b.x+t*t*c.x,y:h*h*a.y+2*h*t*b.y+t*t*c.y})}};cubic(out.at(-1),{x:8,y:-21},{x:30,y:-33},{x:41,y:-27});cubic(out.at(-1),{x:23,y:-14},{x:33,y:3},{x:12,y:18});quad(out.at(-1),{x:2,y:23},{x:-8,y:19});quad(out.at(-1),{x:5,y:6},{x:-4,y:-3});return out})();
function attackOriginAt(a,t){const motion=a.motion;if(!motion?.length)return {x:a.sx,y:a.sy};if(t<=motion[0].t)return {x:motion[0].x,y:motion[0].y};for(let i=motion.length-1;i>0;i--){const left=motion[i-1],right=motion[i];if(t>=left.t){const u=clamp((t-left.t)/(right.t-left.t||1),0,1);return {x:left.x+(right.x-left.x)*u,y:left.y+(right.y-left.y)*u}}}return {x:a.sx,y:a.sy}}
function advanceVertical(p,dt){p.vy-=1800*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0}
function rawAttackTip(a,t){const n=a.n||1,wind=smooth(t/.10),u=clamp((t-.10)/.24,0,1);let x,y;if(t<.10){x=23+2*wind-Math.sin(Math.PI*clamp(t/.10,0,1))*65;y=-127+((n===2?-190:n===3?-100:-60)+127)*wind}else if(t<=.34){x=25+275*Math.sin(Math.PI*u);y=n===1?-105+45*Math.cos(Math.PI*u):n===2?-120-70*Math.cos(Math.PI*u):-100-55*Math.sin(Math.PI*2*u)}else{const r=smooth((t-.34)/.16),endY=n===1?-150:n===2?-50:-100;x=25+(23-25)*r;y=endY+(-127-endY)*r}const origin=attackOriginAt(a,t);return {x:origin.x+a.dir*x,y:-origin.y+y}}
function bladePolygon(pose){const c=Math.cos(pose.angle),s=Math.sin(pose.angle);return BLADE_OUTLINE.map(p=>({x:pose.x+.68*(p.x*c-p.y*s),y:pose.y+.68*(p.x*s+p.y*c)}))}
function attackBladePose(a,t){const tip=rawAttackTip(a,t),before=rawAttackTip(a,Math.max(0,t-.0001)),after=rawAttackTip(a,Math.min(a.duration,t+.0001)),angle=Math.atan2(after.y-before.y,after.x-before.x)-.3;const pose={...tip,angle};const origin=attackOriginAt(a,t),excess=Math.max(0,...bladePolygon(pose).map(p=>(p.x-origin.x)*a.dir-ATTACK_REACH));pose.x-=a.dir*excess;return pose}
function attackTip(a,t){const p=attackBladePose(a,t);return {x:p.x,y:p.y}}
function attackTrailSamples(a,t){const start=Math.min(t,Math.max(ATTACK_START,t-.11));return Array.from({length:25},(_,i)=>({...attackTip(a,start+(t-start)*i/24),age:(t-start)*(1-i/24)}))}
function segmentRect(a,b,r){let lo=0,hi=1;for(const [start,delta,min,max] of [[a.x,b.x-a.x,r.left,r.right],[a.y,b.y-a.y,r.top,r.bottom]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)return null}else{let t0=(min-start)/delta,t1=(max-start)/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return null}}return {x:a.x+(b.x-a.x)*lo,y:a.y+(b.y-a.y)*lo}}
function polygonRect(poly,r){for(let i=0;i<poly.length;i++){const hit=segmentRect(poly[i],poly[(i+1)%poly.length],r);if(hit)return hit}const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside?{x,y}:null}
function sweepNormal(a,t0,t1,enemy,previousEnemy=enemy){const start=Math.max(ATTACK_START,t0),end=Math.min(ATTACK_END,t1);if(end<start)return null;const r={left:-ENEMY_HITBOX.halfWidth,right:ENEMY_HITBOX.halfWidth,top:-ENEMY_HITBOX.top,bottom:-ENEMY_HITBOX.bottom},steps=Math.max(1,Math.ceil((end-start)*720)),targetAt=t=>{const u=clamp((t-t0)/(t1-t0||1),0,1);return {x:previousEnemy.x+(enemy.x-previousEnemy.x)*u,y:previousEnemy.y+(enemy.y-previousEnemy.y)*u}},relativeAt=t=>{const e=targetAt(t);return bladePolygon(attackBladePose(a,t)).map(p=>({x:p.x-e.x,y:p.y+e.y}))};let prev=relativeAt(start);for(let i=0;i<=steps;i++){const t=start+(end-start)*i/steps,poly=relativeAt(t);let hit=polygonRect(poly,r);if(!hit)for(let j=0;j<poly.length;j++){hit=segmentRect(prev[j],poly[j],r);if(hit)break}if(hit){const e=targetAt(t);return {x:hit.x+e.x,y:hit.y-e.y,t}}prev=poly}return null}
class MelantaGame{
 constructor(){this.mode='idle';this.free=false;this.reset()}
 reset(){this.t=0;this.matchState='playing';this.finisher=null;this.p={x:450,y:0,vy:0,vx:0,dir:1,hp:1500,max:1500,speed:0};this.e={x:900,y:0,hp:5000,max:5000,bind:0,stun:0,stunStartedAt:0};this.enemyMoveTime=0;this.cd={attack:0,q:0,w:0,e:0,r:0};this.a=null;this.fx=[];this.events=[];this.total=0;this.hits=0;this.healed=0;this.rHealVisual=null;this.last='Sẵn sàng';this.buffer=null;this.ai=0;this.respawn=0;this.nextNormal=1;this.normalUntil=0}
 effect(k,x,y,data={}){this.fx.push({k,x,y,t:0,life:k==='burst'?.8:.55,...data});if(this.fx.length>100)this.fx.shift()}
 hit(n,x=this.e.x,y=this.e.y+90,visual={}){if(this.matchState!=='playing'||this.e.hp<=0)return;const d=Math.min(n,this.e.hp);if(d<=0)return;this.e.hp-=d;this.total+=d;this.hits++;this.effect('hit',x,y,{n:d});const a=this.a,dir=a?.dir||this.p.dir,source=a?.k||'impact',angle=visual.angle??(source==='q'?Math.atan2(140,dir*45):source==='w'?-dir*.55:source==='e'?-dir*.8:dir*(this.hits%2?-.78:.7));this.effect('cut',x,y,{life:source==='r'?.23:.32,angle,source,seed:this.hits,targetX:this.e.x,targetY:this.e.y,size:source==='q'?1.16:source==='r'?.72:1});this.events.push({k:'hit',n:d,time:this.t});if(source==='r'&&this.p.hp>0){const heal=Math.min(6,Math.max(0,this.p.max-this.p.hp));if(heal>0){this.p.hp+=heal;this.healed+=heal;if(!this.rHealVisual)this.rHealVisual={since:this.t};Object.assign(this.rHealVisual,{lastAt:this.t,until:this.t+.65,amount:heal});}}this.last=`${d} sát thương`;if(this.e.hp<=0){this.e.bind=0;this.e.stun=0;this.beginFinisher(source)}}
 beginFinisher(source){if(this.matchState!=='playing')return;this.matchState='finishing';this.finisher={t:0,duration:2,source,dir:this.p.dir};this.respawn=0;this.a=null;this.buffer=null;this.p.vx=0;this.p.vy=0;this.rHealVisual=null;this.last='Kết liễu';this.events.push({k:'finisher',time:this.t})}
 hurt(n){if(this.matchState!=='playing'||this.p.hp<=0)return 0;const d=n*(this.a?.k==='r'?.8:1);this.p.hp=Math.max(0,this.p.hp-d);this.effect('hurt',this.p.x,105,{n:d});if(this.p.hp===0){if(this.a?.k==='q'){this.p.y=0;this.p.vy=0}this.a=null;this.buffer=null;this.e.bind=0;this.rHealVisual=null}return d}
 cast(k){if(this.matchState!=='playing'||!SKILLS[k]||this.p.hp<=0)return false;if(this.a){
 const active=this.a;
 if(active.k==='w'&&k==='r'&&this.cd.r<=.001){
 // Preserve W's catch and arrival hit; R may cancel only its recovery.
 if(active.hit){this.a=null;this.buffer=null;this.e.bind=0;const started=this.cast('r');if(started)this.a.fromW=true;return started}
 if((active.locked&&active.t>=.6)||active.t>=active.duration-.24)this.buffer={k:'r',life:.32};
 }else if(active.duration-active.t<.18&&k!=='r')this.buffer={k,life:.24};
 return false}this.buffer=null;if(this.cd[k]>.001)return false;const p=this.p,e=this.e;this.cd[k]=this.free?0:SKILLS[k].cd;this.a={k,t:0,duration:SKILLS[k].duration,sx:p.x,sy:p.y,dir:p.dir,hit:false,ticks:0,locked:false,tx:e.x};if(k==='attack'){this.a.motion=[{t:0,x:p.x,y:p.y}];this.a.n=this.t<=this.normalUntil?this.nextNormal:1;this.nextNormal=this.a.n%3+1;this.normalUntil=this.t+SKILLS.attack.duration+.55}if(k==='e'){p.speed=2;this.a.airborne=p.y>.01||p.vy>0;this.a.airTime=(p.vy+Math.sqrt(p.vy*p.vy+3600*p.y))/1800;}if(k==='r'){p.vx=0;this.a.phase=p.y>.01||p.vy>0?'plunge':'dance';if(this.a.phase==='plunge'){this.a.plungeTime=0;p.vy=Math.min(p.vy,-600)}else{p.y=0;p.vy=0}}this.last={attack:'Vũ khí quét vòng',q:'Vận phi đà • quật đất tại chỗ',w:'Phóng phi đà • trói buộc',e:'Lộn múa • tăng tốc 2s',r:'Vũ điệu gai tím • giảm sát thương 20%'}[k];if(k==='attack')this.last='N'+this.a.n+' • Vũ điệu phi đà';return true}
 jump(){if(this.matchState==='playing'&&!this.a&&this.p.y===0&&this.p.hp>0)this.p.vy=650}
 update(dt,input={}){dt=Math.min(dt,.034);if(this.matchState==='finishing'){this.fx=this.fx.filter(f=>(f.t+=dt)<f.life);this.finisher.t=Math.min(this.finisher.duration,this.finisher.t+dt);if(this.finisher.t+1e-8>=this.finisher.duration){this.finisher.t=this.finisher.duration;this.matchState='finished';this.last='Chiến thắng • Melanta'}return}if(this.matchState==='finished')return;this.t+=dt;const p=this.p,e=this.e,eBefore={x:e.x,y:e.y};for(const k in this.cd)this.cd[k]=Math.max(0,this.cd[k]-dt);const enemyFreeDt=Math.max(0,dt-Math.max(e.bind,e.stun));p.speed=Math.max(0,p.speed-dt);e.stun=Math.max(0,e.stun-dt);e.bind=Math.max(0,e.bind-dt);this.fx=this.fx.filter(f=>(f.t+=dt)<f.life);if(this.events.length>100)this.events.splice(0,this.events.length-100);
 if(this.buffer){this.buffer.life-=dt;if(this.buffer.life<=0)this.buffer=null}
 if(this.respawn>0){this.respawn-=dt;if(this.respawn<=0){e.hp=e.max;e.bind=0;e.stun=0}}
 if(e.hp>0&&enemyFreeDt>1e-9){this.enemyMoveTime+=enemyFreeDt;if(this.mode==='move')e.x=900+Math.sin(this.enemyMoveTime*.9)*330;if(this.mode==='counter'){this.ai+=enemyFreeDt;if(this.ai>1.65){this.ai=0;this.effect('shot',e.x,90,{tx:p.x});if(Math.abs(e.x-p.x)<800)this.hurt(100)}}}
 if(this.rHealVisual&&(this.rHealVisual.until<=this.t||p.hp<=0))this.rHealVisual=null;
 const a=this.a;
 if(a){
 if(a.k==='r'&&a.phase==='plunge'){
 a.plungeTime+=dt;p.vx=0;p.x=a.sx;p.vy-=3000*dt;p.y=Math.max(0,p.y+p.vy*dt);
 if(p.y===0){p.vy=0;a.phase='dance';a.t=0;a.landedAt=this.t;this.effect('rland',p.x,0,{life:.52,power:1});this.last='Nện đất • Vũ điệu gai tím'}
 return;
 }
 a.t+=dt;const u=a.t/a.duration,dir=a.dir;
 if(a.k==='attack'){
 // A normal attack owns the upper-body animation, not the jump's physics.
 // Keep vertical momentum, gravity and floor collision running every tick.
 const inAir=p.y>0||p.vy>0,move=(input.right?1:0)-(input.left?1:0),target=move*350*(p.speed>0?1.35:1);
 if(inAir){if(move)p.vx+=(target-p.vx)*(1-Math.exp(-dt*10));else p.vx*=Math.exp(-dt*2)}
 else p.vx+=(target-p.vx)*(1-Math.exp(-dt*15));
 p.x=clamp(p.x+p.vx*dt,80,1520);advanceVertical(p,dt);
 // Keep the committed swing's facing, while legs remain free to run or backstep.
 // Collision, blade and rope all read the moving root from this history.

 a.motion.push({t:a.t,x:p.x,y:p.y});if(a.motion.length>80)a.motion.shift();
 }else p.vx=0;
 if(a.k==='attack'&&!a.hit&&e.hp>0){const contact=sweepNormal(a,a.t-dt,a.t,e,eBefore);if(contact){a.hit=true;a.contact=contact;const before=attackTip(a,Math.max(0,contact.t-.002)),after=attackTip(a,Math.min(a.duration,contact.t+.002));this.hit(60,contact.x,-contact.y,{angle:Math.atan2(after.y-before.y,after.x-before.x)});this.last='N'+a.n+' • 60 sát thương'}}
 if(a.k==='q'){p.x=a.sx;p.y=a.sy+qHop(a.t);p.vy=0;if(!a.hit&&a.t+1e-8>=Q_IMPACT_TIME){a.hit=true;const impact=qTip(a,Q_IMPACT_TIME);this.effect('qslam',impact.x,0,{dir:a.dir,life:1.05,power:1,radius:Q_RADIUS});if(e.hp>0&&Math.hypot(e.x-impact.x,e.y)<Q_RADIUS){this.hit(100);if(e.hp>0){e.stun=1;e.stunStartedAt=this.t;this.last='100 sát thương • Choáng 1s'}}}}
 if(a.k==='w'){
 if(!a.checked&&a.t+1e-8>=.28){a.checked=true;const dx=(e.x-a.sx)*dir,valid=dx>=0&&Math.hypot(e.x-a.sx,e.y-a.sy)<=700;a.throwX=valid?e.x:a.sx+dir*700;a.throwY=valid?e.y:a.sy;if(e.hp>0&&dx>=0&&Math.hypot(e.x-a.sx,e.y-a.sy)<=700){a.locked=true;a.tx=e.x;a.ty=e.y;a.stop=Math.min(72,Math.abs(e.x-a.sx)*.45);e.bind=Math.max(0,.8-a.t)+dt;this.last='Phi đà bắt trúng • Trói chân'}}
 if(a.locked&&!a.hit){if(e.hp<=0){a.locked=false;e.bind=0}else{e.bind=Math.max(e.bind,.8-a.t+dt);if(a.t>=.4){const v=clamp((a.t-.4)/.4,0,1),ease=v*v*v*(v*(v*6-15)+10);p.dir=dir;p.x=clamp(a.sx+(a.tx-dir*a.stop-a.sx)*ease,80,1520);p.y=a.sy+(a.ty-a.sy)*ease+18*Math.pow(Math.sin(Math.PI*v),2);p.vy=0;if(a.t+1e-8>=.8){a.hit=true;e.bind=0;this.hit(80,a.tx,a.ty+95);this.last='Lao tới mục tiêu • 80 sát thương'}}}}
 if(!a.locked){advanceVertical(p,dt)}
 }
 if(a.k==='e'){p.x=clamp(a.sx+dir*330*smooth(u),80,1520);if(a.airborne)advanceVertical(p,dt);else p.y=a.sy+Math.sin(Math.PI*clamp(u,0,1))*115;if(!a.hit&&e.hp>0&&Math.abs(e.x-p.x)<85&&Math.abs(e.y-p.y)<160){a.hit=true;this.hit(50)}}
 if(a.k==='r'){while(this.matchState==='playing'&&a.ticks<13&&a.t+1e-8>=(a.ticks+1)*R_HIT_INTERVAL){a.ticks++;const x=rImpactX(a,a.ticks);this.effect('spike',x,0,{power:1});this.effect('burst',x,0,{power:.4,life:.42});if(e.hp>0&&Math.hypot(e.x-p.x,e.y)<=500)this.hit(25)}}
 // Consume the requested W→R link in this same simulation tick, without
 // an idle frame. A miss keeps its full recovery; a hit finishes on arrival.
 if(a.k==='w'&&this.buffer?.k==='r'&&(a.hit||a.t>=a.duration)){
 this.buffer=null;this.a=null;e.bind=0;if(this.cast('r'))this.a.fromW=true;return;
 }
 if(a.t>=a.duration){if(a.k==='q'){p.y=a.sy;p.vy=0}if(a.k==='e'&&!a.airborne){p.y=a.sy;p.vy=0}if(a.k==='w')e.bind=0;this.a=null}
 }else if(p.hp>0){const move=(input.right?1:0)-(input.left?1:0);const target=move*350*(p.speed>0?1.35:1);p.vx+=(target-p.vx)*(1-Math.exp(-dt*15));p.x=clamp(p.x+p.vx*dt,80,1520);if(move)p.dir=move;advanceVertical(p,dt);if(input.attack)this.cast('attack');if(this.buffer){const k=this.buffer.k;this.buffer=null;this.cast(k)}}
 }
}
'use strict';
const ropeNormalTip=typeof module!=='undefined'&&module.exports?require('./engine.js').attackTip:attackTip;
const rSwingPeriod=typeof module!=='undefined'&&module.exports?require('./engine.js').R_SWING_PERIOD:R_SWING_PERIOD;
const ropeRTip=typeof module!=='undefined'&&module.exports?require('./engine.js').rTip:rTip;
const ropeQTip=typeof module!=='undefined'&&module.exports?require('./engine.js').qTip:qTip;
// Persistent world-space spring chains. Gravity, velocity damping and distance
// constraints keep the hair weighted while allowing the ends to trail motion.
class SoftChain{
 constructor(count){this.count=count;this.nodes=[]}
 reset(target){this.nodes=target.map(p=>({...p,vx:0,vy:0}));this.lengths=target.slice(1).map((p,i)=>Math.hypot(p.x-target[i].x,p.y-target[i].y))}
 update(dt,target,gravity,stiffness){if(!this.nodes.length||Math.hypot(target[0].x-this.nodes[0].x,target[0].y-this.nodes[0].y)>180)this.reset(target);const n=this.nodes;n[0]={...target[0],vx:0,vy:0};for(let i=1;i<n.length;i++){const p=n[i],oldx=p.x,oldy=p.y;const force=stiffness*(1-.5*i/(n.length-1));p.vx+=(target[i].x-p.x)*force*dt;p.vy+=((target[i].y-p.y)*force+gravity)*dt;const damp=Math.exp(-dt*8);p.vx*=damp;p.vy*=damp;p.x+=p.vx*dt;p.y+=p.vy*dt;p.oldx=oldx;p.oldy=oldy}
 for(let pass=0;pass<8;pass++){n[0].x=target[0].x;n[0].y=target[0].y;for(let i=1;i<n.length;i++){const a=n[i-1],b=n[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,c=(d-this.lengths[i-1])/d;const w=i===1?1:.5;if(i>1){a.x+=dx*c*w;a.y+=dy*c*w}b.x-=dx*c*w;b.y-=dy*c*w}}
 for(let i=1;i<n.length;i++){n[i].vx=.35*(n[i].x-n[i].oldx)/dt;n[i].vy=.35*(n[i].y-n[i].oldy)/dt}}
}
// Hair-only simulation: fixed scalp, inertial free tail, gravity and bend damping.
// Unlike the weapon, the ponytail retains velocity along its full length.
class FlowHair extends SoftChain{
 update(dt,target){if(!this.nodes.length||Math.hypot(target[6].x-this.nodes[6].x,target[6].y-this.nodes[6].y)>180){this.reset(target);this.root={...target[6]};this.clock=0}const n=this.nodes,root=target[6],rvx=(root.x-this.root.x)/dt,rvy=(root.y-this.root.y)/dt,activity=Math.min(2,Math.hypot(rvx,rvy)/350);this.root={...root};this.clock+=dt;for(let i=0;i<7;i++)n[i]={...target[i],vx:0,vy:0};for(let i=7;i<n.length;i++){const p=n[i],f=(i-6)/(n.length-7),stiff=85*(1-f)+24*f;p.oldx=p.x;p.oldy=p.y;p.vx+=((target[i].x-p.x)*stiff-rvx*.25+Math.sin(this.clock*5-i*.65)*activity*90*f)*dt;p.vy+=((target[i].y-p.y)*stiff+130+Math.sin(this.clock*4-i*.7)*activity*55*f)*dt;const damp=Math.exp(-dt*2.4);p.vx*=damp;p.vy*=damp;p.x+=p.vx*dt;p.y+=p.vy*dt}
 // Smooth local bends before enforcing segment length, preventing sharp folds.
 const positions=n.map(p=>({x:p.x,y:p.y}));for(let i=7;i<n.length-1;i++){n[i].x+=(positions[i-1].x+positions[i+1].x-2*positions[i].x)*.09;n[i].y+=(positions[i-1].y+positions[i+1].y-2*positions[i].y)*.09}
 for(let pass=0;pass<14;pass++){for(let i=7;i<n.length;i++){const a=n[i-1],b=n[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,c=(d-this.lengths[i-1])/d,w=i===7?1:.5;if(i>7){a.x+=dx*c*w;a.y+=dy*c*w}b.x-=dx*c*w;b.y-=dy*c*w}}
 for(let i=7;i<n.length;i++){const a=n[i-1],b=n[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;b.x=a.x+dx/d*this.lengths[i-1];b.y=a.y+dy/d*this.lengths[i-1];b.vx=(b.x-b.oldx)/dt*.96;b.vy=(b.y-b.oldy)/dt*.96;const v=Math.hypot(b.vx,b.vy);if(v>850){b.vx*=850/v;b.vy*=850/v}}}
}
function walkLeg(phase,side,mix){const q=(phase/(Math.PI*2)+side*.5)%1,stance=.56,u=q<stance?q/stance:(q-stance)/(1-stance),ease=u*u*(3-2*u),swing=q>=stance;const fx=swing?-42+84*ease:42-84*u,fy=swing?-18*Math.sin(Math.PI*u):0;const hip={x:side?10:-9,y:-65},foot={x:(side?37:-4)*(1-mix)+fx*mix,y:fy*mix};const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.min(81.9,Math.hypot(dx,dy)),l1=40,l2=42,along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),len=Math.hypot(dx,dy)||1;const knee={x:hip.x+dx/len*along+dy/len*height,y:hip.y+dy/len*along-dx/len*height};return {hip,knee,foot,swing,q}}
// A rounded, tapered leg volume replaces independent inner/outer knee curves.
// Both edges share one centerline and retain their measured cross-section.
function walkLegVolume(leg,bob=0){const a=leg.hip,b=leg.knee,c={x:leg.foot.x,y:leg.foot.y-bob-4},samples=[],left=[],right=[];const profile=[[0,12],[.22,11.8],[.5,10],[.76,8],[1,4]];for(let i=0;i<=48;i++){const t=i/48,h=1-t,x=h*h*a.x+2*h*t*b.x+t*t*c.x,y=h*h*a.y+2*h*t*b.y+t*t*c.y,dx=2*h*(b.x-a.x)+2*t*(c.x-b.x),dy=2*h*(b.y-a.y)+2*t*(c.y-b.y),len=Math.hypot(dx,dy)||1;let k=0;while(k<profile.length-2&&profile[k+1][0]<t)k++;let u=(t-profile[k][0])/(profile[k+1][0]-profile[k][0]);u=u*u*(3-2*u);const width=profile[k][1]+(profile[k+1][1]-profile[k][1])*u,nx=-dy/len,ny=dx/len;left.push({x:x+nx*width,y:y+ny*width});right.push({x:x-nx*width,y:y-ny*width});samples.push({x,y,width})}return {left,right,samples}}
const LEG_REFERENCE_COMMANDS=[[['M',250,349],['C',245,371,257,408,263,440],['L',276,506],['C',278,520,282,526,290,524],['C',299,525,302,508,303,495],['L',307,378],['C',289,356,272,348,250,349]],[['M',299,352],['C',306,384,321,418,337,453],['C',351,483,368,510,386,521],['C',396,527,402,523,396,509],['C',385,476,376,440,366,404],['L',348,344]]];
const legReferenceCache=[];
function referenceLegOutline(side,count){if(legReferenceCache[side]?.length===count)return legReferenceCache[side];let points=[],last;for(const cmd of LEG_REFERENCE_COMMANDS[side]){if(cmd[0]==='M'){last={x:cmd[1],y:cmd[2]};points.push(last)}else if(cmd[0]==='L'){last={x:cmd[1],y:cmd[2]};points.push(last)}else{const a=last;for(let i=1;i<=24;i++){const u=i/24,h=1-u;points.push({x:h*h*h*a.x+3*h*h*u*cmd[1]+3*h*u*u*cmd[3]+u*u*u*cmd[5],y:h*h*h*a.y+3*h*h*u*cmd[2]+3*h*u*u*cmd[4]+u*u*u*cmd[6]})}last=points.at(-1)}}points=points.map(p=>({x:(p.x-300)*.4,y:(p.y-523)*.4}));return legReferenceCache[side]=resampleOutline(points,count)}
function resampleOutline(points,count){let lengths=[0];for(let i=1;i<=points.length;i++){const a=points[i-1],b=points[i%points.length];lengths.push(lengths.at(-1)+Math.hypot(b.x-a.x,b.y-a.y))}const result=[];let j=0;for(let i=0;i<count;i++){const d=i/count*lengths.at(-1);while(j<points.length-1&&lengths[j+1]<d)j++;const a=points[j],b=points[(j+1)%points.length],u=(d-lengths[j])/(lengths[j+1]-lengths[j]||1);result.push({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u})}return result}
function walkLegOutline(phase,side,mix,bob=0){const v=walkLegVolume(walkLeg(phase,side,mix),bob),outline=resampleOutline([...v.left,...v.right.slice().reverse()],100),rest=referenceLegOutline(side,100),blend=mix*mix*(3-2*mix);return outline.map((p,i)=>({x:rest[i].x+(p.x-rest[i].x)*blend,y:rest[i].y+(p.y-rest[i].y)*blend}))}
const poseSmooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const NORMAL_POSE_KEYS=['torso','hip','shift','load','handX','handY','freeX','freeY','weight'];
const NORMAL_REST={torso:0,hip:0,shift:0,load:0,handX:-31,handY:-77,freeX:18,freeY:-130,weight:0};
const NORMAL_POSES={
 1:[{torso:-.12,hip:-.05,shift:-2,load:2,handX:-36,handY:-106,freeX:27,freeY:-125},{torso:.17,hip:.07,shift:3,load:1,handX:44,handY:-105,freeX:-3,freeY:-120},{torso:.11,hip:.035,shift:2,load:1,handX:36,handY:-139,freeX:6,freeY:-119}],
 2:[{torso:-.07,hip:.04,shift:-1,load:1,handX:-10,handY:-148,freeX:29,freeY:-113},{torso:.19,hip:-.06,shift:3,load:2,handX:44,handY:-99,freeX:0,freeY:-132},{torso:.13,hip:-.035,shift:2,load:3,handX:40,handY:-84,freeX:3,freeY:-126}],
 3:[{torso:-.18,hip:-.075,shift:-3,load:3,handX:-43,handY:-92,freeX:27,freeY:-123},{torso:.22,hip:.085,shift:4,load:1,handX:46,handY:-114,freeX:-4,freeY:-122},{torso:-.10,hip:-.045,shift:-1,load:2,handX:24,handY:-144,freeX:22,freeY:-112}]
};
function rDance(a){const t=a.t,envelope=poseSmooth(t/.23)*(1-poseSmooth((t-3.65)/.35)),turn=2*Math.PI*t/rSwingPeriod,beat=2*Math.PI*t/(rSwingPeriod/2);
 return {weight:envelope,turn,beat}}
// Both wrists follow bounded opposed ellipses on the same weapon clock.
// This crosses/opens the arms without normalizing through a blade passing the
// shoulder, which would abruptly flip a wrist at the center of a cross-over.
function rHandDrive(a,end){const phase=2*Math.PI*a.t/rSwingPeriod,side=end?-1:1;return {x:(end?13:-13)+side*36*Math.sin(phase),y:(end?-117:-115)-side*25*Math.cos(phase)}}
function rDanceTarget(a){const {weight:w,turn:z,beat:b}=rDance(a),front=rHandDrive(a,0),back=rHandDrive(a,1);return {weight:w,torso:w*(.11*Math.sin(z-.35)+.05*Math.sin(b-.5)),hip:w*.035*Math.sin(z-.8),shift:w*5*Math.sin(z),load:w*(-3+3*Math.cos(b)),handX:-31+w*(front.x+31),handY:-77+w*(front.y+77),freeX:18+w*(back.x-18),freeY:-130+w*(back.y+130)}}
function normalPoseTarget(a){if(a?.k==='r'){if(a.phase==='plunge')return {...NORMAL_REST,torso:.12,handX:-22,handY:-112,freeX:24,freeY:-111,weight:1};return rDanceTarget(a);}if(a?.k==='e'){a={...a,t:eVisualTime(a)};const frames=[{t:0,...NORMAL_REST,weight:0},{t:.10,...NORMAL_REST,torso:.12,hip:-.06,load:5,handX:-23,handY:-111,freeX:26,freeY:-113,weight:1},{t:.24,...NORMAL_REST,torso:.10,hip:.06,load:0,handX:-12,handY:-103,freeX:14,freeY:-105,weight:1},{t:.44,...NORMAL_REST,torso:-.06,hip:-.05,handX:-14,handY:-103,freeX:18,freeY:-111,weight:1},{t:.62,...NORMAL_REST,torso:-.10,handX:-26,handY:-104,freeX:27,freeY:-119,load:1,weight:1},{t:.70,...NORMAL_REST,torso:.10,handX:-31,handY:-97,freeX:24,freeY:-121,load:6,weight:1},{t:.78,...NORMAL_REST,weight:0}];let i=0;while(i<frames.length-2&&a.t>frames[i+1].t)i++;const lo=frames[i],hi=frames[i+1],u=poseSmooth((a.t-lo.t)/(hi.t-lo.t)),out={};for(const key of NORMAL_POSE_KEYS)out[key]=lo[key]+(hi[key]-lo[key])*u;return out}if(a?.k==='w'){const frames=[{t:0,...NORMAL_REST,weight:0},{t:.10,...NORMAL_REST,torso:-.13,shift:-3,load:3,handX:-33,handY:-117,weight:1},{t:.28,...NORMAL_REST,torso:.12,handX:38,handY:-111,freeX:-7,freeY:-112,weight:1},{t:.4,...NORMAL_REST,torso:-.1,handX:8,handY:-100,freeX:21,freeY:-112,load:4,weight:1},{t:.60,...NORMAL_REST,torso:-.15,handX:29,handY:-109,freeX:-30,freeY:-92,load:1,weight:1},{t:.8,...NORMAL_REST,torso:.05,handX:37,handY:-106,freeX:0,freeY:-120,load:5,weight:1},{t:1.05,...NORMAL_REST,weight:0}];let i=0;while(i<frames.length-2&&a.t>frames[i+1].t)i++;const lo=frames[i],hi=frames[i+1],u=poseSmooth((a.t-lo.t)/(hi.t-lo.t)),out={};for(const key of NORMAL_POSE_KEYS)out[key]=lo[key]+(hi[key]-lo[key])*u;return out}if(a?.k!=='attack')return {...NORMAL_REST};const keys=NORMAL_POSES[a.n||1],frames=[{t:0,...NORMAL_REST,weight:1},{t:.045,...keys[0],weight:1},{t:.115,...keys[1],weight:1},{t:.285,...keys[2],weight:1},{t:.5,...NORMAL_REST,weight:0}];let i=0;while(i<frames.length-2&&a.t>frames[i+1].t)i++;const lo=frames[i],hi=frames[i+1],u=poseSmooth((a.t-lo.t)/(hi.t-lo.t)),out={};for(const key of NORMAL_POSE_KEYS)out[key]=lo[key]+(hi[key]-lo[key])*u;return out}
function updateNormalPose(g,dt){let state=g.normalVisual;if(!state||g.t<state.time)state=g.normalVisual={...NORMAL_REST,velocity:Object.fromEntries(NORMAL_POSE_KEYS.map(k=>[k,0])),time:g.t};const target=normalPoseTarget(g.a);if(g.a?.k==='r'&&g.a.phase!=='plunge'&&!g.a.rEntryPose)g.a.rEntryPose=Object.fromEntries(NORMAL_POSE_KEYS.map(k=>[k,state[k]]));for(const key of NORMAL_POSE_KEYS){
 if(g.a?.k==='r'&&g.a.phase!=='plunge'&&['handX','handY','freeX','freeY'].includes(key)){
 const previous=state[key],carry=1-poseSmooth(g.a.t/.23);state[key]=target[key]+(g.a.rEntryPose[key]-NORMAL_REST[key])*carry;state.velocity[key]=(state[key]-previous)/dt;continue;
 }
const omega=key==='hip'?20:key==='torso'?26:key==='weight'?25:key==='shift'||key==='load'?22:24,offset=state[key]-target[key],v=state.velocity[key],decay=Math.exp(-omega*dt),term=v+omega*offset;state[key]=target[key]+(offset+term*dt)*decay;state.velocity[key]=(v-omega*term*dt)*decay}state.time=g.t;return state}
// Visual-only jump state follows actual vertical motion, including authored skill hops.
// No animation phase writes back into gameplay position or gravity.
function updateAirPose(g,dt){let a=g.airVisual;const p=g.p;if(!a||g.t<a.time)a=g.airVisual={time:g.t,y:p.y,x:p.x,mix:0,rise:0,fall:0,travel:0,land:0,tuck:0,landingAt:-10,wasAir:false};const vy=(p.y-a.y)/dt,vx=(p.x-a.x)/dt,inAir=p.grounded===undefined?p.y>.01:!p.grounded;if(a.wasAir&&!inAir&&vy<0)a.landingAt=g.t;const landAge=g.t-a.landingAt,target={mix:inAir?poseSmooth(p.y/18):0,rise:poseSmooth((vy+60)/650),fall:poseSmooth((-vy-20)/520),travel:Math.max(-1,Math.min(1,vx*p.dir/350)),land:!inAir&&landAge<.24?Math.sin(Math.PI*landAge/.24):0,tuck:Math.max(0,.46+.5*poseSmooth((vy+60)/650)-.33*poseSmooth((-vy-20)/520))*poseSmooth(p.y/60)};for(const k of ['mix','rise','fall','travel','land','tuck']){const omega=k==='land'?30:k==='tuck'?14:18;a[k]+=(target[k]-a[k])*(1-Math.exp(-dt*omega))}a.y=p.y;a.x=p.x;a.time=g.t;a.wasAir=inAir;return a}
// Fixed-length two-bone legs retain their tapered cross-section while bending.
function airLeg(pose,side){const air=pose.airState||{},tuck=air.tuck||0,travel=air.travel||0,land=air.land||0,hip={x:side?10:-9,y:-65},foot={x:(side?28:-11)+(side?8:-14)*tuck-travel*10*tuck,y:-(side?18:33)*tuck-land*6};const dx=foot.x-hip.x,dy=foot.y-hip.y,len=Math.hypot(dx,dy)||1,d=Math.min(81.8,Math.max(3,len)),l1=40,l2=42,along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),nx=dx/len,ny=dy/len;foot.x=hip.x+nx*d;foot.y=hip.y+ny*d;return {hip,knee:{x:hip.x+nx*along+ny*height,y:hip.y+ny*along-nx*height},foot}}
function airLegOutline(pose,side){const v=walkLegVolume(airLeg(pose,side),-4);return resampleOutline([...v.left,...v.right.slice().reverse()],100)}
function danceLeg(pose,side){
 const w=pose.dance?.weight||0,z=pose.dance?.turn||0,hip={x:side?10:-9,y:-65},rest=walkLeg(0,side,0).foot;
 const target=side?{x:20+22*Math.sin(z-.65),y:-12-13*(.5+.5*Math.cos(z-.65))}:{x:-7+3*Math.sin(z),y:-2};
 let dx=rest.x+(target.x-rest.x)*w-hip.x,dy=rest.y+(target.y-rest.y)*w-hip.y;
 const raw=Math.hypot(dx,dy)||1,d=Math.min(81.8,Math.max(3,raw)),nx=dx/raw,ny=dy/raw,along=(40*40-42*42+d*d)/(2*d),bend=Math.sqrt(Math.max(0,40*40-along*along));
 return {hip,knee:{x:hip.x+nx*along+ny*bend,y:hip.y+ny*along-nx*bend},foot:{x:hip.x+nx*d,y:hip.y+ny*d}}
}
function torsoLocalPoint(pose,x,y){const a=pose.torso||0,c=Math.cos(a),s=Math.sin(a),dy=y+88;return {x:x*c-dy*s,y:-88+x*s+dy*c}}
function normalArm(pose,front=true){if(pose.armJoints)return pose.armJoints[front?'front':'back'];const shoulder=torsoLocalPoint(pose,front?-13:13,front?-115:-117),wanted=front?(pose.normalWeight>.001?{x:pose.handX,y:pose.handY}:{x:-31-(pose.arm||0)*9,y:-77-(pose.arm||0)*14}):(pose.normalWeight>.001?{x:pose.freeX,y:pose.freeY}:{x:18+(pose.arm||0)*9,y:-130+(pose.arm||0)*5});let dx=wanted.x-shoulder.x,dy=wanted.y-shoulder.y,d=Math.hypot(dx,dy)||1;const reach=53;if(d>reach){dx*=reach/d;dy*=reach/d;d=reach}const hand={x:shoulder.x+dx,y:shoulder.y+dy},along=d/2,height=Math.sqrt(Math.max(0,27*27-along*along)),side=front?-1:1,elbow={x:shoulder.x+dx/d*along-dy/d*height*side,y:shoulder.y+dy/d*along+dx/d*height*side};return {shoulder,elbow,hand}}
function wDashLean(a){if(a?.k!=='w'||!a.locked||a.t<=.4||a.t>=.8)return 0;const u=(a.t-.4)/.4,speed=16*u*u*(1-u)*(1-u),distance=Math.abs(a.tx-a.sx)-(a.stop||0);return -.09*speed*Math.min(1,Math.max(0,distance)/240)}
// Simulated-time snapshots keep dash trails consistent at any render FPS.
class DashAfterimages{
 constructor(){this.reset()}
 reset(){this.samples=[];this.time=-1;this.nextAt=0;this.action=null;this.last=null}
 update(dt,g,pose,rig){if(g.t<this.time||g.p.hp<=0)this.reset();this.time=g.t;for(const s of this.samples)s.age+=dt;this.samples=this.samples.filter(s=>s.age<s.life);const a=g.a,active=(a?.k==='w'&&a.locked&&!a.hit&&a.t>.4&&a.t<.8)||(g.p.speed>0&&(Math.abs(g.p.vx)>15||g.p.y>.01||a?.k==='e'));if(!active){this.action=null;this.last=null;return}if(this.action!==a||!this.last){this.action=a;this.nextAt=g.t;this.last={x:g.p.x,y:g.p.y}}const distance=Math.hypot(g.p.x-this.last.x,g.p.y-this.last.y);if(g.t+1e-8<this.nextAt||distance<7)return;const volume=rig?hairVolume(rig):null;this.samples.push({x:g.p.x,y:g.p.y,dir:g.p.dir,pose:{...pose,airState:pose.airState?{...pose.airState}:undefined},hair:volume?{left:volume.left.map(p=>({...p})),right:volume.right.map(p=>({...p}))}:null,age:0,life:.22});this.nextAt=g.t+.03;this.last={x:g.p.x,y:g.p.y};if(this.samples.length>8)this.samples.shift()}
}
function eVisualTime(a){if(!a?.airborne)return a?.t||0;const span=Math.min(.78,Math.max(.10,(Number.isFinite(a.airTime)?a.airTime:a.duration||.78)-.025));return Math.min(1,a.t/span)*.78}
function eFlipPose(a){if(a?.k!=='e')return {angle:0,fold:0,pivot:0};const t=eVisualTime(a),u=Math.max(0,Math.min(1,(t-.08)/.60)),turn=u*u*u*(u*(u*6-15)+10),full=!a.airborne||(Number.isFinite(a.airTime)?a.airTime:a.duration||.78)>=.32;return {angle:full?turn*Math.PI*2:Math.sin(Math.PI*Math.min(1,t/.78))*.15,fold:poseSmooth((t-.09)/.16)*(1-poseSmooth((t-.48)/.24))*(full?.94:.35),pivot:-78}}

function playerPose(g){const p=g.p,a=g.a,w=g.walkVisual||{phase:0,mix:0},phase=w.phase,mix=w.mix,grounded=(p.grounded??(p.y<.01))&&(!a||a.k==='attack'),gaitMix=grounded?mix:0,q=a?.k==='q',t=q?a.t:0;const charge=q?poseSmooth(t/.44):0,release=q?poseSmooth((t-.44)/.28):0,recover=q?poseSmooth((t-.86)/.46):0;
 const visual=g.normalVisual||NORMAL_REST,air=g.airVisual||{mix:0,rise:0,fall:0,travel:0,land:0},airWeight=Math.max(air.mix,air.land),airArms=air.mix*(1-visual.weight)*(q||a?.k==='e'||a?.k==='r'?0:1);const normal=a?.k==='attack',normalU=normal?Math.max(0,Math.min(1,a.t/a.duration)):0,normalTwist=normal?Math.sin(normalU*Math.PI*2)*([0,.12,-.11,.16][a.n||1]):0;
 const crouch=q?(t<.14?Math.sin(t/.14*Math.PI)*5:t>.76&&t<1.12?Math.sin((t-.76)/.36*Math.PI)*7:0):0;
 const dance=a?.k==='r'&&a.phase!=='plunge'?rDance(a):null;return {dance,turnScale:1,run:gaitMix,phase,gaitMix,airState:air,airHeight:p.y,airWeight,eFlip:a?.k==='e',pivotY:a?.k==='e'?-78:0,plantWeight:visual.weight*(1-airWeight)*(1-gaitMix),qFold:a?.k==='e'?eFlipPose(a).fold:a?.k==='w'&&a.locked?Math.sin(Math.PI*Math.max(0,Math.min(1,(a.t-.4)/.4)))*.45:q?Math.sin(Math.PI*Math.max(0,Math.min(1,(t-.14)/.78)))*.78:0,qCrouch:crouch,normalWeight:Math.max(visual.weight,airArms),torso:visual.torso+air.mix*(.04+.045*air.rise-.07*air.fall),handX:visual.handX+(-23-visual.handX)*airArms,handY:visual.handY+(-109-14*air.rise+10*air.fall-visual.handY)*airArms,freeX:visual.freeX+(30+8*air.travel-visual.freeX)*airArms,freeY:visual.freeY+(-112-10*air.rise+13*air.fall-visual.freeY)*airArms,shift:Math.sin(phase)*1.4*gaitMix+visual.shift,bob:q?crouch:Math.sin(g.t*3)*1.2*(1-gaitMix)+(1-Math.cos(phase*2))*1.5*gaitMix+visual.load+air.land*6,hipRoll:visual.hip+Math.sin(phase)*.038*gaitMix+air.mix*(.035*air.rise-.025*air.fall),arm:normal?Math.sin(normalU*Math.PI)*(a.n===3?1.35:1.05):q?(.95*charge+.45*release)*(1-recover):a?Math.sin(Math.min(1,a.t/a.duration)*Math.PI):0,rot:normal?visual.torso*.06+air.mix*(.025*air.travel-.025*air.fall):a?.k==='e'?eFlipPose(a).angle:a?.k==='r'?(a.phase==='plunge'?-.08:dance.weight*(.045*Math.sin(dance.turn-.7))):a?.k==='w'?wDashLean(a):q?(-.13*charge+.48*release)*(1-recover):(.055+Math.sin(phase+.6)*.008)*gaitMix+Math.sin(g.t*2)*.004*(1-gaitMix)+air.mix*(.045*air.travel-.025*air.fall)}}
function rigPoint(p,pose,t,x,y,upper=false){if(upper){const bone=torsoLocalPoint(pose,x,y);x=bone.x;y=bone.y}y+=pose.bob===undefined?Math.sin(t*3)*2:pose.bob;x+=pose.shift||0;const a=pose.rot||0,pivot=pose.pivotY||0,size=modelSize;return {x:p.x+size*p.dir*(pose.turnScale??1)*(x*Math.cos(a)-(y-pivot)*Math.sin(a)),y:-p.y+size*(pivot+x*Math.sin(a)+(y-pivot)*Math.cos(a))}}
// Build a solid tapered volume around a smooth centerline. Width is measured
// perpendicular to the curve, so turning cannot flatten the ponytail.
function hairVolume(rig){if(!rig.hair.nodes.length)return null;const rest=rig.hairRest,n=rig.hair.nodes,centers=[];for(let i=5;i<18;i++){const u=(i-5)/12,fade=Math.min(1,Math.max(0,(i-6)/2));let dx=0,dy=0,w=0;for(let j=Math.max(0,i-1);j<=Math.min(17,i+1);j++){const k=2-Math.abs(i-j);dx+=(n[j].x-rest[j].x)*k;dy+=(n[j].y-rest[j].y)*k;w+=k}dx=dx/w*fade;dy=dy/w*fade;const d=Math.hypot(dx,dy);if(d>75){dx*=75/d;dy*=75/d}centers.push({x:rest[i].x+dx,y:rest[i].y+dy,width:(8.8*Math.pow(1-u,.7)+.08)*(modelSize)})}
 const samples=[];for(let i=0;i<centers.length-1;i++){const a=centers[Math.max(0,i-1)],b=centers[i],c=centers[i+1],d=centers[Math.min(centers.length-1,i+2)];for(let j=0;j<6;j++){const t=j/6,t2=t*t,t3=t2*t,interp=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);samples.push({x:interp('x'),y:interp('y'),width:b.width+(c.width-b.width)*t})}}samples.push(centers.at(-1));const left=[],right=[];for(let i=0;i<samples.length;i++){const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],p=samples[i],len=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;left.push({x:p.x+nx*p.width,y:p.y+ny*p.width});right.push({x:p.x-nx*p.width,y:p.y-ny*p.width})}return {left,right,samples}}
// Paid-out cable: hand and dart are constrained endpoints; all intervening
// particles keep momentum. Gravity creates slack on recovery instead of a
// fresh rigid Bezier pose every frame.
class QFlowRope{
 constructor(start,end,dir){this.nodes=[];this.history=[];const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)||1;for(let i=0;i<29;i++){const f=i/28,bend=Math.sin(f*Math.PI)*32;this.nodes.push({x:start.x+dx*f-dy/d*bend*dir,y:start.y+dy*f+dx/d*bend*dir,vx:0,vy:0})}this.length=d+50}
 update(dt,start,end,t,normal=false,slackOverride){const n=this.nodes,N=n.length-1,distance=Math.hypot(end.x-start.x,end.y-start.y),release=Math.max(0,Math.min(1,(t-.44)/.28)),retract=Math.max(0,Math.min(1,(t-.86)/.46)),slack=slackOverride!==undefined?slackOverride:normal?(t<.10?55:t<.34?28+14*Math.sin((t-.10)/.24*Math.PI):45+30*Math.sin(Math.min(1,(t-.34)/.16)*Math.PI)):(t<.44?72:t<.72?60*(1-release)+15: t<.86?22:22+70*Math.sin(retract*Math.PI)),wanted=distance+slack;this.length=Math.max(distance*1.015,this.length+(wanted-this.length)*(1-Math.exp(-dt*16)));const length=this.length/N;
 for(let i=1;i<N;i++){const p=n[i];p.ox=p.x;p.oy=p.y;p.vy+=330*dt;p.vx*=Math.exp(-dt*3.5);p.vy*=Math.exp(-dt*3.5);p.x+=p.vx*dt;p.y+=p.vy*dt}
 n[0]={...start,vx:0,vy:0};n[N]={...end,vx:0,vy:0};const old=n.map(p=>({x:p.x,y:p.y}));for(let i=1;i<N;i++){n[i].x+=(old[i-1].x+old[i+1].x-2*old[i].x)*.07;n[i].y+=(old[i-1].y+old[i+1].y-2*old[i].y)*.07}
 for(let pass=0;pass<28;pass++){for(let k=0;k<N;k++){const i=pass%2?N-1-k:k,a=n[i],b=n[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,err=(d-length)/d,wa=i===0?0:1,wb=i+1===N?0:1,sum=wa+wb;if(sum){a.x+=dx*err*wa/sum;a.y+=dy*err*wa/sum;b.x-=dx*err*wb/sum;b.y-=dy*err*wb/sum}}for(let i=1;i<N;i++)n[i].y=Math.min(-1,n[i].y)}
 for(let i=1;i<N;i++){const p=n[i];p.vx=(p.x-p.ox)/dt*.985;p.vy=(p.y-p.oy)/dt*.985;if(p.y>=-1&&p.vy>0)p.vy=0;const v=Math.hypot(p.vx,p.vy);if(v>2600){p.vx*=2600/v;p.vy*=2600/v}}this.history.push({t,points:n.map(p=>({x:p.x,y:p.y}))});while(this.history.length>28)this.history.shift();return n}
}
class MelantaRig{
 constructor(){this.hair=new FlowHair(18);this.low=new SoftChain(23);this.high=new SoftChain(21)}
 reset(){this.hairDir=null;this.hairRoot=null;this.weaponLag=0;this.weaponVelocity=0;this.weaponMotion=null;this.rRope=null;this.rRopes=null;this.rAction=null;this.qRope=null;this.qAction=null;this.eRope=null;this.eAction=null;this.wRope=null;this.wAction=null;this.normalRope=null;this.normalAction=null;this.normalAt=-10;this.poseReset=true;this.airReset=true;this.hair.nodes=[];this.low.nodes=[];this.high.nodes=[]}
 update(dt,g,poseOverride=null){const p=g.p,t=g.t;
 const incomingW=g.a?.k==='r'&&g.a.phase!=='plunge'&&g.a.fromW&&this.rAction!==g.a?this.wRope:null;
 if(incomingW&&!g.a.rStartTips){g.a.rStartTips=[{...incomingW.nodes.at(-1)},{...this.low.nodes.at(-1)}]}
if(this.poseReset){g.normalVisual=null;this.poseReset=false}updateNormalPose(g,dt);if(this.airReset){g.airVisual=null;this.airReset=false}updateAirPose(g,dt);if(!g.walkVisual||g.t<this.walkTime)g.walkVisual={phase:0,mix:0,phaseSpeed:0};const w=g.walkVisual,delta=p.x-(w.x??p.x),moved=Math.abs(delta),speed=moved/dt;w.x=p.x;const walking=(p.grounded??(p.y<.01))&&(!g.a||g.a.k==='attack')&&speed>8;w.mix+=((walking?Math.min(1,speed/240):0)-w.mix)*(1-Math.exp(-dt*12));w.phaseSpeed=((w.phaseSpeed||0)+((walking?speed/150*Math.PI*2*(Math.sign(delta*p.dir)||1):0)-(w.phaseSpeed||0))*(1-Math.exp(-dt*12)));if(Math.abs(w.phaseSpeed)<.001)w.phaseSpeed=0;w.phase=((w.phase+w.phaseSpeed*dt)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);this.walkTime=g.t;const pose=poseOverride||playerPose(g),pt=(x,y)=>rigPoint(p,pose,t,x,y);const hair=[],anchors=[[280,130],[250,109],[226,145],[216,205],[194,256],[163,294],[146,334],[154,370]];this.hairRest=[];for(let i=0;i<18;i++){const f=i/17*(anchors.length-1),j=Math.min(anchors.length-2,Math.floor(f)),u=f-j,rx=anchors[j][0]*(1-u)+anchors[j+1][0]*u,ry=anchors[j][1]*(1-u)+anchors[j+1][1]*u;const target=rigPoint(p,pose,t,(rx-300)*.4,(ry-523)*.4,true);hair.push(target);this.hairRest.push({...target,rx,ry})}// Mirror persistent offsets about the bound root when facing changes.
 // Do not let the old world-space chain stretch across the face on a turn.
 if(this.hairDir!==undefined&&this.hairDir!==null&&this.hairDir!==p.dir&&this.hair.nodes.length){const prev=this.hairRoot,next=hair[0];for(const n of this.hair.nodes){n.x=next.x-(n.x-prev.x);n.y=next.y+(n.y-prev.y);n.vx=-n.vx}}
 this.hairDir=p.dir;this.hairRoot={...hair[0]};this.hair.update(dt,hair,180,230);
 // World-space damped springs react to actual root acceleration, including
 // jumping, stopping and landing. Endpoints lag; the hand stays fully pinned.
 if(!this.weaponMotion)this.weaponMotion={x:p.x,y:-p.y,vx:0,vy:0,history:[],low:{x:0,y:0,vx:0,vy:0},high:{x:0,y:0,vx:0,vy:0}};
 const motion=this.weaponMotion,dx=p.x-motion.x,dy=-p.y-motion.y;
 if(Math.hypot(dx,dy)>180){motion.x=p.x;motion.y=-p.y;motion.vx=motion.vy=0;motion.history=[];for(const end of [motion.low,motion.high])end.x=end.y=end.vx=end.vy=0}
 const rootVx=(p.x-motion.x)/dt,rootVy=(-p.y-motion.y)/dt,ax=(rootVx-motion.vx)/dt,ay=(rootVy-motion.vy)/dt;
 for(const [end,omega,strength] of [[motion.low,7.5,.38],[motion.high,9,.26]]){for(const axis of ['x','y']){const vel=axis==='x'?rootVx:rootVy,accel=axis==='x'?ax:ay,target=-vel*(axis==='x'?.025:.014),v='v'+axis;end[v]+=((target-end[axis])*omega*omega-1.5*omega*end[v]-accel*strength)*dt;end[axis]+=end[v]*dt;const limit=axis==='x'?32:27;if(Math.abs(end[axis])>limit){end[axis]=Math.sign(end[axis])*limit;end[v]*=.35}}}
 motion.history.push({t,low:{x:motion.low.x,y:motion.low.y},high:{x:motion.high.x,y:motion.high.y}});while(motion.history.length>75)motion.history.shift();
 const delayed=(name,f)=>{const at=t-f*.19,h=motion.history;let i=h.length-1;while(i>0&&h[i-1].t>at)i--;if(i===0)return h[0][name];const a=h[i-1],b=h[i],u=Math.max(0,Math.min(1,(at-a.t)/(b.t-a.t||1)));return {x:a[name].x+(b[name].x-a[name].x)*u,y:a[name].y+(b[name].y-a[name].y)*u}};
 motion.x=p.x;motion.y=-p.y;motion.vx=rootVx;motion.vy=rootVy;this.weaponLag=motion.low.x*p.dir;this.weaponVelocity=motion.low.vx;
 const hand=normalArm(pose,true).hand,gx=hand.x,gy=hand.y;
 const cubic=(a,b,c,d,u)=>{const v=1-u;return {x:v*v*v*a.x+3*v*v*u*b.x+3*v*u*u*c.x+u*u*u*d.x,y:v*v*v*a.y+3*v*v*u*b.y+3*v*u*u*c.y+u*u*u*d.y}};
 const low=[],high=[];
 for(let i=0;i<23;i++){const f=i/22,z=cubic({x:gx,y:gy},{x:-7,y:-53},{x:-69,y:-31},{x:-47,y:-7},f),wave=Math.sin(f*5.2-t*2)*4.8*Math.sin(f*Math.PI)*f,follow=f*f*(3-2*f),lag=delayed('low',f);const point=pt(z.x+wave,z.y+Math.sin(t*1.5-f*4)*3*f*f);point.x+=lag.x*follow;point.y+=Math.min(lag.y,p.y+3)*follow;low.push(point)}
 const controls=[[{x:gx,y:gy},{x:-48,y:-96},{x:-39,y:-101},{x:-20,y:-91}],[{x:-20,y:-91},{x:-1,y:-81},{x:28,y:-102},{x:23,y:-127}]];
 for(let i=0;i<21;i++){const f=i/20,k=f<.42?0:1,u=k?(f-.42)/.58:f/.42,z=cubic(...controls[k],u);const follow=f*f*(3-2*f),lag=delayed('high',f),wave=Math.sin(f*5-t*1.8)*2.8*Math.sin(f*Math.PI)*f;const point=pt(z.x+wave,z.y+Math.sin(t*1.5-f*3)*1.5*f*f);point.x+=lag.x*follow;point.y+=lag.y*follow;high.push(point)}
 low[0]=high[0]=pt(gx,gy);this.low.nodes=low;this.high.nodes=high;
 if(g.a?.k==='attack'){const tip=ropeNormalTip(g.a,g.a.t);if(this.normalAction!==g.a){this.normalAction=g.a;if(!this.normalRope||g.t-(this.normalAt||-10)>.2)this.normalRope=new QFlowRope(low[0],tip,p.dir);else this.normalRope.history=[]}this.normalRope.update(dt,low[0],tip,g.a.t,true);this.normalAt=g.t}else{this.normalAction=null;if(this.normalRope&&g.t-this.normalAt>.6)this.normalRope=null}
 if(g.a?.k==='e'){const a=g.a,u=Math.max(0,Math.min(1,a.t/a.duration)),swing=Math.sin(Math.PI*u),target=pt(23+95*swing,-127+18*Math.sin(u*Math.PI*2)),rest=high.at(-1),tip={x:rest.x+(target.x-rest.x)*swing,y:rest.y+(target.y-rest.y)*swing};if(this.eAction!==a){this.eAction=a;this.eRope=new QFlowRope(low[0],tip,p.dir)}this.eRope.update(dt,low[0],tip,a.t,false,35+25*swing)}else{this.eAction=null;this.eRope=null}
 if(g.a?.k==='w'){const a=g.a,rest=high.at(-1),target=a.locked?{x:a.tx,y:a.ty}:a.checked?{x:a.throwX,y:a.throwY}:((g.e.x-a.sx)*a.dir>=0&&Math.hypot(g.e.x-a.sx,g.e.y-a.sy)<=700?{x:g.e.x,y:g.e.y}:{x:a.sx+a.dir*700,y:a.sy}),anchor={x:target.x-a.dir*32,y:-target.y-105},flight=poseSmooth(a.t/.28),back=poseSmooth((a.t-(a.locked?.91:.35))/(a.locked?.14:.7));let end={x:rest.x+(anchor.x-rest.x)*flight,y:rest.y+(anchor.y-rest.y)*flight-Math.sin(flight*Math.PI)*45};if(a.checked&&!a.locked){end={x:anchor.x+(rest.x-anchor.x)*back,y:anchor.y+(rest.y-anchor.y)*back}}else if(a.locked&&a.t>.91)end={x:anchor.x+(rest.x-anchor.x)*back,y:anchor.y+(rest.y-anchor.y)*back};
 if(this.wAction!==a){this.wAction=a;this.wRope=new QFlowRope(low[0],end,p.dir)}const tension=a.locked?poseSmooth((a.t-.32)/.12)*(1-poseSmooth((a.t-.77)/.22)):0;this.wRope.update(dt,low[0],end,a.t,false,55*(1-tension)+8*tension);this.wWrap=[];
 if(a.locked&&a.t<.91){const wind=poseSmooth((a.t-.28)/.12)*(1-poseSmooth((a.t-.8)/.11)),turn=wind*Math.PI*6;for(let i=1;i<=96;i++){const f=i/96,angle=turn*f,r=32+Math.sin(a.t*15-f*7)*2*wind;this.wWrap.push({x:a.tx-a.dir*r*Math.cos(angle),y:-a.ty-105+80*angle/(Math.PI*6)+Math.sin(angle)*8})}}this.wPoints=[...this.wRope.nodes,...this.wWrap];
 }else{this.wRope=null;this.wAction=null;this.wWrap=[];this.wPoints=null}
 if(g.a?.k==='r'&&g.a.phase!=='plunge'){
 const a=g.a,free=normalArm(pose,false).hand,roots=[low[0],pt(free.x,free.y)];
 if(this.rAction!==a){this.rAction=a;this.rRopes=roots.map((root,end)=>{if(end===0&&incomingW){incomingW.history=[];return incomingW}return new QFlowRope(root,ropeRTip(a,a.t,end),p.dir)})}
 this.rRopes.forEach((rope,end)=>rope.update(dt,roots[end],ropeRTip(a,a.t,end),a.t,false,25+25*(.5+.5*Math.sin(a.t*2*Math.PI/rSwingPeriod+end*Math.PI))));
 this.rRope=this.rRopes[0];
 }else{this.rRope=null;this.rRopes=null;this.rAction=null}

 if(g.a?.k==='q'){const tip=ropeQTip(g.a,g.a.t);if(this.qAction!==g.a){this.qAction=g.a;this.qRope=new QFlowRope(low[0],tip,p.dir)}this.qRope.update(dt,low[0],tip,g.a.t)}else{this.qRope=null;this.qAction=null}

 }
 points(){return [...this.low.nodes.slice().reverse(),...this.high.nodes.slice(1)]}
}
'use strict';
// One coherent, feathered ribbon per cached atlas. Nested translucent shells
// soften the entire contour at load time; animation only composites images.
function bakeUltimateEdge(createCanvas,detail=false){
 const canvas=createCanvas();canvas.width=512;canvas.height=256;const c=canvas.getContext('2d'),gradient=c.createLinearGradient(-40,280,515,24);
 gradient.addColorStop(0,'#68258c00');gradient.addColorStop(.17,detail?'#ad67d9a0':'#843cafcc');gradient.addColorStop(.43,detail?'#c08be5b0':'#a05bcab8');gradient.addColorStop(.7,detail?'#a866d64a':'#8646b25e');gradient.addColorStop(1,'#75349500');c.fillStyle=gradient;
 const center=u=>{const v=1-u,offset=detail?-12:0;return {x:v*v*v*(-100)+3*v*v*u*5+3*v*u*u*265+u*u*u*550,y:v*v*v*330+3*v*v*u*(244+offset)+3*v*u*u*(165+offset)+u*u*u*5}};
 const samples=40,layers=24;
 for(let layer=0;layer<layers;layer++){
  const q=layer/(layers-1),spread=1-q*.9,left=[],right=[];
  for(let i=0;i<=samples;i++){const u=i/samples,p=center(u),prev=center(Math.max(0,u-.001)),next=center(Math.min(1,u+.001)),dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,w=(detail?31:86)*spread*Math.pow(1-u,.68)*(.65+.35*Math.sin(Math.PI*u));left.push({x:p.x-dy/len*w,y:p.y+dx/len*w});right.push({x:p.x+dy/len*w,y:p.y-dx/len*w})}
  const edge=[...left,...right.reverse()];c.globalAlpha=.045+.025*q;c.beginPath();c.moveTo(edge[0].x,edge[0].y);
  for(let i=0;i<edge.length;i++){const a=edge[(i-1+edge.length)%edge.length],b=edge[i],d=edge[(i+1)%edge.length],e=edge[(i+2)%edge.length];c.bezierCurveTo(b.x+(d.x-a.x)/6,b.y+(d.y-a.y)/6,d.x-(e.x-b.x)/6,d.y-(e.y-b.y)/6,d.x,d.y)}c.closePath();c.fill();
 }
 c.globalAlpha=1;return canvas;
}
class UltimateFrameEffect{
 constructor(createCanvas=()=>document.createElement('canvas')){this.base=bakeUltimateEdge(createCanvas);this.wisps=bakeUltimateEdge(createCanvas,true);this.reset()}
 reset(){this.opacity=0;this.clock=0;this.active=false;this.lastGameTime=-1}
 update(dt,g){
  if(g.t<this.lastGameTime||g.p.hp<=0){this.reset();this.lastGameTime=g.t;return}
  this.lastGameTime=g.t;const active=g.a?.k==='r';if(active&&!this.active)this.clock=0;
  this.active=active;if(active||this.opacity>0)this.clock+=dt;
  this.opacity=active?Math.min(1,this.opacity+dt/.16):Math.max(0,this.opacity-dt/.16);
 }
 draw(c,width,height,star,low=false){
  if(this.opacity<=0)return;const alpha=this.opacity*this.opacity*(3-2*this.opacity),w=Math.min(width*.43,640),h=Math.min(height*.62,310),t=this.clock;
  c.save();c.beginPath();c.rect(0,0,width,height);c.clip();
  for(let corner=0;corner<2;corner++){
   c.save();if(corner){c.translate(width,height);c.scale(-1,-1)}
   const flow=Math.sin(t*.85+corner*.6),breathe=.94+.06*Math.sin(t*1.15+corner*.5);
   c.globalAlpha=alpha*.94*breathe;c.drawImage(this.base,-10+flow*4,height-h,w,h);
   if(!low){c.globalAlpha=alpha*(.3+.055*Math.sin(t*1.2+corner*.5));c.drawImage(this.wisps,-10+flow*4,height-h+flow*1.5,w,h)}
   const count=low?1:3;
   for(let i=0;i<count;i++){
    const u=(t*.16+i/count+corner*.37)%1,life=Math.sin(Math.PI*u)**2,x=w*(.04+.78*u),y=height-h*(.04+.72*u)+Math.sin(t*.9+i)*3,size=4+2*Math.sin(i*2.4)**2;
    c.globalAlpha=alpha*life*(.4+.15*Math.sin(t*2+i)**2);c.drawImage(star,x-size,y-size,size*2,size*2);
   }
   c.restore();
  }
  c.restore();
 }
}
'use strict';
const FinisherRigClass=typeof module!=='undefined'?require('./rig.js').MelantaRig:MelantaRig;
const FinisherRopeClass=typeof module!=='undefined'?require('./rig.js').QFlowRope:QFlowRope;
const finisherRigPoint=typeof module!=='undefined'?require('./rig.js').rigPoint:rigPoint;
const finisherTorsoPoint=typeof module!=='undefined'?require('./rig.js').torsoLocalPoint:torsoLocalPoint;
const finishEase=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
function finisherTimeline(t){return {alpha:finishEase((t-.10)/.12)*(1-finishEase((t-1.70)/.15)),veil:t<.10?finishEase(t/.10):t<1.85?1:1-finishEase((t-1.85)/.15),strike:finishEase((t-.84)/.36),flash:Math.max(0,1-Math.abs(t-1.20)/.065)}}
function finishArm(pose,front){
 const shoulder=finisherTorsoPoint(pose,front?13:-13,front?-119:-117),wanted=front?{x:pose.handX,y:pose.handY}:{x:pose.freeX,y:pose.freeY},dx=wanted.x-shoulder.x,dy=wanted.y-shoulder.y,len=Math.hypot(dx,dy)||1,l1=25,l2=26,d=Math.max(3,Math.min(l1+l2-.2,len)),nx=dx/len,ny=dy/len,along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along)),side=front?1:-1;
 return {cinematic:true,shoulder,elbow:{x:shoulder.x+nx*along-ny*bend*side,y:shoulder.y+ny*along+nx*bend*side},hand:{x:shoulder.x+nx*d,y:shoulder.y+ny*d}};
}
function finisherPose(t){
 const frames=[{t:0,torso:-.025,hip:0,shift:0,handX:31,handY:-113,freeX:-32,freeY:-106},{t:.26,torso:-.07,hip:-.025,shift:-1,handX:18,handY:-139,freeX:-34,freeY:-119},{t:.66,torso:-.13,hip:-.04,shift:-3,handX:-4,handY:-159,freeX:-30,freeY:-124},{t:.76,torso:-.11,hip:-.03,shift:-2,handX:-3,handY:-158,freeX:-31,freeY:-121},{t:.94,torso:.07,hip:.02,shift:1,handX:33,handY:-135,freeX:-36,freeY:-112},{t:1.16,torso:.20,hip:.05,shift:4,handX:48,handY:-106,freeX:-31,freeY:-105},{t:1.35,torso:.15,hip:.035,shift:3,handX:36,handY:-87,freeX:-26,freeY:-110},{t:1.7,torso:.075,hip:.015,shift:1,handX:31,handY:-98,freeX:-26,freeY:-114},{t:2,torso:.075,hip:.015,shift:1,handX:31,handY:-98,freeX:-26,freeY:-114}];
 let i=0;while(i<frames.length-2&&t>frames[i+1].t)i++;const a=frames[i],b=frames[i+1],u=finishEase((t-a.t)/(b.t-a.t)),mix=k=>a[k]+(b[k]-a[k])*u;
 const p={phase:0,gaitMix:0,airWeight:0,normalWeight:1,plantWeight:1,bob:0,shift:mix('shift'),torso:mix('torso'),hipRoll:mix('hip'),rot:mix('torso')*.10,handX:mix('handX'),handY:mix('handY'),freeX:mix('freeX'),freeY:mix('freeY'),qFold:0};p.armJoints={front:finishArm(p,true),back:finishArm(p,false)};return p;
}
function finisherTip(t,end=0){
 const wind=finishEase((t-.12)/.58),u=finishEase((t-.84)/.36),settle=finishEase((t-1.20)/.45);
 if(end)return {x:-69-14*wind+24*finishEase((t-.98)/.40),y:-73-20*wind+15*finishEase((t-1.05)/.45)};
 const x0=142-70*wind,y0=-108-87*wind,h=1-u;
 return {x:h*h*h*x0+3*h*h*u*220+3*h*u*u*275+u*u*u*205-42*settle,y:h*h*h*y0+3*h*h*u*(-203)+3*h*u*u*(-86)+u*u*u*(-28)-15*settle};
}
function finisherCamera(t){return {zoom:3.1-.60*finishEase((t-.12)/.5)+.5*finishEase((t-.94)/.42),x:.29,y:.98,pitch:.22,yaw:.24}}
// Slightly elevated camera on the leading dart side. The hero plane uses
// this same affine projection; depth grows along each rope from its wrist.
const FINISH_VIEW={pitch:.22,yaw:.24};
function projectFinisherPoint(p,depth=0){const cy=Math.cos(FINISH_VIEW.yaw),sy=Math.sin(FINISH_VIEW.yaw),cp=Math.cos(FINISH_VIEW.pitch),sp=Math.sin(FINISH_VIEW.pitch),perspective=1+depth/360;return {x:(p.x*cy-depth*sy)*perspective,y:(p.y*cp+(p.x*sy+depth*cy)*sp)*perspective}}
function projectFinisherWeapon(curves,blades,bridge){const view=curves.map((curve,end)=>curve.map((p,i)=>projectFinisherPoint(p,(end?-18:70)*Math.pow(i/(curve.length-1),1.2)))),joined=bridge.map((p,i)=>projectFinisherPoint(p,5*Math.sin(i/(bridge.length-1)*Math.PI)));
 const projectedBlades=blades.map((b,end)=>{const depth=end?-18:70,tip=view[end].at(-1),direction=projectFinisherPoint({x:Math.cos(b.angle),y:Math.sin(b.angle)}),perspective=1+depth/360;return {...b,x:tip.x,y:tip.y,angle:Math.atan2(direction.y,direction.x),scale:b.scale*perspective}});
 return {curves:view,bridge:joined,blades:projectedBlades,fullCurve:[...view[1].slice().reverse(),...joined.slice(1),...view[0].slice(1)]};
}
function joinFinisherGrips(back,front){const points=[];for(let i=0;i<=24;i++){const u=i/24,v=1-u;points.push({x:v*v*v*back.x+3*v*v*u*(back.x-12)+3*v*u*u*(front.x-14)+u*u*u*front.x,y:v*v*v*back.y+3*v*v*u*(back.y+42)+3*v*u*u*(front.y+48)+u*u*u*front.y})}return points}
function softenFinisherRope(nodes){let points=nodes.map(p=>({x:p.x,y:p.y}));for(let pass=0;pass<6;pass++){const old=points;points=old.map((p,i)=>i===0||i===old.length-1?p:{x:(old[i-1].x+2*p.x+old[i+1].x)/4,y:(old[i-1].y+2*p.y+old[i+1].y)/4})}return points}
function bakeFinisherBackdrop(create){const canvas=create();canvas.width=960;canvas.height=400;const c=canvas.getContext('2d'),g=c.createLinearGradient(0,400,960,0);g.addColorStop(0,'#160e22');g.addColorStop(.5,'#30203f');g.addColorStop(1,'#492455');c.fillStyle=g;c.fillRect(0,0,960,400);
 const light=c.createRadialGradient(680,95,0,680,95,370);light.addColorStop(0,'#b872cb55');light.addColorStop(1,'#a357cc00');c.fillStyle=light;c.fillRect(0,0,960,400);
 for(let i=0;i<11;i++){const x=-380+i*135,w=16+i%3*20;c.fillStyle=i%3?'#100b1f35':'#87549320';c.beginPath();c.moveTo(x,410);c.bezierCurveTo(x+260,245,x+460,100,x+700,-15);c.lineTo(x+700+w,-15);c.bezierCurveTo(x+440,155,x+270,310,x+w,410);c.closePath();c.fill()}
 return canvas;
}
class FinisherScene{
 constructor(create=()=>document.createElement('canvas')){this.background=bakeFinisherBackdrop(create);this.layer=create();this.layer.width=this.layer.height=1;this.rig=new FinisherRigClass();this.reset()}
 reset(){this.action=null;this.actor=null;this.pose=null;this.ropes=null;this.curves=null;this.blades=null;this.bridge=null;this.view=null;this.history=[];this.sampleAt=-1;this.lastTip=null;this.tipSpeed=0;this.rig.reset()}
 update(dt,f){if(!f||f.t>=f.duration)return;if(this.action!==f){this.reset();this.action=f;this.actor={t:0,p:{x:0,y:0,vx:0,vy:0,dir:1,hp:1500},a:null}}
 const g=this.actor;g.t=f.t;this.pose=finisherPose(f.t);this.rig.update(dt,g,this.pose);
 const backHand=this.pose.armJoints.back.hand,backRoot=finisherRigPoint(g.p,this.pose,g.t,backHand.x,backHand.y),roots=[this.rig.low.nodes[0],backRoot];
 if(!this.ropes){this.ropes=roots.map((root,end)=>new FinisherRopeClass(root,finisherTip(f.t,end),1));for(const n of this.ropes[0].nodes){const u=this.ropes[0].nodes.indexOf(n)/28;n.y-=Math.sin(u*Math.PI)*75}}
 const tension=finishEase((f.t-.80)/.12)*(1-finishEase((f.t-1.19)/.18));this.ropes.forEach((rope,end)=>rope.update(dt,roots[end],finisherTip(f.t,end),f.t,false,end?55:46-33*tension));this.curves=this.ropes.map(rope=>softenFinisherRope(rope.nodes));
 if(!this.blades)this.blades=this.curves.map((curve,end)=>{const tip=curve.at(-1),prev=curve.at(-2);return {x:tip.x,y:tip.y,angle:Math.atan2(tip.y-prev.y,tip.x-prev.x),velocity:0,scale:end?.85:1.6}});
 this.curves.forEach((curve,end)=>{const tip=curve.at(-1),prev=curve.at(-2),b=this.blades[end],target=Math.atan2(tip.y-prev.y,tip.x-prev.x),delta=Math.atan2(Math.sin(target-b.angle),Math.cos(target-b.angle)),omega=16;b.velocity+=(delta*omega*omega-2*.9*omega*b.velocity)*dt;b.velocity=Math.max(-12,Math.min(12,b.velocity));b.angle+=b.velocity*dt;b.x=tip.x;b.y=tip.y});
 this.bridge=joinFinisherGrips(this.curves[1][0],this.curves[0][0]);this.view=projectFinisherWeapon(this.curves,this.blades,this.bridge);
 const tip=this.blades[0];this.tipSpeed=this.lastTip?Math.hypot(tip.x-this.lastTip.x,tip.y-this.lastTip.y)/dt:0;this.lastTip={x:tip.x,y:tip.y};
 if(f.t-this.sampleAt>=1/60-1e-8){this.sampleAt=f.t;this.history.push({t:f.t,view:this.view,curves:this.curves.map(curve=>curve.map(p=>({...p}))),blades:this.blades.map(b=>({...b}))})}while(this.history.length>14||this.history.length&&f.t-this.history[0].t>.16)this.history.shift();
 }
}
let ctx,game,rig,ultFrame,finisherScene;
let W=1600,H=1120,ground=930,fps=60,time=0;
const ghosts=[];let dashGhosts;
const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d'),gr=gc.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#d99bff70');gr.addColorStop(.3,'#ac58dd28');gr.addColorStop(1,'#9c45d500');gc.fillStyle=gr;gc.fillRect(0,0,128,128);
function halo(x,y,r,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(glow,x-r,y-r,r*2,r*2);ctx.restore()}
// Cached soft fog; two layers envelop the target without covering its silhouette.
const mist=document.createElement('canvas');mist.width=mist.height=128;const mc=mist.getContext('2d'),mg=mc.createRadialGradient(64,64,0,64,64,64);mg.addColorStop(0,'#cf94ed99');mg.addColorStop(.35,'#a34edb55');mg.addColorStop(.7,'#782dbb22');mg.addColorStop(1,'#782dbb00');mc.fillStyle=mg;mc.fillRect(0,0,128,128);
function stunMist(e,front=false){if(e.stun<=0)return;const elapsed=game.t-e.stunStartedAt,alpha=smooth(elapsed/.10)*smooth(e.stun/.18);ctx.save();ctx.globalAlpha*=alpha*(front?.62:1);for(let i=0;i<9;i++){const phase=elapsed*1.7+i*2.399,side=i%2?1:-1,x=e.x+side*(15+Math.sin(phase)*16),y=ground-e.y-24-i*17+Math.sin(phase*.8)*9,rx=42+Math.sin(phase+1)*8,ry=36+Math.cos(phase)*8;ctx.drawImage(mist,x-rx,y-ry,rx*2,ry*2)}ctx.restore();if(front){ctx.save();ctx.globalAlpha=alpha*.85;ctx.fillStyle='#ebc5ff';ctx.textAlign='center';ctx.font='500 14px system-ui';ctx.fillText('CHOÁNG',e.x,ground-e.y-188);ctx.restore()}}
// Baked once: no live blur, shadow filter, gradient allocation or per-hit particles.
const healStar=document.createElement('canvas');healStar.width=healStar.height=32;const hc=healStar.getContext('2d');hc.drawImage(glow,0,0,32,32);hc.fillStyle='#f6dcff';hc.beginPath();hc.moveTo(16,3);hc.quadraticCurveTo(18,14,29,16);hc.quadraticCurveTo(18,18,16,29);hc.quadraticCurveTo(14,18,3,16);hc.quadraticCurveTo(14,14,16,3);hc.fill();
function rHealingMist(front=false){const v=game.rHealVisual,p=game.p;if(!v||p.hp<=0)return;
 const age=game.t-v.since,hitAge=game.t-v.lastAt,fade=smooth(age/.12)*smooth((v.until-game.t)/.3),pulse=.78+.22*Math.exp(-hitAge*9),low=fps<45,count=front?(low?1:2):(low?2:3);ctx.save();
 for(let i=0;i<count;i++){const phase=game.t*1.8+i*2.4+(front?1:0),x=p.x+Math.sin(phase)*23,y=ground-p.y-38-i*(front?62:43)+Math.cos(phase*.8)*8,rx=40+Math.sin(phase)*6,ry=35+Math.cos(phase)*6;ctx.globalAlpha=fade*pulse*(front?.17:.32);ctx.drawImage(mist,x-rx,y-ry,rx*2,ry*2)}
 if(front){const count=low?3:6;for(let i=0;i<count;i++){const u=(game.t*.66+i/count)%1,x=p.x+Math.sin(i*2.399+u*2)*31,y=ground-p.y-18-u*145,size=5+Math.sin(i*1.7)**2*3;ctx.globalAlpha=fade*Math.sin(Math.PI*u)**2*.8;ctx.drawImage(healStar,x-size,y-size,size*2,size*2)}ctx.globalAlpha=fade*(1-smooth(hitAge/.55));ctx.fillStyle='#edc1ff';ctx.font='500 15px system-ui';ctx.textAlign='center';ctx.fillText('+'+v.amount,p.x,ground-p.y-180-hitAge*28)}ctx.restore()
}
function path(points,color,width=3,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore()}
function ribbon(points,alpha=1,width=2.7){path(points,'#b25adc',width+11,alpha*.075);path(points,'#d58aef',width+5,alpha*.12);path(points,'#edb7fa',width,alpha);path(points,'#ffefff',.8,alpha*.8)}
function blade(x,y,angle,alpha=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(.68,.68);ctx.globalAlpha*=alpha;halo(0,0,49,.5);ctx.fillStyle='#f3cbff';ctx.beginPath();BLADE_OUTLINE.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.restore()}
function limb(a,b,c,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo(...b,...c);ctx.stroke()}
// Outline traced in the reference's own 591 × 603 coordinate system.
// Keep the original proportions; animation deforms the limbs around their joints.
const MELANTA_PATHS={
 upper:new Path2D('M 275 216 C 260 206 251 187 249 167 C 247 143 258 128 282 126 C 300 124 325 128 332 141 C 340 157 335 188 323 209 C 325 216 334 218 340 224 C 350 232 354 249 347 265 C 345 274 338 279 334 282 L 343 310 C 335 321 316 326 293 323 C 271 326 251 320 239 311 L 234 323 C 230 333 226 338 220 336 C 212 333 216 323 220 315 L 237 270 C 240 250 247 232 260 226 Z'),
 hip:new Path2D('M 247 293 C 268 285 318 285 337 294 C 345 314 352 342 353 365 C 344 385 322 389 303 378 C 285 388 264 386 250 370 C 243 349 239 325 247 293 Z'),
 left:new Path2D('M 250 349 C 245 371 257 408 263 440 L 276 506 C 278 520 282 526 290 524 C 299 525 302 508 303 495 L 307 378 C 289 356 272 348 250 349 Z'),
 right:new Path2D('M 299 352 C 306 384 321 418 337 453 C 351 483 368 510 386 521 C 396 527 402 523 396 509 C 385 476 376 440 366 404 L 348 344 Z')
};
function drawWalkingLeg(phase,side,mix,bob,fold=0,pose={}){let outline=walkLegOutline(phase,side,mix,bob);if(pose.dance){const v=walkLegVolume(danceLeg(pose,side),0);outline=resampleOutline([...v.left,...v.right.slice().reverse()],100)}if(pose.airWeight>0){const air=airLegOutline(pose,side);outline=outline.map((p,i)=>({x:p.x+(air[i].x-p.x)*pose.airWeight,y:p.y+(air[i].y-p.y)*pose.airWeight}))}if(fold>0){const leg=pose.eFlip?airLeg({airState:{tuck:1.12,travel:0,land:0}},side):walkLeg(0,side,1);if(!pose.eFlip){leg.hip={x:side?10:-9,y:-65};leg.knee={x:side?25:-15,y:-45};leg.foot={x:side?15:-29,y:-18}}const v=walkLegVolume(leg,0),air=resampleOutline([...v.left,...v.right.slice().reverse()],100);outline=outline.map((p,i)=>({x:p.x+(air[i].x-p.x)*fold,y:p.y+(air[i].y-p.y)*fold}))}if((pose.plantWeight??pose.normalWeight??0)>0){outline=outline.map(p=>{const w=clamp((p.y+68)/68,0,1)*(pose.plantWeight??pose.normalWeight??0);return {x:p.x-(pose.shift||0)*w,y:p.y-bob*w}})}ctx.beginPath();ctx.moveTo(outline[0].x,outline[0].y);for(let i=0;i<outline.length;i++){const a=outline[(i-1+outline.length)%outline.length],b=outline[i],c=outline[(i+1)%outline.length],d=outline[(i+2)%outline.length];ctx.bezierCurveTo(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,c.y-(d.y-b.y)/6,c.x,c.y)}ctx.closePath();ctx.fill()}
const MELANTA_TRUNK=new Path2D('M 275 216 C 260 206 251 187 249 167 C 247 143 258 128 282 126 C 300 124 325 128 332 141 C 340 157 335 188 323 209 C 325 216 334 218 337 225 C 335 242 328 261 331 282 L 343 310 C 335 321 316 326 293 323 C 271 326 251 320 239 311 C 246 288 247 266 251 248 C 253 236 260 226 275 216 Z');
function articulatedArm(arm){if(arm.cinematic){const a=arm.shoulder,b=arm.elbow,c=arm.hand;ctx.save();ctx.strokeStyle=ctx.fillStyle;ctx.lineCap='round';ctx.lineWidth=9.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.lineWidth=7.8;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.beginPath();ctx.arc(c.x,c.y,3,0,Math.PI*2);ctx.fill();ctx.restore();return}const a=arm.shoulder,b=arm.elbow,c=arm.hand,left=[],right=[];for(let i=0;i<=20;i++){const u=i/20,h=1-u,x=h*h*a.x+2*h*u*b.x+u*u*c.x,y=h*h*a.y+2*h*u*b.y+u*u*c.y,dx=2*h*(b.x-a.x)+2*u*(c.x-b.x),dy=2*h*(b.y-a.y)+2*u*(c.y-b.y),d=Math.hypot(dx,dy)||1,w=6.4-2.5*u;left.push({x:x-dy/d*w,y:y+dx/d*w});right.push({x:x+dy/d*w,y:y-dx/d*w})}const edge=[...left,...right.reverse()];ctx.beginPath();ctx.moveTo(edge[0].x,edge[0].y);for(let i=1;i<edge.length;i++){const p=edge[i],n=edge[(i+1)%edge.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2)}ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(c.x,c.y,3.9,0,Math.PI*2);ctx.fill()}
function melantaSilhouette(x,y,dir,pose,alpha){ctx.save();ctx.translate(x,ground-y);const size=modelSize;ctx.scale(size,size);ctx.scale(dir*(pose.turnScale??1),1);ctx.translate(0,pose.pivotY||0);ctx.rotate(pose.rot||0);ctx.translate(0,-(pose.pivotY||0));ctx.translate(pose.shift||0,pose.bob??Math.sin(game.t*3)*2);ctx.fillStyle='#5f2d7d';ctx.globalAlpha*=alpha;const sides=Math.sin(pose.phase)<0?[1,0]:[0,1];for(const side of sides)drawWalkingLeg(pose.phase||0,side,pose.gaitMix||0,pose.bob||0,pose.qFold||0,pose);articulatedArm(normalArm(pose,false));ctx.save();ctx.scale(.4,.4);ctx.translate(-300,-523);ctx.save();ctx.translate(298,337);ctx.rotate(pose.hipRoll||0);ctx.translate(-298,-337);ctx.fill(MELANTA_PATHS.hip);ctx.restore();ctx.translate(300,303);ctx.rotate(pose.torso||0);ctx.translate(-300,-303);ctx.fill(MELANTA_TRUNK);ctx.restore();articulatedArm(normalArm(pose,true));ctx.restore()}
function fighter(x,y,dir,pose={},alpha=1,enemy=false){if(!enemy){melantaSilhouette(x,y,dir,pose,alpha);return}ctx.save();ctx.translate(x,ground-y);ctx.scale(dir,1);ctx.globalAlpha*=alpha;ctx.rotate(pose.rot||0);const t=game.t,speed=pose.run||0,bob=Math.sin(t*3)*2,step=Math.sin(t*12)*speed;ctx.translate(0,bob);const col=enemy?'#b6afbf':'#613080',light=enemy?'#c9c2d1':'#613080';
 if(enemy){limb([-10,-73],[-18-step*18,-39],[-22-step*30,-4],18,col);limb([9,-73],[19+step*18,-38],[24+step*28,-3],18,col)}else{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-21,-85);ctx.bezierCurveTo(-24,-65,-15-step*18,-14,-11-step*27,-3);ctx.quadraticCurveTo(-4-step*27,6,1-step*27,-6);ctx.lineTo(6,-63);ctx.bezierCurveTo(16,-36,30+step*22,-8,43+step*25,-2);ctx.quadraticCurveTo(52+step*25,2,47+step*25,-11);ctx.lineTo(23,-84);ctx.closePath();ctx.fill()}
 ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-14,-132);ctx.bezierCurveTo(-24,-116,-21,-100,-17,-87);ctx.quadraticCurveTo(-34,-66,-10,-63);ctx.bezierCurveTo(9,-56,31,-64,20,-87);ctx.bezierCurveTo(15,-104,21,-120,8,-131);ctx.closePath();ctx.fill();
 ctx.save();ctx.translate(0,-148);ctx.rotate(Math.sin(t*2)*.035);ctx.fillStyle=light;ctx.beginPath();ctx.ellipse(0,0,enemy?17:20,enemy?24:27,-.12,0,Math.PI*2);ctx.fill();ctx.restore();
 const a=pose.arm||0;if(enemy){limb([-13,-123],[-29,-101],[-29,-85],12,col);limb([12,-123],[29,-105],[27,-88],12,light)}else{limb([-13,-123],[-22,-105],[-24-a*9,-91-a*14],12,col);limb([12,-123],[24+a*12,-119-a*10],[23+a*54,-132-a*15],12,light);}
 ctx.restore()}
function curveStroke(points,color,width){if(points.length<2)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0].x,ground+points[0].y);for(let i=1;i<points.length-1;i++){const p=points[i],next=points[i+1];ctx.quadraticCurveTo(p.x,ground+p.y,(p.x+next.x)/2,ground+(p.y+next.y)/2)}const end=points.at(-1);ctx.lineTo(end.x,ground+end.y);ctx.stroke();ctx.restore()}
const HAIR_CAP=new Path2D('M 295 126 C 300 102 279 76 251 80 C 214 83 204 115 202 150 C 201 164 199 177 196 190 L 234 192 C 240 158 242 139 267 132 C 278 128 284 127 295 126 Z');
function drawHair(volume=hairVolume(rig),p=game.p,pose=playerPose(game)){if(!volume)return;const pts=[...volume.left,...volume.right.slice().reverse()];ctx.fillStyle='#5f2d7d';ctx.beginPath();ctx.moveTo(pts[0].x,ground+pts[0].y);for(let i=0;i<pts.length;i++){const a=pts[(i-1+pts.length)%pts.length],b=pts[i],c=pts[(i+1)%pts.length],d=pts[(i+2)%pts.length];ctx.bezierCurveTo(b.x+(c.x-a.x)/6,ground+b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,ground+c.y-(d.y-b.y)/6,c.x,ground+c.y)}ctx.closePath();ctx.fill();ctx.save();ctx.translate(p.x,ground-p.y);const size=modelSize;ctx.scale(size,size);ctx.scale(p.dir*(pose.turnScale??1),1);ctx.translate(0,pose.pivotY||0);ctx.rotate(pose.rot||0);ctx.translate(0,-(pose.pivotY||0));ctx.translate(pose.shift||0,pose.bob??Math.sin(game.t*3)*2);ctx.scale(.4,.4);ctx.translate(-300,-523);ctx.translate(300,303);ctx.rotate(pose.torso||0);ctx.translate(-300,-303);ctx.fill(HAIR_CAP);ctx.restore()}
function smoothFill(points){if(points.length<3)return;ctx.beginPath();ctx.moveTo(points[0].x,ground+points[0].y);for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[Math.min(points.length-1,i+1)],d=points[Math.min(points.length-1,i+2)];ctx.bezierCurveTo(b.x+(c.x-a.x)/6,ground+b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,ground+c.y-(d.y-b.y)/6,c.x,ground+c.y)}ctx.closePath();ctx.fill()}
function drawQEnergy(rope,a){if(a.t<.42||a.t>.98)return;const grow=smooth((a.t-.42)/.1),fade=1-smooth((a.t-.76)/.22),power=grow*fade;if(power<=0)return;
 // The broad afterimage follows only previous blade positions. Its newest
 // vertex is the very same endpoint as the visible weapon, never a fan origin.
 const trail=qTrailSamples(a,a.t),left=[],right=[];trail[trail.length-1]={...rope.at(-1),age:0};for(let i=0;i<trail.length;i++){const p=trail[i],prev=trail[Math.max(0,i-1)],next=trail[Math.min(trail.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,u=i/(trail.length-1),width=(Math.sin(Math.PI*u)*27+u*2)*power;left.push({x:p.x-dy/len*width,y:p.y+dx/len*width});right.push({x:p.x+dy/len*width,y:p.y-dx/len*width})}
 const oldest=trail[0],end=rope.at(-1);ctx.save();const g=ctx.createLinearGradient(oldest.x,ground+oldest.y,end.x,ground+end.y);g.addColorStop(0,'#a159d500');g.addColorStop(.45,'#bb70e45a');g.addColorStop(.85,'#e6affbba');g.addColorStop(1,'#fff0ff');ctx.fillStyle=g;ctx.globalAlpha=.8*power;smoothFill([...left,...right.slice().reverse()]);ctx.restore();
 // Successive cable poses fade behind the current curve, preserving its wave.
 if(rig.qRope){const h=rig.qRope.history;for(let i=Math.max(0,h.length-18);i<h.length-1;i+=4){const age=a.t-h[i].t,opacity=Math.max(0,1-age/.16)*.10*power;ctx.save();ctx.globalAlpha=opacity;curveStroke(h[i].points,'#cf8fee',9);ctx.restore()}}
 // Soft energy on the rope itself shares every curve sample with the weapon.
 const first=Math.floor(rope.length*.42),segment=rope.slice(first);for(let layer=0;layer<3;layer++){const l=[],r=[];for(let i=0;i<segment.length;i++){const p=segment[i],prev=segment[Math.max(0,i-1)],next=segment[Math.min(segment.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,u=i/(segment.length-1),width=(1+Math.sin(Math.PI*u)*((3-layer)*5)+u*3)*power;l.push({x:p.x-dy/len*width,y:p.y+dx/len*width});r.push({x:p.x+dy/len*width,y:p.y-dx/len*width})}ctx.save();ctx.globalAlpha=(.10+layer*.09)*power;ctx.fillStyle=['#ad57d8','#dc9bf5','#f8dcff'][layer];smoothFill([...l,...r.reverse()]);ctx.restore()}halo(end.x,ground+end.y,50,power*.85)
}
function drawNormalEnergy(rope,a){const power=smooth((a.t-.075)/.055)*(1-smooth((a.t-.34)/.14));if(power<=0)return;const trail=attackTrailSamples(a,a.t);trail[trail.length-1]={...rope.at(-1)};const left=[],right=[];for(let i=0;i<trail.length;i++){const p=trail[i],prev=trail[Math.max(0,i-1)],next=trail[Math.min(trail.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,u=i/(trail.length-1),w=(Math.sin(u*Math.PI)*(a.n===3?21:15)+u*1.5)*power;left.push({x:p.x-dy/len*w,y:p.y+dx/len*w});right.push({x:p.x+dy/len*w,y:p.y-dx/len*w})}ctx.save();ctx.globalAlpha=.55*power;const first=trail[0],end=rope.at(-1),g=ctx.createLinearGradient(first.x,ground+first.y,end.x,ground+end.y);g.addColorStop(0,'#ac5bdb00');g.addColorStop(.65,'#d494f0a0');g.addColorStop(1,'#ffe9ff');ctx.fillStyle=g;smoothFill([...left,...right.reverse()]);ctx.restore();const h=rig.normalRope?.history||[];for(let i=Math.max(0,h.length-14);i<h.length-1;i+=4){ctx.save();ctx.globalAlpha=.08*power*Math.max(0,1-(a.t-h[i].t)/.12);curveStroke(h[i].points,'#dba2f3',7);ctx.restore()}ctx.save();ctx.globalAlpha=.18*power;curveStroke(rope,'#ce8cf1',12);ctx.restore();halo(end.x,ground+end.y,38,power*.65)}
function rBladeAngle(a,t,end){const before=rTip(a,Math.max(0,t-.006),end),after=rTip(a,Math.min(4,t+.006),end);return Math.atan2(after.y-before.y,after.x-before.x)-.3}
function drawREnergy(sim,a,endIndex){const rope=sim.nodes;if(rope.length<2)return;const power=smooth(a.t/.15)*(1-smooth((a.t-3.9)/.1)),trail=[];
 for(let i=0;i<=36;i++){const t=Math.max(0,a.t-.14*(1-i/36));trail.push(rTip(a,t,endIndex))}trail[trail.length-1]={...rope.at(-1)};
 const left=[],right=[];for(let i=0;i<trail.length;i++){const prev=trail[Math.max(0,i-1)],next=trail[Math.min(trail.length-1,i+1)],p=trail[i],dx=next.x-prev.x,dy=next.y-prev.y,d=Math.hypot(dx,dy)||1,w=Math.sin(Math.PI*i/(trail.length-1))*14;left.push({x:p.x-dy/d*w,y:p.y+dx/d*w});right.push({x:p.x+dy/d*w,y:p.y-dx/d*w})}
 ctx.save();ctx.globalAlpha=.5*power;const start=trail[0],end=rope.at(-1),g=ctx.createLinearGradient(start.x,ground+start.y,end.x,ground+end.y);g.addColorStop(0,'#9c48dc00');g.addColorStop(.65,'#c578e9aa');g.addColorStop(1,'#f4cdff');ctx.fillStyle=g;smoothFill([...left,...right.reverse()]);ctx.restore();
 // Timestamped physics snapshots retain both blade shapes and entire rope poses.
 for(const delay of [.14,.10,.065,.032]){let sample;for(let i=sim.history.length-1;i>=0;i--){if(sim.history[i].t<=a.t-delay){sample=sim.history[i];break}}if(!sample)continue;
 const age=a.t-sample.t,opacity=(1-smooth(age/.19))*.26*power,tip=sample.points.at(-1);ctx.save();ctx.globalAlpha=opacity;curveStroke(sample.points,'#a956e3',6);curveStroke(sample.points,'#daa0ff',2);blade(tip.x,ground+tip.y,rBladeAngle(a,sample.t,endIndex),.8);ctx.restore()}
 ctx.save();ctx.globalAlpha=.15*power;curveStroke(rope,'#bd6bf3',12);ctx.restore();halo(end.x,ground+end.y,36,power*.6)
}
function drawRWeapon(a){const ropes=rig.rRopes;if(!ropes)return;const order=Math.sin(a.t*2*Math.PI/R_SWING_PERIOD)>=0?[0,1]:[1,0];
 for(const end of order)drawREnergy(ropes[end],a,end);
 const bridge=[ropes[0].nodes[0],ropes[1].nodes[0]];curveStroke(bridge,'#bf7cda',2.5);
 for(const end of order){const rope=ropes[end].nodes,tip=rope.at(-1);curveStroke(rope,'#bc79d51c',10);curveStroke(rope,'#bf7cda',2.5);curveStroke(rope,'#ecc0fa',.65);blade(tip.x,ground+tip.y,rBladeAngle(a,a.t,end),1)}
}
function rGroundAura(a){const fade=smooth(a.t/.24)*(1-smooth((a.t-3.65)/.35));ctx.save();ctx.translate(game.p.x,ground+2);ctx.scale(1,.115);const g=ctx.createRadialGradient(0,0,0,0,0,500);g.addColorStop(0,'#ca82ed48');g.addColorStop(.42,'#af55d93a');g.addColorStop(.75,'#9e49d31c');g.addColorStop(1,'#8c3ccb00');ctx.globalAlpha=fade;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,500,0,Math.PI*2);ctx.fill();ctx.restore();for(let i=0;i<3;i++){const age=(a.t+i*.44)%1.3,u=age/1.3,r=100+390*(1-(1-u)**2),alpha=Math.sin(Math.PI*u)*fade;ctx.save();ctx.translate(game.p.x,ground);ctx.scale(1,.115);for(const [width,opacity] of [[24,.025],[12,.04],[4,.09]]){ctx.strokeStyle='#d695f4';ctx.globalAlpha=alpha*opacity;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(0,0,r,r,0,0,Math.PI*2);ctx.stroke()}ctx.restore()}}
function weapon(a){if(a?.k==='r'&&a.phase==='plunge')a=null;if(a?.k==='r'){drawRWeapon(a);return}const p=game.p,t=game.t,dir=p.dir,u=a?clamp(a.t/a.duration,0,1):0;let pts=rig.points().map(p=>({...p}));if(pts.length<3)return;
 if(a){const grip=rig.low.nodes[0],tail=rig.low.nodes.slice().reverse(),front=[];if(a.k==='attack'){const nodes=rig.normalRope?.nodes;if(nodes)for(const node of nodes)front.push({x:node.x,y:node.y});else front.push({...grip},attackTip(a,a.t))}
 else if(a.k==='q'){const nodes=rig.qRope?.nodes;if(nodes)for(const node of nodes)front.push({x:node.x,y:node.y});else front.push({...grip},qTip(a,a.t))}
 else if(a.k==='w'){if(rig.wPoints)front.push(...(a.locked&&rig.wWrap?.length?rig.wRope.nodes:rig.wPoints))}
 else if(a.k==='e'){if(rig.eRope)front.push(...rig.eRope.nodes)}
 else if(a.k==='r'){if(rig.rRope)front.push(...rig.rRope.nodes)}
 else{const amplitude=Math.sin(Math.PI*u),radius=a.k==='attack'?300:a.k==='q'?250:a.k==='e'?155:280;const phase=a.k==='q'?-2.8+smooth(u)*4.2:a.k==='e'?u*Math.PI*4:a.k==='r'?t*5:-2.4+u*5;for(let i=0;i<=80;i++){const f=i/80,r=radius*f;front.push({x:grip.x+dir*(Math.cos(phase+f*2)*r),y:grip.y+Math.sin(phase+f*2)*r*.7})}}
 // A gentle traveling bend runs along casts, rather than moving the whole
 // length as a stiff rod. Both endpoints remain exactly on their paths.
 const softened=(a.k==='q'||a.k==='attack'||a.k==='w'||a.k==='e'||a.k==='r')?front:front.map((v,i)=>{if(i===0||i===front.length-1)return v;const f=i/(front.length-1),prev=front[i-1],next=front[i+1],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,w=Math.sin(f*7-t*5)*Math.sin(f*Math.PI)*4;return {x:v.x-dy/len*w,y:v.y+dx/len*w}});
 const active=[...tail,...softened.slice(1)],rest=rig.points();const blend=a.k==='attack'?Math.min(1,a.t/.09,(a.duration-a.t)/.14):a.k==='q'?Math.min(1,a.t/.12,(a.duration-a.t)/.13):a.k==='w'?1-smooth((a.t-.97)/.08):a.k==='r'?1:Math.min(1,a.t/.17,(a.duration-a.t)/.22);pts=active.map((v,i)=>{const q=i/(active.length-1)*(rest.length-1),j=Math.floor(q),u=q-j,a=rest[j],b=rest[Math.min(j+1,rest.length-1)],base={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};return {x:base.x+(v.x-base.x)*blend,y:base.y+(v.y-base.y)*blend}})}
 if(a?.k==='q')drawQEnergy(pts,a);if(a?.k==='attack')drawNormalEnergy(pts,a);
 curveStroke(pts,'#bc79d51c',10);curveStroke(pts,'#bf7cda',2.5);curveStroke(pts,'#ecc0fa',.65);const first=pts[0],second=pts[1],end=pts.at(-1),prev=pts.at(-2);blade(first.x,ground+first.y,Math.atan2(first.y-second.y,first.x-second.x)-.3,.8);if(!(a?.k==='w'&&a.locked&&rig.wWrap?.length))blade(end.x,ground+end.y,a?.k==='attack'?attackBladePose(a,a.t).angle:Math.atan2(end.y-prev.y,end.x-prev.x)-.3,.8)
}
let backdrop=null,backdropHeight=0;
function qEnergyShard(x,y,dx,dy,width,alpha){ctx.save();ctx.globalAlpha*=alpha;const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length,bend=width*.35;const gradient=ctx.createLinearGradient(x,y,x+dx,y+dy);gradient.addColorStop(0,'#edb9ff');gradient.addColorStop(.25,'#d68df0');gradient.addColorStop(.8,'#a565ce');gradient.addColorStop(1,'#a565ce80');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(x-nx*width*.35,y-ny*width*.35);ctx.bezierCurveTo(x+dx*.2+nx*width,y+dy*.2+ny*width,x+dx*.68+nx*bend,y+dy*.68+ny*bend,x+dx,y+dy);ctx.bezierCurveTo(x+dx*.62-nx*width*.12,y+dy*.62-ny*width*.12,x+dx*.12-nx*width*.5,y+dy*.12-ny*width*.5,x-nx*width*.35,y-ny*width*.35);ctx.fill();ctx.restore()}
function qShockwave(x,y,R,t){const inherited=ctx.globalAlpha;for(let i=0;i<2;i++){const age=t-i*.085;if(age<=0||age>=.52)continue;const u=age/.52,spread=1-Math.pow(1-u,3),rx=R*(.10+.90*spread)*(i?.88:1),ry=rx*.18,opacity=smooth(age/.025)*Math.pow(1-u,1.7);ctx.save();ctx.globalAlpha*=opacity;for(const [width,color,alpha] of [[19,'#9f54dd',.10],[9,'#c77ef1',.28],[2.8,'#f0c3ff',.83]]){ctx.globalAlpha=inherited*opacity*alpha;ctx.strokeStyle=color;ctx.lineWidth=width*(1-u*.65);ctx.beginPath();ctx.ellipse(x,y-2,rx,ry,0,0,Math.PI*2);ctx.stroke()}ctx.restore()}}
function qExplosion(f){const t=f.t,x=f.x,y=ground-(f.y||0),R=f.radius||Q_RADIUS,dir=f.dir||1,groundFade=1-smooth(t/.62);ctx.save();
 // A broad luminous base and expanding ground waves share the damage footprint.
 ctx.save();ctx.translate(x,y-1);ctx.scale(1,.18);const pool=ctx.createRadialGradient(0,0,0,0,0,R);pool.addColorStop(0,'#edb6ffa8');pool.addColorStop(.4,'#c679eb65');pool.addColorStop(1,'#a05acc00');ctx.globalAlpha*=groundFade;ctx.fillStyle=pool;ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fill();ctx.restore();qShockwave(x,y,R,t);
 const baseRise=1-Math.exp(-t*32),baseFade=1-smooth((t-.10)/.42);for(let i=0;i<5;i++){const offset=(i-2)*20,dx=(i-2)*R*.12,dy=-R*(.26+(i===2?.17:.07))*baseRise;qEnergyShard(x+offset,y-2,dx,dy,(i===2?34:25)*(1-smooth((t-.18)/.34)*.65),baseFade*(i===2?.95:.72))}
 for(const side of [-1,1])for(let i=0;i<3;i++){const u=Math.max(0,t-i*.012),spread=smooth(u/.13),fade=1-smooth(u/(.36+i*.05)),reach=R*(i===0?1:.82-i*.12),ex=x+side*reach,ey=y-3-i*4;ctx.save();ctx.globalAlpha*=fade*(i===0?.8:.48);ctx.fillStyle=i===0?'#e4a0fb':'#aa69cb';ctx.beginPath();ctx.moveTo(x,y-2);ctx.bezierCurveTo(x+side*reach*.24,y-21-i*5,x+side*reach*.72*spread,y-23-i*7,ex,ey);ctx.bezierCurveTo(x+side*reach*.68*spread,y-3-i*2,x+side*reach*.22,y+9,x,y-2);ctx.fill();ctx.restore()}
 // A tall central spear and staggered side splinters share the impact origin.
 const rays=[[-.10,1.50,21,0],[.05,1.21,18,.018],[.31,.96,14,.032],[-.39,.77,12,.024],[.58,.66,11,.045],[-.23,1.06,9,.055],[.44,.48,13,.012]];
 for(let i=0;i<rays.length;i++){const [dx,height,width,delay]=rays[i],u=t-delay;if(u<=0)continue;const rise=1-Math.exp(-u*24),fade=1-smooth((u-.09)/.37),lift=smooth((u-.12)/.35)*R*.10,bx=x+(i%2?1:-1)*(i%3)*15,by=y-3-lift;if(fade<=0)continue;qEnergyShard(bx,by,dir*R*dx*rise,-R*height*rise,width*(1-smooth((u-.12)/.3)*.78),fade*(i===0?.85:.72));if(i<4){qEnergyShard(bx+dir*3,by-2,dir*R*(dx+.035)*rise,-R*height*.72*rise,2,fade*.75)}}
 if(t<.16){const fade=1-smooth(t/.16);qEnergyShard(x,y-3,dir*33,-30,15,fade);qEnergyShard(x,y-2,-dir*30,-22,11,fade*.8);halo(x,y-9,38,fade*.38)}
 // Small soft dust pockets follow the floor; no broad glowing sphere.
 for(let i=0;i<5;i++){const u=Math.max(0,t-.04),fade=smooth(u/.08)*(1-smooth(u/.55));halo(x+Math.sin(i*2.4)*R*.44*(1-Math.exp(-u*8)),y-6-u*(12+i*3),38+u*29,fade*.21)}
 // Angular rock fragments retain ballistic weight and drop back to the floor.
 for(let i=0;i<24;i++){const seed=i*2.399,speed=R*(.65+(i%5)*.19),vx=Math.cos(seed)*speed,vy=-(90+Math.abs(Math.sin(seed))*(170+i%4*24)),dx=vx*t,dy=vy*t+420*t*t;if(dy>0)continue;const fade=1-smooth((t-.38)/.65),size=2.5+i%4*.9;ctx.save();ctx.globalAlpha*=fade;ctx.translate(x+dx,y+dy);ctx.rotate(seed+t*(i%2?4:-3));ctx.fillStyle=i%3?'#755586':'#b784c9';ctx.beginPath();ctx.moveTo(-size,-size*.8);ctx.lineTo(size*.7,-size*1.1);ctx.lineTo(size,size*.3);ctx.lineTo(-size*.3,size);ctx.closePath();ctx.fill();ctx.strokeStyle='#d4a6ea80';ctx.lineWidth=.6;ctx.stroke();ctx.restore()}
 ctx.restore()}
// Tapered blade wounds use the actual contact tangent, rather than radial sparks.
function cutShape(color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-62,1);ctx.bezierCurveTo(-41,-4,-20,-9,16,-5);ctx.lineTo(59,-1);ctx.bezierCurveTo(35,3,12,7,-17,6);ctx.lineTo(-41,4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-43,9);ctx.quadraticCurveTo(-12,3,27,6);ctx.lineTo(43,8);ctx.quadraticCurveTo(8,11,-43,9);ctx.fill();ctx.beginPath();ctx.moveTo(6,-11);ctx.quadraticCurveTo(31,-13,52,-10);ctx.lineTo(29,-8);ctx.closePath();ctx.fill()}
function drawCut(f){const t=f.t,u=t/f.life,growth=smooth(t/.065),fade=1-smooth((u-.28)/.72);if(growth<=0||fade<=0)return;const x=f.x+game.e.x-f.targetX,y=ground-(f.y+game.e.y-f.targetY),size=f.size||1;
 ctx.save();ctx.globalAlpha*=fade;ctx.translate(x,y);ctx.rotate(f.angle);ctx.scale(size,size);ctx.beginPath();ctx.rect(-70,-20,140*growth,40);ctx.clip();const grad=ctx.createLinearGradient(-62,0,59,0);grad.addColorStop(0,'#b15fe800');grad.addColorStop(.18,'#c580f2');grad.addColorStop(.52,'#e5acff');grad.addColorStop(.85,'#e4a5ff');grad.addColorStop(1,'#cc86f000');cutShape(grad);ctx.globalAlpha*=.8*(1-smooth(t/.2));ctx.fillStyle='#fff0ff';ctx.beginPath();ctx.moveTo(-51,1);ctx.quadraticCurveTo(0,-3,48,0);ctx.quadraticCurveTo(1,2,-51,1);ctx.fill();ctx.restore();
 // Two short, eased glitches displace only small horizontal slices of the cut.
 const pulse=(start,duration)=>{const v=(t-start)/duration;return v>0&&v<1?Math.sin(v*Math.PI):0},glitch=(pulse(.025,.052)+pulse(.105,.06))*(1-u);if(glitch<=0)return;
 for(let i=0;i<4;i++){const band=((i*19+f.seed*7)%65)-32,offset=(i%2?1:-1)*(3+(f.seed+i)%4)*glitch;ctx.save();ctx.globalAlpha*=glitch*(i%2?.7:.45);ctx.beginPath();ctx.rect(x-85*size,y+band*size,170*size,(3+i%2*2)*size);ctx.clip();ctx.translate(x+offset,y);ctx.rotate(f.angle);ctx.scale(size,size);cutShape(i%2?'#ed8eff':'#d4c4ff');ctx.restore()}}
function drawFx(f){let u=f.t/f.life,alpha=1-u;const x=f.x,y=ground-f.y;ctx.save();ctx.globalAlpha=alpha;if(f.k==='qslam')qExplosion(f);if(f.k==='rland'){qShockwave(x,y,120,f.t);halo(x,y-4,85,(1-smooth(u))*.5);for(let i=0;i<8;i++){const dx=Math.cos(i*2.4)*f.t*160,dy=-(70+i%3*26)*f.t+300*f.t*f.t;if(dy>0)continue;ctx.fillStyle='#ac7bbf';ctx.fillRect(x+dx,ground+dy,3,4)}}if(f.k==='cut')drawCut(f);if(f.k==='hit'||f.k==='hurt'){if(f.k==='hurt')halo(x,y,70,.8);ctx.fillStyle=f.k==='hit'?'#f8d6ff':'#ffabae';ctx.textAlign='center';ctx.font='500 23px Georgia';ctx.fillText(Math.round(f.n),x,y-25-u*55);if(f.k==='hurt')for(let i=0;i<7;i++){const a=i*2.4;path([{x:x+Math.cos(a)*u*60,y:y+Math.sin(a)*u*60},{x:x+Math.cos(a)*(u*60+8),y:y+Math.sin(a)*(u*60+8)}],'#efc7ff',2)}}
 if(f.k==='burst'){const power=f.power||1;halo(x,y,240*power,.9);for(let i=0;i<10;i++){let a=i*Math.PI*.2;const r=(20+u*180)*power;const pts=[];for(let j=0;j<=20;j++){const s=j/20;pts.push({x:x+Math.cos(a)*r*s,y:y-Math.sin(s*Math.PI)*65*power*(1-u)+Math.sin(a)*r*s*.23})}ribbon(pts,.75,2*(1-u)+.5)}for(let i=0;i<13;i++){const a=i*2.4,dx=Math.cos(a)*(35+f.t*170)*power,dy=-Math.abs(Math.sin(a))*f.t*340+f.t*f.t*330;ctx.fillStyle=i%2?'#9b61b2':'#dc96f4';ctx.save();ctx.translate(x+dx,y+dy);ctx.rotate(a+u*3);ctx.fillRect(-3,-5,6,10);ctx.restore()}}
 if(f.k==='spike'){const grow=1-Math.exp(-f.t*32),fade=1-smooth(f.t/.5);for(let i=0;i<3;i++)qEnergyShard(x+(i-1)*10,y,(i-1)*23*grow,-(i===1?140:85)*grow,i===1?15:9,fade*(i===1?.85:.58));qShockwave(x,y,95,f.t)}

 if(f.k==='shot')ribbon([{x,y},{x:f.tx,y:ground-100}],.5,2);ctx.restore()}
let hudTime=0;
// Bake a tinted, softly feathered silhouette once per snapshot, not per frame.
function bakeAfterimage(g){const pool=dashGhosts.spritePool??=[],index=(dashGhosts.spriteCursor??0)%10;dashGhosts.spriteCursor=index+1;let pair=pool[index];if(!pair){pair=pool[index]=[document.createElement('canvas'),document.createElement('canvas')];for(const c of pair)c.width=c.height=320;}const [sprite,soft]=pair,previous=ctx;ctx=sprite.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,320,320);ctx.save();ctx.translate(160-g.x,240-ground+g.y);drawHair(g.hair,g,g.pose);fighter(g.x,g.y,g.dir,g.pose,1);ctx.restore();ctx.globalCompositeOperation='source-in';ctx.fillStyle='#b45cf0';ctx.fillRect(0,0,320,320);const brush=soft.getContext('2d');brush.setTransform(1,0,0,1,0,0);brush.globalCompositeOperation='source-over';brush.globalAlpha=1;brush.filter='none';brush.clearRect(0,0,320,320);brush.filter='blur(2px)';brush.globalAlpha=.68;brush.drawImage(sprite,0,0);brush.filter='none';brush.globalAlpha=.52;brush.drawImage(sprite,0,0);ctx=previous;return soft}
// Blade attachment is the first outline vertex, so even enlarged close-up
// weapons join the cable exactly; the same transform renders every afterimage.
function drawFinisherBlade(b,alpha=1){ctx.save();ctx.translate(b.x,ground+b.y);ctx.rotate(b.angle);ctx.scale(.68*b.scale,.68*b.scale);ctx.globalAlpha*=alpha;ctx.fillStyle='#f3cbff';ctx.beginPath();BLADE_OUTLINE.forEach((p,i)=>i?ctx.lineTo(p.x+4,p.y+3):ctx.moveTo(p.x+4,p.y+3));ctx.closePath();ctx.fill();ctx.restore()}
function drawFinisher(f){if(!f||!finisherScene.actor||game.matchState!=='finishing')return;const timeline=finisherTimeline(f.t),scene=finisherScene,pose=scene.pose,actor=scene.actor;
 const output=ctx;
 output.save();output.globalAlpha*=timeline.veil;output.fillStyle='#100b18';output.fillRect(0,0,W,H);output.restore();if(timeline.alpha<=0)return;
 const layer=scene.layer;if(layer.width!==Math.ceil(W)||layer.height!==Math.ceil(H)){layer.width=Math.ceil(W);layer.height=Math.ceil(H)}
 ctx=layer.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
 try{ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.globalAlpha=1;
 const drift=Math.sin(f.t*1.1)*W*.012;ctx.drawImage(scene.background,-W*.025+drift,-H*.025,W*1.05,H*1.05);
 const stars=fps<45?8:14;for(let i=0;i<stars;i++){const u=(f.t*.22+i/stars)%1,x=W*(.08+(i*.618%1)*.84)+Math.sin(f.t+i)*7,y=H*(.12+((i*.381+u*.22)%1)*.74),size=3+(i%3)*1.4;ctx.save();ctx.globalAlpha*=Math.sin(u*Math.PI)**2*.65;ctx.drawImage(healStar,x-size,y-size,size*2,size*2);ctx.restore()}
 // Close framing keeps the silhouette left and the enlarged dart in foreground.
 ctx.save();const camera=finisherCamera(f.t),zoom=camera.zoom*H/630;ctx.translate(W*camera.x,H*camera.y);ctx.scale(zoom,zoom);ctx.translate(0,-ground);
 const view=scene.view,back=view.curves[1],front=view.curves[0],power=finishEase((f.t-.82)/.08)*(1-finishEase((f.t-1.30)/.14))*finishEase((scene.tipSpeed-90)/350);
 if(power>0)for(const delay of [.12,.085,.05]){let sample;for(let i=scene.history.length-1;i>=0;i--){if(scene.history[i].t<=f.t-delay){sample=scene.history[i];break}}if(!sample)continue;const opacity=(1-finishEase((f.t-sample.t)/.17))*.24*power;ctx.save();ctx.globalAlpha*=opacity;curveStroke(sample.view.bridge,'#c684e6',2.3);for(let end=0;end<2;end++){curveStroke(sample.view.curves[end],'#c684e6',2.3);drawFinisherBlade(sample.view.blades[end],.8)}ctx.restore()}
 curveStroke(back,'#ac59d52a',6);curveStroke(back,'#dba3ed',1.9);drawFinisherBlade(view.blades[1],.9);
 ctx.save();ctx.translate(0,ground);ctx.transform(Math.cos(camera.yaw),Math.sin(camera.yaw)*Math.sin(camera.pitch),0,Math.cos(camera.pitch),0,0);ctx.translate(0,-ground);
 drawHair(hairVolume(scene.rig),actor.p,pose);fighter(0,0,1,pose,1);ctx.restore();
 curveStroke(view.bridge,'#bd69dc30',6);curveStroke(view.bridge,'#eeb9f4',2);curveStroke(view.bridge,'#fff0ff',.6);
 curveStroke(front,'#bd69dc30',6);curveStroke(front,'#eeb9f4',2);curveStroke(front,'#fff0ff',.6);drawFinisherBlade(view.blades[0]);ctx.restore();
 if(timeline.flash>0){ctx.save();ctx.globalAlpha*=timeline.flash*.1;ctx.fillStyle='#edbaff';ctx.fillRect(0,0,W,H);ctx.restore()}
 ctx.restore();}finally{ctx=output}
 output.save();output.globalAlpha*=timeline.alpha;output.drawImage(layer,0,0,W,H);output.restore();
}

const actors=new Map();
function bind(context,f,enemy,clock,surface,cinematic=false){
 modelSize=cinematic?1:(window.FighterSize?.scale('melanta')||1);
 ctx=context;ground=Number.isFinite(f.melanta?.ground)&&f.melanta.ground>0?f.melanta.ground:surface;if(f.ground&&!f.melanta?.a)ground=f.y;surface=ground;time=clock;let state=actors.get(f.id);
 if(!state||state.type!==f.type||clock<state.clock){state={type:f.type,clock:clock-1/120,rig:new MelantaRig(),ult:new UltimateFrameEffect(),finish:null,dash:new DashAfterimages(),action:null,game:{}};actors.set(f.id,state);}
 const dt=Math.max(1/240,Math.min(1/30,clock-state.clock||1/120));state.clock=clock;rig=state.rig;ultFrame=state.ult;finisherScene=state.finish;dashGhosts=state.dash;
 const m=f.melanta||{};game=state.game;
 Object.assign(game,m,{t:clock,p:{...(m.p||{}),x:f.x,y:surface-f.y,vx:f.vx||0,vy:-(f.vy||0),dir:f.dir||1,hp:f.hp,max:1000,grounded:f.ground??(Math.abs(surface-f.y)<.01),speed:Math.max(0,(m.speedUntil||0)-clock)},e:{...(m.e||{}),x:enemy.x,y:surface-enemy.y,hp:enemy.hp,max:1000,stunStartedAt:enemy.melantaStunVfx?.startedAt??clock,bind:Math.max(0,(enemy.rootUntil||0)-clock),stun:enemy.hp>0&&enemy.melantaStunVfx?.owner===f.id?Math.max(0,(enemy.stunUntil||0)-clock):0},rHealVisual:m.rHealVisual?{...m.rHealVisual,since:clock-(m.t-m.rHealVisual.since),lastAt:clock-(m.t-m.rHealVisual.lastAt),until:clock+(m.rHealVisual.until-m.t)}:null,fx:m.fx||[]});
 const source=m.a||null;
 if(source){const key=source.use?.id||source.id||source.k+':'+source.sx+':'+source.startedAt;if(!state.action||state.actionKey!==key){state.action={...source};state.actionKey=key;}else Object.assign(state.action,source);game.a=state.action;}else{game.a=null;state.action=null;}
 if(state.rigAt!==clock){if(rig.low?.nodes?.some(p=>!Number.isFinite(p.x+p.y))||game.normalVisual&&Object.values(game.normalVisual).some(v=>typeof v==='number'&&!Number.isFinite(v))){state.rig=rig=new MelantaRig();state.dash=dashGhosts=new DashAfterimages();game.normalVisual=null;game.airVisual=null;game.walkVisual=null;}rig.update(dt,game);ultFrame.update(dt,game);dashGhosts.update(dt,game,playerPose(game),rig);state.rigAt=clock;}return state;
}
window.MelantaLab={rImpactX,MelantaGame,SKILLS,sweepNormal,attackBladePose,attackTip,attackOriginAt,bladePolygon,ATTACK_START,ATTACK_END,ATTACK_REACH,Q_IMPACT_TIME,Q_REACH,Q_RADIUS,qHop,qTip,rTip};
window.MelantaVisual={
 character(context,f,enemy,clock,surface){bind(context,f,enemy,clock,surface);const p=game.p,a=game.a;for(const g of dashGhosts.samples){const fade=1-smooth(g.age/g.life);if(!g.sprite)g.sprite=bakeAfterimage(g);ctx.save();ctx.globalAlpha*=fade*.52;ctx.drawImage(g.sprite,g.x-160,ground-g.y-240,320,320);ctx.restore();}if(a?.k==='r'&&a.phase!=='plunge')rGroundAura(a);for(const effect of game.fx)drawFx(effect);stunMist(game.e);rHealingMist(false);weapon(a);drawHair();fighter(p.x,p.y,p.dir,playerPose(game),p.hp>0?1:.35);rHealingMist(true);},
 front(context,f,enemy,clock,surface){bind(context,f,enemy,clock,surface);stunMist(game.e,true);if(f.melanta?.a?.k!=='w'||!f.melanta.a.locked)return;if(!rig.wWrap?.length)return;const pts=[rig.wRope.nodes.at(-1),...rig.wWrap],end=pts.at(-1),prev=pts.at(-2);curveStroke(pts,'#bc79d51c',10);curveStroke(pts,'#bf7cda',2.5);curveStroke(pts,'#ecc0fa',.65);blade(end.x,ground+end.y,Math.atan2(end.y-prev.y,end.x-prev.x)-.3,.8);},
 frame(context,f,enemy,clock,surface,width=1600,height=1120){bind(context,f,enemy,clock,surface);ultFrame.draw(context,width,height,healStar,false);},
 finisher(context,f,enemy,clock,surface,elapsed,width=1600,height=1120){const state=bind(context,f,enemy,clock,surface,true);W=width;H=height;game.matchState='finishing';if(!state.finishAction||elapsed<state.finishAction.t)state.finishAction={t:0,duration:2,dir:f.dir};const action=state.finishAction;action.t=elapsed;game.finisher=action;finisherScene=state.finish??=(new FinisherScene());finisherScene.update(1/120,action);drawFinisher(action);},
 reset(){actors.clear();}
};
})();
