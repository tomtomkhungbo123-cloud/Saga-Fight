// Original Mox BUILD 1.4 engine, used for pose and action math.
(()=>{
'use strict';
const MOX={q:{cd:2,name:'Chuyển dạng'},w:{cd:5,name:'Song hỏa cầu'},e:{cd:4,name:'Lướt ảnh'},r:{cd:15,name:'Thiên giáng'}};
const MOX_W_RANGE=500,MOX_R_RANGE={melee:300,ranged:450};
function moxArcPoint(b,t){if(b.k==='r')t=t*t*(3-2*t);return {x:b.sx+(b.tx-b.sx)*t,y:b.sy+(b.ty-b.sy)*t+(b.k==='r'?Math.sin(t*Math.PI)*b.bend:Math.sin(t*Math.PI*2)*b.bend*(1-.35*t))};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class MoxGame{
 constructor(){this.mode='dummy';this.free=false;this.reset();}
 reset(){this.t=0;this.p={x:490,y:0,vx:0,vy:0,dir:1,turn:0,hp:1500,max:1500,form:0,cc:0,immune:0,invuln:0};this.e={x:825,y:0,vx:0,turn:0,hp:3000,max:3000,stun:0,burn:0,burnClock:0,respawn:0};this.cd={q:0,w:0,e:0,r:0,attack:0};this.action=null;this.anim={k:'idle',t:0};this.nextHand=0;this.punchPose={front:0,back:0,roll:0};this.punchVelocity={front:0,back:0,roll:0};this.balls=[];this.fx=[];this.events=[];this.buffer=null;this.damage=0;this.last='Sẵn sàng chiến đấu';this.aiClock=0;this.combo=0;}
 distance(){return Math.hypot(this.e.x-this.p.x,this.e.y-this.p.y);}
 emit(k,data={}){this.events.push({k,...data});}
 effect(k,x,y,life=.5,data={}){this.fx.push({k,x,y,life,max:life,...data});}
 hit(n,knock=0,burn=false){const e=this.e;if(e.hp<=0)return;let actual=Math.min(e.hp,n);e.hp-=actual;this.damage+=actual;this.combo++;this.emit('hit',{n:actual,x:e.x,y:e.y});this.effect('impact',e.x,e.y+80,.28);if(knock&&!this.action?.grab)e.vx=this.p.dir*knock;if(burn){e.burn=3;e.burnClock=0;}if(!e.hp){e.respawn=2;this.last='Mục tiêu đã hạ · hồi sinh sau 2s';e.burn=0;}}
 hurt(n,cc=0){const p=this.p;if(p.hp<=0)return;if(p.invuln>0){this.emit('evade');this.last='NÉ THÀNH CÔNG · miễn sát thương';return;}p.hp=Math.max(0,p.hp-n);this.emit('hurt',{n,x:p.x,y:p.y});if(cc&&p.immune<=0){p.cc=cc;if(this.action){if(this.action.grab){this.e.y=0;this.e.turn=0;p.turn=0;}this.action=null;}this.last='Bị choáng';}else if(cc)this.last='MIỄN KHỐNG CHẾ';}
 use(k){const p=this.p,e=this.e;if(p.hp<=0||p.cc>0)return false;
 if(this.action){if(this.action.remaining<.16)this.buffer={k,life:.22};return false;}
 if(!this.free&&this.cd[k]>0){if(this.cd[k]<.12)this.buffer={k,life:.18};return false;}
 if(k==='q'){this.cd.q=this.free?0:MOX.q.cd;p.form=1-p.form;p.immune=1;this.anim={k:'q',t:0};this.effect('shift',p.x,p.y+75,.6);this.last=p.form?'DẠNG ĐÁNH XA · miễn khống chế 1s':'DẠNG CẬN CHIẾN · miễn khống chế 1s';return true;}
 if(!['attack','w','e','r'].includes(k))return false;
 if(k==='r'&&(e.hp<=0||this.distance()>(p.form?MOX_R_RANGE.ranged:MOX_R_RANGE.melee))){this.last='R · mục tiêu ngoài tầm '+(p.form?MOX_R_RANGE.ranged:MOX_R_RANGE.melee);this.emit('miss');return false;}
 if(e.hp>0&&['w','r'].includes(k))p.dir=e.x>=p.x?1:-1;
 let hand=0;if(k==='attack'&&!p.form){hand=this.nextHand;this.nextHand=1-this.nextHand;}this.anim={k,t:0,form:p.form,hand};this.last=k==='attack'?'Đánh thường':MOX[k].name;
 if(k==='e'){this.cd.e=this.free?0:4;p.invuln=.5;this.action={k,total:.5,remaining:.5,dir:p.dir};this.effect('dash',p.x,p.y,.45,{dir:p.dir});return true;}
 let total=k==='attack'?.32:k==='w'?.4:p.form?1.04:1.52;
 this.cd[k]=this.free?0:k==='attack'?(p.form?.48:.42):MOX[k].cd;
 this.action={k,total,remaining:total,age:0,released:false,form:p.form,origin:p.x,target:{x:e.x,y:e.y+80},valid:e.hp>0&&this.distance()<=MOX_W_RANGE,grab:k==='r'&&!p.form};
 if(k==='r'&&!p.form){p.vx=0;p.vy=0;e.vx=0;e.stun=.22;this.action.startY=p.y;this.action.enemyStartY=e.y;this.action.enemyStartX=e.x;this.action.grip=Math.min(64,Math.abs(e.x-p.x));this.action.catchX=clamp(e.x-p.dir*this.action.grip,70,1530);}
 return true;
 }
 release(a){let p=this.p,e=this.e;
 if(a.k==='attack'){
 if(!a.form){this.effect('punch',p.x,p.y+100,.22,{dir:p.dir,hand:this.anim.hand,range:300});if(e.hp>0&&(e.x-p.x)*p.dir>=-20&&this.distance()<=300)this.hit(75,100);else this.last='Đánh hụt · tầm cận chiến 300';}
 else {this.balls.push({k:'basic',x:p.x+p.dir*52,y:p.y+90,vx:p.dir*1350,range:648,originX:p.x,traveled:0,damage:60,life:1,trail:[]});this.effect('muzzle',p.x+p.dir*52,p.y+90,.2);}
 }
 if(a.k==='w'){
 const start={x:p.x+p.dir*48,y:p.y+95};a.valid=e.hp>0&&this.distance()<=MOX_W_RANGE;a.target={x:e.x,y:e.y+80};const target=a.valid?a.target:{x:p.x+p.dir*MOX_W_RANGE,y:p.y+80};
 for(let i=0;i<2;i++)this.balls.push({k:'w',x:start.x,y:start.y,sx:start.x,sy:start.y,tx:target.x,ty:target.y,age:-i*.09,duration:.62,bend:(i?1:-1)*145,damage:100,burn:true,trail:[],valid:a.valid});
 this.last=a.valid?'Song hỏa cầu · khóa vị trí cuối':'W · không có mục tiêu trong 500';
 }
 }
 updatePunchPose(dt){
 const a=this.anim,t=a.t,melee=a.k==='attack'&&!a.form;const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};let drive=0;if(melee&&t<.36)drive=t<.04?-.12*smooth(t/.04):t<.12?-.12+1.12*smooth((t-.04)/.08):1-smooth((t-.12)/.24);const target={front:melee&&a.hand===0?drive:0,back:melee&&a.hand===1?drive:0,roll:melee?drive*(a.hand?-.09:.07):0},omega=40,decay=Math.exp(-omega*dt);for(const k in target){const x=this.punchPose[k]-target[k],v=this.punchVelocity[k],c=v+omega*x;this.punchPose[k]=target[k]+(x+c*dt)*decay;this.punchVelocity[k]=(v-omega*c*dt)*decay;}
 }
 update(dt,input={}){dt=Math.min(dt,.0334);this.t+=dt;const p=this.p,e=this.e;
 for(const k in this.cd)this.cd[k]=Math.max(0,this.cd[k]-dt);for(const k of ['cc','immune','invuln'])p[k]=Math.max(0,p[k]-dt);e.stun=Math.max(0,e.stun-dt);this.anim.t+=dt;this.updatePunchPose(dt);
 if(this.buffer){this.buffer.life-=dt;if(this.buffer.life<0)this.buffer=null;else if(!this.action&&this.cd[this.buffer.k]<=0){let k=this.buffer.k;this.buffer=null;this.use(k);}}
 const a=this.action;
 if(a){a.age=(a.age||0)+dt;a.remaining-=dt;
 if(a.k==='e'){p.vx=a.dir*1000;p.x=clamp(p.x+p.vx*dt,80,1520);if(Math.floor(a.age*35)!==Math.floor((a.age-dt)*35))this.effect('ghost',p.x,p.y,.23,{dir:p.dir,form:p.form});}
 else if(a.grab){
 const t=a.age,smooth=v=>{v=clamp(v,0,1);return v*v*v*(v*(v*6-15)+10);};
 if(t<.22){const u=smooth(t/.22);p.x=a.origin+(a.catchX-a.origin)*u;p.y=a.startY+(a.enemyStartY-a.startY)*u+Math.sin(u*Math.PI)*10;p.turn=-.08*Math.sin(u*Math.PI);e.x=a.enemyStartX;e.y=a.enemyStartY;}
 else {
 if(!a.caught){a.caught=true;this.effect('grab',e.x,e.y+95,.25);this.last='Tóm mục tiêu · cất lên';}
 p.x=a.catchX;e.x=p.x+p.dir*64;if(!a.slammed)e.stun=Math.max(e.stun,.08);
 if(t<.32){p.y=a.enemyStartY-7*Math.sin(smooth((t-.22)/.1)*Math.PI);p.turn=0;e.y=a.enemyStartY;}
 else if(t<.78){const u=smooth((t-.32)/.46);p.y=a.enemyStartY+230*u;p.turn=-.12*Math.sin(u*Math.PI);e.y=p.y+12*u;}
 else if(t<1.06){const u=smooth((t-.78)/.28);p.y=a.enemyStartY+230+18*Math.sin(u*Math.PI);p.turn=-Math.PI*u;e.y=p.y+12;e.turn=Math.PI*u;}
 else if(t<1.28){const u=clamp((t-1.06)/.22,0,1);p.y=(a.enemyStartY+230)*(1-u*u*u);p.turn=-Math.PI;e.y=p.y;e.turn=Math.PI;if(Math.floor(t*45)!==Math.floor((t-dt)*45))this.effect('diveTrail',e.x,e.y+90,.16,{dir:p.dir});}
 else {if(!a.slammed){a.slammed=true;p.y=0;e.y=0;this.hit(400);if(e.hp>0)e.stun=1;this.effect('slam',e.x,0,1.05);this.effect('debris',e.x,0,1.05);this.emit('slam');this.last='THIÊN GIÁNG · 400 sát thương · choáng 1s';}const u=smooth((t-1.28)/.24);p.y=Math.sin(u*Math.PI)*11;e.y=0;p.turn=-Math.PI-Math.PI*u;e.turn=Math.PI+Math.PI*u;}
 }
 if(a.remaining<=0){p.turn=0;e.turn=0;p.y=0;e.y=0;p.vy=0;}
 }
 else if(a.k==='r'&&a.form){for(let i=0;i<4;i++){let key='shot'+i;if(a.age>=.15+i*.22&&!a[key]){a[key]=true;this.balls.push({k:'r',sx:p.x+p.dir*84,sy:p.y+113,x:p.x+p.dir*84,y:p.y+113,age:0,duration:.62,bend:(i%2?1:-1)*(95+i*32),damage:87.5,trail:[]});this.effect('muzzle',p.x+p.dir*84,p.y+113,.2);}}}
 else if(!a.released&&a.age>=(a.k==='w'?.18:.12)){a.released=true;this.release(a);}
 if(a.remaining<=0)this.action=null;
 }
 if(!a||(!a.grab&&a.k!=='e')){let locked=p.cc>0||p.hp<=0||a?.k==='r';let move=locked?0:(input.right?1:0)-(input.left?1:0);let desired=move*(a?.k==='w'?120:370);p.vx+=(desired-p.vx)*(1-Math.exp(-dt*18));if(move)p.dir=move;p.x=clamp(p.x+p.vx*dt,70,1530);if(input.jump&&p.y<=0&&!locked){p.vy=660;}p.y+=p.vy*dt;p.vy-=1800*dt;if(p.y<0){p.y=0;p.vy=0;}}
 if(e.hp>0&&!a?.grab){if(e.stun<=0&&this.mode==='moving')e.x=1000+Math.sin(this.t*.95)*330;else {e.x=clamp(e.x+e.vx*dt,80,1520);e.vx*=Math.exp(-dt*8);}if(e.y>0){e.y=Math.max(0,e.y-600*dt);} }
 if(e.burn>0&&e.hp>0){let elapsed=Math.min(dt,e.burn);e.burn-=elapsed;e.burnClock+=elapsed;if(e.burnClock>=1-1e-7){e.burnClock-=1;this.hit(50);}}
 if(e.hp<=0){e.respawn-=dt;if(e.respawn<=0){Object.assign(e,{hp:e.max,x:900,y:0,stun:0,vx:0,burn:0,burnClock:0});this.combo=0;}}
 if(this.mode==='attack'&&e.hp>0&&e.stun<=0&&p.hp>0&&!a?.grab){this.aiClock+=dt;if(this.aiClock>1.65){this.aiClock=0;this.balls.push({k:'enemy',x:e.x,y:e.y+85,vx:(p.x>=e.x?1:-1)*650,range:1600,traveled:0,life:3,trail:[]});this.effect('muzzle',e.x,e.y+85,.2);}}
 for(const b of this.balls){let oldX=b.x,oldY=b.y;if(b.k==='w'||b.k==='r'){b.age+=dt;if(b.age<0)continue;let t=clamp(b.age/b.duration,0,1);if(b.k==='r'){b.tx=e.x;b.ty=e.y+80;}const point=moxArcPoint(b,t);b.x=point.x;b.y=point.y;
 if(t>=1){b.dead=true;if(b.k==='w'||b.k==='r')this.effect('ribbon',0,0,.24,{ball:{...b,trail:[]}});if(e.hp>0&&Math.hypot(e.x-b.x,e.y+80-b.y)<65&&(b.k==='r'||b.valid)){this.hit(b.damage,b.k==='w'?210:0,b.burn);if(b.k==='r')this.effect('sparks',e.x,e.y+80,.65,{dir:p.dir,seed:this.combo,power:2.2});}}}
 else {b.x+=b.vx*dt;b.traveled+=Math.abs(b.vx*dt);let target=b.k==='enemy'?p:e;const crossed=Math.min(oldX,b.x)-28<=target.x&&Math.max(oldX,b.x)+28>=target.x;if(target.hp>0&&crossed&&Math.abs(target.y+80-b.y)<70&&(b.k!=='basic'||Math.hypot(target.x-b.originX,target.y-p.y)<=700)){b.dead=true;if(b.k==='enemy')this.hurt(100,.8);else {this.hit(b.damage,70);this.effect('sparks',target.x,b.y,.48,{dir:Math.sign(b.vx),seed:this.combo});}}if(b.traveled>=b.range)b.dead=true;}
 b.trail.push({x:oldX,y:oldY});if(b.trail.length>18)b.trail.shift();}
 this.balls=this.balls.filter(b=>!b.dead);for(let f of this.fx)f.life-=dt;this.fx=this.fx.filter(f=>f.life>0);if(this.fx.length>140)this.fx.splice(0,this.fx.length-140);
 }
}
if(typeof module!=='undefined')module.exports={MoxGame,MOX,MOX_W_RANGE,MOX_R_RANGE,moxArcPoint};

window.MoxBase={MoxGame,MOX,MOX_W_RANGE,MOX_R_RANGE,moxArcPoint,clamp};
})();
