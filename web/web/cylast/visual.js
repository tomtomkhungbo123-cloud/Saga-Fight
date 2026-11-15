// Original Cylast 1.9 renderer/texture code; no lab inputs, HUD or game loop.
(()=>{
let ctx,game,t=0;const TAU=Math.PI*2;const {CYLAST_SKILLS,smooth01}=window.CylastBase;
const pathCache=new Map();
function path(d,fill,stroke,width=2){let p=pathCache.get(d);if(!p){p=new Path2D(d);if(pathCache.size<64)pathCache.set(d,p);}if(fill){ctx.fillStyle=fill;ctx.fill(p);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}}
function line(x,y,x2,y2,color,w=2){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function ellipse(x,y,rx,ry,color,stroke){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function glow(color='#48e7f4',blur=18){ctx.shadowColor=color;ctx.shadowBlur=blur;}
function snowflake(x,y,r,rot=0){if(!snowflake.texture){let c=document.createElement('canvas');c.width=c.height=76;let g=c.getContext('2d');g.translate(38,38);g.beginPath();for(let i=0;i<6;i++){g.rotate(TAU/6);g.moveTo(0,0);g.lineTo(0,-20);g.moveTo(0,-12);g.lineTo(-4.6,-16);g.moveTo(0,-12);g.lineTo(4.6,-16);}g.strokeStyle='#72eafa';g.lineWidth=2.3;g.lineCap='round';g.shadowColor='#32d5ff';g.shadowBlur=12;g.stroke();snowflake.texture=c;}ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.shadowBlur=0;ctx.drawImage(snowflake.texture,-r*1.9,-r*1.9,r*3.8,r*3.8);ctx.restore();}
function character(x,y,dir,enemy=false){let g=game,p=g.player;ctx.save();ctx.translate(x,-y);ctx.scale(dir,1);let bob=enemy?0:Math.sin(game.time*2.9)*5,lean=enemy?0:p.vx*.018;ctx.translate(0,-bob);ellipse(0,14+bob,44,8,'#00000044');ctx.translate(0,-20);ctx.rotate(lean*.003+(enemy?0:g.pose.tilt));if(!enemy)ctx.translate(0,-g.pose.rise);if(enemy){ctx.fillStyle='#b999a4';ellipse(0,-113,17,21,'#b999a4');path('M-18 -89 Q0 -100 18 -87 L25 -35 L14 -30 L10 5 L0 5 L-5 -30 L-11 4 L-22 3 L-18 -39 Z','#a28491');line(-17,-83,-30,-45,'#a28491',12);line(16,-83,29,-45,'#a28491',12);line(25,-43,33,-85,'#dab4b9',4);ctx.restore();return;}
 // Reference-space silhouette: (78,154) is the lowest toe in the supplied drawing.
 // Keep all body parts the same flat blue and overlap joins to avoid neck seams.
 const pose=g.pose;
 let gesture=pose.angle+Math.sin(t*2)*.015;
 let sway=Math.sin(t*2.1)*1.3-p.vx*.006+pose.hair;
 ctx.scale(1.45,1.45);ctx.translate(-78,-154);
 const blue='#a3cee5';
 // The only long trailing lock is on the right, as in the drawing.
 path(`M86 81 Q97 89 104 101 Q${115+sway} 115 ${108+sway} 129 Q${104+sway} 138 ${103+sway} 133 Q${109+sway} 119 102 113 Q94 107 87 104 Z`,blue);
 // One long tapered front leg, with the shorter rear leg tucked behind it.
 path('M73 120 L91 120 Q88 133 81 142 Q78 146 76 140 L77 125 Z',blue);
 path('M72 119 L83 122 Q81 138 77 149 Q75 155 72 154 Q69 154 70 145 L71 130 Z',blue);
 // Continuous head, hair and dress. No face, collar, waist line or neck gap.
 path('M64 72 Q63 64 63 53 Q62 38 75 37 Q88 34 91 48 Q93 60 91 72 Q96 78 102 86 Q107 94 101 93 Q96 92 92 86 L95 103 Q100 114 98 120 Q95 125 83 126 L67 126 Q59 126 61 119 L64 96 Q62 98 59 100 Q55 102 55 98 Q56 93 63 87 Z',blue);
 // Left hand and snowflake staff share a subtle casting pivot.
 let hx=60+pose.reach,hy=90-pose.lift;
 path(`M65 83 Q${62+pose.reach*.3} ${94-pose.lift*.3} ${hx-3} ${hy+4} Q${hx-8} ${hy+8} ${hx-7} ${hy+2} Q${63+pose.reach*.4} ${85-pose.lift*.5} 67 79 Z`,blue);
 ctx.save();ctx.translate(hx,hy);ctx.rotate(gesture);
 path('M3 -4 Q0 0 -5 4 Q-8 9 -5 10 Q0 8 5 2 Z',blue);
 glow('#32d5ff',12);line(-6,-12,-2,35,'#3bcfff',2.3);
 snowflake(-6,-16,7.5+pose.flare*1.7,Math.sin(t*.8)*.06);
 if(pose.flare>.04){ctx.globalAlpha=pose.flare*.45;ellipse(-6,-16,13+pose.flare*4,13+pose.flare*4,null,'#8ceeff');ctx.globalAlpha=1;}
 ellipse(-13,-13,1.3,1.3,'#56ddff');ellipse(1,-18,1,1,'#56ddff');
 ctx.restore();ctx.restore();}

// Small reusable glow textures. No live blur/filter passes on the arena canvas.
const fxTextures=(()=>{
 const texture=(w,h,draw)=>{let c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));return c;};
 const dot=texture(64,64,c=>{let g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#d2ffffdd');g.addColorStop(.12,'#8cffffbb');g.addColorStop(.3,'#40f1ff65');g.addColorStop(.6,'#25ddff20');g.addColorStop(1,'#25ddff00');c.fillStyle=g;c.fillRect(0,0,64,64);});
 const pool=texture(128,128,c=>{let g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#63f3ff50');g.addColorStop(.4,'#32e4fc30');g.addColorStop(.75,'#32e4fc0d');g.addColorStop(1,'#32e4fc00');c.fillStyle=g;c.fillRect(0,0,128,128);});
 const streak=texture(48,112,c=>{c.translate(24,96);let p=new Path2D('M0 -50 C-.5 -35 -1.2 -12 -1.2 -4 Q0 2 1.2 -4 C1.2 -12 .5 -35 0 -50 Z');let g=c.createLinearGradient(0,-50,0,0);g.addColorStop(0,'#44deff00');g.addColorStop(.35,'#44e3ff35');g.addColorStop(.8,'#76faffbd');g.addColorStop(1,'#bcffffa0');c.fillStyle=g;c.shadowColor='#45e6ff';c.shadowBlur=13;c.filter='blur(2px)';c.fill(p);c.filter='blur(.45px)';c.fill(p);});
 const ringHalf=front=>texture(1100,120,c=>{c.translate(550,60);c.lineCap='round';for(let l of [[21,.018],[15,.04],[10,.08],[6,.18],[2.8,.5]]){c.strokeStyle=`rgba(96,246,255,${l[1]})`;c.lineWidth=l[0];c.beginPath();c.ellipse(0,0,500,29,0,front?0:Math.PI,front?Math.PI:TAU);c.stroke();}});
 return{dot,pool,streak,ring:[ringHalf(false),ringHalf(true)]};
})();
// Pre-baked Q frames keep ribbon geometry, gradients and bloom out of combat frames.
const qAtlas=new Array(48);
function bakeQFrame(index){
 if(qAtlas[index])return qAtlas[index];
 const phase=index/48*TAU,turns=TAU*1.85;
 const frames=[false,true].map(front=>{
 let c=document.createElement('canvas');c.width=196;c.height=224;let g=c.getContext('2d');g.translate(98,190);g.globalCompositeOperation='lighter';
 const ribbon=(sample,start,end)=>{
 let pts=[],steps=Math.max(16,Math.ceil((end-start)*100));for(let i=0;i<=steps;i++)pts.push(sample(start+(end-start)*i/steps));
 // Feather the ribbon across its width. These translucent bands are baked once.
 for(let layer of [[13,.018],[10,.025],[7,.045],[4,.09],[2,.17],[.5,.3]]){
 let left=[],right=[];for(let i=0;i<pts.length;i++){let p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,w=p.w+layer[0]*Math.min(1,p.w/2);left.push([p.x-dy/len*w,p.y+dx/len*w]);right.push([p.x+dy/len*w,p.y-dx/len*w]);}
 g.beginPath();g.moveTo(...left[0]);for(let p of left.slice(1))g.lineTo(...p);for(let p of right.reverse())g.lineTo(...p);g.closePath();g.fillStyle=`rgba(92,248,255,${layer[1]})`;g.fill();}
 };
 const ring=f=>{let a=f*TAU;return{x:Math.cos(a)*(61+2*Math.sin(a*2+phase)),y:-4+Math.sin(a)*13+Math.sin(a*3+phase)*1.2,w:2.5+1.25*(.5+.5*Math.sin(a*2-phase))};};ribbon(ring,front?0:.5,front?.5:1);
 const sample=f=>{let a=phase+f*turns,tip=smooth01(f/.12)*smooth01((1-f)/.2),rx=57-7*f+2.2*Math.sin(f*Math.PI*3+phase);return{x:Math.cos(a)*rx,y:-13-f*130+Math.sin(a*2+phase)*2.4,w:(1.2+3.2*Math.sin(f*Math.PI))*tip};};
 let cuts=[0,1];for(let n=Math.ceil(phase/Math.PI);n*Math.PI<phase+turns;n++){let f=(n*Math.PI-phase)/turns;if(f>0&&f<1)cuts.push(f);}cuts.sort((a,b)=>a-b);
 for(let i=0;i<cuts.length-1;i++){let lo=cuts[i],hi=cuts[i+1];if((Math.sin(phase+(lo+hi)*.5*turns)>0)===front)ribbon(sample,lo,hi);}
 return c;});qAtlas[index]=frames;return frames;
}
let qWarm=0;function warmQ(){if(qWarm<48){bakeQFrame(qWarm++);requestAnimationFrame(warmQ);}}requestAnimationFrame(warmQ);
function iceAura(e,amount,height,front){
 ctx.save();ctx.translate(e.x,-e.y);ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';let strength=amount*(.94+.06*Math.sin(t*2.2));
 if(!front){ctx.globalAlpha=strength;ctx.drawImage(fxTextures.pool,-110,-36,220,70);}
 let position=(t*.78/TAU%1)*48,i=Math.floor(position),mix=position-i,sy=.12+.88*height;
 ctx.scale(1,sy);ctx.globalAlpha=strength*(1-mix);ctx.drawImage(bakeQFrame(i)[front?1:0],-98,-190);ctx.globalAlpha=strength*mix;ctx.drawImage(bakeQFrame((i+1)%48)[front?1:0],-98,-190);ctx.restore();
}
const crystalTexture=(()=>{let c=document.createElement('canvas');c.width=152;c.height=230;let g=c.getContext('2d');g.translate(76,200);g.shadowColor='#42d9f7';g.shadowBlur=20;let grad=g.createLinearGradient(-45,0,28,-175);grad.addColorStop(0,'#4fefff55');grad.addColorStop(1,'#247fad66');let shell=new Path2D('M-48 -18 L-47 -119 L-6 -177 L36 -147 L47 -38 L16 -12 Z');g.fillStyle=grad;g.fill(shell);g.strokeStyle='#51d5f0';g.lineWidth=3;g.stroke(shell);g.shadowBlur=0;g.strokeStyle='#63dff1aa';g.lineWidth=1.8;g.stroke(new Path2D('M-6 -177 L-2 -100 L-47 -119 M-2 -100 L36 -147 L47 -38 L8 -53 Z M-2 -100 L8 -53 L-48 -18'));return c;})();
function drawCrystal(e){let rise=smooth01(e.age/.16),fade=smooth01((e.duration-e.age)/.22);ctx.save();ctx.translate(e.x,-e.y);ctx.shadowBlur=0;ctx.globalAlpha=fade;let sy=.12+.88*rise;ctx.drawImage(crystalTexture,-76,-200*sy,152,230*sy);if(e.age<.25){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-e.age/.25)*.55;ctx.drawImage(fxTextures.dot,-84,-30,168,44);}ctx.restore();}

// W: staggered light rain with tapered tails, soft landings and a breathing light pool.
function frostRain(z,front){
 const radius=CYLAST_SKILLS.w.range,fade=smooth01(z.age/.3)*smooth01(z.life/.55);
 const hash=n=>{let v=Math.sin(n*127.13+17.7)*43758.5453;return v-Math.floor(v);};
 ctx.save();ctx.translate(z.x,0);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;
 if(!front){ctx.globalAlpha=fade*(.85+.1*Math.sin(z.age*2.1));ctx.drawImage(fxTextures.pool,-radius*1.08,-radius*.108,radius*2.16,radius*.216);}
 let breath=1+.006*Math.sin(z.age*2.2);ctx.save();ctx.scale(breath,1+.025*Math.sin(z.age*.7));ctx.globalAlpha=fade*.72;ctx.drawImage(fxTextures.ring[front?1:0],-550,-62);ctx.restore();
 for(let i=0;i<34;i++){
 const depth=hash(i+81);if((depth>.5)!==front)continue;
 const period=1.05+hash(i+17)*.58,delay=hash(i+32)*.82,elapsed=z.age-delay;if(elapsed<0)continue;
 const cycle=Math.floor(elapsed/period),local=elapsed-cycle*period,flight=.76+hash(i+61)*.25;
 const x=(hash(i*2.31+cycle*51.3)-.5)*radius*1.82,ground=(depth-.5)*36;
 if(local<flight){
 let progress=local/flight,alpha=fade*smooth01(progress/.15)*(1-smooth01((progress-.88)/.12));
 let yy=ground-320+320*(.84*progress+.16*progress*progress),drift=Math.sin(progress*Math.PI)*7*(hash(i+95)-.5);
 let len=32+hash(i+28)*31,w=.75+hash(i+9)*.75;
 ctx.save();ctx.translate(x+drift,yy);ctx.rotate(-.025+hash(i+43)*.05);ctx.globalAlpha=alpha*(.36+hash(i+22)*.32);
 let sx=w/1.2,sy=len/50;ctx.drawImage(fxTextures.streak,-24*sx,-96*sy,48*sx,112*sy);ctx.restore();
 }else if(local<flight+.25){
 let age=(local-flight)/.25,alpha=fade*Math.sin(Math.PI*age)*.22,rx=5+age*16;
 ctx.save();ctx.translate(x,ground);ctx.globalAlpha=alpha;ctx.drawImage(fxTextures.dot,-rx,-rx*.22,rx*2,rx*.44);ctx.restore();
 }
 }
 ctx.restore();
}
// R uses small pre-baked wind and green mist textures; no live blur passes.
const stormTextures=(()=>{
 const mist=document.createElement('canvas');mist.width=128;mist.height=64;let g=mist.getContext('2d');
 g.save();g.translate(64,32);g.scale(1,.45);let fog=g.createRadialGradient(0,0,0,0,0,62);fog.addColorStop(0,'#8df5ac9c');fog.addColorStop(.3,'#62e99a75');fog.addColorStop(.65,'#42d58535');fog.addColorStop(1,'#35be7800');g.fillStyle=fog;g.fillRect(-64,-70,128,140);g.restore();
 const wind=document.createElement('canvas');wind.width=512;wind.height=96;let w=wind.getContext('2d');
 for(let i=0;i<=90;i++){let f=i/90,x=16+f*480,y=48+Math.sin(f*Math.PI*2)*15,size=12+Math.sin(f*Math.PI)*20;w.globalAlpha=.05*Math.pow(Math.sin(f*Math.PI),.7);w.drawImage(fxTextures.dot,x-size/2,y-size/2,size,size);}
 return{mist,wind};
})();
function blizzard(z,front){
 const radius=CYLAST_SKILLS.r.range,fade=smooth01(z.age/.3)*smooth01(z.life/.42),age=z.age;
 ctx.save();ctx.translate(z.x,0);ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 if(!front){ctx.globalAlpha=fade*.72;ctx.drawImage(fxTextures.pool,-radius,-130,radius*2,260);}
 ctx.globalAlpha=fade*.85;let ringScale=radius/500;ctx.drawImage(fxTextures.ring[front?1:0],-550*ringScale,-52*ringScale,1100*ringScale,120*ringScale);
 // Wind ribbons sweep at different heights and speeds instead of four rigid rings.
 for(let i=0;i<3;i++){let phase=age*(1.5+i*.22)+i*2.1,rx=radius*(.9-i*.12),x=Math.sin(phase)*90,y=-50-i*65+Math.sin(phase*.8)*9;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(phase)*.045);ctx.scale(Math.cos(phase)>0?1:-1,1);ctx.globalAlpha=fade*(front?.38:.52);ctx.drawImage(stormTextures.wind,-rx,-28,rx*2,56+i*8);ctx.restore();}
 for(let i=0;i<60;i++){
 let f=(age*.42+i*.6180339)%1,angular=1.9+(i%5)*.16,a=age*angular+i*2.399,rx=radius*(.25+(i%9)*.075);
 if((Math.sin(a)>0)!==front)continue;
 let x=Math.cos(a)*rx,y=-35-f*240+Math.sin(a)*30,vx=-Math.sin(a)*rx*angular,vy=-100+Math.cos(a)*30*angular;
 let len=25+(i%7)*6,opacity=fade*Math.sin(f*Math.PI)*(.26+(i%4)*.1);
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(vy,vx)-Math.PI/2);ctx.globalAlpha=opacity;let sx=.65+(i%3)*.24,sy=len/50;ctx.drawImage(fxTextures.streak,-24*sx,-96*sy,48*sx,112*sy);ctx.restore();
 }
 ctx.restore();
 if(front)drainMist(z,fade);
}
function drainMist(z,fade){
 const e=game.enemy,p=game.player;if(e.hp<=0||p.hp<=0||Math.hypot(e.x-z.x,e.y)>CYLAST_SKILLS.r.range)return;
 const sx=e.x,sy=-e.y-62,tx=p.x,ty=-p.y-90-Math.sin(game.time*2.9)*5,dx=tx-sx,dy=ty-sy;
 ctx.save();ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 // Overlapping translucent clouds advect from victim to caster along a curling stream.
 for(let i=0;i<22;i++){
 let f=(z.age*.72+i/22)%1,a=f*Math.PI,wave=Math.sin(f*TAU*1.8-z.age*3.2)*Math.sin(a)*13;
 let x=sx+dx*f,y=sy+dy*f-Math.sin(a)*45+wave;
 let tangent=Math.atan2(dy-Math.cos(a)*Math.PI*45,dx),size=(44+36*Math.sin(a))*(.9+.1*Math.sin(i*2+z.age*2));
 ctx.save();ctx.translate(x,y);ctx.rotate(tangent);ctx.globalAlpha=fade*Math.pow(Math.sin(a),.8)*.3;ctx.drawImage(stormTextures.mist,-size*.9,-size*.32,size*1.8,size*.64);ctx.restore();
 }
 let pulse=.75+.25*Math.sin(z.age*TAU);ctx.globalAlpha=fade*.16*pulse;ctx.drawImage(stormTextures.mist,tx-48,ty-32,96,64);ctx.restore();
}
function rootedIce(e){
 let grow=smooth01((CYLAST_SKILLS.r.rootDuration-e.root)/.18),fade=smooth01(e.root/.25),sy=.12+.36*grow;
 ctx.save();ctx.translate(e.x,-e.y);ctx.shadowBlur=0;ctx.globalAlpha=fade;
 ctx.drawImage(crystalTexture,-53.2,-200*sy,106.4,230*sy);
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade*.8;ctx.drawImage(fxTextures.ring[0],-40,-5,80,9);ctx.drawImage(fxTextures.ring[1],-40,-5,80,9);
 ctx.restore();
}
function zone(z,front){if(z.k==='w')frostRain(z,front);else if(z.k==='r')blizzard(z,front);}
// E fog is baked once: a translucent feathered shell and two soft cloud ribbons.
const wardTextures=(()=>{
 const make=draw=>{let c=document.createElement('canvas');c.width=192;c.height=256;draw(c.getContext('2d'));return c;};
 const shell=make(g=>{g.translate(96,128);g.scale(.7,1);let grad=g.createRadialGradient(0,0,0,0,0,108);grad.addColorStop(0,'#5feaff00');grad.addColorStop(.62,'#61e9ff05');grad.addColorStop(.79,'#71efff16');grad.addColorStop(.88,'#9af9ff35');grad.addColorStop(.94,'#6deaff25');grad.addColorStop(1,'#5be2ff00');g.fillStyle=grad;g.fillRect(-135,-128,270,256);});
 const clouds=[0,1].map(side=>make(g=>{g.globalCompositeOperation='lighter';for(let i=0;i<=60;i++){let f=i/60,a=f*Math.PI*1.18+(side?Math.PI*.8:-Math.PI*.48),rx=58+Math.sin(f*Math.PI)*8,ry=93-7*Math.sin(f*Math.PI);let x=96+Math.cos(a)*rx,y=128+Math.sin(a)*ry,size=12+22*Math.pow(Math.sin(f*Math.PI),1.2);g.globalAlpha=.11*Math.pow(Math.sin(f*Math.PI),.8);g.drawImage(fxTextures.dot,x-size/2,y-size/2,size,size);}}));
 return{shell,clouds};
})();
function shield(front=false){
 const p=game.player,ward=game.ward;if(!ward)return;
 const fade=ward.phase==='fade'?1-smooth01(ward.fadeAge/.38):1;
 const gather=smooth01(ward.age/.48),enclose=smooth01((ward.age-.15)/.43);
 const phase=ward.age,spread=ward.phase==='fade'?smooth01(ward.fadeAge/.38):0;
 ctx.save();ctx.translate(p.x,-p.y-95-Math.sin(game.time*2.9)*5-game.pose.rise);ctx.rotate(p.vx*.000035);ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 const breath=1+.012*Math.sin(phase*3),size=breath+spread*.13;
 ctx.scale(size,size);
 if(!front){ctx.globalAlpha=enclose*fade*.8;ctx.drawImage(wardTextures.shell,-96,-128);}
 for(let i=0;i<2;i++){
 ctx.save();ctx.translate(Math.sin(phase*1.7+i*2)*3,Math.cos(phase*1.4+i)*4);ctx.rotate(Math.sin(phase*1.3+i*2)*.12+(front?.08:-.1));
 ctx.globalAlpha=gather*fade*(front?.42:.8)*(i===0?1:.8);
 ctx.drawImage(wardTextures.clouds[(i+(front?1:0))%2],-96,-128);ctx.restore();
 }
 // A few dim motes drift up inside the fog, fading in and out without hard spawns.
 for(let i=0;i<4;i++){let f=(phase*.24+i*.25)%1,a=i*2.4+phase*.5;ctx.globalAlpha=gather*fade*Math.sin(f*Math.PI)*.13;let x=Math.cos(a)*48,y=75-f*150;ctx.drawImage(fxTextures.dot,x-7,y-7,14,14);}
 ctx.restore();
}

function bind(context,f,enemy,clock,ground=0){ctx=context;t=clock;game={time:clock,player:{x:f.x,y:ground-f.y,vx:f.vx,dir:f.dir,hp:f.hp},enemy:{x:enemy.x,y:ground-enemy.y,hp:enemy.hp,root:Math.max(0,(enemy.rootUntil||0)-clock)},pose:f.frost.pose,ward:f.frost.ward};}
window.CylastVisual={
 character(context,f,clock){bind(context,f,f,clock);character(f.x,-f.y,f.dir);},
 back(context,f,enemy,clock){bind(context,f,enemy,clock);for(const z of f.frost.zones){ctx.save();ctx.translate(0,z.y);bind(context,f,enemy,clock,z.y);zone(z,false);ctx.restore();}bind(context,f,enemy,clock);const q=f.frost.qLight,ice=f.frost.ice,aura=q||ice;if(aura){const light=q?smooth01(q.age/q.duration):smooth01((ice.duration-ice.age)/.22);iceAura({...aura,y:-aura.y},light,q?smooth01(q.age/q.duration):1,false);}shield(false);},
 front(context,f,enemy,clock){bind(context,f,enemy,clock);const q=f.frost.qLight,ice=f.frost.ice,aura=q||ice;if(ice)drawCrystal({...ice,y:-ice.y});if(aura){const light=q?smooth01(q.age/q.duration):smooth01((ice.duration-ice.age)/.22);iceAura({...aura,y:-aura.y},light,q?smooth01(q.age/q.duration):1,true);}shield(true);for(const z of f.frost.zones){ctx.save();ctx.translate(0,z.y);bind(context,f,enemy,clock,z.y);zone(z,true);ctx.restore();}},
 projectile(context,b){ctx=context;ctx.save();glow('#48e9ff',20);const dir=Math.sign(b.vx)||1;ctx.translate(b.x,b.y);ctx.scale(dir,1);ctx.rotate(Math.atan2(b.vy,Math.abs(b.vx)));path('M25 0 Q7 -14 -16 -5 L-60 -2 L-30 2 Q7 13 25 0 Z','#8cf4ff');line(-48,-2,15,0,'#d0ffff',2);ctx.restore();},
 effect(context,e){ctx=context;ctx.save();ctx.globalAlpha=1-e.age/e.life;glow();if(e.type==='frostMuzzle')ellipse(e.x,e.y,9+22*(e.age/e.life),6+12*(e.age/e.life),null,'#abfaff');if(e.type==='frostBurst')snowflake(e.x,e.y,60*(e.age/e.life),t);ctx.restore();}
};
})();
