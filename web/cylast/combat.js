// Arena adapter. Rendering and pose math remain in the original Cylast modules.
(()=>{
const {FrostGame,CYLAST_SKILLS,frostStaffTip}=window.CylastBase;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function init(){const g=new FrostGame();return {pose:g.pose,poseVelocity:g.poseVelocity,animation:null,qLight:null,ice:null,ward:null,zones:[]};}
function begin(f,k,env){const s=CYLAST_SKILLS[k],cast=k==='attack'?.12:s?.cast;if(cast===undefined)return false;if(f.action)return f.action.duration-f.action.age<=.14?null:false;if(f.cd[k]>0)return f.cd[k]<.12?null:false;if(k==='w'&&f.frost.zones.some(z=>z.k==='w'))return false;
 if(k==='e')env.cue?.('cylast_e_cast');
 f.action={k,age:0,duration:cast,cancel:cast,originX:f.x,originY:env.surface(f.x,f.y)};f.frost.animation={k,age:0,cast,recovery:k==='attack'?.3:k==='r'?.6:.42};if(k==='attack')f.cd.attack=.38;if(k==='r')f.vx=0;if(k==='e')f.frost.ward={age:0,phase:'cast',fadeAge:0};if(k==='q'&&env.targetable?.(env.enemy)!==false&&env.enemy.hp>0&&distance(f,env.enemy)<=600){f.dir=Math.sign(env.enemy.x-f.x)||f.dir;f.frost.qLight={x:env.enemy.x,y:env.enemy.y,age:0,duration:cast};}return true;
}
function cancel(f){if(!f.frost)return;f.action=null;f.queue=[];f.frost.qLight=null;if(f.frost.ward?.phase==='cast')f.frost.ward.phase='fade';}
function release(f,a,env){const {enemy:e,time,damage,shots,emit}=env,k=a.k,s=CYLAST_SKILLS[k],g=f.frost;
 if(k==='attack'){const tip=frostStaffTip({x:f.x,y:-f.y,vx:f.vx,dir:f.dir},g.pose,time);const x=tip.x,y=-tip.y,dx=e.x-x,dy=e.y-85-y,aim=e.hp>0&&dx*f.dir>0&&Math.abs(dx)<=1000?Math.atan2(dy,Math.abs(dx)):0;shots.push({kind:'frost',owner:f.id,x,y,vx:f.dir*(window.SagaCombatConfig?.cylastNormalSpeed??600)*Math.cos(aim),vy:(window.SagaCombatConfig?.cylastNormalSpeed??600)*Math.sin(aim),remaining:1000,age:0});emit('frostMuzzle',x,y,'#a3cee5',30,{life:.2});return;}
 if(k!=='w')f.cd[k]=s.cd;
 if(k==='q'){const locked=!!g.qLight;g.qLight=null;if(locked&&env.targetable?.(e)!==false&&e.hp>0&&distance(f,e)<=600){f.dir=Math.sign(e.x-f.x)||f.dir;const previousHitstun=e.hitstunUntil||0;const dealt=damage(f,e,150,0,false,false,{use:a.use,hitId:a.use.id+':freeze'});if(dealt>0&&e.hp>0&&env.canControl(e,a.use)&&!a.use.endOnly){env.freeze(e,1,a.use,previousHitstun);e.queue=[];e.jumpUntil=0;e.vx=0;if(e.type==='soul'&&e.action?.k==='e')e.cd.e=8;env.interrupt(e);g.ice={x:e.x,y:e.y,useId:a.use.id,age:0,duration:Math.max(0,e.freezeUntil-time)+.22};}}}
 if(k==='w'){env.cue?.('cylast_w_rain_cast',f.x,{instance:a.use.id+':zone'});const x=e.hp>0&&distance(f,e)<=1000?e.x:f.x+f.dir*400;g.zones.push({k,x,y:env.surface(x,e.hp>0&&distance(f,e)<=1000?e.y:f.y),life:4,age:0,tick:0,hits:0,use:a.use});}
 if(k==='e'){g.ward.phase='active';f.shield=300;f.shieldUntil=time+CYLAST_SKILLS.e.duration;}
 if(k==='r')env.cue?.('cylast_r_storm',a.originX,{instance:a.use.id+':zone'});
 if(k==='r')g.zones.push({k,x:a.originX,y:a.originY,life:3,age:0,tick:0,hits:0,use:a.use});
}
function visual(f,enemy,dt){const g=f.frost;FrostGame.prototype.updatePose.call(g,dt);if(g.ward){const w=g.ward;w.age+=dt;if(w.phase==='active'&&f.shield<=0)w.phase='fade';if(w.phase==='fade'){w.fadeAge+=dt;if(w.fadeAge>=.38)g.ward=null;}}if(g.qLight){g.qLight.age+=dt;g.qLight.x=enemy.x;g.qLight.y=enemy.y;}if(g.ice){g.ice.age+=dt;if(enemy.hp>0){g.ice.x=enemy.x;g.ice.y=enemy.y;}if(g.ice.age>=g.ice.duration)g.ice=null;}}
function update(f,dt,env){const g=f.frost;if(f.shieldUntil<=env.time)f.shield=0;visual(f,env.enemy,dt);if(f.hp<=0){cancel(f);g.zones=[];f.shield=0;return;}const a=f.action;if(a){a.age+=dt;if(a.age>=a.duration){f.action=null;release(f,a,env);}}
 for(const z of g.zones){z.life-=dt;z.age+=dt;z.tick+=dt;const e=env.enemy,inside=e.hp>0&&distance(e,z)<=CYLAST_SKILLS[z.k].range;
 while(z.tick>=1-1e-8){z.tick-=1;env.decoyArea?.(z.x,z.y,CYLAST_SKILLS[z.k].range,205,z.k==='w'?CYLAST_SKILLS.w.damage:CYLAST_SKILLS.r.damage*Math.max(0,1-CYLAST_SKILLS.r.decay*z.hits),z.use.id+':decoy:'+Math.floor(z.age));if(inside){const index=z.hits,amount=z.k==='w'?CYLAST_SKILLS.w.damage:CYLAST_SKILLS.r.damage*Math.max(0,1-CYLAST_SKILLS.r.decay*index);const dealt=env.damage(f,e,amount,0,false,false,{use:z.use,dot:true,skillHit:true,hitId:z.use.id+':tick:'+(z.serial=(z.serial||0)+1)});if(dealt>0)z.hits++; if(z.k==='r'&&f.hp>0){const heal=Math.min(CYLAST_SKILLS.r.healPerTick,dealt*.2,1000-f.hp);f.hp+=heal;if(heal)env.cue?.('cylast_lifesteal');if(heal)env.emit('damage',f.x,f.y-220,'#a4f4c2',heal,{life:.85,text:'+'+heal});}}}if(z.life<=1e-8&&z.k==='w')f.cd.w=3.5;}
 g.zones=g.zones.filter(z=>z.life>1e-8);
}
window.CylastCombat={init,begin,cancel,update,visual};
})();
