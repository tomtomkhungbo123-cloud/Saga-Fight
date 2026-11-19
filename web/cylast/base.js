// Cylast BUILD 1.9 · source 183f7919871a6811b01b951ed2ceaadf797eadf3
(()=>{
'use strict';
const CYLAST_SKILLS={q:{name:'Quang băng',cd:4.3,cast:.65,range:600},w:{name:'Mưa băng',cd:3.5,cast:.2,range:200,duration:4,damage:30},e:{name:'Sương hộ mệnh',cd:6,cast:.5,duration:1.2},r:{name:'Bão tuyết',cd:15,cast:.5,range:400,duration:3,damage:300,decay:.2,rootDuration:0,healPerTick:20}};
const smooth01=v=>{v=Math.max(0,Math.min(1,v));return v*v*v*(v*(v*6-15)+10);};
function frostStaffTip(p,pose,time){
 const a=pose.angle,rx=(60+pose.reach-78-6*Math.cos(a)+16*Math.sin(a))*1.45;
 const ry=(90-pose.lift-154-6*Math.sin(a)-16*Math.cos(a))*1.45;
 const tilt=p.vx*.000054+pose.tilt,size=window.FighterSize?.scale('cylast')||1;
 return {x:p.x+size*p.dir*(rx*Math.cos(tilt)-ry*Math.sin(tilt)),y:p.y+size*(20+Math.sin(time*2.9)*5+pose.rise-rx*Math.sin(tilt)-ry*Math.cos(tilt))};
}
class FrostGame{
 constructor(){this.reset();}
 reset(){this.time=0;this.player={x:620,y:0,vx:0,vy:0,dir:1,hp:1000,maxHp:1000,shield:0,shieldEnd:0};this.enemy={x:1080,y:0,hp:2500,maxHp:2500,freeze:0,root:0,dead:0};this.cd={q:0,w:0,e:0,r:0,attack:0};this.cast=null;this.animation=null;this.qLight=null;this.ice=null;this.ward=null;this.queued=null;this.pose={angle:0,reach:0,lift:0,tilt:0,rise:0,hair:0,flare:0};this.poseVelocity={...this.pose};this.zones=[];this.projectiles=[];this.effects=[];this.events=[];this.totalDamage=0;this.totalHeal=0;this.ai=false;this.free=false;this.attackClock=0;this.last='Sẵn sàng';}
 emit(type,data={}){this.events.push({type,...data});}
 distance(){return Math.hypot(this.enemy.x-this.player.x,this.enemy.y-this.player.y);}
 hit(n){let e=this.enemy;if(e.hp<=0)return 0;let dealt=Math.min(n,e.hp);e.hp-=dealt;this.totalDamage+=dealt;this.emit('damage',{x:e.x,y:e.y,n:dealt});if(e.hp<=0){e.dead=2.5;this.last='Mục tiêu đã hạ • tự hồi sinh';}return dealt;}
 hurt(n){let p=this.player;let absorbed=Math.min(p.shield,n);p.shield-=absorbed;p.hp=Math.max(0,p.hp-(n-absorbed));this.emit('hurt',{n:n-absorbed,absorbed,x:p.x,y:p.y});if(p.hp<=0)this.last='Cylast gục ngã • bấm Làm mới';}
 animate(k,cast){this.animation={k,age:0,cast,recovery:k==='attack'?.3:k==='r'?.6:.42};}
 updatePose(dt){
 let target={angle:0,reach:0,lift:0,tilt:0,rise:0,hair:0,flare:0},a=this.animation;
 if(a){a.age+=dt;let wind=smooth01(a.age/a.cast),recover=smooth01((a.age-a.cast)/a.recovery),hold=1-recover;
 let thrust=smooth01((a.age-a.cast*.48)/(a.cast*.52+.05))*hold;
 if(a.k==='attack')target={angle:-.28*wind*hold+1.36*thrust,reach:-4*wind*hold+30*thrust,lift:7*wind*hold,tilt:-.045*wind*hold+.09*thrust,rise:3*wind*hold,hair:4*wind*hold+5*thrust,flare:wind*hold};
 if(a.k==='q')target={angle:-.18*wind*hold,reach:6*wind*hold,lift:18*wind*hold,tilt:-.035*wind*hold,rise:5*wind*hold,hair:5*wind*hold,flare:wind*hold};
 if(a.k==='w')target={angle:-.5*wind*hold,reach:8*wind*hold,lift:25*wind*hold,tilt:-.06*wind*hold,rise:8*wind*hold,hair:7*wind*hold,flare:wind*hold};
 if(a.k==='e')target={angle:.25*wind*hold,reach:9*wind*hold,lift:12*wind*hold,tilt:.035*wind*hold,rise:6*wind*hold,hair:5*wind*hold,flare:wind*hold};
 if(a.k==='r')target={angle:-.65*wind*hold,reach:10*wind*hold,lift:33*wind*hold,tilt:-.075*wind*hold,rise:0,hair:12*wind*hold,flare:wind*hold};
 if(a.age>a.cast+a.recovery)this.animation=null;
 }
 // Exact critically damped spring: keep pose and velocity when another clip starts.
 const omega=30,decay=Math.exp(-omega*dt);
 for(let k in target){let x=this.pose[k]-target[k],v=this.poseVelocity[k],c=v+omega*x;this.pose[k]=target[k]+(x+c*dt)*decay;this.poseVelocity[k]=(v-omega*c*dt)*decay;}
 }
 use(k){let p=this.player;if(p.hp<=0)return false;
 if(this.cast){if(this.cast.remaining<=.14)this.queued={k,life:.18};return false;}
 if(!this.free&&(this.cd[k]>0||(k==='w'&&this.zones.some(z=>z.k==='w')))){if(this.cd[k]>0&&this.cd[k]<.12)this.queued={k,life:.16};return false;}
 if(k==='attack'){this.cd.attack=.38;this.cast={k,remaining:.12,total:.12};this.animate(k,.12);return true;}
 let s=CYLAST_SKILLS[k];if(!s)return false;this.cast={k,remaining:s.cast,total:s.cast,originX:p.x};if(k==='r')p.vx=0;this.animate(k,s.cast);if(k==='e')this.ward={age:0,phase:'cast',fadeAge:0};if(k==='q'&&this.enemy.hp>0&&this.distance()<=600){p.dir=this.enemy.x>=p.x?1:-1;this.qLight={x:this.enemy.x,y:this.enemy.y,age:0,duration:s.cast};}this.last='Đang vận '+s.name;this.emit('cast',{k});return true;}
 release(k,originX=this.player.x){let p=this.player,e=this.enemy,s=CYLAST_SKILLS[k];let tip=frostStaffTip(p,this.pose,this.time);if(k==='attack'){let dx=e.x-tip.x,dy=e.y+85-tip.y,aim=e.hp>0&&dx*p.dir>0&&Math.abs(dx)<=1000?Math.atan2(dy,Math.abs(dx)):0;this.projectiles.push({x:tip.x,y:tip.y,v:p.dir*1500*Math.cos(aim),vy:1500*Math.sin(aim),remaining:1000,owner:'player'});this.effects.push({type:'muzzle',x:tip.x,y:tip.y,life:.2,max:.2});return;}if(k!=='w')this.cd[k]=s.cd;
 if(k==='q'){let locked=!!this.qLight;this.qLight=null;if(locked&&e.hp>0&&this.distance()<=600){p.dir=e.x>=p.x?1:-1;this.hit(150);e.freeze=Math.max(e.freeze,2);this.ice={x:e.x,y:e.y,age:0,duration:2.22};this.last='Quang băng • khép băng · 150 sát thương · đóng băng 2 giây';}else this.last='Quang băng • mục tiêu ngoài phạm vi 600';}
 if(k==='w'){let x=e.hp>0&&this.distance()<=1000?e.x:p.x+p.dir*400;this.zones.push({k,x,life:4,age:0,tick:0});this.last='Mưa băng • 50 sát thương / giây';}
 if(k==='e'){if(this.ward)this.ward.phase='active';p.shield=300;p.shieldEnd=2;this.last='Giáp ảo • 300 sát thương / 2 giây';}
 if(k==='r'){this.zones.push({k,x:originX,life:3,age:0,tick:0,rooted:false});this.last='Bão tuyết • 100 sát thương & hút máu / giây';}
 }
 update(dt,input={}){dt=Math.min(dt,.05);this.time+=dt;this.updatePose(dt);let p=this.player,e=this.enemy;Object.keys(this.cd).forEach(k=>this.cd[k]=Math.max(0,this.cd[k]-dt));e.freeze=Math.max(0,e.freeze-dt);e.root=Math.max(0,e.root-dt);p.shieldEnd=Math.max(0,p.shieldEnd-dt);if(!p.shieldEnd)p.shield=0;
 if(e.hp<=0){e.dead-=dt;if(e.dead<=0){e.hp=e.maxHp;e.freeze=0;e.root=0;}}
 let target=p.hp>0&&(!this.cast||this.cast.k==='attack')?(input.move||0)*350:0;p.vx+=(target-p.vx)*(1-Math.exp(-dt*13));p.x=Math.max(70,Math.min(2330,p.x+p.vx*dt));if(Math.abs(p.vx)>15)p.dir=p.vx>0?1:-1;
 if(input.jump&&p.y<=0&&p.hp>0)p.vy=660;p.vy-=1800*dt;p.y=Math.max(0,p.y+p.vy*dt);if(!p.y)p.vy=0;
 if(this.ward){this.ward.age+=dt;if(this.ward.phase==='active'&&(p.shield<=0||p.shieldEnd<=0))this.ward.phase='fade';if(this.ward.phase==='fade'){this.ward.fadeAge+=dt;if(this.ward.fadeAge>=.38)this.ward=null;}}
 if(this.qLight){this.qLight.age+=dt;this.qLight.x=e.x;this.qLight.y=e.y;}if(this.ice){this.ice.age+=dt;if(e.hp>0){this.ice.x=e.x;this.ice.y=e.y;}if(this.ice.age>=this.ice.duration)this.ice=null;}
 if(this.queued){this.queued.life-=dt;if(this.queued.life<=0)this.queued=null;else if(!this.cast&&(!this.cd[this.queued.k]||this.free)){let k=this.queued.k;this.queued=null;this.use(k);}}
 if(this.cast){this.cast.remaining-=dt;if(this.cast.remaining<=0){let {k,originX}=this.cast;this.cast=null;this.release(k,originX);}}
 for(let z of this.zones){z.life-=dt;z.age+=dt;z.tick+=dt;let inside=e.hp>0&&Math.hypot(e.x-z.x,e.y)<=CYLAST_SKILLS[z.k].range;
 
 while(z.tick>=1-1e-8){z.tick-=1;if(inside){let damage=this.hit(z.k==='w'?50:100);if(z.k==='r'&&p.hp>0){let heal=Math.min(CYLAST_SKILLS.r.healPerTick,damage,p.maxHp-p.hp);p.hp+=heal;this.totalHeal+=heal;this.emit('heal',{n:heal,x:p.x,y:p.y});}}}
 if(z.life<=1e-8&&z.k==='w')this.cd.w=3.5;
 }this.zones=this.zones.filter(z=>z.life>1e-8);
 for(let b of this.projectiles){let prev=b.x;b.x+=b.v*dt;b.y+=(b.vy||0)*dt;b.remaining-=Math.hypot(b.v,b.vy||0)*dt;let victim=b.owner==='player'?e:p;let lo=Math.min(prev,b.x)-24,hi=Math.max(prev,b.x)+24;if(victim.hp>0&&victim.x>=lo&&victim.x<=hi&&Math.abs(b.y-(victim.y+75))<70){if(b.owner==='player')this.hit(65);else this.hurt(100);b.remaining=-1;this.effects.push({type:'burst',x:victim.x,y:victim.y+75,life:.4,max:.4});}}
 this.projectiles=this.projectiles.filter(b=>b.remaining>0);
 if(this.ai&&e.hp>0&&p.hp>0){if(e.freeze<=0){if(e.root<=0&&Math.abs(e.x-p.x)>270)e.x+=Math.sign(p.x-e.x)*120*dt;this.attackClock+=dt;if(this.attackClock>=1.4){this.attackClock=0;this.projectiles.push({x:e.x,y:75,v:Math.sign(p.x-e.x)*650,remaining:2400,owner:'enemy'});}}}
 this.effects.forEach(f=>f.life-=dt);this.effects=this.effects.filter(f=>f.life>0);
 }
}
if(typeof module!=='undefined')module.exports={FrostGame,CYLAST_SKILLS,frostStaffTip};

window.CylastBase={FrostGame,CYLAST_SKILLS,frostStaffTip,smooth01};
})();
