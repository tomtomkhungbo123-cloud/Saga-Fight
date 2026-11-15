(()=>{
const states=new Map();let prepared=false;
function bodyColor(f,alternate=false){if(f.hp<=0)return '#999999';const color=FairiRig.reference.color;return alternate&&window.FighterPalette?window.FighterPalette.color(color,'fairi'):color}
function prepare(){if(prepared)return;FairiW.prepare();FairiDash.prepare();FairiR.prepare();prepared=true}
function character(ctx,f,e,t,env={}){prepare();const key=f.id??0;let s=states.get(key);if(!s||s.fighter!==f&&s.type!==f.type){s={fighter:f,type:f.type,m:FairiRig.motion(),t:t,trail:FairiDash.createTrail()};states.set(key,s)}let dt=Math.max(1/240,Math.min(.04,t-s.t||1/60));s.t=t;let base=f.action?.k==='r'?f.action.base:env.surface?.(f.x,f.y)??f.y,y=Math.max(0,base-f.y),a=f.action,g=f.fairi||{clones:[],events:[]},q=env.quality||'high',viewer=env.viewer||'enemy';FairiRig.update(s.m,{x:f.x,y,vy:-f.vy,vx:f.vx,dir:f.dir},dt);
s.m.bodyColor=env.bodyColor;ctx.save();ctx.translate(0,base-550);let v=null;
if(a?.k==='r'){v={...a,t:a.age,sy:base-a.sy,ty:base-a.ty,actors:a.actors};FairiR.ring(ctx,v,a.age,q);FairiR.drawClones(env.palette||ctx,v,t,q,viewer)}
for(let c of g.clones){if(a?.k==='r')continue;let cy=c.worldY??base-c.y,al=FairiClones.presentation(viewer,c,4).alpha,k=c.pose===0?'n'+((c.normalStage||0)+1):c.pose===1?'q':'run',m=FairiRig.motion();m.bodyColor=env.bodyColor;m.run=Math.min(1,Math.abs(c.vx)/230);m.lean=Math.max(-.6,Math.min(.6,c.vx*.00135));m.gait=c.gait;m.airBlend=c.y>0?1:0;m.flightTime=c.y>0?.2:0;m.wasAir=c.y>0;let p=FairiRig.draw(ctx,c.x,base-cy,c.dir,t+c.phase,k,c.swing,al,c.normalHand||0,viewer!=='enemy',m,q);if(k==='q')FairiDash.draw(ctx,{x:c.x,y:base-cy},{sx:c.castX,sy:c.castY,dir:c.castDir,duration:.22},c.swing,p,q)}
for(let ev of g.events||[]){let age=t-ev.t;if(ev.k==='reveal')FairiW.mist(ctx,ev.x,base-ev.y,t,1,false,viewer,q,FairiW.revealView(viewer,age));else FairiW.burst(ctx,ev.x,base-ev.y,t,age,q)}
let wview=FairiW.visibility(viewer,a?.k==='w'?a.age/.5:0,g.stealth>0),alpha=g.stealth||a?.k==='w'?wview.body:1;if(a?.k==='e')alpha=FairiClones.splitAlpha(a.age,false);for(let ev of g.events||[])if(ev.k==='reveal'&&t-ev.t<.22)alpha=Math.min(alpha,FairiW.revealView(viewer,t-ev.t).body);if(g.stealth||a?.k==='w')FairiW.mist(ctx,f.x,y,t,a?.k==='w'?a.age/.5:1,g.stealth>0,viewer,q);
let k=f.normal?'n'+f.normal.n:a?.k|| (Math.abs(f.vx)>25?'run':'idle'),u=a?Math.min(1,a.age/a.duration):0,dir=a?.dir||f.dir,echoes=a?.k==='q'?FairiDash.echoes({...a,sy:base-a.sy},u,q,340):null,p=FairiRig.draw(ctx,f.x,y,dir,t,k,u,alpha,f.normal?.n===2?1:0,false,s.m,q,echoes);
if(a?.k==='q'){if(s.sourceAction!==a){s.sourceAction=a;s.qAction={...a,sy:base-a.sy}}s.qAction.t=a.age}s.trail.update({x:f.x,y},a?.k==='q'?s.qAction:null,u,p,t,340);s.trail.draw(ctx,t,q);
if(v){FairiR.mainTrail(ctx,v,t,{x:f.x,y},p,q);FairiR.ring(ctx,v,a.age,q,true)}
if(a?.k==='ambush'&&a.age>.34){let w=p.wrists[1];FairiDash.drawLance(ctx,{x:f.x+dir*w[0],y:550-y+w[1],dir:1,angle:Math.PI/2,length:Math.min(340,(a.age-.34)*950)},Math.min(1,(a.age-.34)/.1)*(1-Math.min(1,Math.max(0,(a.age-.63)/.15))),q)}
ctx.restore()}
window.FairiVisual={character,bodyColor,prepare,reset(id){if(id==null)states.clear();else states.delete(id)}};
})();
