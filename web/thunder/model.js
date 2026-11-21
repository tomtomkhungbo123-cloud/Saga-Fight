(function(root){
'use strict';
const outline=typeof module!=='undefined'?require('./design.js'):root.ThunderDesign;
const hairOutline=outline.hair||[],armOutline=outline.arm||[],palmOutline=armOutline.slice(16,32);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
// The raised lips are costume pads; the anatomical pivot sits beneath them.
const shoulderPads=[outline.slice(15,24).concat([[-17,-155]]),outline.slice(112,125).concat([[15,-158]])];
// Match Soulblade's body height; weapons, orb bloom and attack effects do not affect sizing.
const bodyBounds={top:Math.min(...outline.map(p=>p[1]),...hairOutline.map(p=>p[1])),bottom:Math.max(...outline.map(p=>p[1]),...hairOutline.map(p=>p[1]))};
const soulPoints=root.SoulDesignData?.points,soulHeight=soulPoints?Math.max(...soulPoints.map(p=>p[1]))-Math.min(...soulPoints.map(p=>p[1])):205;
const referenceHeight=soulHeight*(root.SoulDesign?.visualScale??.8),visualScale=referenceHeight/(bodyBounds.bottom-bodyBounds.top);
const palette=Object.freeze({core:'#ffff91',mid:'#ffff91',edge:'#fff68f',glow:'#ffed47',haloCore:'#ffff9ac0',haloMid:'#ffef5c50',haloEdge:'#ffde3000'});
const MOTION={speed:330,response:14,lean:.07,bob:4,clothDrag:.022};
const shoulder={x:18,y:-153},elbow={x:31,y:-130},wrist={x:40,y:-153};
const upper=Math.hypot(elbow.x-shoulder.x,elbow.y-shoulder.y),fore=Math.hypot(wrist.x-elbow.x,wrist.y-elbow.y);
function solveArm(x,y){const dx=x-shoulder.x,dy=y-shoulder.y,raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(upper-fore)+.01,upper+fore-.1),nx=dx/(raw||1),ny=dy/(raw||1),a=(upper*upper-fore*fore+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-a*a));return {shoulder,elbow:{x:shoulder.x+nx*a-ny*h,y:shoulder.y+ny*a+nx*h},wrist:{x:shoulder.x+nx*d,y:shoulder.y+ny*d}};}
function spring(s,key,target,frequency,dt){const vkey=key+'V',offset=s[key]-target,v=s[vkey]||0,decay=Math.exp(-frequency*dt),k=v+frequency*offset;s[key]=target+(offset+k*dt)*decay;s[vkey]=(v-frequency*k*dt)*decay;}
// Underdamped cloth springs retain momentum and settle without snapping to rest.
function clothSpring(s,key,target,stiffness,damping,limit,dt){
 s[key]??=0;const vk=key+'V';s[vk]??=0;if(!dt)return;
 const h=damping/2,w=Math.sqrt(stiffness-h*h),offset=s[key]-target,v=s[vk],decay=Math.exp(-h*dt),c=Math.cos(w*dt),si=Math.sin(w*dt);
 s[key]=target+decay*(offset*c+(v+h*offset)/w*si);s[vk]=decay*(v*c-(h*v+stiffness*offset)/w*si);
 if(Math.abs(s[key])>limit){s[key]=clamp(s[key],-limit,limit);s[vk]*=.3;}
}
function updateGarments(f,s,dt){
 const vx=f.vx||0,vy=f.vy||0,ax=dt?clamp((vx-(s.garmentVX??vx))/dt,-2500,2500):0,landing=f.ground&&s.garmentGround===false;
 if(landing){const impulse=clamp((s.garmentVY||0)*.015,0,10);s.capeLiftV=(s.capeLiftV||0)+impulse;s.sleeveLiftV=(s.sleeveLiftV||0)+impulse*.45;}
 clothSpring(s,'capeMid',clamp(-vx*.024-ax*.001,-12,12),100,10,14,dt);
 clothSpring(s,'capeTip',clamp(s.capeMid*.65-vx*.014,-14,14),65,7.5,17,dt);
 clothSpring(s,'capeLift',f.ground?0:clamp(-vy*.008,-4,6),90,9,8,dt);
 clothSpring(s,'sleeveSwing',clamp(-vx*.012-ax*.0007,-6,6),115,9,8,dt);
 clothSpring(s,'sleeveLift',f.ground?0:clamp(-vy*.004,-2,3),110,10,4,dt);
 s.garmentVX=vx;s.garmentVY=vy;s.garmentGround=f.ground;
}
// Two independently weighted tie tails; the bun remains rigidly attached to the head.
const ribbonRest=[ [[-24,-210],[-28,-201],[-31,-192],[-35,-184],[-40,-180],[-44,-179]], [[-25,-211],[-33,-208],[-40,-202],[-46,-197],[-52,-195]] ];
const ribbonBindings=hairOutline.map(([x,y],index)=>{
 if(index>=35)return null;const chain=index<20?0:1,rest=ribbonRest[chain];let best=null;
 for(let i=0;i<rest.length-1;i++){const a=rest[i],b=rest[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),u=clamp(((x-a[0])*dx+(y-a[1])*dy)/(len*len),0,1),px=a[0]+dx*u,py=a[1]+dy*u,d=Math.hypot(x-px,y-py);if(!best||d<best.d)best={chain,i,u,d,along:((x-px)*dx+(y-py)*dy)/len,across:((y-py)*dx-(x-px)*dy)/len,weight:smooth(Math.hypot(x-rest[0][0],y-rest[0][1])/10)};}
 return best;
});
function ribbonLocal(f,s,p){const angle=s.lean*f.dir,c=Math.cos(angle),si=Math.sin(angle),x=(p.x-f.x)/visualScale*f.dir,y=(p.y-f.y)/visualScale+16+Math.sin(s.clock*2.8)*MOTION.bob;return {x:x*c+y*si,y:-x*si+y*c};}
function ensureVisualArray(s,key){
 const value=s[key];
 if(!Array.isArray(value)||Object.prototype.propertyIsEnumerable.call(s,key))Object.defineProperty(s,key,{value:Array.isArray(value)?value:[],writable:true,configurable:true,enumerable:false});
 return s[key];
}
function updateRibbons(f,s,dt){
 // Hair constraints amplify tiny trig differences; they never affect aim or damage.
 // Restored checkpoints rebuild these local strands from the current pose.
 if(!dt)return;ensureVisualArray(s,'ribbons');
 for(let j=0;j<ribbonRest.length;j++){
  const rest=ribbonRest[j],target=rest.map(p=>transform(f,...p)),root=target[0];let chain=s.ribbons[j];
  if(!chain){chain=s.ribbons[j]={nodes:target.map(p=>({...p,vx:0,vy:0})),root:{...root},dir:f.dir};}
  const nodes=chain.nodes,shiftX=root.x-chain.root.x,shiftY=root.y-chain.root.y;
  // Teleports translate the simulation; reversals mirror its persistent offsets.
  if(chain.dir!==f.dir){for(const n of nodes){n.x=root.x-(n.x-chain.root.x);n.y=root.y+(n.y-chain.root.y);n.vx=-n.vx;}chain.root={...root};}
  else if(Math.hypot(shiftX,shiftY)>80){for(const n of nodes){n.x+=shiftX;n.y+=shiftY;}chain.root={...root};}
  const rvx=clamp((root.x-chain.root.x)/dt,-500,500),rvy=clamp((root.y-chain.root.y)/dt,-700,700);chain.root={...root};chain.dir=f.dir;
  for(let i=1;i<nodes.length;i++){
   const n=nodes[i],u=i/(nodes.length-1),stiff=100-55*u;n.oldx=n.x;n.oldy=n.y;
   n.vx+=((target[i].x-n.x)*stiff-rvx*.22-(f.vx||0)*.9+Math.sin(s.clock*5-i*.7+j)*Math.min(1,Math.abs(rvx)/330)*12*u)*dt;
   n.vy+=((target[i].y-n.y)*stiff+22-rvy*.18)*dt;const damp=Math.exp(-dt*4.2);n.vx*=damp;n.vy*=damp;n.x+=n.vx*dt;n.y+=n.vy*dt;
  }
  for(let pass=0;pass<10;pass++){
   nodes[0].x=root.x;nodes[0].y=root.y;
   for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],length=Math.hypot(rest[i][0]-rest[i-1][0],rest[i][1]-rest[i-1][1])*visualScale,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,correction=(d-length)/d,w=i===1?1:.5;if(i>1){a.x+=dx*correction*w;a.y+=dy*correction*w;}b.x-=dx*correction*w;b.y-=dy*correction*w;}
  }
  // Final forward projection fixes lengths; velocity is recovered from constrained motion.
  for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],length=Math.hypot(rest[i][0]-rest[i-1][0],rest[i][1]-rest[i-1][1])*visualScale,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;b.x=a.x+dx/d*length;b.y=a.y+dy/d*length;b.vx=clamp((b.x-b.oldx)/dt*.95,-450,450);b.vy=clamp((b.y-b.oldy)/dt*.95,-450,450);}
 }
}
function ensureDrawBuffers(s){
 // Render-derived geometry is not authoritative game state. Keep these buffers out of rollback hashes.
 for(const [key,length] of [['points',outline.length*2],['hairPoints',hairOutline.length*2],['handPoints',palmOutline.length*2]]){
  const value=s[key];
  if(!(value instanceof Float64Array)||value.length!==length)Object.defineProperty(s,key,{value:new Float64Array(length),writable:true,configurable:true,enumerable:false});
  else if(Object.prototype.propertyIsEnumerable.call(s,key))Object.defineProperty(s,key,{value,writable:true,configurable:true,enumerable:false});
 }
 ensureVisualArray(s,'sleevePoints');ensureVisualArray(s,'ribbons');
 return s;
}
function make(){return ensureDrawBuffers({wx:40,wy:-153,lean:0,cloth:0,lift:0,hair:0,rear:0,hemX:38,hemY:-99,clock:0,arm:solveArm(40,-153)});}
function targetPose(f){const a=f.action,k=a?.k,age=a?.age||0;let x=40,y=-153;
 if(k==='attack'){const start=a.startup||.1;if(age<start){const u=smooth(age/start);x-=13*u;y+=6*u;}else{const u=smooth((age-start)/.065),relax=smooth((age-start-.10)/.18);x+=7*u*(1-relax);y-=12*u*(1-relax);}}
 if(k==='q'){const cast=root.ThunderTuning?.qCast??.5;if(age<cast){const u=smooth(age/Math.max(.06,cast*.6));x=40-5*u;y=-153+3*u;}else{const fire=smooth((age-cast)/.06),recover=smooth((age-cast-.10)/Math.max(.06,(a.duration??.72)-cast-.10));x=35+20*fire;y=-150-4*fire;x+=(40-x)*recover;y+=(-153-y)*recover;}}
 if(k==='w'){x=a.diving?36:46;y=a.diving?-143:-177;}
 if(k==='e'){x=33;y=-151;}
 if(k==='r'){x=age<.5?36:40;y=age<.5?-164:-197;}
 return {x,y};}
function update(f,dt,time){const s=f.thunderModel??=make(),target=targetPose(f);dt=clamp(dt,0,.05);s.clock=time;
 spring(s,'wx',target.x,30,dt);spring(s,'wy',target.y,30,dt);
 spring(s,'lean',clamp(f.vx/MOTION.speed,-1,1)*MOTION.lean,12,dt);
 spring(s,'cloth',clamp(-f.vx*MOTION.clothDrag,-10,10),9,dt);
 spring(s,'hair',clamp(-f.vx*.014,-6,6),7,dt);
 spring(s,'rear',clamp(f.vx*.00012,-.07,.07),9,dt);
 spring(s,'lift',f.ground?0:5+4*clamp(f.vy/540,-1,1),10,dt);
 updateGarments(f,s,dt);updateRibbons(f,s,dt);s.arm=solveArm(s.wx,s.wy);spring(s,'hemX',s.arm.elbow.x+7+(s.sleeveSwing??s.cloth*.35)*f.dir,11,dt);spring(s,'hemY',s.arm.elbow.y+31+(s.sleeveLift||0),11,dt);return s;
}
const weights=outline.map(([x,y],i)=>{const cloth=i>=67&&i<=92?0:smooth((y+125)/108),edge=.25+.75*clamp(Math.abs(x)/40,0,1);return {x,y,cloth:cloth*edge,rear:smooth((-x-25)/15)*smooth((y+155)/15)*(1-smooth((y+85)/12))};});
function rotatePoint(x,y,ox,oy,angle,tx=ox,ty=oy){const c=Math.cos(angle),s=Math.sin(angle);return [tx+(x-ox)*c-(y-oy)*s,ty+(x-ox)*s+(y-oy)*c];}
function foreAngle(a){return Math.atan2(a.wrist.y-a.elbow.y,a.wrist.x-a.elbow.x)-Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x);}
function orbLocal(a){const angle=foreAngle(a),c=Math.cos(angle),s=Math.sin(angle);return {x:a.wrist.x+24*c+20*s,y:a.wrist.y+24*s-20*c};}
function sleeveGeometry(a,s){
 const sx=a.shoulder.x,sy=a.shoulder.y,ex=a.elbow.x,ey=a.elbow.y,wx=a.wrist.x,wy=a.wrist.y;
 const unx=(ey-sy)/upper,uny=-(ex-sx)/upper,fnx=-(wy-ey)/fore,fny=(wx-ex)/fore,cx=ex+(wx-ex)*.28,cy=ey+(wy-ey)*.28;
 const start=[sx+unx*8,sy+uny*8],cuff=[cx+fnx*7,cy+fny*7],tip=[s.hemX,clamp(s.hemY,cy+28,cy+52)],inner=[sx-unx*7,sy-uny*7];
 const points=[start];
 function quad(control,end){const begin=points[points.length-1];for(let i=1;i<=10;i++){const t=i/10,u=1-t;points.push([u*u*begin[0]+2*u*t*control[0]+t*t*end[0],u*u*begin[1]+2*u*t*control[1]+t*t*end[1]]);}}
 quad([ex+unx*9,ey+uny*9],cuff);quad([tip[0]+4,tip[1]-10],tip);quad([ex-16,ey+18],inner);
 return points;
}
function skin(f,s){ensureDrawBuffers(s);const a=s.arm,angle=foreAngle(a),fc=Math.cos(angle),fs=Math.sin(angle);
 for(let i=0;i<weights.length;i++){const p=weights[i];let x=p.x,y=p.y;
 if(p.rear){const v=rotatePoint(x,y,-25,-174,s.rear*f.dir);x+=(v[0]-x)*p.rear;y+=(v[1]-y)*p.rear;}
 const lower=smooth((p.y+85)/65),drag=(s.capeMid??s.cloth)*(1-lower)+(s.capeTip??s.cloth)*lower,flutter=Math.sin(s.clock*4.1-p.y*.035)*Math.min(1,Math.abs(f.vx||0)/330)*1.2;
 x+=(drag*f.dir+flutter)*p.cloth;y+=(s.lift+(s.capeLift||0)*lower)*p.cloth;
 s.points[i*2]=x;s.points[i*2+1]=y;}
 // Forearm and palm are rigid; the sleeve is a separate gravity-driven envelope.
 for(let i=0;i<palmOutline.length;i++){const [x,y]=palmOutline[i];s.handPoints[i*2]=a.elbow.x+(x-elbow.x)*fc-(y-elbow.y)*fs;s.handPoints[i*2+1]=a.elbow.y+(x-elbow.x)*fs+(y-elbow.y)*fc;}
 s.sleevePoints=sleeveGeometry(a,s);
 for(let i=0;i<hairOutline.length;i++){
  const [x,y]=hairOutline[i],b=ribbonBindings[i],chain=b&&s.ribbons?.[b.chain];let px=x,py=y;
  if(chain){const a=ribbonLocal(f,s,chain.nodes[b.i]),c=ribbonLocal(f,s,chain.nodes[b.i+1]),dx=c.x-a.x,dy=c.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const nx=a.x+dx*b.u+ux*b.along-uy*b.across,ny=a.y+dy*b.u+uy*b.along+ux*b.across;px+=(nx-x)*b.weight;py+=(ny-y)*b.weight;}
  s.hairPoints[i*2]=px;s.hairPoints[i*2+1]=py;
 }
 return s.points;
}
function transform(f,x,y){const s=f.thunderModel||make(),bob=Math.sin(s.clock*2.8)*MOTION.bob,c=Math.cos(s.lean*f.dir),si=Math.sin(s.lean*f.dir);return {x:f.x+visualScale*f.dir*(x*c-y*si),y:f.y+visualScale*(-16-bob+x*si+y*c)};}
function muzzle(f){const s=f.thunderModel||make();const orb=orbLocal(s.arm);return transform(f,orb.x,orb.y);}
function draw(c,f,time,bloom=true,effectContext=c){const s=f.thunderModel||update(f,0,time),pts=skin(f,s),n=pts.length/2,bob=Math.sin(s.clock*2.8)*MOTION.bob;
 c.save();c.translate(f.x,f.y);c.scale(visualScale,visualScale);c.translate(0,-16-bob);c.scale(f.dir,1);c.rotate(s.lean*f.dir);
 c.fillStyle='#e1d490';if(hairOutline.length){c.beginPath();c.moveTo(s.hairPoints[0],s.hairPoints[1]);for(let i=1;i<hairOutline.length;i++)c.lineTo(s.hairPoints[i*2],s.hairPoints[i*2+1]);c.closePath();c.fill();}
 // Sleeve and upper arm stay behind the fixed shoulder/collar.
 const sleeve=s.sleevePoints;c.beginPath();c.moveTo(...sleeve[0]);for(let i=1;i<sleeve.length;i++)c.lineTo(...sleeve[i]);c.closePath();c.fill();
 c.strokeStyle='#e1d490';c.lineCap='round';c.lineJoin='round';c.lineWidth=10;c.beginPath();c.moveTo(shoulder.x,shoulder.y);c.lineTo(s.arm.elbow.x,s.arm.elbow.y);c.stroke();
 c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=1;i<n;i++)c.lineTo(pts[i*2],pts[i*2+1]);c.closePath();c.fillStyle='#e1d490';c.fill();
 // Forearm and hand remain visible in front of the body even when the elbow rises.
 c.strokeStyle='#e1d490';c.lineWidth=8;c.beginPath();c.moveTo(s.arm.elbow.x,s.arm.elbow.y);c.lineTo(s.arm.wrist.x,s.arm.wrist.y);c.stroke();
 c.beginPath();c.moveTo(s.handPoints[0],s.handPoints[1]);for(let i=1;i<palmOutline.length;i++)c.lineTo(s.handPoints[i*2],s.handPoints[i*2+1]);c.closePath();c.fill();
 // Fixed costume pads cover the armhole; they never rotate with either arm bone.
 for(const pad of shoulderPads){c.beginPath();c.moveTo(...pad[0]);for(let i=1;i<pad.length;i++)c.lineTo(...pad[i]);c.closePath();c.fill();}
 const orb=orbLocal(s.arm);drawOrb(effectContext,orb.x,orb.y,11.5+Math.sin(time*5)*.25,time,bloom);
 c.restore();
}
function drawOrb(c,ox,oy,r,time,bloom=true){c.save();
 if(bloom){const glow=c.createRadialGradient(ox,oy,1,ox,oy,35);glow.addColorStop(0,palette.haloCore);glow.addColorStop(.38,palette.haloMid);glow.addColorStop(1,palette.haloEdge);c.fillStyle=glow;c.fillRect(ox-35,oy-35,70,70);}
 c.fillStyle=palette.core;c.shadowColor=palette.glow;c.shadowBlur=bloom?12:0;c.beginPath();c.arc(ox,oy,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle=palette.edge;c.lineWidth=.85;c.lineCap='round';
 // Three bounded strands orbit the sphere; continuous motion, no per-frame random paths.
 for(let j=0;j<3;j++){c.beginPath();for(let i=0;i<12;i++){const a=time*(j===1?-2.7:2.2)+j*2.094+i*.065,rr=r+2+Math.sin(i*1.7+j)*1.8,x=ox+Math.cos(a)*rr,y=oy+Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
 c.restore();}
const api={clothSpring,updateGarments,ribbonRest,ribbonBindings,updateRibbons,ribbonLocal,palette,drawOrb,visualScale,referenceHeight,bodyBounds,MOTION,shoulderPads,shoulder,elbow,wrist,upper,fore,outline,hairOutline,armOutline,palmOutline,foreAngle,orbLocal,sleeveGeometry,make,solveArm,targetPose,update,skin,transform,muzzle,draw};if(typeof module!=='undefined')module.exports=api;else root.ThunderModel=api;
})(typeof window!=='undefined'?window:globalThis);
