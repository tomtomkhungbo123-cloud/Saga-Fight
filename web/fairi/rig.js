'use strict';
const FairiRig=(()=>{
 const WS=typeof FairiW!=='undefined'?FairiW:require('./w-skill.js');
 const N=typeof FairiNormal!=='undefined'?FairiNormal:require('./normal-combo.js');
 const R=typeof FAIRI_REFERENCE!=='undefined'?FAIRI_REFERENCE:require('./reference-shape.js');
 const mix=(a,b,t)=>a+(b-a)*t,sat=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=sat(x);return x*x*(3-2*x)},P=(x,y)=>[(x-R.origin[0])*R.scale,(y-R.origin[1])*R.scale],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const rest={hip:P(268,380),chest:P(268,250),neck:P(267,215),head:P(262,173),shoulders:[P(226,244),P(309,244)],elbows:[P(214,283),P(324,283)],wrists:[P(205,327),P(332,326)],hips:[P(241,380),P(296,380)],knees:[P(237,460),P(302,460)],feet:[P(232,533),P(306,533)]};
 function spring(m,key,target,dt,k=95,damping=19){let v=key+'V';m[v]??=0;m[key]??=0;m[v]+=(target-m[key])*k*dt-m[v]*damping*dt;m[key]+=m[v]*dt}
 const MOTION_CFG={runLean:.60,leanMax:.76,attackRunLeanScale:.20,attackSlashLeanScale:.55,attackLeanMax:.34,attackRecoverStart:.78,runUpper:[-1.60,-1.0],runFore:[-1.90,.12],guardBlade:[.55,-.40],jumpUpper:[-.95,.28],jumpFore:[-1.25,.88]};
 function motion(){return {lean:0,leanV:0,sway:0,swayV:0,gait:0,run:0,runV:0,land:0,landV:0,wasAir:false,previousVx:0,facing:1,airBlend:0,airBlendV:0,vertical:0,flightTime:0,armLag:0,armLagV:0}}
 function update(m,p,dt){let speed=Math.abs(p.vx),acc=(p.vx-m.previousVx)/dt,vy=p.vy||0,air=p.y>.1||vy>0;if(speed>35)m.facing=Math.sign(p.vx);else if(speed<8)m.facing=p.dir||m.facing;
 if(air&&!m.wasAir)m.flightTime=0;if(air)m.flightTime+=dt;
 const leanTarget=air?p.vx*.00085:p.vx*MOTION_CFG.runLean/330+acc*.000026;
 spring(m,'lean',Math.max(-MOTION_CFG.leanMax,Math.min(MOTION_CFG.leanMax,leanTarget)),dt,85,18);
 spring(m,'sway',Math.max(-5,Math.min(5,-acc*.0013-p.vx*.004)),dt,65,15);spring(m,'run',sat(speed/230),dt,100,21);
 spring(m,'airBlend',air?1:0,dt,210,29);m.vertical=mix(m.vertical,vy,1-Math.exp(-dt*18));
 spring(m,'armLag',Math.max(-.28,Math.min(.28,-acc*m.facing*.000075-vy*.00018)),dt,60,16);
 if(speed>8&&!air)m.gait+=speed*dt*Math.PI*2/REPEAT_DISTANCE;
 if(m.wasAir&&!air)m.landV=62;spring(m,'land',0,dt,160,22);m.wasAir=air;m.previousVx=p.vx;
 }

 function ik(a,b,l1,l2,bend){let dx=b[0]-a[0],dy=b[1]-a[1],raw=Math.hypot(dx,dy),d=Math.min(l1+l2-1e-7,Math.max(Math.abs(l1-l2)+1e-7,raw)),ux=dx/(raw||1),uy=dy/(raw||1),along=(l1*l1-l2*l2+d*d)/(2*d),off=Math.sqrt(Math.max(0,l1*l1-along*along));return [a[0]+ux*along-uy*off*bend,a[1]+uy*along+ux*off*bend]}
 function rotate(v,origin,angle){let x=v[0]-origin[0],y=v[1]-origin[1],c=Math.cos(angle),s=Math.sin(angle);return [origin[0]+x*c-y*s,origin[1]+x*s+y*c]}
 function normalLean(locomotion,slash,u,duration){let weight=smooth(u*duration/N.blendTime)*(1-smooth((u-MOTION_CFG.attackRecoverStart)/(1-MOTION_CFG.attackRecoverStart))),balanced=Math.max(-MOTION_CFG.attackLeanMax,Math.min(MOTION_CFG.attackLeanMax,locomotion*MOTION_CFG.attackRunLeanScale+slash*MOTION_CFG.attackSlashLeanScale));return mix(locomotion,balanced,weight)}
 // During contact the ankle moves backwards by exactly the travel of the
 // fighter. The swing then rolls the heel up, passes under the hips and reaches.
 const REPEAT_DISTANCE=52/.42,CONTACT=.39,HALF_STEP=REPEAT_DISTANCE*CONTACT/2;
 const RUN_LEAN=.22,RUN_UPPER=[-1.61,-1.42],RUN_FORE=[-1.58,-1.49],RUN_GUARD=[1.10,1.29];
 const swingSpeed=-REPEAT_DISTANCE*(1-CONTACT);
 const SWING=[
  // [phase, x, height, x tangent, height tangent] in swing time
  [0,-HALF_STEP,0,swingSpeed,0],
  [.24,-31,25,55,110],
  [.49,-6,37,118,0],
  [.76,24,15,65,-108],
  [1,HALF_STEP,0,swingSpeed,0]
 ];
 const runBones={
  spine:[['hip','chest'],['chest','neck'],['neck','head']],
  arm:[['shoulders','elbows'],['elbows','wrists']],
  leg:[['hips','knees'],['knees','feet']]
 };
 const boneLimits={spine:[.8,1.2],arm:[.7,1.35],leg:[.72,1.3]};
 const runJointLimits={hip:[14,14],shoulders:[12,10],hips:[12,10],spineTurn:[-.54,.54]};
 const vector=(a,b)=>[b[0]-a[0],b[1]-a[1]];
 const plus=(a,b)=>[a[0]+b[0],a[1]+b[1]];
 const scaled=(v,k)=>[v[0]*k,v[1]*k];
 function runSkeleton(source){
  const length=(type,side)=>runBones[type].map((_,i)=>
   bound(type==='spine'?source?.lengths?.spine?.[i]:source?.lengths?.[type]?.[side]?.[i],1,boneLimits[type]));
  const offset=(type,side)=>runJointLimits[type].map((max,i)=>
   bound((side===undefined?source?.offsets?.[type]:source?.offsets?.[type]?.[side])?.[i],0,[-max,max]));
  const spine=length('spine');
  const arm=[length('arm',0),length('arm',1)],leg=[length('leg',0),length('leg',1)];
  const hip=offset('hip'),shoulders=[offset('shoulders',0),offset('shoulders',1)],hips=[offset('hips',0),offset('hips',1)];
  const turns=spine.map((_,i)=>bound(source?.turns?.[i],0,runJointLimits.spineTurn));
  const active=[...spine,...arm.flat(),...leg.flat()].some(v=>v!==1)||
   [...hip,...shoulders.flat(),...hips.flat(),...turns].some(v=>v!==0);
  return {lengths:{spine,arm,leg},offsets:{hip,shoulders,hips},turns,active};
 }
 function adjustedRunTorso(base,skeleton,weight){
  const {lengths,offsets,turns}=skeleton;
  const legLengths=lengths.leg.map((scales,i)=>scales.map((factor,j)=>{
   const [a,b]=runBones.leg[j];
   return dist(rest[a][i],rest[b][i])*mix(1,factor,weight);
  }));
  const legReach=legLengths.map(([a,b])=>a+b);
  const originalReach=legLengths.map((_,i)=>dist(rest.hips[i],rest.knees[i])+dist(rest.knees[i],rest.feet[i]));
  const lengthChanges=legReach.map((reach,i)=>reach-originalReach[i]);
  const meanLengthChange=(lengthChanges[0]+lengthChanges[1])/2;
  const hipShift=scaled(offsets.hip,weight);
  hipShift[1]-=meanLengthChange*.72;
  const hipAnchors=base.hips.map((point,i)=>{
   const anchor=plus(point,scaled(offsets.hips[i],weight));
   anchor[1]-=(lengthChanges[i]-meanLengthChange)*.72;
   return anchor;
  });
  for(let i=0;i<2;i++){
   // Leave room for a planted ankle at either end of its travel.
   const reachableDepth=Math.sqrt(Math.max(0,(legReach[i]-1.5)**2-HALF_STEP**2));
   const groundShift=rest.feet[i][1]+2-reachableDepth-hipAnchors[i][1];
   hipShift[1]=Math.max(hipShift[1],groundShift*weight);
  }
  const hip=plus(base.hip,hipShift),spine=[hip];
  const deltas={hip:hipShift};
  let accumulatedTurn=0;
  for(const [i,[from,to]] of runBones.spine.entries()){
   accumulatedTurn+=turns[i]*weight;
   const bone=vector(base[from],base[to]);
   const end=plus(spine[i],scaled(rotate(bone,[0,0],accumulatedTurn),mix(1,lengths.spine[i],weight)));
   spine.push(end);
   deltas[to]=vector(base[to],end);
  }
  const [,,neck,head]=spine;
  const chest=spine[1];
  const shoulderAnchors=base.shoulders.map(point=>plus(chest,rotate(vector(base.chest,point),[0,0],turns[0]*weight)));
  const shoulders=shoulderAnchors.map((point,i)=>plus(point,scaled(offsets.shoulders[i],weight)));
  const hipCenters=base.hips.map(point=>plus(point,hipShift));
  const hips=hipAnchors.map((anchor,i)=>{
   const point=plus(anchor,hipShift),[thigh,shin]=legLengths[i];
   const furthest=Math.sqrt(Math.max(0,(thigh+shin-1.5)**2-HALF_STEP**2));
   const highest=rest.feet[i][1]+2-furthest;
   const lowest=-thigh-8;
   point[1]=mix(point[1],Math.max(highest,Math.min(lowest,point[1])),weight);
   return point;
  });
  return {hip,chest,neck,head,hips,shoulders,legLengths,deltas,shoulderAnchors,hipCenters,turn:turns[0]*weight};
 }

 const runRigLimits={
  lean:[-.08,.48],
  upper:[-2.52,-.85],
  fore:[-2.77,-.65],
  blade:[.40,1.95],
  stepX:[[-40,-16],[-21,10],[12,35]],
  stepLift:[[14,34],[24,42],[8,26]]
 };
 const bound=(value,fallback,[min,max])=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
 function runRigSettings(source){
  const steps=(input,fallback)=>fallback.map(([x,lift],i)=>[
   bound(input?.[i]?.[0],x,runRigLimits.stepX[i]),
   bound(input?.[i]?.[1],lift,runRigLimits.stepLift[i])
  ]);
  const first=steps(source?.steps,[[-31,25],[-8,33],[24,15]]);
  return {
   lean:bound(source?.lean,RUN_LEAN,runRigLimits.lean),
   upper:RUN_UPPER.map((v,i)=>bound(source?.upper?.[i],v,runRigLimits.upper)),
   fore:RUN_FORE.map((v,i)=>bound(source?.fore?.[i],v,runRigLimits.fore)),
   blade:RUN_GUARD.map((v,i)=>bound(source?.blade?.[i],v,runRigLimits.blade)),
   steps:first,
   otherSteps:steps(source?.otherSteps,first),
   skeleton:runSkeleton(source?.skeleton),
   mesh:meshPairSettings(source?.mesh)
  };
 }
 function hermite(a,b,da,db,u){
  const u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*a+(u3-2*u2+u)*da+(-2*u3+3*u2)*b+(u3-u2)*db;
 }
 function sprintStep(phase,leg,tuning){
  const cycle=((phase/(2*Math.PI)+leg*.5)%1+1)%1;
  if(cycle<CONTACT)return [HALF_STEP-REPEAT_DISTANCE*cycle,0];
  const swing=(cycle-CONTACT)/(1-CONTACT);
  let index=1;
  while(index<SWING.length-1&&swing>SWING[index][0])index++;
  const a=SWING[index-1],b=SWING[index],span=b[0]-a[0],u=(swing-a[0])/span;
  const steps=leg?tuning?.otherSteps:tuning?.steps;
  const start=steps?.[index-2],end=steps?.[index-1];
  return [hermite(start?.[0]??a[1],end?.[0]??b[1],a[3]*span,b[3]*span,u),
    hermite(start?.[1]??a[2],end?.[1]??b[2],a[4]*span,b[4]*span,u)];
 }
 function combatStep(phase,leg){
  const cycle=((phase/(Math.PI*2)+leg*.5)%1+1)%1;
  if(cycle<.42)return [26-52*cycle/.42,0];
  const u=sat((cycle-.42)/.58),v=-52*.58/.42;
  return [hermite(-26,26,v,v,u),8*Math.sin(Math.PI*u)**2];
 }
 function pose(t,kind,u,hand,y,m,dir){m??=motion();if(kind==='r'){let time=u*1.05,push=smooth((time-.44)/.15),recover=smooth((time-.78)/.22);m={...m,lean:mix(-.08,.34,push)*(1-recover),rThrust:push*(1-recover)}}let run=sat(m.run),phase=m.gait,air=y>5||m.airBlend>.01,dash=kind==='q'||kind==='r',attack=kind==='attack'||/^n[123]$/.test(kind),stage=kind[0]==='n'?Number(kind[1])-1:0,normal=attack?N.sample(stage,u,hand):null,transition=(attack||kind==='ambush')&&m.attackFrom?N.smooth(u*(attack?N.stages[stage].duration:WS.CFG.duration)/N.blendTime):1,plunge=kind==='ambush',plungePose=plunge?WS.pose(u):null,dashBlend=kind==='q'?smooth(u/.20)*smooth((1-u)/.28):kind==='r'?smooth((u*1.05-.44)/.16)*(1-smooth((u*1.05-.8)/.25)):1,sprinting=kind==='run'||kind==='idle',runRig=sprinting?(m.runRig??defaultRunRig):null,forwardLean=m.lean*dir,lean=mix((attack||plunge)&&m.attackFrom?m.attackFrom.lean:m.lean*dir,plunge?plungePose.lean:attack?normalLean(m.lean*dir,normal.lean,u,N.stages[stage].duration):(sprinting?mix(forwardLean,Math.max(0,forwardLean)+(runRig?.lean??RUN_LEAN)*run,1-sat(m.airBlend)):forwardLean)+(dash?.58*dashBlend:0),transition),land=m.land+(plunge?plungePose.crouch:0),bob=air?0:run*(1-Math.cos(phase*2))*1.35+Math.sin(t*2.5)*.35,lower=run*8*(1-sat(m.airBlend));
 const mesh=kind==='finish'?null:meshForMotion((m.runRig??defaultRunRig).mesh,run);
 const airWeight=m.flightTime>0?sat(m.airBlend):(y>5?1:0),vy=m.vertical||0,rise=smooth((vy-30)/350),fall=(y<=.1&&m.flightTime>0&&!m.wasAir)?1:smooth((-vy-30)/450),apex=1-smooth(Math.abs(vy)/240),preland=(y<=.1&&m.flightTime>0&&!m.wasAir)?1:fall*smooth((52-y)/42);
 const waist=P(268,340),root=v=>{let q=rotate(v,waist,lean);return [q[0],q[1]+land-bob+lower]};
 let hip=[rest.hip[0],rest.hip[1]+land-bob+lower],torsoPivot=[waist[0],waist[1]+land-bob+lower],
  chest=root(rest.chest),neck=root(rest.neck),head=root(rest.head),shoulders=rest.shoulders.map(root),
  hips=rest.hips.map(h=>[mix(h[0],h[0]*.58,sprinting?run*(1-airWeight):0),h[1]+land-bob+lower]);
 const profile=sprinting?run*(1-airWeight):0;
 if(profile>0){
  const shoulderX=(shoulders[0][0]+shoulders[1][0])/2;
  const shoulderY=(shoulders[0][1]+shoulders[1][1])/2;
  shoulders=shoulders.map(([x,y])=>[mix(x,shoulderX,profile*.64),mix(y,shoulderY,profile*.64)]);
  head=rotate(head,neck,-.28*profile);
 }
 head[0]+=m.sway*dir*.2;
 let skeleton=null;
 if(profile>0&&runRig?.skeleton?.active){
  skeleton=adjustedRunTorso({hip,chest,neck,head,shoulders,hips},runRig.skeleton,profile);
  ({hip,chest,neck,head,shoulders,hips}=skeleton);
  torsoPivot=plus(torsoPivot,skeleton.deltas.hip);
 }
 let feet=rest.feet.map((foot,i)=>{
  const [step,lift]=sprinting?sprintStep(phase,i,runRig):combatStep(phase,i);
  return [mix(foot[0],hips[i][0]+step,run),foot[1]-lift*run];
 });
 if(airWeight>0){let target=[[hips[0][0]+mix(16,2,preland),mix(hips[0][1]+53-4*apex+8*fall,rest.feet[0][1],preland)],[hips[1][0]-mix(18,3,preland),mix(hips[1][1]+58-3*apex+3*fall,rest.feet[1][1],preland)]];feet=feet.map((f,i)=>[mix(f[0],target[i][0],airWeight),mix(f[1],target[i][1],airWeight)])}
 // Project the torso around the pelvis for the elevated cinematic camera.
 if(kind==='finish'){
  const project=q=>[q[0],hip[1]+(q[1]-hip[1])*.70];
  chest=project(chest);neck=project(neck);head=[head[0],hip[1]+(head[1]-hip[1])*.85];
  shoulders=shoulders.map(project);
  feet=feet.map((_,i)=>[hips[i][0]+(i?-10:9),hips[i][1]+(i?43:36)]);
 }
 if(dash){let target=[[hips[0][0]-37,-14],[hips[1][0]-28,-40]];feet=feet.map((f,i)=>f.map((v,j)=>mix(v,target[i][j],dashBlend)))}

 let runElbows=[],wrists=rest.wrists.map((w,i)=>{let swing=Math.sin(phase+i*Math.PI),a0=Math.atan2(rest.elbows[i][0]-rest.shoulders[i][0],rest.elbows[i][1]-rest.shoulders[i][1]),a1=Math.atan2(w[0]-rest.elbows[i][0],w[1]-rest.elbows[i][1]);
 let groundUpper=runRig?mix(a0+lean,runRig.upper[i]+swing*.10-lean*.12,run):mix(a0,MOTION_CFG.runUpper[i]+swing*.07,run)+lean;
 let groundFore=runRig?mix(a1+lean,runRig.fore[i]+swing*.13-lean*.12,run):mix(a1,MOTION_CFG.runFore[i]+swing*.10,run)+lean;
 let jumpUpper=MOTION_CFG.jumpUpper[i]-.12*rise+.20*fall+lean,jumpFore=MOTION_CFG.jumpFore[i]+.18*fall+lean,upper=mix(groundUpper,jumpUpper,airWeight)+(m.armLag||0)*.60,fore=mix(groundFore,jumpFore,airWeight)+(m.armLag||0),l1=dist(rest.shoulders[i],rest.elbows[i])*mix(1,runRig?.skeleton?.lengths.arm[i][0]??1,profile),l2=dist(rest.elbows[i],w)*mix(1,runRig?.skeleton?.lengths.arm[i][1]??1,profile),sh=shoulders[i],el=[sh[0]+Math.sin(upper)*l1,sh[1]+Math.cos(upper)*l1];runElbows[i]=el;return [el[0]+Math.sin(fore)*l2,el[1]+Math.cos(fore)*l2]}),angles=[lean,lean];
 if(dash){let target=[root(P(218,308)),[chest[0]+43,chest[1]+17]];wrists=wrists.map((w,i)=>w.map((v,j)=>mix(v,target[i][j],dashBlend)));angles=[mix(lean,.6,dashBlend),mix(lean,-1.5,dashBlend)]}


 if(kind==='r'&&u<.48){let v=smooth(u/.2);wrists=rest.wrists.map((w,i)=>{let z=root(w);z[1]-=51*v;return z});angles=[2.7,-2.7]}
 // Clamp each hand to the two anatomical bone lengths before solving its elbow.
 let elbows=skeleton?runElbows:shoulders.map((s,i)=>{let l1=dist(rest.shoulders[i],rest.elbows[i]),l2=dist(rest.elbows[i],rest.wrists[i]),d=dist(s,wrists[i]);if(d>l1+l2-.001){let k=(l1+l2-.001)/d;wrists[i]=[s[0]+(wrists[i][0]-s[0])*k,s[1]+(wrists[i][1]-s[1])*k]}let a=rest.shoulders[i],b=rest.wrists[i],e=rest.elbows[i],cross=(b[0]-a[0])*(e[1]-a[1])-(b[1]-a[1])*(e[0]-a[0]);return ik(s,wrists[i],l1,l2,Math.sign(cross)||1)});
 if(!dash&&!attack&&!plunge&&!(kind==='r'&&u<.48)){elbows=runElbows;angles=wrists.map((w,i)=>mix(lean,mix(runRig?runRig.blade[i]+Math.sin(phase+i*Math.PI)*.10:MOTION_CFG.guardBlade[i],i?.05:.70,airWeight),Math.max(run,airWeight))+(m.armLag||0)*.4);}
 if(attack){for(let i=0;i<2;i++){let sh=shoulders[i],l1=dist(rest.shoulders[i],rest.elbows[i]),l2=dist(rest.elbows[i],rest.wrists[i]),base0=Math.atan2(runElbows[i][0]-sh[0],runElbows[i][1]-sh[1]),base1=Math.atan2(wrists[i][0]-runElbows[i][0],wrists[i][1]-runElbows[i][1]),baseAngle=mix(lean,mix(MOTION_CFG.guardBlade[i],i?.05:.70,airWeight),Math.max(run,airWeight)),values=i===hand?normal.active:normal.guard,w=normal.weight;let a0=mix(base0,values[0]+lean,w),a1=mix(base1,values[1]+lean,w),bladeAngle=mix(baseAngle,values[2],w);if(m.attackFrom){let prev=m.attackFrom,ps=prev.shoulders[i],pe=prev.elbows[i],pw=prev.wrists[i];a0=mix(Math.atan2(pe[0]-ps[0],pe[1]-ps[1]),a0,transition);a1=mix(Math.atan2(pw[0]-pe[0],pw[1]-pe[1]),a1,transition);bladeAngle=mix(prev.angles[i],bladeAngle,transition)}elbows[i]=[sh[0]+Math.sin(a0)*l1,sh[1]+Math.cos(a0)*l1];wrists[i]=[elbows[i][0]+Math.sin(a1)*l2,elbows[i][1]+Math.cos(a1)*l2];angles[i]=bladeAngle}}
 if(plunge){for(let i=0;i<2;i++){let v=plungePose,l1=dist(rest.shoulders[i],rest.elbows[i]),l2=dist(rest.elbows[i],rest.wrists[i]),sh=shoulders[i],rest0=Math.atan2(rest.elbows[i][0]-rest.shoulders[i][0],rest.elbows[i][1]-rest.shoulders[i][1]),rest1=Math.atan2(rest.wrists[i][0]-rest.elbows[i][0],rest.wrists[i][1]-rest.elbows[i][1]),a0=mix(v.upper+(i?.12:-.12)+lean,rest0,v.recover),a1=mix(v.fore+(i?.10:-.10)+lean,rest1,v.recover);let bladeAngle=mix(v.blade,0,v.recover);if(m.attackFrom){let old=m.attackFrom,sh0=old.shoulders[i],e0=old.elbows[i],w0=old.wrists[i];a0=mix(Math.atan2(e0[0]-sh0[0],e0[1]-sh0[1]),a0,transition);a1=mix(Math.atan2(w0[0]-e0[0],w0[1]-e0[1]),a1,transition);bladeAngle=mix(old.angles[i],bladeAngle,transition)}elbows[i]=[sh[0]+Math.sin(a0)*l1,sh[1]+Math.cos(a0)*l1];wrists[i]=[elbows[i][0]+Math.sin(a1)*l2,elbows[i][1]+Math.cos(a1)*l2];angles[i]=bladeAngle}}
 // R thrust uses fixed bone lengths: hands lag during the draw-back, then extend.
 if(m.rThrust!==undefined){let v=m.rThrust;for(let i=0;i<2;i++){let sh=shoulders[i],l1=dist(rest.shoulders[i],rest.elbows[i]),l2=dist(rest.elbows[i],rest.wrists[i]),a0=mix(i?-.2:-1.1,i?1.55:-.9,v)+lean*.25,a1=mix(i?.7:-.5,i?1.65:-.2,v)+lean*.2;elbows[i]=[sh[0]+Math.sin(a0)*l1,sh[1]+Math.cos(a0)*l1];wrists[i]=[elbows[i][0]+Math.sin(a1)*l2,elbows[i][1]+Math.cos(a1)*l2]}}
 // Keep the game's existing cinematic dagger arcs.
 if(kind==='finish'){
  const time=m.finishTime??u*3,follow=smooth((time-1.42)/.82);
  for(let i=0;i<2;i++){
   const lag=i?.065:0,v=smooth((time-.68-lag)/.46),side=i?1:-1,sh=shoulders[i];
   const upper=mix(side*(mix(.55,1.50,v)+.65*Math.sin(Math.PI*v)),i?1.45:-1.55,follow*.35);
   const fore=mix(side*(mix(1.20,1.75,v)+.40*Math.sin(Math.PI*v)),i?1.60:-1.65,follow*.35);
   const l1=dist(rest.shoulders[i],rest.elbows[i]),l2=dist(rest.elbows[i],rest.wrists[i]);
   elbows[i]=[sh[0]+Math.sin(upper)*l1,sh[1]+Math.cos(upper)*l1];
   wrists[i]=[elbows[i][0]+Math.sin(fore)*l2,elbows[i][1]+Math.cos(fore)*l2];
   angles[i]=mix(i?-.2:.2,i?2.65:-2.65,v)*(1-follow*.10);
  }
 }
 function solveKnee(h,f,i){
  const l1=skeleton?.legLengths[i][0]??dist(rest.hips[i],rest.knees[i]);
  const l2=skeleton?.legLengths[i][1]??dist(rest.knees[i],rest.feet[i]);
  const d=dist(h,f),reach=Math.max(Math.abs(l1-l2)+1e-7,Math.min(l1+l2-1e-7,d));
  if(d!==reach){
   f[0]=h[0]+(d?(f[0]-h[0])*reach/d:0);
   f[1]=h[1]+(d?(f[1]-h[1])*reach/d:reach);
  }
  return ik(h,f,l1,l2,-1);
 }
 const knees=hips.map((h,i)=>solveKnee(h,feet[i],i));
 // Place the supporting sole, not just its ankle, at floor level. Ease the
 // correction away as the foot leaves the floor so toe-off stays continuous.
 if(y<=.1&&!dash&&!plunge&&(run>.001||m.airBlend>.001||mesh?.['leg-0-lower']||mesh?.['leg-1-lower']))for(let i=0;i<2;i++){
  const contact=1-smooth(sprintStep(phase,i,runRig)[1]/5);
  const project=sprinting?run*contact*(1-airWeight):0;
  const baseKnee=rest.knees[i],baseFoot=rest.feet[i];
  const shinScale=skeleton?skeleton.legLengths[i][1]/dist(baseKnee,baseFoot):1;
  const editedFoot=mesh?.['leg-'+i+'-lower'];
  const solePoints=editedFoot?.outline??rigidParts.leg[i].lower;
  for(let pass=0;pass<(skeleton||editedFoot?6:3);pass++){
   const knee=knees[i],foot=feet[i];
   let bottom=-Infinity;
   for(const vertex of solePoints){
    bottom=Math.max(bottom,rigidMap(vertex,baseKnee,baseFoot,knee,foot,shinScale)[1]);
   }
   const correction=bottom>0?bottom:bottom*project;
   if(Math.abs(correction)<=.02)break;
   foot[1]-=correction;
   knees[i]=solveKnee(hips[i],foot,i);
  }
 }

 if(m.aimBlades)angles=m.aimBlades.slice();
 return {hip,chest,neck,head,hips,feet,knees,shoulders,wrists,elbows,angles,lean,run,hand,kind,u,bob,land,airWeight,vertical:vy,rise,fall,preland,torsoPivot,skeleton,mesh};}
 function nearest(point){let n=0,best=Infinity;R.body.forEach((v,i)=>{let d=(point[0]-v[0])**2+(point[1]-v[1])**2;if(d<best){best=d;n=i}});return n}
 // Keep the source silhouette, but render limbs as independent overlapping contours.
 function branch(a,b){let start=nearest(a),end=nearest(b),f=[],r=[],n=R.body.length;for(let i=start;i!==end;i=(i+1)%n)f.push(i);for(let i=start;i!==end;i=(i+n-1)%n)r.push(i);let out=f.length<r.length?f:r;out.push(end);return out}
 const armParts=[branch([223,239],[230,276]),branch([315,239],[308,273])],legParts=[branch([221,375],[271,391]),branch([319,375],[271,391])],arms=armParts.map(p=>new Set(p)),removed=new Set();
 for(let part of [...armParts,...legParts])for(let i of part.slice(1,-1))removed.add(i);
 const core=R.body.map((_,i)=>i).filter(i=>!removed.has(i));

 function bone(v,a,b,c,d){let dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,along=((v[0]-a[0])*ux+(v[1]-a[1])*uy),off=-(v[0]-a[0])*uy+(v[1]-a[1])*ux,ddx=d[0]-c[0],ddy=d[1]-c[1],ll=Math.hypot(ddx,ddy)||1;return [c[0]+ddx*along/l-ddy/ll*off,c[1]+ddy*along/l+ddx/ll*off]}
 function chain(v,a,b,c,A,B,C){let total=dist(a,b)+dist(b,c),projection=sat((v[1]-a[1])/(c[1]-a[1]||1)),joint=dist(a,b)/total,w=smooth((projection-joint+.16)/.32),v1=bone(v,a,b,A,B),v2=bone(v,b,c,B,C);return [mix(v1[0],v2[0],w),mix(v1[1],v2[1],w)]}
 function vertex(src,i,p){let v=P(...src);for(let k=0;k<2;k++)if(arms[k].has(i)){let moved=chain(v,rest.shoulders[k],rest.elbows[k],rest.wrists[k],p.shoulders[k],p.elbows[k],p.wrists[k]);let ends=armParts[k],s0=R.body[ends[0]],s1=R.body[ends[ends.length-1]],attach=smooth(Math.min(Math.hypot(src[0]-s0[0],src[1]-s0[1]),Math.hypot(src[0]-s1[0],src[1]-s1[1]))/24);let trunk=bone(v,rest.hip,rest.neck,p.hip,p.neck);return [mix(trunk[0],moved[0],attach),mix(trunk[1],moved[1],attach)]}
 if(src[1]>375){let k=src[0]<271?0:1,leg=chain(v,rest.hips[k],rest.knees[k],rest.feet[k],p.hips[k],p.knees[k],p.feet[k]),trunk=bone(v,rest.hip,rest.neck,p.hip,p.neck),w=smooth((src[1]-402)/35);return [mix(trunk[0],leg[0],w),mix(trunk[1],leg[1],w)]}
 if(src[1]<216)return rigidMap(v,rest.neck,rest.head,p.neck,p.head);return bone(v,rest.hip,rest.neck,p.hip,p.neck)}

 // Cut the reference into overlapping contours bound to the limb segments.
 function clipY(points,y,keepTop){let out=[];for(let j=0;j<points.length;j++){let a=points[j],b=points[(j+1)%points.length],insideA=keepTop?a[1]<=y:a[1]>=y,insideB=keepTop?b[1]<=y:b[1]>=y;if(insideA)out.push(a);if(insideA!==insideB){let u=(y-a[1])/(b[1]-a[1]);out.push([mix(a[0],b[0],u),y])}}return out}
 const rigidParts={arm:[],leg:[]};
 for(let type of ['arm','leg'])for(let i=0;i<2;i++){let ids=type==='arm'?armParts[i]:legParts[i],outline=ids.map(j=>P(...R.body[j])),joint=type==='arm'?rest.elbows[i]:rest.knees[i],upper=clipY(clipY(outline,P(0,type==='leg'?395:255)[1],false),joint[1],true),lower=clipY(outline,joint[1],false),cross=[];for(let j=0;j<outline.length;j++){let a=outline[j],b=outline[(j+1)%outline.length];if(Math.min(a[1],b[1])<=joint[1]&&joint[1]<Math.max(a[1],b[1]))cross.push(a[0]+(joint[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]))}cross.sort((a,b)=>a-b);rigidParts[type][i]={upper,lower,radius:(cross.at(-1)-cross[0])/2,centerX:(cross.at(-1)+cross[0])/2}}
 const ratio=(a,b,A,B)=>dist(A,B)/dist(a,b);
 function rigidMap(v,a,b,A,B,scale=1){
  if(scale!==1){
   const [x,y]=vector(a,b),k=(scale-1)*((v[0]-a[0])*x+(v[1]-a[1])*y)/(x*x+y*y);
   v=[v[0]+x*k,v[1]+y*k];
  }
  let theta=Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]),dx=v[0]-a[0],dy=v[1]-a[1],c=Math.cos(theta),s=Math.sin(theta);return [A[0]+dx*c-dy*s,A[1]+dx*s+dy*c]}
 function limbGeometry(p,type,i){let r=rigidParts[type][i],a=type==='arm'?rest.shoulders[i]:rest.hips[i],b=type==='arm'?rest.elbows[i]:rest.knees[i],end=type==='arm'?rest.wrists[i]:rest.feet[i],A=type==='arm'?p.shoulders[i]:p.hips[i],B=type==='arm'?p.elbows[i]:p.knees[i],E=type==='arm'?p.wrists[i]:p.feet[i],upperScale=p.skeleton?ratio(a,b,A,B):1,lowerScale=p.skeleton?ratio(b,end,B,E):1,upper=(p.mesh?.[type+'-'+i+'-upper']?.outline??r.upper).map(v=>rigidMap(v,a,b,A,B,upperScale)),lower=(p.mesh?.[type+'-'+i+'-lower']?.outline??r.lower).map(v=>rigidMap(v,b,end,B,E,lowerScale)),center=rigidMap([r.centerX,b[1]],a,b,A,B,upperScale);let top=null;if(type==='leg'){let cut=P(0,395)[1],xs=r.upper.filter(v=>Math.abs(v[1]-cut)<1e-5).map(v=>v[0]);if(xs.length>1)top={center:rigidMap([(Math.min(...xs)+Math.max(...xs))/2,cut],a,b,A,B,upperScale),radius:(Math.max(...xs)-Math.min(...xs))/2}}return {upper,lower,center,radius:r.radius,top}}
 // All drawing assets are immutable. Geometry is simplified/smoothed once, never per frame.
 function simplify(points,epsilon=.22){if(points.length<4)return points;function rdp(p){if(p.length<3)return p;let a=p[0],b=p.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,max=0,index=0;for(let i=1;i<p.length-1;i++){let d=Math.abs(dx*(a[1]-p[i][1])-(a[0]-p[i][0])*dy)/len;if(d>max){max=d;index=i}}return max>epsilon?[...rdp(p.slice(0,index+1)).slice(0,-1),...rdp(p.slice(index))]:[a,b]}let split=Math.floor(points.length/2);return [...rdp(points.slice(0,split+1)).slice(0,-1),...rdp([...points.slice(split),points[0]]).slice(0,-1)]}
 function asset(points,radius=.65){let vertices=simplify(points),path=typeof Path2D!=='undefined'?new Path2D():null;if(path){for(let i=0;i<vertices.length;i++){let v=vertices[i],a=vertices[(i+vertices.length-1)%vertices.length],b=vertices[(i+1)%vertices.length],da=dist(v,a),db=dist(v,b),r=Math.min(radius,da*.4,db*.4),before=[mix(v[0],a[0],r/(da||1)),mix(v[1],a[1],r/(da||1))],after=[mix(v[0],b[0],r/(db||1)),mix(v[1],b[1],r/(db||1))];i?path.lineTo(...before):path.moveTo(...before);path.quadraticCurveTo(...v,...after)}path.closePath()}return {path,vertices}}
 function capsule(a,b,r0,r1){let dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,n=[-dy/l,dx/l],pts=[];for(let i=0;i<=16;i++){let t=i/16,r=mix(r0,r1,t**.75);pts.push([mix(a[0],b[0],t)+n[0]*r,mix(a[1],b[1],t)+n[1]*r])}let theta=Math.atan2(n[1],n[0]);for(let i=1;i<=12;i++){let a0=theta-i*Math.PI/12;pts.push([b[0]+Math.cos(a0)*r1,b[1]+Math.sin(a0)*r1])}for(let i=15;i>=0;i--){let t=i/16,r=mix(r0,r1,t**.75);pts.push([mix(a[0],b[0],t)-n[0]*r,mix(a[1],b[1],t)-n[1]*r])}theta=Math.atan2(-n[1],-n[0]);for(let i=1;i<=12;i++){let a0=theta-i*Math.PI/12;pts.push([a[0]+Math.cos(a0)*r0,a[1]+Math.sin(a0)*r0])}return pts}
 for(let i=0;i<2;i++){let arm=rigidParts.arm[i];arm.upper=capsule(rest.shoulders[i],rest.elbows[i],4.8,arm.radius);arm.lower=capsule(rest.elbows[i],rest.wrists[i],arm.radius,3.2);let leg=rigidParts.leg[i],cut=P(0,395)[1],xs=leg.upper.filter(v=>Math.abs(v[1]-cut)<1e-5).map(v=>v[0]),center=[(Math.min(...xs)+Math.max(...xs))/2,cut];leg.upper=capsule(center,rest.knees[i],(Math.max(...xs)-Math.min(...xs))/2,leg.radius)}
 const coreOutline=core.map(i=>P(...R.body[i])),waist=P(268,340),assets={
  head:asset(clipY(coreOutline,P(0,218)[1],true),.55),
  finishHead:asset(simplify(clipY(coreOutline,P(0,218)[1],true),.9),1.4),
  arm:[],leg:[],blades:[]
 };
 for(let type of ['arm','leg'])for(let i=0;i<2;i++){let part=rigidParts[type][i],topY=Math.min(...part.upper.map(v=>v[1])),xs=part.upper.filter(v=>Math.abs(v[1]-topY)<1e-5).map(v=>v[0]);assets[type][i]={upper:asset(part.upper),lower:asset(part.lower),topCenter:[(Math.min(...xs)+Math.max(...xs))/2,topY],topRadius:(Math.max(...xs)-Math.min(...xs))/2}}
 for(let i=0;i<2;i++)assets.blades.push(asset(R.blades[i].map(v=>{let q=P(...v);return [q[0]-rest.wrists[i][0],q[1]-rest.wrists[i][1]]}),.4));
 const BODY_POINTS=[[242,213],[223,241],[231,291],[225,333],[222,374],[242,389],[267,388],[298,389],[319,375],[314,333],[308,291],[311,241],[289,213]];

 function bodyPoint(src,p){let v=P(...src),offset=[p.hip[0]-rest.hip[0],p.hip[1]-rest.hip[1]];if(src[1]>=340)return [v[0]+offset[0],v[1]+offset[1]];if(src[1]<=280){let q=rotate(v,waist,p.lean);return [q[0]+offset[0],q[1]+offset[1]]}
  // Smooth spine between an upright pelvis and the leaning ribcage; keep each section's width.
  let t=(340-src[1])/60,L=60*R.scale,A=[waist[0]+offset[0],waist[1]+offset[1]],base=rotate(P(268,280),waist,p.lean),B=[base[0]+offset[0],base[1]+offset[1]],h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t,theta=p.lean*smooth(t),cx=h00*A[0]+h01*B[0]+h11*Math.sin(p.lean)*L,cy=h00*A[1]-h10*L+h01*B[1]-h11*Math.cos(p.lean)*L;return [cx+v[0]*Math.cos(theta),cy+v[0]*Math.sin(theta)]
 }
 function torsoAngle(y,p){
  return y>=340?0:y<=280?p.lean:p.lean*smooth((340-y)/60);
 }
 function torsoPoint(src,p,offset=[0,0]){
  let point=bodyPoint(src,p);
  const y=src[1];
  if(p.skeleton){
   const {hip,chest,neck}=p.skeleton.deltas;
   const shift=y>=250?scaled(vector(hip,chest),smooth((380-y)/130)):
    plus(vector(hip,chest),scaled(vector(chest,neck),smooth((250-y)/35)));
   point=plus(point,shift);
  }
  point=plus(point,rotate(offset,[0,0],torsoAngle(y,p)));
  return p.kind==='finish'?[point[0],p.hip[1]+(point[1]-p.hip[1])*.70]:point;
 }
 function bodyPath(p){
  if(typeof Path2D==='undefined')return null;
  const offsets=p.mesh?.body?.offsets;
  const q=BODY_POINTS.map((v,i)=>torsoPoint(v,p,offsets?.[i]));
  const path=new Path2D(),n=q.length;
  path.moveTo(...q[0]);
  for(let i=0;i<n;i++){
   const prev=q[(i+n-1)%n],a=q[i],b=q[(i+1)%n],next=q[(i+2)%n],t=.14;
   path.bezierCurveTo(a[0]+(b[0]-prev[0])*t,a[1]+(b[1]-prev[1])*t,
    b[0]-(next[0]-a[0])*t,b[1]-(next[1]-a[1])*t,...b);
  }
  path.closePath();
  return path;
 }

 // Keep the reference's fine contour points. The editor exposes a sparse set
 // of handles and interpolates each edit over the intervening outline.
 function insideOutline([x,y],outline){
  let inside=false;
  for(let i=0;i<outline.length;i++){
   const [ax,ay]=outline[i],[bx,by]=outline[(i+1)%outline.length];
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 }
 function meshRegion(outline,count,limit,segment=null,round=.65){
  const arc=[0];
  for(let i=1;i<=outline.length;i++)arc[i]=arc[i-1]+dist(outline[i-1],outline[i%outline.length]);
  const handles=[...new Set(Array.from({length:count},(_,i)=>{
   const at=arc.at(-1)*i/count;
   const next=arc.findIndex(value=>value>at);
   return next<1||at-arc[next-1]<=arc[next]-at?Math.max(0,next-1):next%outline.length;
  }))].sort((a,b)=>a-b);
  let anchors=[rest.neck,rest.chest,rest.hip];
  if(segment){
   const [from,to,side]=segment;
   const a=side===undefined?rest[from]:rest[from][side];
   const b=side===undefined?rest[to]:rest[to][side];
   anchors=[.14,.5,.86].map(t=>plus(a,scaled(vector(a,b),t)));
  }
  return {outline,arc,handles,limit,segment,round,anchors:anchors.filter(p=>insideOutline(p,outline))};
 }
 const meshRegions={
  head:meshRegion(assets.head.vertices,17,16,['neck','head'],.55),
  body:meshRegion(BODY_POINTS.map(v=>P(...v)),BODY_POINTS.length,12)
 };
 // Every torso control belongs to the authored Bézier path.
 meshRegions.body.handles=BODY_POINTS.map((_,i)=>i);
 for(const type of ['arm','leg'])for(let i=0;i<2;i++)for(const [j,part] of ['upper','lower'].entries()){
  const k=type+'-'+i+'-'+part;
  meshRegions[k]=meshRegion(assets[type][i][part].vertices,type==='leg'?12:9,type==='leg'?9:6,
   [...runBones[type][j],i]);
 }
 const meshCache=new WeakMap();
 const emptyMesh={};
 meshCache.set(emptyMesh,null);
 function meshOffsets(region,edits){
  const {handles,outline,arc}=region;
  const shifts=outline.map(()=>[0,0]);
  for(const [j,a] of handles.entries()){
   const b=handles[j+1]??outline.length;
   const from=edits[a]??[0,0],to=edits[b%outline.length]??[0,0];
   for(let i=a;i<b;i++){
    const at=smooth((arc[i]-arc[a])/(arc[b]-arc[a]||1));
    shifts[i]=[mix(from[0],to[0],at),mix(from[1],to[1],at)];
   }
  }
  return shifts;
 }
 function area(points){
  return points.reduce((sum,a,i)=>{
   const b=points[(i+1)%points.length];
   return sum+a[0]*b[1]-a[1]*b[0];
  },0);
 }
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 function validMesh(points,region){
  const baseArea=area(region.outline);
  if(region.anchors.some(p=>!insideOutline(p,points)))return false;
  if(area(points)*Math.sign(baseArea)<Math.abs(baseArea)*.45)return false;
  const edges=points.map((a,i)=>{
   const b=points[(i+1)%points.length];
   return [a,b,Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1])];
  });
  for(let i=0;i<edges.length;i++){
   const [a,b,minX,maxX,minY,maxY]=edges[i];
   for(let j=i+2;j<edges.length;j++){
    const e=edges[j];
    if(e[2]>maxX||e[3]<minX||e[4]>maxY||e[5]<minY||i===0&&j===edges.length-1)continue;
    const [c,d]=e;
    if(cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7)return false;
   }
  }
  return true;
 }
 function compileRegion(region,edits){
  const offsets=meshOffsets(region,edits);
  const outline=region.outline.map((p,i)=>plus(p,offsets[i]));
  if(!validMesh(outline,region))return null;
  return {offsets,outline,art:asset(outline,region.round)};
 }
 function meshSettings(source){
  if(!source||typeof source!=='object')return emptyMesh;
  if(meshCache.has(source))return source;
  const saved={},compiled={};
  for(const [id,region] of Object.entries(meshRegions)){
   const edits={};
   for(const i of region.handles){
    const value=source[id]?.[i];
    if(!Array.isArray(value))continue;
    const offset=value.slice(0,2).map(v=>bound(v,0,[-region.limit,region.limit]));
    if(offset.length===2&&offset.some(Boolean))edits[i]=offset;
   }
   if(!Object.keys(edits).length)continue;
   const shape=compileRegion(region,edits);
   if(shape){saved[id]=edits;compiled[id]=shape;}
  }
  if(!Object.keys(saved).length)return emptyMesh;
  meshCache.set(saved,compiled);
  return saved;
 }
 function compiledMesh(settings){
  return settings?meshCache.get(meshSettings(settings)):null;
 }
 function meshPairSettings(source){
  if(source&&(Object.hasOwn(source,'idle')||Object.hasOwn(source,'run'))){
   return {idle:meshSettings(source.idle),run:meshSettings(source.run)};
  }
  // Older saves used one outline for every pose. Start both poses from it.
  const shared=meshSettings(source);
  return {idle:shared,run:shared};
 }

 const meshTransitions=new WeakMap(),MESH_TRANSITION_STEPS=24;
 function morphRegion(region,idle,running){
  if(idle===running||idle&&running&&idle.offsets.every(([x,y],i)=>
   x===running.offsets[i][0]&&y===running.offsets[i][1]))return ()=>idle;

  function sample(from,to,weight){
   if(weight===0)return from;
   if(weight===1)return to;
   const offsets=region.outline.map((_,i)=>{
    const a=from?.offsets[i],b=to?.offsets[i];
    return [mix(a?.[0]??0,b?.[0]??0,weight),mix(a?.[1]??0,b?.[1]??0,weight)];
   });
   const outline=region.outline.map((v,i)=>plus(v,offsets[i]));
   return validMesh(outline,region)?{offsets,outline}:false;
  }
  let shapes=Array.from({length:MESH_TRANSITION_STEPS+1},(_,i)=>
   sample(idle,running,i/MESH_TRANSITION_STEPS));
  if(shapes.includes(false)){
   // Take a route through the reference outline if the direct route folds.
   shapes=shapes.map((_,i)=>{
    const t=i/MESH_TRANSITION_STEPS;
    return t<=.5?sample(idle,null,t*2):sample(null,running,t*2-1);
   });
   const safe=shapes.map((shape,i)=>shape===false?null:{shape,i}).filter(Boolean);
   shapes=shapes.map((shape,i)=>shape===false?safe.reduce((best,next)=>
    Math.abs(next.i-i)<Math.abs(best.i-i)?next:best).shape:shape);
  }
  return i=>{
   const shape=shapes[i];
   if(shape&&!shape.art)shape.art=asset(shape.outline,region.round);
   return shape;
  };
 }
 function meshForMotion(pair,run){
  if(!pair)return null;
  const {idle,run:running}=pair;
  if(idle===running)return compiledMesh(idle);
  const frame=Math.round(run*MESH_TRANSITION_STEPS);
  if(frame===0)return compiledMesh(idle);
  if(frame===MESH_TRANSITION_STEPS)return compiledMesh(running);

  let byRunning=meshTransitions.get(idle);
  if(!byRunning){byRunning=new WeakMap();meshTransitions.set(idle,byRunning);}
  let transition=byRunning.get(running);
  if(!transition){
   const a=compiledMesh(idle),b=compiledMesh(running);
   const regions=Object.keys({...a,...b}).map(id=>[
    id,morphRegion(meshRegions[id],a?.[id]??null,b?.[id]??null)
   ]);
   transition={regions,frames:[]};
   byRunning.set(running,transition);
  }
  if(!transition.frames[frame]){
   const shapes={};
   for(const [id,at] of transition.regions){
    const shape=at(frame);
    if(shape)shapes[id]=shape;
   }
   transition.frames[frame]=shapes;
  }
  return transition.frames[frame];
 }
 function prepareMeshTransition(tuning){meshForMotion(tuning.mesh,.5)}
 const defaultRunRig=runRigSettings(typeof FAIRI_RUN_PRESET==='undefined'?undefined:FAIRI_RUN_PRESET.runRig);
 if(typeof requestIdleCallback==='function')requestIdleCallback(()=>prepareMeshTransition(defaultRunRig));
 const layer=typeof document!=='undefined'?document.createElement('canvas'):null,cloneLayer=layer?document.createElement('canvas'):null;let lc,cc,layerScale=0,cloneScale=0;if(layer){lc=layer.getContext('2d');cc=cloneLayer.getContext('2d')}
 const bladeSprites=[{},{}];
 function bladeSprite(i,quality,color=R.bladeColor){let key=(quality==='low'?'low':'high')+':'+color;if(bladeSprites[i][key])return bladeSprites[i][key];let vertices=assets.blades[i].vertices,pad=12,left=Math.floor(Math.min(...vertices.map(p=>p[0])))-pad,top=Math.floor(Math.min(...vertices.map(p=>p[1])))-pad,w=Math.ceil(Math.max(...vertices.map(p=>p[0])))-left+pad,h=Math.ceil(Math.max(...vertices.map(p=>p[1])))-top+pad,bitmap=document.createElement('canvas');bitmap.width=w*3;bitmap.height=h*3;let c=bitmap.getContext('2d');c.setTransform(3,0,0,3,-left*3,-top*3);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=quality==='low'?2:8;c.fill(assets.blades[i].path);return bladeSprites[i][key]={bitmap,left,top,w,h}}
 function draw(target,x,y,dir,t,kind,u,alpha,hand,clone,m,quality,echoes=null){let p=pose(t,kind,u,hand,y,m,dir),c=clone?cc:lc,surface=clone?cloneLayer:layer,res=clone?(quality==='low'?1:1.5):(quality==='low'?2:3);if((clone?cloneScale:layerScale)!==res){if(clone)cloneScale=res;else layerScale=res;surface.width=280*res;surface.height=260*res}c.setTransform(res,0,0,res,140*res,210*res);c.clearRect(-140,-210,280,260);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.shadowBlur=0;c.fillStyle='#ffffff';
 function fill(shape){c.fill(shape.path)}
 function disk(center,radius){c.beginPath();c.arc(center[0],center[1],radius,0,Math.PI*2);c.fill()}
 function boneFrame(a,b,A,B,fn,scale=1){let theta=Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]);c.save();c.translate(...A);c.rotate(theta);if(scale!==1){const axis=Math.atan2(b[1]-a[1],b[0]-a[0]);c.rotate(axis);c.scale(scale,1);c.rotate(-axis)}c.translate(-a[0],-a[1]);fn();c.restore()}
 function limb(type,i){let source=rigidParts[type][i],art=assets[type][i],a=type==='arm'?rest.shoulders[i]:rest.hips[i],b=type==='arm'?rest.elbows[i]:rest.knees[i],end=type==='arm'?rest.wrists[i]:rest.feet[i],A=type==='arm'?p.shoulders[i]:p.hips[i],B=type==='arm'?p.elbows[i]:p.knees[i],E=type==='arm'?p.wrists[i]:p.feet[i];boneFrame(a,b,A,B,()=>{fill(p.mesh?.[type+'-'+i+'-upper']?.art??art.upper);disk([source.centerX,b[1]],source.radius)},p.skeleton?ratio(a,b,A,B):1);boneFrame(b,end,B,E,()=>fill(p.mesh?.[type+'-'+i+'-lower']?.art??art.lower),p.skeleton?ratio(b,end,B,E):1);disk(B,source.radius);if(type==='arm'){disk(A,5);disk(E,3.2)}}
 // Opaque mask union overlaps at joints. No stretched bridging polygons or moving clips.
 limb('leg',0);limb('arm',0);limb('leg',1);limb('arm',1);
 c.fill(bodyPath(p));
 if(p.skeleton)for(const [anchors,joints,width] of [
  [p.skeleton.shoulderAnchors,p.shoulders,10],[p.skeleton.hipCenters,p.hips,16]
 ]){
  c.strokeStyle='#fff';c.lineWidth=width;c.lineCap='round';
  for(let i=0;i<2;i++)if(dist(anchors[i],joints[i])>.01){
   c.beginPath();c.moveTo(...anchors[i]);c.lineTo(...joints[i]);c.stroke();
  }
 }
 if(kind==='finish'){c.save();c.translate(...p.head);c.rotate(p.lean*.15);c.scale(1.55,1.55);c.translate(-rest.head[0],-rest.head[1]);fill(assets.finishHead);c.restore()}else boneFrame(rest.neck,rest.head,p.neck,p.head,()=>fill(p.mesh?.head?.art??assets.head));
 // Color the completed body once. Internal antialiasing can never expose component colors.
 c.globalCompositeOperation='source-in';c.fillStyle=m?.bodyColor||R.color;c.fillRect(-140,-210,280,260);c.globalCompositeOperation='source-over';
 function blade(i,w,angle,opacity=1){c.save();c.translate(...w);c.rotate(angle);if(kind==='finish')c.scale(1.35,1.35);c.globalAlpha=opacity;let sprite=bladeSprite(i,quality,kind==='finish'?'#75fff4':R.bladeColor);c.drawImage(sprite.bitmap,sprite.left,sprite.top,sprite.w,sprite.h);c.restore()}
 if(kind==='attack'||/^n[123]$/.test(kind)){let stage=kind[0]==='n'?Number(kind[1])-1:0,profile=N.stages[stage],seconds=u*profile.duration,age=seconds-profile.hitStart;if(age>0&&seconds<profile.hitEnd+.075){let count=clone?4:quality==='low'?6:10,outer=[],inner=[],source=assets.blades[hand].vertices,tip=source.reduce((a,b)=>Math.hypot(...a)>Math.hypot(...b)?a:b),fade=1-smooth((seconds-profile.hitEnd)/.075);for(let j=0;j<=count;j++){let at=Math.max(profile.hitStart,seconds-.085*(1-j/count)),q=pose(t-(seconds-at),kind,at/profile.duration,hand,y,m,dir),w=q.wrists[hand],ang=q.angles[hand],co=Math.cos(ang),si=Math.sin(ang),pt=[w[0]+tip[0]*co-tip[1]*si,w[1]+tip[0]*si+tip[1]*co];outer.push(pt);inner.push([mix(w[0],pt[0],.38+.35*j/count),mix(w[1],pt[1],.38+.35*j/count)])}c.save();c.globalAlpha=fade;c.fillStyle='#72eddf55';c.beginPath();outer.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));inner.reverse().forEach(v=>c.lineTo(...v));c.closePath();c.fill();c.strokeStyle='#c8fff3aa';c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';c.beginPath();outer.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.stroke();c.restore()}}
 for(let i=0;i<2;i++)blade(i,p.wrists[i],p.angles[i]);

 if(echoes)for(let e of echoes){target.save();target.translate(e.x,550-e.y);target.scale(dir,1);target.globalAlpha=e.alpha*alpha;target.drawImage(surface,-140,-210,280,260);target.restore()}
 target.save();target.translate(x,550-y);target.scale(dir,1);target.globalAlpha=alpha;target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';target.drawImage(surface,-140,-210,280,260);target.restore();return p
 }

 return {motion,update,pose,ik,draw,rest,vertex,MOTION_CFG,runRigSettings,normalLean,reference:R,limbGeometry,rigidParts,assets,BODY_POINTS,bodyPoint,parts:{core,arms:armParts,legs:legParts}};
})();
if(typeof module!=='undefined')module.exports=FairiRig;
