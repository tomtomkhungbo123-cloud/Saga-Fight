'use strict';
// One seed per E cast; all decisions use simulation time, never render frames.
const FairiClones=(()=>{
 const CFG={hp:500,launchSpeeds:[420,385,325,440],runSpeed:310,acceleration:1300,gravity:1850,launchTime:.55,qFirst:.80,qGroupGap:.90,qDuration:.22,qRange:340,reactionMin:.10,reactionMax:.19,dodgeChance:.68,standOff:260,pressureTurn:1.30,splitHideStart:.035,splitHidden:.065,splitReveal:.115,splitVisible:.175};
 const DEFAULT_BOUNDS={min:70,max:1530};
 function random(seed,n){let x=Math.imul((seed+1)|0,0x9e3779b1)^Math.imul((n+1)|0,0x85ebca6b);x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296}
 function plan(seed,arena={min:45,max:1555}){seed=seed>>>0;let majority=random(seed,1)<.5?-1:1,minority=Math.floor(random(seed,2)*4),directions=Array.from({length:4},(_,i)=>i===minority?-majority:majority),order=[0,1,2,3];for(let i=3;i>0;i--){let j=Math.floor(random(seed,10+i)*(i+1));[order[i],order[j]]=[order[j],order[i]]}return {seed,bounds:{min:arena.min+25,max:arena.max-25},directions,order,index:0,qNext:CFG.qFirst,qStarts:[],minority,pressureIndex:0,pressureId:order[0],pressureNext:CFG.pressureTurn}}
 function spawn(id,p,group=plan(0)){let direction=group.directions[id],rank=group.directions.slice(0,id).filter(d=>d===direction).length,jump=id===group.minority?(random(group.seed,id+20)>.5?500:0):[0,480,700][rank];return {id,homeX:p.x,hops:jump>0?1:0,nextHop:.85+random(group.seed,id+50)*.8,seed:group.seed+id*31,x:p.x,y:p.y,vx:direction*CFG.launchSpeeds[id],vy:(p.y>0?p.vy:0)+jump,age:0,hp:CFG.hp,maxHP:CFG.hp,dir:direction,launchDir:direction,launchSpeed:CFG.launchSpeeds[id],phase:id*1.8,pose:4,swing:0,gait:id*1.3,mode:'scatter',modeUntil:CFG.launchTime,targetDir:direction,targetSpeed:CFG.launchSpeeds[id],decision:0,skillKind:-1,skillAge:0,skillDuration:0,attackCount:0,nextDecision:CFG.launchTime+.03*id,recoverUntil:0,threatSeen:-1,reactAt:Infinity}}
 function prepare(group,clones){if(!group||!clones.length)return;for(let i=0;i<4&&!clones.some(c=>c.id===group.order[group.index]);i++)group.index=(group.index+1)%4;let now=clones[0].age,old=clones.find(c=>c.id===group.pressureId);if(!old||(now>=group.pressureNext&&old.skillKind<0)){group.pressureIndex=(group.pressureIndex+1)%4;for(let i=0;i<4&&!clones.some(c=>c.id===group.order[group.pressureIndex]);i++)group.pressureIndex=(group.pressureIndex+1)%4;group.pressureId=group.order[group.pressureIndex];group.pressureNext=now+CFG.pressureTurn}}
 function skill(c,kind,dir){c.skillKind=kind;c.qHitShown=false;c.skillAge=0;c.castX=c.x;c.castY=c.y;c.castDir=dir;c.dir=dir;c.pose=kind;c.normalStage=c.attackCount%3;c.normalHand=(c.id+c.attackCount)%2;c.skillDuration=kind===1?CFG.qDuration:[.36,.38,.48][c.normalStage];if(kind===0)c.attackCount++;c.mode=kind===1?'dash':'attack'}
 function physics(c,dt,bounds){let target=c.targetDir*c.targetSpeed;c.vx+=Math.max(-CFG.acceleration*dt,Math.min(CFG.acceleration*dt,target-c.vx));c.x=Math.max(bounds.min,Math.min(bounds.max,c.x+c.vx*dt));c.vy-=CFG.gravity*dt;c.y=Math.max(0,c.y+c.vy*dt);if(!c.y)c.vy=0;if(Math.abs(c.vx)>45)c.dir=Math.sign(c.vx)}
 function step(c,dt,enemy={},group=null){const bounds=group?.bounds||DEFAULT_BOUNDS;c.age+=dt;let dx=(Number.isFinite(enemy.x)?enemy.x:c.x+180)-c.x,distance=Math.abs(dx),toward=Math.sign(dx)||c.dir,threat=enemy.attackIntentId||0,pressure=!group||group.pressureId===c.id;
 if((enemy.attackWindup||0)>0&&distance<245&&c.threatSeen!==threat){c.threatSeen=threat;c.reactAt=c.age+CFG.reactionMin+random(c.seed,threat+70)*(CFG.reactionMax-CFG.reactionMin);c.willDodge=random(c.seed,threat+92)<CFG.dodgeChance}
 let casting=c.skillKind>=0&&c.skillAge<c.skillDuration;
 if(casting){c.skillAge+=dt;c.swing=Math.min(1,c.skillAge/c.skillDuration);c.pose=c.skillKind;if(c.skillKind===1){let u=c.swing,v=u*u*(3-2*u);c.x=Math.max(bounds.min,Math.min(bounds.max,c.castX+c.castDir*CFG.qRange*v));c.y=c.castY;c.vy=0;c.vx=c.castDir*CFG.qRange*6*u*(1-u)/c.skillDuration;c.dir=c.castDir}else {c.targetSpeed=0;physics(c,dt,bounds);c.dir=c.castDir}if(c.skillAge>=c.skillDuration){c.recoverUntil=c.age+.14+random(c.seed,c.decision+120)*.12;c.mode='recover';if(c.skillKind===1){c.targetDir=c.castDir;c.targetSpeed=380}c.skillKind=-1;c.pose=4;c.nextDecision=c.recoverUntil}c.gait+=Math.abs(c.vx)*dt*Math.PI*2/(52/.42);return}
 c.pose=4;c.swing=0;if(!pressure&&(c.mode==='approach'||c.mode==='bait'))c.nextDecision=c.age;
 if(c.age>CFG.launchTime&&c.willDodge&&c.age>=c.reactAt&&(enemy.attackWindup||0)>0){c.willDodge=false;c.reactAt=Infinity;c.mode='dodge';c.modeUntil=c.age+.25+random(c.seed,threat+99)*.10;c.targetDir=-toward;c.targetSpeed=390;c.vx=-toward*380;c.dodgeFacing=toward;if(c.y===0&&random(c.seed,threat+33)>.4)c.vy=420;c.nextDecision=c.modeUntil}
 if(c.age<CFG.launchTime){c.targetDir=c.launchDir;c.targetSpeed=c.launchSpeed}
 else if(c.age>=c.nextDecision){let n=++c.decision,r=random(c.seed,n),span=.24+random(c.seed,n+40)*.25;c.nextDecision=c.age+span;c.modeUntil=c.nextDecision;
 if(!pressure){c.mode=distance<CFG.standOff?'withdraw':'roam';let side=c.launchDir,target=(c.homeX||c.x)+side*(190+random(c.seed,n+23)*260);if(Number.isFinite(enemy.x)&&Math.abs(target-enemy.x)<CFG.standOff)target=enemy.x+side*(CFG.standOff+90);target=Math.max(bounds.min+20,Math.min(bounds.max-20,target));c.targetDir=distance<CFG.standOff?-toward:Math.sign(target-c.x)||side;c.targetSpeed=240+random(c.seed,n+27)*100}
 else if(distance>340){c.mode='approach';c.targetDir=toward;c.targetSpeed=300+random(c.seed,n+3)*70}
 else if(distance<75){c.mode='retreat';c.targetDir=-toward;c.targetSpeed=250+random(c.seed,n+4)*90}
 else if(r<.35&&distance<185&&c.age>=c.recoverUntil){skill(c,0,toward);c.gait+=Math.abs(c.vx)*dt*.05;return}
 else if(r<.72){c.mode='bait';c.targetDir=toward;c.targetSpeed=140+random(c.seed,n+6)*80;c.baitTurn=c.age+span*.5}
 else {c.mode='retreat';c.targetDir=-toward;c.targetSpeed=230+random(c.seed,n+7)*80}
 }
 if(!pressure&&c.age>CFG.launchTime&&distance<CFG.standOff&&c.mode!=='dodge'){c.mode='withdraw';c.targetDir=-toward;c.targetSpeed=340}
 if(c.y===0&&distance>CFG.standOff&&c.age>=c.nextHop&&c.age>CFG.launchTime&&c.mode!=='dodge'){c.vy=480+random(c.seed,c.hops+210)*170;c.hops++;c.nextHop=c.age+.95+random(c.seed,c.hops+220)*.65}
 if(c.mode==='bait'&&c.age>c.baitTurn){c.targetDir=-toward;c.targetSpeed=260}
 // A group-wide token gives only one agent Q, then waits longer than its light trail.
 if(group&&c.age>=group.qNext&&c.id===group.order[group.index]&&c.age>=c.recoverUntil&&c.mode!=='dodge'&&c.age>CFG.launchTime){let direction=distance>110?toward:-toward;if(c.x<bounds.min+100)direction=1;if(c.x>bounds.max-100)direction=-1;skill(c,1,direction);group.qStarts.push({id:c.id,age:c.age});group.qNext=c.age+CFG.qGroupGap;group.index=(group.index+1)%4;return}
 if(c.x<bounds.min+40){c.targetDir=1;c.targetSpeed=Math.max(230,c.targetSpeed)}if(c.x>bounds.max-40){c.targetDir=-1;c.targetSpeed=Math.max(230,c.targetSpeed)}
 physics(c,dt,bounds);if(c.mode==='dodge')c.dir=c.dodgeFacing;c.gait+=Math.abs(c.vx)*dt*Math.PI*2/(52/.42);
 }
 function splitAlpha(age,clone=false){let smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};if(age<CFG.splitReveal)return clone?0:1-smooth((age-CFG.splitHideStart)/(CFG.splitHidden-CFG.splitHideStart));return smooth((age-CFG.splitReveal)/(CFG.splitVisible-CFG.splitReveal))}
 function presentation(viewer,c,life=4){return {alpha:splitAlpha(c.age,true)*(viewer==='enemy'?1:Math.max(0,Math.min(1,(life-c.age)/.18))*.62),lightweight:viewer!=='enemy',ambientMist:false}}
 return {CFG,plan,spawn,prepare,step,presentation,splitAlpha};
})();
if(typeof module!=='undefined')module.exports=FairiClones;
