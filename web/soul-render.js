// Cached radial cloud layers follow the same soft sprite approach as Fairi W.
window.SoulMist=(()=>{let cloud,spark;function prepare(){if(cloud)return cloud;const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(256,384):null;if(!canvas)return null;canvas.width=256;canvas.height=384;const c=canvas.getContext('2d');for(let i=0;i<17;i++){const x=128+Math.sin(i*2.4)*48,y=42+i*18,r=48+i%3*10,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(237,104,137,.20)');g.addColorStop(.35,'rgba(194,49,85,.14)');g.addColorStop(1,'rgba(126,25,51,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}cloud=canvas;spark=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(48,48);spark.width=spark.height=48;const sc=spark.getContext('2d'),halo=sc.createRadialGradient(24,24,0,24,24,24);halo.addColorStop(0,'rgba(255,247,242,.95)');halo.addColorStop(.18,'rgba(255,181,207,.70)');halo.addColorStop(1,'rgba(238,88,139,0)');sc.fillStyle=halo;sc.fillRect(0,0,48,48);sc.fillStyle='#fff1f0';sc.beginPath();sc.moveTo(24,11);sc.quadraticCurveTo(25,22,35,24);sc.quadraticCurveTo(25,25,24,37);sc.quadraticCurveTo(23,26,13,24);sc.quadraticCurveTo(23,23,24,11);sc.fill();return cloud;}
function draw(ctx,t,view,front){if(view.mist<.001)return;const sprite=prepare();if(!sprite)return;ctx.save();ctx.globalAlpha*=view.mist*(front?.65:1);ctx.translate(110+Math.sin(t*.7+(front?1.7:0))*5,133-Math.sin(t*.5)*2-view.exit*9);ctx.rotate(Math.sin(t*.65)*.055+(front?-.12:0));const width=(front?140:160)*view.spread,height=(front?220:235)*view.spread;ctx.drawImage(sprite,-width*.5,-height*.5,width,height);ctx.restore();if(front&&spark){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<11;i++){const life=((t*.43+i*.237)%1+1)%1,alpha=Math.sin(Math.PI*life)**2*view.mist*.95,drift=Math.sin(i*2.399+t*.55)*48*view.spread,x=110+drift,y=230-life*185-view.exit*12,size=(10+5*Math.sin(i*3.7)**2)*( .8+.2*Math.sin(Math.PI*life));ctx.globalAlpha=alpha;ctx.drawImage(spark,x-size/2,y-size/2,size,size);}ctx.restore();}}return {draw};})();
window.drawSoul = function(ctx, fighter, time, bloom=true,effectContext=ctx){
const p=fighter,action=p.action,blade=p.blade,t=time,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const $=()=>({checked:bloom}),BODY='#651d1e';
function path(points,fill,g=ctx){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=fill;g.fill();}
// Smooth, hand-drawn contours; all turn poses keep a positive body width.
const cache=window.soulPathCache??=(new Map());
function contour(d,color='#791520'){ctx.fillStyle=color;let shape=cache.get(d);if(!shape){shape=new Path2D(d);if(cache.size<100)cache.set(d,shape);}ctx.fill(shape);}
function sword(x,y,angle=0,scale=1){if(window.SoulDesign){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);window.SoulDesign.weapon(ctx,{x:0,y:0},0,bloom);ctx.restore();return;}ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.shadowColor='#ff4964';ctx.shadowBlur=$('glow').checked?11:0;contour('M -8 -34 C -14 -21 -20 -9 -19 6 C -16 17 -4 12 5 -3 L 18 -28 C 20 -32 23 -29 22 -23 C 17 5 5 38 -12 77 C -16 87 -19 91 -20 81 C -19 49 -18 24 -13 6 C -9 -6 -4 -21 -8 -34 Z','#ff5269');ctx.restore();}
// Reference contours in the supplied 238 × 273 drawing's coordinate system.
const soulShape={
 head:'M 89 102 C 83 99 85 86 90 78 C 95 68 94 57 100 46 C 104 38 110 36 117 38 C 126 39 129 45 130 54 C 131 65 137 72 139 84 C 141 94 137 103 133 109 C 124 116 105 114 96 108 Z',
 torso:'M 100 89 C 100 96 91 96 88 100 C 86 110 93 122 92 132 C 91 137 91 142 93 146 C 103 150 119 150 127 145 C 128 139 126 134 128 129 C 127 117 134 107 130 100 C 127 96 118 96 118 89 Z',
 leftLeg:'M 94 165 C 92 181 98 201 103 222 C 106 235 109 242 113 240 C 117 236 116 224 115 211 L 115 173 Z',
 rightLeg:'M 114 169 C 118 190 128 213 140 232 C 145 239 150 243 150 235 C 147 216 140 196 136 177 L 132 163 Z',
 rightArm:'M 128 99 C 136 105 137 119 142 131 C 145 138 150 143 148 146 C 145 149 140 144 137 139 C 132 131 127 122 124 111 Z',
 leftArm:'M 91 100 C 87 111 82 122 77 132 C 73 139 69 146 72 149 C 75 151 80 142 83 137 C 89 127 95 116 99 105 Z',
 blade:'M 69 129 C 63 135 58 148 54 160 L 46 191 C 43 201 47 198 52 192 C 66 177 77 161 85 145 C 88 137 88 134 85 137 C 80 145 74 154 69 154 C 62 154 69 138 72 132 C 74 127 73 126 69 129 Z'
};
// The sword and trail share this exact wrist/angle curve.
function person(x,y,dir=1){
 const spin=window.SoulMotion.spinView(p),phase=spin.angle,en=spin.amount,turn=Math.sin(phase)*en;
 const a=action?.age||0,attack=action?.k==='attack'?window.SoulDesign.normalFrame(p):null,swing=action?.k==='attack'?Math.sin(clamp(a/.38,0,1)*Math.PI):0;
 const slam=action?.k==='r'?(action.fired?Math.max(0,1-(a-action.impactAge)/.42):action.diving?.9:.35):0;
 const rig=p.soulMotion||{},hairX=-(p.dir||1)*(rig.hair||0),tipX=-(p.dir||1)*(rig.tip||0);
 const form=window.SoulMotion.transformView(p),morph=form.blend,weight=(p.runWeight||0)*(1-en*.65),gait=p.gait||0,run=Math.sin(gait)*weight,air=p.airWeight||0;
 const bob=window.SoulDesign.motionOptions(p).bob;
 ctx.save();ctx.translate(x,y);ctx.scale(window.SoulDesign.visualScale,window.SoulDesign.visualScale);ctx.translate(0,en*4);ctx.scale(-dir,1-slam*.20);ctx.rotate(-swing*.10);ctx.translate(-110,-240);
 // Rear and front half-arcs interleave with the body, matching the reference.
 function spinRibbons(front,ctx){
  if(en<.01)return;
  const cross=p.crossBlend||0;
  for(let layer=0;layer<2;layer++)for(let j=0;j<3;j++){
   if(layer&&j>0)continue;const strength=j===0?1:cross;if(strength<.01)continue;
   const radius=layer?400/window.SoulDesign.visualScale:132+j*8;
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
    ctx.globalAlpha*=.38;ctx.shadowBlur=28;path(ribbon,ribbonColor,ctx);
    ctx.globalAlpha*=1.5;ctx.shadowBlur=10;path(ribbon,'#ff7190',ctx);ctx.restore();
   }
   ctx.beginPath();ctx.rect(-radius-5,front?0:-radius,2*radius+10,radius);ctx.clip();
   ctx.shadowBlur=0;path(ribbon,ribbonColor,ctx);
   ctx.restore();
  }
 }
 function normalSweep(front,ctx){
  if(!front||!attack||attack.q<.001||attack.trail<.001)return;
  const samples=[],count=28,thrust=action.n===3;
  for(let i=0;i<=count;i++){const u=i/count;if(thrust){const end=window.SoulDesign.normalArc(3,attack.q).tip;samples.push([attack.hx+14+(end[0]-attack.hx-14)*u,end[1]+Math.sin(Math.PI*u)*.6]);}else samples.push(window.SoulDesign.normalArc(action.n,attack.q*u).tip);}
  ctx.save();ctx.translate(110,155+bob);ctx.rotate(-(p.lean||0));ctx.translate(-110,-155);ctx.globalAlpha*=attack.trail;
  const first=samples[0],last=samples[count],gradient=ctx.createLinearGradient(first[0],first[1],last[0]+.001,last[1]);gradient.addColorStop(0,'rgba(222,56,90,0)');gradient.addColorStop(.35,'rgba(232,69,111,.38)');gradient.addColorStop(.80,'rgba(255,115,151,.68)');gradient.addColorStop(1,'rgba(255,208,220,.9)');
  function curve(points,close=false){ctx.beginPath();ctx.moveTo(...points[0]);for(let j=1;j<points.length-1;j++)ctx.quadraticCurveTo(...points[j],(points[j][0]+points[j+1][0])*.5,(points[j][1]+points[j+1][1])*.5);ctx.lineTo(...points[points.length-1]);if(close)ctx.closePath();}
  for(const [spread,alpha] of [[2.0,.18],[1,.65]]){const outer=[],inner=[];samples.forEach(([x,y],i)=>{const before=samples[Math.max(0,i-1)],after=samples[Math.min(count,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy)||1,w=(thrust?3.2:8)*Math.sin(Math.PI*i/count)**.8*Math.min(1,attack.q*5)*spread;outer.push([x-dy/len*w,y+dx/len*w]);inner.push([x+dy/len*w,y-dx/len*w]);});ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=gradient;if(bloom&&spread>1){ctx.shadowColor='#f56590';ctx.shadowBlur=7;}curve(outer.concat(inner.reverse()),true);ctx.fill();ctx.restore();}
  ctx.globalAlpha*=.65;ctx.strokeStyle=gradient;ctx.lineWidth=thrust?1.1:.85;ctx.lineCap='round';ctx.lineJoin='round';curve(samples);ctx.stroke();ctx.restore();
 }

 window.SoulMist.draw(effectContext,t,form,false);
 if(morph<1){ctx.globalAlpha=1-morph;spinRibbons(false,effectContext);
 const drawOptions={weight,air,bob,run,en,turn,slam,attack,bloom};if(action?.k==='q')window.SoulDesign.drawSpin(ctx,p,drawOptions,phase);else window.SoulDesign.draw(ctx,morph>0?{...p,blade:true}:p,drawOptions);
 spinRibbons(true,effectContext);normalSweep(true,effectContext);}
 if(morph>0){ctx.save();ctx.globalAlpha=1;const pose=window.SoulDesign.deformed(p,{weight,air,bob,run,en,turn,slam}),m=pose.root,w=pose.wrist,hx=m.a*w.x+m.c*w.y+m.e,hy=m.b*w.x+m.d*w.y+m.f,offset=window.SoulDesign.weaponTipOffset,upright=-Math.PI/2-Math.atan2(offset.y,offset.x),heldAngle=pose.weaponAngle+Math.atan2(m.b,m.a);sword(hx+(110-hx)*morph,hy+(164+Math.sin(t*1.7)*1.1-hy)*morph,heldAngle+(upright-heldAngle)*morph,1+.12*morph);ctx.restore();}
 ctx.globalAlpha=1;window.SoulMist.draw(effectContext,t,form,true);
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
