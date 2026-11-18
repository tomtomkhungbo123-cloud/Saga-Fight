// Mox model refined to the supplied silhouette; arena coordinates convert only at the boundary.
(()=>{let ctx,game;const {clamp,moxArcPoint,moxMuzzle}=window.MoxBase;
const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d'),gr=gc.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,125,32,.6)');gr.addColorStop(.3,'rgba(255,80,16,.15)');gr.addColorStop(1,'rgba(255,60,10,0)');gc.fillStyle=gr;gc.fillRect(0,0,128,128);
function bloom(x,y,r=80,alpha=1){ctx.globalAlpha*=alpha;ctx.drawImage(glow,x-r,y-r,r*2,r*2);ctx.globalAlpha/=alpha||1;}
// Gauntlet halo is baked once; one draw per fist, no live shadow/filter.
const gauntGlow=document.createElement('canvas');gauntGlow.width=gauntGlow.height=128;
const gg=gauntGlow.getContext('2d'),gh=gg.createRadialGradient(64,64,0,64,64,64);
gh.addColorStop(0,'#ffad62d0');gh.addColorStop(.2,'#ff793ba0');gh.addColorStop(.46,'#f64e2b48');gh.addColorStop(1,'#ef481b00');gg.fillStyle=gh;gg.fillRect(0,0,128,128);
function gauntBloom(r,alpha){const previous=ctx.globalAlpha;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=previous*Math.min(1,alpha);ctx.drawImage(gauntGlow,-r,-r,r*2,r*2);ctx.restore();}
function line(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
function path(d,color){ctx.fillStyle=color;ctx.fill(new Path2D(d));}
function orb(x,y,r,color='#ff5a2d'){ctx.save();bloom(x,y,r*5,.8);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,r*1.3,r*.7,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd18a';ctx.beginPath();ctx.ellipse(x+1,y-1,r*.6,r*.27,-.1,0,Math.PI*2);ctx.fill();ctx.restore();}

// Analytic tapered ribbon: one continuous filled shape, no segmented trail joints.
function fireRibbon(b,progress,opacity=1,head=true){
 const end=clamp(progress,0,1),start=Math.max(0,end-.78),points=[],count=48;
 if(end<=0)return;
 for(let i=0;i<=count;i++){let u=i/count,t=start+(end-start)*u,p=moxArcPoint(b,t),before=moxArcPoint(b,Math.max(0,t-.001)),after=moxArcPoint(b,Math.min(1,t+.001));let dx=after.x-before.x,dy=-(after.y-before.y),len=Math.hypot(dx,dy)||1;points.push({x:p.x,y:-p.y,nx:-dy/len,ny:dx/len,w:(b.k==='r'?15:13)*Math.pow(u,1.35)*Math.min(1,end*8)});}
 ctx.save();ctx.globalCompositeOperation='lighter';
 function band(mult,color,alpha){ctx.globalAlpha=opacity*alpha;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<points.length;i++){let p=points[i];ctx[i?'lineTo':'moveTo'](p.x+p.nx*p.w*mult,p.y+p.ny*p.w*mult);}for(let i=points.length-1;i>=0;i--){let p=points[i];ctx.lineTo(p.x-p.nx*p.w*mult,p.y-p.ny*p.w*mult);}ctx.closePath();ctx.fill();}
 band(3.2,'#ff4819',.055);band(1.95,'#ff6524',.12);band(1,'#e54c24',.9);band(.36,'#ffb56a',.7);band(.09,'#ffe6a9',.8);
 for(let i=0;i<7;i++){let u=(i+.5)/7,t=start+(end-start)*u,p=moxArcPoint(b,t),flicker=.45+.55*Math.sin(game.t*8+i*4)**2;ctx.globalAlpha=opacity*u*flicker*.7;let r=1.1+u*.8;ctx.fillStyle=i%2?'#ffc776':'#ff8340';ctx.beginPath();ctx.arc(p.x+Math.sin(i*17+game.t)*8,-p.y+Math.cos(i*13+game.t)*13,r,0,7);ctx.fill();}
 if(head){const p=points[points.length-1],prev=points[points.length-2];ctx.globalAlpha=opacity;ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.y-prev.y,p.x-prev.x));bloom(0,0,73,.8);ctx.fillStyle='#ff6e32';ctx.beginPath();ctx.moveTo(-30,0);ctx.bezierCurveTo(-19,-11,6,-15,20,-4);ctx.bezierCurveTo(28,4,8,15,-30,0);ctx.fill();ctx.fillStyle='#ffd08a';ctx.beginPath();ctx.ellipse(2,0,14,3,0,0,7);ctx.fill();}
 ctx.restore();
}

function limb(x,y,ex,ey,width,color){line([[x,y],[ex,ey]],color,width);}
// Local visual state follows real displacement, never a wall-clock running loop.
const locomotionStates=new WeakMap();
function locomotion(f,clock){let m=locomotionStates.get(f);if(!m||clock<m.time){m={time:clock,x:f.x,phase:0,mix:0,lean:0,air:0,land:0,wasAir:!f.ground};locomotionStates.set(f,m);}const dt=Math.min(.05,Math.max(0,clock-m.time));if(dt>0){const dx=f.x-m.x,speed=Math.abs(f.vx||0),inAir=!f.ground,grabbing=!!f.mox?.action?.grab,targetMix=!inAir&&!grabbing?clamp(speed/300,0,1):0;m.mix+=(targetMix-m.mix)*(1-Math.exp(-dt*16));if(!inAir&&!grabbing&&Math.abs(dx)<100)m.phase+=Math.abs(dx)*Math.PI*2/(84/.57);const localVelocity=(f.vx||0)*(f.dir||1);m.lean+=(clamp(localVelocity/370,-1,1)*.14*(grabbing?0:1)-m.lean)*(1-Math.exp(-dt*12));m.air+=((inAir&&!grabbing?1:0)-m.air)*(1-Math.exp(-dt*16));if(m.wasAir&&!inAir)m.land=1;m.land*=Math.exp(-dt*15);m.wasAir=inAir;m.x=f.x;m.time=clock;}return m;}
function moxLeg(phase,side,mix,air,vy,bob){
 const q=((phase/(2*Math.PI)+side*.5)%1+1)%1,stance=.57,u=q<stance?q/stance:(q-stance)/(1-stance),ease=u*u*(3-2*u),swing=q>=stance;
 const idle=side?28:-25,gaitX=swing?-42+84*ease:42-84*u,gaitY=swing?-23*Math.sin(Math.PI*u):0,tuck=air*(.65+clamp(vy/850,-.3,.35)),hip={x:side?8:-8,y:-69-bob};
 const foot={x:idle*(1-mix)+gaitX*mix+(side?7:-9)*tuck,y:-6+gaitY*mix-(side?11:25)*tuck};
 const dx=foot.x-hip.x,dy=foot.y-hip.y,len=Math.hypot(dx,dy)||1,d=clamp(len,2,81.9),upper=40,lower=42,along=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-along*along));
 const knee={x:hip.x+dx/len*along+dy/len*h,y:hip.y+dy/len*along-dx/len*h},bend=.35+.45*Math.max(mix,air);knee.x=(hip.x+foot.x)*.5+(knee.x-(hip.x+foot.x)*.5)*bend;knee.y=(hip.y+foot.y)*.5+(knee.y-(hip.y+foot.y)*.5)*bend;return {hip,knee,foot};
}
function drawMoxLeg(leg,color){const a=leg.hip,b=leg.knee,c=leg.foot,h={x:a.x,y:a.y+18},left=[],right=[];for(let i=0;i<=24;i++){const t=i/24,q=1-t,x=q*q*q*a.x+3*q*q*t*h.x+3*q*t*t*b.x+t*t*t*c.x,y=q*q*q*(a.y-.7)+3*q*q*t*h.y+3*q*t*t*b.y+t*t*t*c.y,dx=3*q*q*(h.x-a.x)+6*q*t*(b.x-h.x)+3*t*t*(c.x-b.x),dy=3*q*q*(h.y-a.y)+6*q*t*(b.y-h.y)+3*t*t*(c.y-b.y),len=Math.hypot(dx,dy)||1,w=10.5-3.5*t*t;left.push({x:x-dy/len*w,y:y+dx/len*w});right.push({x:x+dy/len*w,y:y-dx/len*w});}ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);for(const p of left)ctx.lineTo(p.x,p.y);const capLeft=left.at(-1),capRight=right.at(-1),capLen=Math.hypot(c.x-b.x,c.y-b.y)||1,tx=(c.x-b.x)/capLen*9.4,ty=(c.y-b.y)/capLen*9.4;ctx.bezierCurveTo(capLeft.x+tx,capLeft.y+ty,capRight.x+tx,capRight.y+ty,capRight.x,capRight.y);for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);ctx.closePath();ctx.fill();}
function shootingPose(anim){const weights=[0,0],smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},pulse=(time,hand)=>{const phase=anim.t-time,w=phase<0?smooth((phase+.12)/.12):1-smooth(phase/.2);weights[hand]=Math.max(weights[hand],w);};let kind='basic';if(anim.k==='attack'&&anim.form)pulse(.12,anim.hand||0);else if(anim.k==='w'){kind='w';for(let i=0;i<2;i++)pulse(.18+i*.09,((anim.shotStartHand||0)+i)%2);}else if(anim.k==='r'&&anim.form){kind='r';for(let i=0;i<4;i++)pulse(.15+i*.22,((anim.shotStartHand||0)+i)%2);}return {weights,kind};}
// Render-local energy advects from sampled glove motion; no gameplay or unbounded particles.
const punchEnergyStates=new WeakMap();
function energyState(f){let state=punchEnergyStates.get(f);if(!state){state=[{time:-1,points:[]},{time:-1,points:[]}];punchEnergyStates.set(f,state);}return state;}
function punchFlame(arm,active,age,toWorld,toLocal){
 const state=game.energy[arm.hand],clock=game.t,phase=clamp((age-.025)/.315,0,1),power=active?Math.pow(Math.sin(phase*Math.PI),.8):0,tip=toWorld(arm.x,arm.y);
 if(state.time<0||clock<state.time||Math.hypot(tip.x-(state.x??tip.x),tip.y-(state.y??tip.y))>180){state.points=[];state.time=clock;state.x=tip.x;state.y=tip.y;state.next=clock;}
 const dt=clock-state.time;
 if(dt>0){const vx=(tip.x-state.x)/dt,vy=(tip.y-state.y)/dt;
 // Fixed-rate emission gives equal persistence at 30/60/120 Hz, with bounded lifetime.
 if(power>.015){for(let stamp=Math.max(state.next,clock-.2);stamp<=clock;stamp+=1/120){const u=clamp((stamp-state.time)/dt,0,1);state.points.push({x:state.x+(tip.x-state.x)*u,y:state.y+(tip.y-state.y)*u,time:stamp,power,vx:clamp(vx,-900,900),vy:clamp(vy,-900,900)});state.next=stamp+1/120;}}
 else state.next=clock;
 state.points=state.points.filter(p=>clock-p.time<.19).slice(-26);state.x=tip.x;state.y=tip.y;state.time=clock;
 }
 if(!state.points.length&&power<.015)return;
 ctx.save();ctx.globalCompositeOperation='source-over';
 // Diffuse residual energy rises and drifts after the glove has already changed direction.
 for(let i=0;i<state.points.length;i+=3){const p=state.points[i],age=clock-p.time,fade=Math.pow(1-age/.19,1.7)*p.power,q=toLocal(p.x+p.vx*age*.12,p.y+p.vy*age*.08-age*45);ctx.save();ctx.translate(q.x,q.y);gauntBloom(22+age*75,fade*.28);ctx.restore();}
 const history=state.points.map(p=>{const age=clock-p.time,q=toLocal(p.x+p.vx*age*.12,p.y+p.vy*age*.08-age*45);return {...q,u:1-age/.19,power:p.power};});
 if(power>.015)history.push({x:arm.x,y:arm.y,u:1,power});
 // Three soft, unequal tongues follow the actual hand path instead of a rigid ellipse.
 for(let lane=0;lane<3;lane++){
 const points=history.map((p,i)=>{const u=i/Math.max(1,history.length-1),wave=Math.sin(clock*12-u*4.6+lane*1.9),offset=(lane-1)*7;return {x:p.x-u*2,y:p.y+offset+(1-u)*(wave*7-lane*3),w:(3.5+lane*1.6)*Math.pow(u,.8)*p.u*p.power};});
 if(points.length<2)continue;
 const band=(mult,color,alpha)=>{ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();const edge=(sign,reverse)=>{const list=reverse?points.slice().reverse():points;list.forEach((p,i)=>{const x=p.x,y=p.y+sign*p.w*mult;if(!i&&!reverse)ctx.moveTo(x,y);else{const next=list[i+1]||p;ctx.quadraticCurveTo(x,y,(x+next.x)*.5,(y+next.y+sign*next.w*mult)*.5);}});};edge(1,false);edge(-1,true);ctx.closePath();ctx.fill();};
 band(2.8,'#c43513',.045);band(1.65,'#db481f',.09);band(1,'#d74b22',.13);band(.42,'#ff8b42',.12);
 }
 if(power>.015){ctx.translate(arm.x,arm.y);gauntBloom(44,power*.6);
 // Low-frequency curling lobes form a loose flame envelope with no closed ring edge.
 for(let i=0;i<4;i++){const phase=clock*5+i*1.7,rise=(Math.sin(phase)+1)*.5,x=-13+i*7+Math.sin(phase*.8)*3,y=-9-rise*11;
 ctx.save();ctx.translate(x,y);ctx.scale(.55,.9+rise*.35);gauntBloom(25,power*(.33+i%2*.08));ctx.restore();
 ctx.globalAlpha=power*.16;ctx.fillStyle=i%2?'#f58b43':'#e6632c';ctx.beginPath();ctx.moveTo(x-7,5);ctx.bezierCurveTo(x-13,y,x+7,y-10-rise*9,x-3,y-16);ctx.bezierCurveTo(x+16,y-7,x+12,7,x-7,5);ctx.fill();}
 }
 ctx.restore();
}
function fighter(entity,enemy=false,ghost=false){const p=entity,t=game.t,anim=game.anim,age=anim.t;const motion=game.motion||{phase:0,mix:0,lean:0,air:0,land:0},moving=motion.mix>.02,stride=Math.sin(motion.phase);let bob=Math.sin(t*3)*.9*(1-motion.mix)+(1-Math.cos(motion.phase*2))*1.8*motion.mix-motion.land*5,lean=motion.lean;let punch=0,cast=0,shift=0;const front=!enemy?game.punchPose.front:0,back=!enemy?game.punchPose.back:0;const grapple=!enemy&&game.action?.grab;const launchAge=game.action?.k==='r'&&game.action.form?Math.max(0,(game.action.age-.15)% .22):1;const recoil=!enemy&&launchAge<.18?Math.sin(launchAge/.18*Math.PI):0;
 if(!enemy){if(game.action?.grab)cast=Math.min(1,age*6);if(anim.k==='q'&&age<.5)shift=Math.sin(age/.5*Math.PI);}
 const firing=shootingPose(anim);if(grapple)bob=0;
 ctx.save();ctx.translate(p.x,-p.y);ctx.scale(p.dir||-1,1);ctx.translate((front+back)*5-recoil*3,0);if(!enemy&&p.cc>0)ctx.rotate(Math.sin(t*25)*.06);
 const col=enemy?'#82918b':'#ff964b',dark=col,gaunt=enemy?'#465d54':'#ba4026';
 ctx.save();ctx.scale(1, .22);ctx.fillStyle=ghost?'transparent':'rgba(0,0,0,'+(.45*(1-motion.air*.8))+')';ctx.beginPath();ctx.ellipse(0,p.y*4.5,60,22,0,0,7);ctx.fill();ctx.restore();
 ctx.translate(0,-85);ctx.rotate(p.turn||0);ctx.translate(0,85);
 if(!enemy&&p.form){ctx.save();ctx.translate(-13,-81);ctx.rotate(Math.sin(t*2.3)*.07);
 const wing='M -19 -12 L -47 -42 Q -52 -27 -44 -9 Z M -28 0 L -57 10 L -32 22 Z M -18 19 L -37 39 L -12 31 Z';
 ctx.save();ctx.globalCompositeOperation='lighter';for(const [x,y,r] of [[-38,-24,39],[-43,11,35],[-26,28,31]]){ctx.translate(x,y);gauntBloom(r,.65+Math.sin(t*2.3)*.08);ctx.translate(-x,-y);}ctx.restore();
 path(wing,gaunt);ctx.restore();}

 // Fixed-length legs plant during stance, lift during swing, and tuck in the air.
 drawMoxLeg(moxLeg(motion.phase,0,motion.mix,motion.air,p.vy||0,bob),col);
 drawMoxLeg(moxLeg(motion.phase,1,motion.mix,motion.air,p.vy||0,bob),col);
 // Shorter abdomen: upper rig lowered 12 units, original leg proportions retained.
 // Trunk and thighs share a narrow vertical attachment without a hip overlay.
 const torsoAngle=lean+(!enemy?game.punchPose.roll:0),ct=Math.cos(torsoAngle),st=Math.sin(torsoAngle),join=(x,y)=>({x:ct*x-st*(y+81-bob),y:-69+st*x+ct*(y+81-bob)});
 const rootShift=(front+back)*5-recoil*3,localShot=hand=>{const tip=moxMuzzle(hand,firing.kind),x=tip.x-rootShift,y=-tip.y+69;return {x:ct*x+st*y,y:-st*x+ct*y-81+bob};};
 const armSwing=Math.sin(motion.phase)*motion.mix*(1-Math.max(front,back,cast)),rearFire=firing.weights[1],frontFire=firing.weights[0];
 const rearActive=Math.max(back,rearFire),frontActive=Math.max(front,frontFire),castReach=game.action?.k==='w'?10:46,castLift=game.action?.k==='w'?31:13;
 // The inactive hand retracts to guard; the active hand has its own shoulder and lane.
 let bx=-3+back*75+(grapple?55:0)+armSwing*3,by=-124+back*12+(grapple?2:0)+motion.mix*2;
 let ex=38+front*40+cast*castReach-back*22-rearFire*22-recoil*5-armSwing*3,ey=-126+front*14+cast*castLift-(grapple?12:0)+motion.mix*2-rearActive*12;
 bx-=frontActive*3;by-=frontActive*4;
 const rearTip=localShot(1),frontTip=localShot(0);bx+=(rearTip.x-bx)*rearFire;by+=(rearTip.y-by)*rearFire;ex+=(frontTip.x-ex)*frontFire;ey+=(frontTip.y-ey)*frontFire;
 const arms=[{hand:1,sx:-20+rearActive*18,sy:-122,x:bx,y:by,elx:-28+back*60,ely:-102-back*5,active:rearActive},{hand:0,sx:20,sy:-122,x:ex,y:ey,elx:31+front*18+cast*18-rearActive*13,ely:-102-front*5-cast*4,active:frontActive}];
 for(const a of arms){const fire=firing.weights[a.hand];a.elx+=(a.sx+(a.x-a.sx)*.5-a.elx)*fire;a.ely+=((a.sy+a.y)*.5+12-a.ely)*fire;}
 const armOrder=arms.slice().sort((a,b)=>a.active-b.active||b.hand-a.hand);
 const drawUpper=a=>limb(a.sx,a.sy,a.elx,a.ely,13,col);
 const turnC=Math.cos(p.turn||0),turnS=Math.sin(p.turn||0),toWorld=(x,y)=>{const q=join(x,y),rx=turnC*q.x-turnS*(q.y+85),ry=-85+turnS*q.x+turnC*(q.y+85);return {x:p.x+(p.dir||1)*(rootShift+rx),y:-p.y+ry};},toLocal=(x,y)=>{const rx=(x-p.x)*(p.dir||1)-rootShift,ry=y+p.y+85,qx=turnC*rx+turnS*ry,qy=-turnS*rx+turnC*ry-85;return {x:ct*qx+st*(qy+69),y:-st*qx+ct*(qy+69)-81+bob};};
 const drawLower=a=>{if(!enemy&&!ghost)punchFlame(a,anim.k==='attack'&&!anim.form&&a.hand===(anim.hand||0),age,toWorld,toLocal);limb(a.elx,a.ely,a.x,a.y,12.5,col);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(-.1+a.active*.1);
 const glove='M -9 -7 L -5 -16 Q -3 -17 -1 -11 L 4 -12 Q 9 -9 10 -3 L 10 5 Q 9 11 3 12 L -5 11 Q -11 10 -11 4 Z';
 if(!enemy)gauntBloom(34,.72+a.active*.25+shift*.15);path(glove,gaunt);
 ctx.restore();};
 ctx.save();ctx.translate(0,-69);ctx.rotate(torsoAngle);ctx.translate(0,81-bob);
 for(const a of arms)drawUpper(a);ctx.restore();
 const move=(x,y)=>{const p=join(x,y);ctx.moveTo(p.x,p.y);},edge=(x,y)=>{const p=join(x,y);ctx.lineTo(p.x,p.y);},curve=(x,y,ex,ey)=>{const a=join(x,y),b=join(ex,ey);ctx.quadraticCurveTo(a.x,a.y,b.x,b.y);};
 ctx.fillStyle=col;ctx.beginPath();move(-10,-136);curve(-17,-132,-22,-123);curve(-27,-115,-26,-108);edge(-18,-91);
 const lc=join(-19,-93),rc=join(19,-93),rw=join(18,-91);
 ctx.bezierCurveTo(lc.x,lc.y,-18.5,-76-bob,-18.5,-69-bob);ctx.lineTo(18.5,-69-bob);ctx.bezierCurveTo(18.5,-76-bob,rc.x,rc.y,rw.x,rw.y);
 edge(26,-108);curve(27,-117,21,-126);curve(16,-134,9,-137);ctx.closePath();ctx.fill();
 ctx.save();ctx.translate(0,-69);ctx.rotate(torsoAngle);ctx.translate(0,81-bob);
 ctx.save();ctx.translate(0,-148);ctx.rotate(-lean*.35+Math.sin(t*2)*.012);ctx.scale(.92,.9);path('M -16 -9 L -21 -25 Q -17 -27 -11 -22 L -13 -30 Q -4 -31 1 -24 L -2 -32 Q 7 -31 12 -25 L 12 -29 Q 21 -25 21 -13 Q 21 4 13 14 Q 5 20 -7 15 Q -16 9 -17 -2 Z',col);ctx.restore();
 // Forearms and gloves render in action order, with the striking hand foremost.
 for(const a of armOrder){if(a.hand===0||a.active>.02)drawUpper(a);drawLower(a);}

 ctx.restore();
 if(!enemy&&p.immune>0){ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#ffd095';ctx.lineWidth=1.4;ctx.setLineDash([9,12]);ctx.beginPath();ctx.ellipse(0,-88,62,102,-.12,0,7);ctx.stroke();ctx.restore();}
 if(!enemy&&p.invuln>0){ctx.strokeStyle='#ffe3b8';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-85,60,96,.15,0,7);ctx.stroke();}
 if(enemy&&p.burn>0){for(let i=0;i<5;i++){let phase=(t*1.8+i*.23)%1;ctx.save();ctx.globalAlpha=1-phase;orb(Math.sin(i*13+t)*30,-20-phase*110,5*(1-phase)+2);ctx.restore();}}
 if((enemy&&p.stun>0)||(!enemy&&p.cc>0)){ctx.strokeStyle='#f5d68e';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-189,28,7,0,0,7);ctx.stroke();for(let i=0;i<3;i++){let a=t*4+i*2.1;ctx.fillStyle='#ffe4a1';ctx.fillRect(Math.cos(a)*28-2,-191+Math.sin(a)*7,4,4);}}
 ctx.restore();
}
// Tapered cubic filaments replace angular ground cracks and rigid rings.
function softFlare(c,width,opacity){
 const points=[];
 for(let i=0;i<=26;i++){const t=i/26,q=1-t,x=3*q*q*t*c[0]+3*q*t*t*c[2]+t*t*t*c[4],y=3*q*q*t*c[1]+3*q*t*t*c[3]+t*t*t*c[5],dx=3*q*q*c[0]+6*q*t*(c[2]-c[0])+3*t*t*(c[4]-c[2]),dy=3*q*q*c[1]+6*q*t*(c[3]-c[1])+3*t*t*(c[5]-c[3]),len=Math.hypot(dx,dy)||1,w=width*Math.pow(Math.sin(Math.PI*t),.85)*(.3+.7*t);points.push({x,y,nx:-dy/len,ny:dx/len,w});}
 for(const [mult,alpha,color] of [[3.5,.045,'#ff652c'],[2,.11,'#ff7c38'],[1,.65,'#f98342'],[.22,.55,'#ffd99a']]){ctx.globalAlpha=opacity*alpha;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];ctx[i?'lineTo':'moveTo'](p.x+p.nx*p.w*mult,p.y+p.ny*p.w*mult);}for(let i=points.length-1;i>=0;i--){const p=points[i];ctx.lineTo(p.x-p.nx*p.w*mult,p.y-p.ny*p.w*mult);}ctx.closePath();ctx.fill();}
}
function effect(f){if(f.k==='punch')return;if(f.k==='ribbon'){fireRibbon(f.ball,1,Math.pow(f.life/f.max,1.5),false);return;}let u=1-f.life/f.max,fade=1-u;ctx.save();ctx.translate(f.x,-f.y);ctx.globalAlpha=fade;
 if(f.k==='ghost'){fighter({x:0,y:0,vx:400,dir:f.dir,form:f.form},false,true);}
 if(['impact','muzzle','grab'].includes(f.k)){bloom(0,0,100,1);for(let i=0;i<8;i++){let a=i*.785+.2,r=u*70;line([[Math.cos(a)*r*.4,Math.sin(a)*r*.4],[Math.cos(a)*r,Math.sin(a)*r]],i%2?'#ffbc6a':'#fa4b25',3*fade);}}


 if(f.k==='sparks'){const power=f.power||1;ctx.scale(power,power);ctx.globalCompositeOperation='lighter';bloom(0,0,100,fade*.8);for(let i=0;i<(f.power?30:18);i++){const seed=(f.seed||0)*.73,a=i*2.399+seed,speed=90+(i*47%190),vx=Math.cos(a)*speed+(f.dir||1)*70,vy=Math.sin(a)*speed;const age=u*f.max,tail=Math.max(0,age-.026),x=vx*age,y=vy*age+160*age*age,px=vx*tail,py=vy*tail+160*tail*tail;ctx.globalAlpha=fade*fade;line([[px,py],[x,y]],i%3?'#ff9842':'#ffe3a8',(1.2+i%3*.65)*Math.sqrt(fade));if(i%4===0){ctx.fillStyle='#fff1c5';ctx.fillRect(x-1,y-1,2,2);}}}
 if(f.k==='shift'){bloom(0,0,150,.7);ctx.strokeStyle='#ffb06a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,40+u*80,70+u*70,0,-u*4,u*5+3);ctx.stroke();for(let i=0;i<6;i++){let a=i*Math.PI/3+u*3;orb(Math.cos(a)*(45+u*55),Math.sin(a)*85,5);}}
 if(f.k==='slash'){ctx.scale(f.dir,1);bloom(120,0,170,.4);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(25,-25+i*10);ctx.bezierCurveTo(100,-90+i*20,235,-30+i*30,300*u+40,10+i*9);ctx.strokeStyle=i===1?'#ffbd7a':'#e9562b';ctx.lineWidth=(13-i*3)*fade;ctx.lineCap='round';ctx.stroke();}}
 if(f.k==='diveTrail'){ctx.globalCompositeOperation='lighter';bloom(0,0,85,.4);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((i-1)*15,40);ctx.quadraticCurveTo((i-1)*25,-40,(i-1)*12,-170);ctx.strokeStyle=i===1?'#ffc07b':'#ef5a2b';ctx.lineWidth=(i===1?13:5)*fade;ctx.stroke();}}
 if(f.k==='slam'){
 const age=u*f.max,spread=1-Math.exp(-age*5.3),opacity=Math.pow(fade,1.6);ctx.globalCompositeOperation='lighter';
 // A broad soft pool of light supports flowing tendrils without a hard ring edge.
 ctx.save();ctx.scale(1,.18);ctx.globalAlpha=1;bloom(0,0,180+spread*330,Math.exp(-age*5)*.8);ctx.restore();
 for(let i=0;i<12;i++){const a=i*2.399,localAge=Math.max(0,age-(i%3)*.014),grow=1-Math.exp(-localAge*6),length=(220+(i*71%250))*grow,x=Math.cos(a)*length,y=Math.sin(a)*length*.19,swirl=Math.sin(i*3.1)*30*grow,lift=(16+i%4*8)*grow;ctx.save();ctx.translate(0,-4);softFlare([x*.25,y*.2-lift,x*.65,y+swirl-lift,x,y*.8],(7+i%3*2.6)*(1-.35*u),opacity*Math.min(1,localAge*20));ctx.restore();}
 // Wisps curl upward near the point of impact and melt away with the ground light.
 for(let i=0;i<4;i++){const side=i%2?1:-1,h=(85+i*22)*spread;softFlare([side*25,-h*.25,side*(45+i*7),-h*.8,side*(20+i*13),-h],5,opacity*.45);}
 const flash=Math.exp(-age*13);ctx.globalAlpha=flash;ctx.beginPath();ctx.moveTo(0,-320);ctx.bezierCurveTo(-22,-210,20,-100,0,0);ctx.strokeStyle='#ffb978';ctx.lineWidth=18*flash;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.moveTo(0,-285);ctx.bezierCurveTo(13,-190,-12,-80,0,0);ctx.strokeStyle='#ffe2ad';ctx.lineWidth=4*flash;ctx.stroke();
 }
 if(f.k==='debris'){
 const age=u*f.max;
 // Large angular rocks and smaller fragments follow ballistic arcs.
 for(let i=0;i<26;i++){const a=i*2.399,speed=95+(i*43%210),vx=Math.cos(a)*speed*1.6,vy=-(95+(i*67%230)),x=vx*age,y=vy*age+280*age*age,size=3+i%5*2.1;ctx.save();ctx.translate(x,Math.min(-2,y));ctx.rotate(a+age*(i%2?3:-4));ctx.globalAlpha=fade;ctx.fillStyle=i%3?'#8b5431':'#c58248';ctx.beginPath();ctx.moveTo(-size,-size*.4);ctx.lineTo(-size*.4,-size);ctx.lineTo(size*.75,-size*.7);ctx.lineTo(size,size*.55);ctx.lineTo(-size*.2,size);ctx.closePath();ctx.fill();line([[-size*.4,-size*.8],[size*.6,-size*.6]],'#f8a663',1);ctx.restore();}
 // Dust uses the cached soft light, no live blur or unbounded emitters.
 ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<9;i++){const side=i%2?1:-1,x=side*(30+age*(110+i*15)),y=-15-age*(10+i%3*12),r=38+age*65;ctx.globalAlpha=fade*.15;ctx.drawImage(glow,x-r,y-r,r*2,r*2);}ctx.restore();
 }

 ctx.restore();}

function bind(context,f,e,clock,ground=0){ctx=context;const g=f.mox;game={energy:energyState(f),motion:locomotion(f,clock),t:clock,p:{...g.p,x:f.x,y:ground-f.y,vx:f.vx,vy:-f.vy,grounded:f.ground,dir:f.dir,turn:f.turn||0,hp:f.hp,cc:Math.max(0,(f.stunUntil||0)-clock,(f.freezeUntil||0)-clock),immune:Math.max(0,(f.immuneUntil||0)-clock),invuln:Math.max(0,(f.invulnUntil||0)-clock)},e:{x:e.x,y:ground-e.y,hp:e.hp},anim:g.anim,action:g.action,punchPose:g.punchPose};}
window.MoxVisual={
 character(context,f,e,clock,ground=f.y){bind(context,f,e,clock,ground);ctx.save();ctx.translate(0,ground);fighter(game.p);ctx.restore();},
 back(context,f,e,clock){bind(context,f,e,clock);for(const fx of f.mox.fx)if(['ghost','slam','shift'].includes(fx.k))effect(fx);},
 front(context,f,e,clock){bind(context,f,e,clock);if(game.action?.k==='r'&&game.action.form){ctx.save();ctx.translate(e.x,e.y-85);ctx.rotate(clock*.7);ctx.strokeStyle='#ff7745';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,58,0,7);ctx.stroke();for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);line([[45,0],[72,0]],'#ff7745',2);}ctx.restore();}
 for(const b of f.mox.balls){if(b.age<0)continue;if(b.k==='w'||b.k==='r'){fireRibbon(b,b.age/b.duration);continue;}let pts=b.trail;for(let i=1;i<pts.length;i++){let a=i/pts.length;ctx.save();ctx.globalAlpha=a*.65;line([[pts[i-1].x,-pts[i-1].y],[pts[i].x,-pts[i].y]],'#ef572a',a*10);ctx.restore();}orb(b.x,-b.y,9,'#ff6233');}
 for(const fx of f.mox.fx)if(!['ghost','slam','shift','dash'].includes(fx.k)){if(fx.k==='ribbon'&&fx.ball.progress!==undefined)fireRibbon(fx.ball,fx.ball.progress,Math.pow(fx.life/fx.max,1.5),false);else effect(fx);}
 if(e.burn?.owner===f.id&&e.burn.remaining>0){ctx.save();ctx.translate(e.x,e.y);for(let i=0;i<5;i++){let phase=(clock*1.8+i*.23)%1;ctx.save();ctx.globalAlpha=1-phase;orb(Math.sin(i*13+clock)*30,-20-phase*110,5*(1-phase)+2);ctx.restore();}ctx.restore();}},
};
})();
