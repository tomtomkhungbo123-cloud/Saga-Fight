window.drawSoul = function(ctx, fighter, time, bloom=true){
const p=fighter,action=p.action,blade=p.blade,t=time,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const $=()=>({checked:bloom});
function path(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
// Smooth, hand-drawn contours; all turn poses keep a positive body width.
const cache=window.soulPathCache??=(new Map());
function contour(d,color='#791520'){ctx.fillStyle=color;let shape=cache.get(d);if(!shape){shape=new Path2D(d);if(cache.size<100)cache.set(d,shape);}ctx.fill(shape);}
function sword(x,y,angle=0,scale=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.shadowColor='#ff4964';ctx.shadowBlur=$('glow').checked?11:0;contour('M -8 -34 C -14 -21 -20 -9 -19 6 C -16 17 -4 12 5 -3 L 18 -28 C 20 -32 23 -29 22 -23 C 17 5 5 38 -12 77 C -16 87 -19 91 -20 81 C -19 49 -18 24 -13 6 C -9 -6 -4 -21 -8 -34 Z','#ff5269');ctx.restore();}
// Reference contours in the supplied 238 × 273 drawing's coordinate system.
const soulShape={
 head:'M 89 102 C 83 99 85 86 90 78 C 95 68 94 57 100 46 C 104 38 110 36 117 38 C 126 39 129 45 130 54 C 131 65 137 72 139 84 C 141 94 137 103 133 109 C 124 116 105 114 96 108 Z',
 torso:'M 96 98 C 91 112 94 125 93 140 C 90 155 90 166 94 177 C 103 185 124 182 135 177 C 136 164 130 150 128 136 L 128 104 Z',
 leftLeg:'M 94 165 C 92 181 98 201 103 222 C 106 235 109 242 113 240 C 117 236 116 224 115 211 L 115 173 Z',
 rightLeg:'M 114 169 C 118 190 128 213 140 232 C 145 239 150 243 150 235 C 147 216 140 196 136 177 L 132 163 Z',
 rightArm:'M 128 99 C 136 105 137 119 142 131 C 145 138 150 143 148 146 C 145 149 140 144 137 139 C 132 131 127 122 124 111 Z',
 leftArm:'M 91 100 C 87 111 82 122 77 132 C 73 139 69 146 72 149 C 75 151 80 142 83 137 C 89 127 95 116 99 105 Z',
 blade:'M 69 129 C 63 135 58 148 54 160 L 46 191 C 43 201 47 198 52 192 C 66 177 77 161 85 145 C 88 137 88 134 85 137 C 80 145 74 154 69 154 C 62 154 69 138 72 132 C 74 127 73 126 69 129 Z'
};
// The sword and trail share this exact wrist/angle curve.
function attackPose(progress){
 const q=action?.n===2?1-clamp(progress,0,1):clamp(progress,0,1),angle=-.9+q*2.0;
 const hx=48-11*Math.sin(Math.PI*q),hy=80+55*q;
 return {hx,hy,angle,tip:[hx-27*Math.cos(angle)-51*Math.sin(angle),hy-27*Math.sin(angle)+51*Math.cos(angle)]};
}
function attackFrame(age){
 const raw=clamp((age-.04)/.22,0,1),q=raw*raw*(3-2*raw),pose=attackPose(q);
 const blend=age<.04?clamp(age/.04,0,1):1-clamp((age-.26)/.12,0,1);
 return {...pose,q,hx:74+(pose.hx-74)*blend,hy:146+(pose.hy-146)*blend,angle:pose.angle*blend};
}
function person(x,y,dir=1){
 const phase=p.spinPhase||0,en=p.spinBlend||0,turn=Math.sin(phase)*en,depth=1+(Math.cos(phase)-1)*en;
 const a=action?.age||0,attack=action?.k==='attack'?attackFrame(action.startup?a*.15/action.startup:a):null,swing=action?.k==='attack'?Math.sin(clamp(a/.38,0,1)*Math.PI):0;
 const slam=action?.k==='r'?(action.fired?Math.max(0,1-(a-action.impactAge)/.42):action.diving?.9:.35):0;
 const morph=action?.k==='e'?clamp(a/.5,0,1):0,weight=(p.runWeight||0)*(1-en*.65),gait=p.gait||0,run=Math.sin(gait)*weight,air=p.airWeight||0;
 ctx.save();ctx.translate(x,y+Math.sin(t*2.8)*1.1+en*4-Math.abs(Math.sin(gait))*weight*4);ctx.scale(-dir*(1+en*.08),1-en*.13-slam*.20);ctx.rotate(turn*.045-swing*.18-(p.lean||0));ctx.translate(-110,-240);
 // Rear and front half-arcs interleave with the body, matching the reference.
 function spinRibbons(front){
  if(en<.01)return;
  const cross=p.crossBlend||0;
  for(let layer=0;layer<2;layer++)for(let j=0;j<3;j++){
   if(layer&&j>0)continue;const strength=j===0?1:cross;if(strength<.01)continue;
   const radius=layer?400/(1+en*.08):132+j*8;
   const tilt=j===0?-.13:j===1?.44:-.48;
   const height=layer?.21:.32;
   const start=phase+j*1.9;
   const point=(v,inner)=>{const ang=start-v*4.7,r=radius-(inner?Math.sin(v*Math.PI)*(layer?37:29):0);return [Math.cos(ang)*r,Math.sin(ang)*r*height];};
   ctx.save();ctx.translate(110,151);ctx.rotate(tilt);ctx.globalAlpha*=(layer?.88:.96)*en*strength;
   // Clip a continuous ribbon into front/back halves without segment seams.
   const ribbon=[];
   for(let i=0;i<=40;i++)ribbon.push(point(i/40,false));
   for(let i=40;i>=0;i--)ribbon.push(point(i/40,true));
   const ribbonColor=j===0?'#f45571':j===1?'#fa5b79':'#eb496c';
   if($('glow').checked&&!front){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor='#ff315f';
    ctx.globalAlpha*=.38;ctx.shadowBlur=28;path(ribbon,ribbonColor);
    ctx.globalAlpha*=1.5;ctx.shadowBlur=10;path(ribbon,'#ff7190');ctx.restore();
   }
   ctx.beginPath();ctx.rect(-radius-5,front?0:-radius,2*radius+10,radius);ctx.clip();
   ctx.shadowBlur=0;path(ribbon,ribbonColor);
   ctx.restore();
  }
 }
 function normalSweep(front){
  if(!attack||attack.q<.001)return;
  const visible=1-clamp((a-.26)/.12,0,1);
  const outer=[],inner=[],count=Math.max(3,Math.ceil(attack.q*72));
  for(let i=0;i<=count;i++){
   const q=attack.q*i/count,pose=attackPose(q),[tx,ty]=pose.tip;
   const next=attackPose(Math.min(1,q+.001)).tip,prev=attackPose(Math.max(0,q-.001)).tip;
   const dx=next[0]-prev[0],dy=next[1]-prev[1],length=Math.hypot(dx,dy)||1;
   const width=25*Math.sin(Math.PI*i/count)*Math.min(1,attack.q*4);
   outer.push([tx,ty]);inner.push([tx-dy/length*width,ty+dx/length*width]);
  }
  const ribbon=outer.concat(inner.reverse());
  ctx.save();ctx.globalAlpha*=visible*.9;
  ctx.beginPath();ctx.rect(-100,front?147:-153,500,300);ctx.clip();
  if($('glow').checked){ctx.shadowColor='#d93a55';ctx.shadowBlur=8;}
  path(ribbon,'#b83e54');ctx.shadowBlur=0;
  ctx.beginPath();outer.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle='#e35a70';ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
 }
 function part(name){contour(soulShape[name],'#76131a');}
 // A single soft contour, with a stable shoulder and modest wrist motion.
 function hand(back){
  const sx=95+turn*3,sy=106;
  const throwing=action?.k==='w',throwProgress=throwing?(a<=.24?clamp(a/.18,0,1):1-clamp((a-.24)/.28,0,1)):0;
  const hx=throwing?74-29*Math.sin(throwProgress*Math.PI/2):attack?attack.hx:74+en*(1-Math.cos(phase))*7;
  const hy=throwing?146-56*Math.sin(throwProgress*Math.PI/2):attack?attack.hy:146+turn*6-en*8+run*3-slam*20;
  const dx=hx-sx,dy=hy-sy,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const cx=sx+dx*.54-3,cy=sy+dy*.54;
  ctx.save();ctx.globalAlpha*=back?.95:1;
  ctx.fillStyle='#76131a';ctx.beginPath();
  ctx.moveTo(sx+nx*7,sy+ny*7);
  ctx.quadraticCurveTo(cx+nx*5.5,cy+ny*5.5,hx+nx*3.8,hy+ny*3.8);
  ctx.quadraticCurveTo(hx+dx/len*4,hy+dy/len*4,hx-nx*3.8,hy-ny*3.8);
  ctx.quadraticCurveTo(cx-nx*5.5,cy-ny*5.5,sx-nx*7,sy-ny*7);
  ctx.quadraticCurveTo(sx-dx/len*6,sy-dy/len*6,sx+nx*7,sy+ny*7);
  ctx.closePath();ctx.fill();
  if(!blade){ctx.translate(hx,hy);ctx.rotate(throwing?throwProgress*.9:attack?attack.angle:(p.bladeAngle||0)+run*.05-slam*.8);ctx.translate(-73,-145);ctx.shadowColor='#ff4055';ctx.shadowBlur=$('glow').checked?9:0;contour(soulShape.blade,'#f4485d');}
  ctx.restore();
 }

 if(morph<1){ctx.globalAlpha=1-morph;spinRibbons(false);normalSweep(false);
 // Flexible knees and lifted feet replace rigid pendulum legs.
 function leg(side){
  const ph=gait+(side?Math.PI:0),stride=-Math.sin(ph)*weight*23;
  const lift=Math.max(0,Math.cos(ph))*weight*17+air*(side?22:12);
  const hip=side?124:104,base=(side?146:111)+(side?1:-1)*en*9,knee=hip+stride*.55+(side?6:-2)+air*8;
  const ankle=base+stride,ky=207-lift*.35,fy=240-lift;
  ctx.save();ctx.translate(hip,172);ctx.rotate((side?-1:1)*turn*.09);ctx.translate(-hip,-172);
  if(weight+air+en<.002)part(side?'rightLeg':'leftLeg');
  else contour(`M ${hip-10} 168 C ${hip-12} 181 ${knee-9} ${ky-7} ${knee-7} ${ky} C ${knee-4} ${ky+10} ${ankle-5} ${fy-7} ${ankle-4} ${fy-2} Q ${ankle} ${fy+4} ${ankle+4} ${fy-1} C ${ankle+8} ${fy-8} ${knee+9} ${ky+6} ${knee+8} ${ky-3} C ${knee+8} ${ky-12} ${hip+10} 182 ${hip+10} 168 Z`,'#76131a');ctx.restore();
 }
 leg(0);leg(1);
 ctx.save();ctx.translate(turn*3,0);part('torso');ctx.save();ctx.translate(129,105);ctx.rotate(-turn*.2-run*.25);ctx.translate(-129,-105);part('rightArm');ctx.restore();
 ctx.save();ctx.translate(113,105);ctx.rotate(-turn*.075-(p.hair||0)-Math.sin(gait-.6)*weight*.025);ctx.scale(1+en*.38+swing*.3,1-en*.12-swing*.06);ctx.translate(-113,-105);part('head');ctx.restore();ctx.restore();hand(false);
 spinRibbons(true);normalSweep(true);}
 if(morph>0){ctx.globalAlpha=morph;sword(110,137,Math.sin(t*2)*.07,1.1);for(let i=0;i<8;i++){ctx.globalAlpha=morph*.12;ctx.fillStyle='#d84260';ctx.beginPath();ctx.ellipse(110+Math.sin(t*3+i)*30,137+Math.cos(t*2+i)*60,14,35,t+i,0,7);ctx.fill();}}
 ctx.restore();
}
function drawSlam(f,z){
 const expand=1-Math.pow(1-clamp(z/.22,0,1),3),fade=1-clamp((z-.48)/.52,0,1);
 ctx.globalAlpha=fade;ctx.shadowBlur=0;
 // A broad, low eruption with long asymmetric spear tips from the reference.
 const crown=[[-1,0],[-.68,-.07],[-.91,-.19],[-.54,-.13],[-.95,-.43],[-.61,-.31],[-.86,-.63],[-.47,-.41],[-.64,-.62],[-.29,-.35],[-.42,-.59],[-.11,-.30],[-.17,-.65],[.02,-.31],[.15,-.75],[.12,-.35],[.39,-.78],[.29,-.34],[.72,-.91],[.48,-.39],[.91,-.54],[.57,-.22],[.99,-.34],[.69,-.08],[1,0],[.34,.035],[-.3,.035]];
 const coords=(scale,raise)=>crown.map(([x,y])=>[x*f.size*expand*scale,y*f.size*.54*expand+raise]);
 path(coords(1.10,-5),'#842c40');
 ctx.save();if($('glow').checked){ctx.shadowColor='#ff315b';ctx.shadowBlur=26;}
 path(coords(.96,0),'#ff526c');ctx.restore();
 // Bright central mass welds the shards into one explosive ground impact.
 ctx.beginPath();ctx.moveTo(-f.size*.68*expand,-4);ctx.quadraticCurveTo(-f.size*.27*expand,-90*expand,0,-150*expand);ctx.quadraticCurveTo(f.size*.25*expand,-60*expand,f.size*.72*expand,-4);ctx.quadraticCurveTo(0,31*expand,-f.size*.68*expand,-4);ctx.fillStyle='#ff526c';ctx.fill();
 // Low ground shockwave, cracks, and outward-moving chunks.
 ctx.globalAlpha=fade*.65;ctx.strokeStyle='#ff7f96';ctx.lineWidth=5*(1-z);
 ctx.beginPath();ctx.ellipse(0,3,f.size*expand,23*expand,0,0,Math.PI*2);ctx.stroke();
 ctx.lineWidth=2;ctx.strokeStyle='#ba3d59';
 for(let i=0;i<9;i++){const sign=i%2?1:-1,r=(70+i*38)*expand;ctx.beginPath();ctx.moveTo(sign*r*.3,8);ctx.lineTo(sign*r,13+i%3*9);ctx.lineTo(sign*(r+22),10+i%3*8);ctx.stroke();}
 for(let i=0;i<16;i++){let sign=i%2?1:-1,xx=sign*(f.size*(.2+(i%8)*.095))*expand,yy=-Math.sin(Math.PI*z)*(18+i%5*13);ctx.save();ctx.translate(xx,yy);ctx.rotate(sign*z*4+i);path([[-8,-3],[10,-5],[5,4],[-5,5]],i%3?'#c63851':'#ff7991');ctx.restore();}
}

person(p.x,p.y,p.dir);};
