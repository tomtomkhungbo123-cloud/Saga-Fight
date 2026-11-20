// Soulblade lab rig. Updated only by simulation ticks; rendering stays read-only.
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),tau=Math.PI*2,smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function spring(s,key,target,dt,k=130,d=20){let v=s[key+'V']||0,x=s[key]||0;v+=((target-x)*k-v*d)*dt;x+=v*dt;s[key]=x;s[key+'V']=v;return x;}
function update(f,dt){
 if(!(dt>0))return;const a=f.action,s=f.soulMotion??={phase:0,weight:0,previousVx:f.vx,ground:f.ground,land:0};
 // Let already-started liquid sheets tear into droplets after Q; never spawn
 // a future damage pulse from a visual tail or advance time in the renderer.
 if(a?.k==='q'){s.qVfxAge=a.age;s.qVfxStop=a.age;s.qVfxTail=0;s.qVfxWas=true;}
 else if(s.qVfxWas||s.qVfxTail>0){if(s.qVfxWas){s.qVfxWas=false;s.qVfxTail=s.qVfxStop>=.45?.40:.20;}s.qVfxAge+=dt;s.qVfxTail=Math.max(0,s.qVfxTail-dt);}
 if(a?.k==='e'){s.eWas=true;s.eRelease=smooth(a.age/.5);s.eFog=smooth(a.age/.22)*(.56+.20*(1-s.eRelease));s.eTail=0;}else if(s.eWas||s.eTail>0){s.eWas=false;s.eTail=(s.eTail||0)+dt;if(s.eTail>=.65){s.eTail=0;s.eRelease=0;}}
 const speed=clamp(Math.abs(f.vx)/430,0,1),accel=clamp((f.vx-s.previousVx)/dt/5000,-1,1);s.previousVx=f.vx;
 const takeoff=!f.ground&&s.ground;if(f.ground&&!s.ground)s.land=1;else s.land*=Math.exp(-dt*12);s.ground=f.ground;
 // Travel advances the gait; a stopped fighter cannot keep marching in place.
 s.phase=(s.phase+(f.ground?Math.abs(f.vx)*tau/168:0)*dt)%tau;
 s.weight+=((f.ground?speed:0)-s.weight)*(1-Math.exp(-dt*12));
 spring(s,'swing',Math.sin(s.phase+.35)*s.weight*.36,dt,180,23);
 spring(s,'bounce',(5.5+1.3*Math.sin(s.phase*2))*s.weight+s.land*7||0,dt,230,27);
 f.gait=s.phase;f.runWeight=s.weight;f.airWeight+=((f.ground?0:1)-f.airWeight)*(1-Math.exp(-dt*12));

 // Preserve the physical lean in world space when facing flips on direction input.
 const airLean=f.ground?1:.5,leanWorld=clamp((f.vx/430*.23+accel*.055)*airLean,-.285,.285);
 f.lean=spring(s,'leanWorld',leanWorld,dt,150,23)*(f.dir||1);
 // Air legs inherit the takeoff pose, then follow distinct softly delayed arcs.
 if(takeoff||s.airA0===undefined){for(let side=0;side<2;side++){const p=solveLeg(side,f.gait||0,f.runWeight||0,0,f.lean||0,s.bounce||0);s['airA'+side]=Math.atan2(p.knee.x-p.hip.x,p.knee.y-p.hip.y)-(f.lean||0);s['airB'+side]=Math.atan2(p.ankle.x-p.knee.x,p.ankle.y-p.knee.y)-(f.lean||0);s['airA'+side+'V']=s['airB'+side+'V']=0;}}
 s.airPose??={a:[0,0],b:[0,0],grounded:f.ground,land:0};
 for(let side=0;side<2;side++){const goal=jumpAngles(f.vy||0,side);if(!f.ground){spring(s,'airA'+side,goal.thigh,dt,125,20);spring(s,'airB'+side,goal.shin,dt,105,19);}s.airPose.a[side]=s['airA'+side];s.airPose.b[side]=s['airB'+side];}s.airPose.grounded=f.ground;s.airPose.land=s.land;
 // Hair trails in WORLD coordinates. Reversing facing does not invert its velocity.
 const hairTarget=clamp(-f.vx*.027-accel*6,-19,19);
 spring(s,'hair',hairTarget,dt,75,12);s.hair=clamp(s.hair,-23,23);
 spring(s,'tip',s.hair,dt,52,10);s.tip=clamp(s.tip,-26,26);
 spring(s,'arm',clamp(-f.vx*f.dir*.013-accel*f.dir*4,-10,10),dt,105,16);
 spring(s,'weapon',clamp(-f.vx*f.dir/430*.14-accel*f.dir*.07,-.22,.22),dt,90,14);
 f.hair=-f.dir*s.hair/100;f.cloth+=(-f.vx*.075-f.cloth)*(1-Math.exp(-dt*7));
 f.spinBlend+=((a?.k==='q'?1:0)-f.spinBlend)*(1-Math.exp(-dt*22));
 if(a?.k==='q')f.spinPhase+=dt*tau/.6;f.bladeAngle=f.spinPhase*f.spinBlend;
 f.crossBlend+=((a?.k==='q'&&a.age>.16?1:0)-f.crossBlend)*(1-Math.exp(-dt*18));
}
// A complete upright revolution settles at the same orientation before Q ends.
function spinView(f){const a=f.action;if(a?.k!=='q')return {angle:0,amount:0};const duration=a.duration||.6,u=clamp((a.age||0)/duration,0,1),turn=u*u*u*(u*(u*6-15)+10),amount=smooth((a.age||0)/.08)*(1-smooth(((a.age||0)-(duration-.10))/.10));return {angle:tau*turn,amount};}
// E gameplay still ends on time. Its visual reveal continues gently afterward.
function transformView(f){const a=f.action,s=f.soulMotion||{};
 if(a?.k==='e'){const blend=smooth((a.age||0)/.5);return {blend,mist:smooth((a.age||0)/.22)*(.56+.20*(1-blend)),spread:.86+.14*blend,exit:0};}
 if(s.eTail>0){const exit=clamp(s.eTail/.65,0,1),blend=(s.eRelease||0)*(1-smooth(s.eTail/.48));return {blend,mist:(s.eFog??.56)*(1-smooth(exit)),spread:1+.40*smooth(exit),exit};}
 return {blend:0,mist:0,spread:1,exit:0};
}
function foot(phase,side,weight,air){
 const u=((phase/tau+side*.5)%1+1)%1,w=clamp(weight,0,1);
 // First half is stance: foot moves backward relative to the travelling pelvis.
 const x=u<.5?-45+180*u:45-90*((u-.5)*2)**2*(3-2*(u-.5)*2);
 const lift=u<.5?0:Math.sin((u-.5)*tau)*24;
 return {x:(side?147:108)*(1-w)+(115+x)*w,y:240-lift*w-air*(side?25:16),stance:u<.5};
}
function knee(hip,ankle){
 const dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.max(.001,Math.hypot(dx,dy)),len=50;
 const half=Math.min(d/2,len-.01),bend=Math.sqrt(Math.max(0,len*len-half*half));
 return {x:(hip.x+ankle.x)/2-dy/d*bend,y:(hip.y+ankle.y)/2+dx/d*bend};
}
// Bind-pose geometry follows the design's continuous waist/hip/leg contour.
const rest=[{"hip":{"x":97.199012,"y":157.668464},"knee":{"x":100.146002,"y":195.426774},"ankle":{"x":107.32929,"y":235.947889}},{"hip":{"x":123.169362,"y":157.668464},"knee":{"x":133.668014,"y":195.426774},"ankle":{"x":145.087601,"y":235.947889}}];


function pelvis(p,lean,bob){const c=Math.cos(-lean),s=Math.sin(-lean),x=p.x-110,y=p.y-155;return {x:110+x*c-y*s,y:155+bob+x*s+y*c};}
// Local -X is forward. Contact -> support -> heel recovery -> reach.
function jumpAngles(vertical,side){const rise=smooth(clamp(-vertical/900,0,1)),fall=smooth(clamp(vertical/800,0,1));
 return side?{thigh:.10+.08*rise-.06*fall,shin:.84+.24*rise-.57*fall}:{thigh:-.24-.34*rise+.18*fall,shin:.48-.20*rise-.30*fall};}
function solveLeg(side,phase,weight,air,lean,bob,vertical=0,airPose=null){
 const r=rest[side],w=clamp(weight,0,1)*(1-clamp(air,0,1)),u=((phase/tau+side*.5)%1+1)%1;
 const hip=pelvis(r.hip,lean,bob),upper=Math.hypot(r.knee.x-r.hip.x,r.knee.y-r.hip.y),lower=Math.hypot(r.ankle.x-r.knee.x,r.ankle.y-r.knee.y);
 const stance=.43,stanceTime=u/stance,swing=clamp((u-stance)/(1-stance),0,1);
 const stride=u<stance?-36+72*stanceTime:(2*swing**3-3*swing**2+1)*36+(swing**3-2*swing**2+swing)*(72/stance)*(1-stance)+(-2*swing**3+3*swing**2)*-36+(swing**3-swing**2)*(72/stance)*(1-stance);
 // Heel recovers behind the pelvis before the knee reaches forward.
 const lift=u<stance?0:24*Math.sin(Math.PI*swing)**2;
 const run={x:hip.x+stride,y:235.8-lift};
 const jump=jumpAngles(vertical,side),thigh=airPose?airPose.a[side]:jump.thigh,shin=airPose?airPose.b[side]:jump.shin;

 const v=clamp(air,0,1);
 function ik(target){let dx=target.x-hip.x,dy=target.y-hip.y,d=Math.hypot(dx,dy)||1;const reach=clamp(d,Math.abs(upper-lower)+.01,upper+lower-.001);dx*=reach/d;dy*=reach/d;d=reach;const ankle={x:hip.x+dx,y:hip.y+dy},along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));const knee={x:hip.x+dx/d*along-dy/d*height,y:hip.y+dy/d*along+dx/d*height};return {knee,ankle};}
 const running=ik(run),angle=(a,b)=>Math.atan2(b.x-a.x,b.y-a.y),restA=angle(r.hip,r.knee)+lean,restB=angle(r.knee,r.ankle)+lean;
 // Blend angles, not foot targets: near a straight leg IK otherwise introduces
 // a square-root knee pop even for a tiny change in movement weight.
 const A=restA*(1-w-v)+angle(hip,running.knee)*w+(thigh+lean)*v,B=restB*(1-w-v)+angle(running.knee,running.ankle)*w+(shin+lean)*v;
 let knee={x:hip.x+Math.sin(A)*upper,y:hip.y+Math.cos(A)*upper},ankle={x:knee.x+Math.sin(B)*lower,y:knee.y+Math.cos(B)*lower};
 if(airPose?.grounded&&airPose.land>.025){const contact=clamp(airPose.land*3,0,1),y=ankle.y+(235.8-ankle.y)*contact,maxX=Math.sqrt(Math.max(0,(upper+lower-.001)**2-(y-hip.y)**2)),x=clamp(ankle.x,hip.x-maxX,hip.x+maxX),planted=ik({x,y});knee=planted.knee;ankle=planted.ankle;}
 if(!air&&ankle.y>239){const grounded=ik({x:ankle.x,y:239});knee=grounded.knee;ankle=grounded.ankle;}

 return {hip,knee,ankle,upper,lower,stance:u<stance};
}
const outline=[];let cursor={x:94,y:131};
function curve(x1,y1,x2,y2,x3,y3){const a=cursor;for(let i=0;i<=12;i++){const t=i/12,h=1-t;outline.push({x:h*h*h*a.x+3*h*h*t*x1+3*h*t*t*x2+t*t*t*x3,y:h*h*h*a.y+3*h*h*t*y1+3*h*t*t*y2+t*t*t*y3});}cursor={x:x3,y:y3};}
curve(93,140,89,146,89,154);curve(89,160,95,165,102,165);curve(106,165,108,163,110,162);
curve(113,163,117,165,123,164);curve(129,163,132,159,131,153);curve(130,146,127,139,126,131);
function lowerBody(phase,weight,air,lean,bob){
 return {poses:[0,1].map(side=>solveLeg(side,phase,weight,air,lean,bob)),pelvis:outline.map(p=>pelvis(p,lean,bob))};
}
window.SoulMotion={update,transformView,spinView,jumpAngles,foot,knee,lowerBody,solveLeg,rest};
})();
