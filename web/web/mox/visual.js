// Original Mox 1.4 drawing routines; arena coordinates are converted only at the boundary.
(()=>{let ctx,game;const {clamp,moxArcPoint}=window.MoxBase;
const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d'),gr=gc.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,125,32,.6)');gr.addColorStop(.3,'rgba(255,80,16,.15)');gr.addColorStop(1,'rgba(255,60,10,0)');gc.fillStyle=gr;gc.fillRect(0,0,128,128);
function bloom(x,y,r=80,alpha=1){ctx.globalAlpha*=alpha;ctx.drawImage(glow,x-r,y-r,r*2,r*2);ctx.globalAlpha/=alpha||1;}
// Gauntlet halo is baked once; one draw per fist, no live shadow/filter.
const gauntGlow=document.createElement('canvas');gauntGlow.width=gauntGlow.height=128;
const gg=gauntGlow.getContext('2d'),gh=gg.createRadialGradient(64,64,0,64,64,64);
gh.addColorStop(0,'#ffe8b5ee');gh.addColorStop(.18,'#ffb254c0');gh.addColorStop(.42,'#ff702f70');gh.addColorStop(1,'#ff481900');gg.fillStyle=gh;gg.fillRect(0,0,128,128);
function gauntBloom(r,alpha){const previous=ctx.globalAlpha;ctx.globalAlpha=previous*Math.min(1,alpha);ctx.drawImage(gauntGlow,-r,-r,r*2,r*2);ctx.globalAlpha=previous;}
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
function fighter(entity,enemy=false,ghost=false){const p=entity,t=game.t,anim=game.anim,age=anim.t;const moving=Math.abs(p.vx||0)>40;const stride=moving?Math.sin(t*15)*19:Math.sin(t*2)*1.5;let bob=moving?Math.abs(Math.sin(t*15))*4:Math.sin(t*3)*2;let lean=(p.vx||0)*.0002;let punch=0,cast=0,shift=0;const front=!enemy?game.punchPose.front:0,back=!enemy?game.punchPose.back:0;const grapple=!enemy&&game.action?.grab;const launchAge=game.action?.k==='r'&&game.action.form?Math.max(0,(game.action.age-.15)% .22):1;const recoil=!enemy&&launchAge<.18?Math.sin(launchAge/.18*Math.PI):0;
 if(!enemy){if(anim.k==='attack'&&anim.form&&age<.44)punch=Math.sin(Math.min(1,age/.32)*Math.PI);if(['w','r'].includes(anim.k)&&game.action)cast=Math.min(1,age*6);if(anim.k==='q'&&age<.5)shift=Math.sin(age/.5*Math.PI);}
 if(grapple)bob=0;
 ctx.save();ctx.translate(p.x,-p.y);ctx.scale(p.dir||-1,1);ctx.rotate(lean+(!enemy?game.punchPose.roll:0));ctx.translate((front+back)*8-recoil*4,-bob);if(!enemy&&p.cc>0)ctx.rotate(Math.sin(t*25)*.06);
 const col=enemy?'#82918b':'#ff984e',dark=enemy?'#5e716a':'#ee7940',gaunt=enemy?'#465d54':'#d74b28';
 ctx.save();ctx.scale(1, .22);ctx.fillStyle=ghost?'transparent':'rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(0,p.y*4.5,60,22,0,0,7);ctx.fill();ctx.restore();
 ctx.translate(0,-85);ctx.rotate(p.turn||0);ctx.translate(0,85);
 if(!enemy&&p.form){ctx.save();ctx.translate(-13,-93);ctx.rotate(Math.sin(t*2.3)*.07);ctx.globalAlpha*=.8;path('M -19 -12 L -47 -42 Q -52 -27 -44 -9 Z M -28 0 L -57 10 L -32 22 Z M -18 19 L -37 39 L -12 31 Z',gaunt);ctx.restore();}
 limb(-13,-57,-25-stride*.6,-8+Math.max(0,stride*.3),22,dark);limb(13,-57,25+stride*.65,-8+Math.max(0,-stride*.3),23,col);
 // Continuous shoulders, torso and neck, no detached head.
 path('M -13 -118 Q -30 -109 -31 -91 L -22 -54 Q -3 -45 24 -55 L 29 -93 Q 29 -111 13 -119 L 10 -130 L -10 -130 Z',col);
 ctx.save();ctx.translate(0,-139);ctx.rotate(-lean*.5+Math.sin(t*2)*.018);path('M -18 -17 L -23 -32 Q -13 -29 -10 -25 L -11 -38 Q 2 -34 5 -28 L 7 -35 Q 20 -30 23 -20 Q 29 -4 19 12 Q 11 25 -3 21 Q -20 17 -22 1 Z',col);ctx.restore();
 // Alternate left jab / right cross, retaining both arm springs between attacks.
 const bx=-3+back*162+(grapple?50:0),by=-87-back*25-(grapple?30:0);
 limb(-21,-105,-32+back*100,-79-back*28,17,dark);limb(-32+back*100,-79-back*28,bx,by,16,col);
 ctx.save();ctx.translate(bx,by);ctx.rotate(-.2+back*.2);if(!enemy)gauntBloom(47,.42+back*.42);path('M -14 -8 L -10 -17 L -4 -15 L 1 -18 L 9 -12 L 13 -2 L 9 10 L -8 12 L -16 4 Z',gaunt);ctx.restore();
 let drive=punch+front;let ex=55+punch*64+front*114-back*13+cast*17-recoil*13,ey=-110-drive*5-cast*3-(grapple?12:0);
 limb(20,-109,32+drive*60,-91-drive*16,18,col);limb(32+drive*60,-91-drive*16,ex-6,ey+3,18,col);
 ctx.save();ctx.translate(ex,ey);ctx.rotate(punch*-.12);if(!enemy){ctx.save();gauntBloom(49,.58+punch*.35+shift*.25);ctx.restore();}path('M -12 -12 L -4 -14 L 2 -17 L 10 -13 L 17 -10 L 19 8 L 10 15 L -10 14 L -15 3 Z',gaunt);ctx.restore();
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
function effect(f){if(f.k==='ribbon'){fireRibbon(f.ball,1,Math.pow(f.life/f.max,1.5),false);return;}let u=1-f.life/f.max,fade=1-u;ctx.save();ctx.translate(f.x,-f.y);ctx.globalAlpha=fade;
 if(f.k==='ghost'){fighter({x:0,y:0,vx:400,dir:f.dir,form:f.form},false,true);}
 if(['impact','muzzle','grab'].includes(f.k)){bloom(0,0,100,1);for(let i=0;i<8;i++){let a=i*.785+.2,r=u*70;line([[Math.cos(a)*r*.4,Math.sin(a)*r*.4],[Math.cos(a)*r,Math.sin(a)*r]],i%2?'#ffbc6a':'#fa4b25',3*fade);}}

 if(f.k==='punch'){ctx.scale(f.dir,1);const reach=80+u*220;ctx.globalCompositeOperation='lighter';bloom(reach-35,-4,70,.35);for(let i=0;i<3;i++){const y=(i-1)*13;ctx.beginPath();ctx.moveTo(40,y);ctx.quadraticCurveTo(reach*.65,y-4,reach,y*.45);ctx.strokeStyle=i===1?'#ffd7a0':'#fa7438';ctx.lineWidth=(i===1?4:2)*fade;ctx.stroke();}ctx.strokeStyle='#ffa55e';ctx.lineWidth=2*fade;ctx.beginPath();ctx.ellipse(reach,-3,7,19,0,-1,1);ctx.stroke();}
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

function bind(context,f,e,clock,ground=0){ctx=context;const g=f.mox;game={t:clock,p:{...g.p,x:f.x,y:ground-f.y,vx:f.vx,dir:f.dir,turn:f.turn||0,hp:f.hp,cc:Math.max(0,(f.stunUntil||0)-clock,(f.freezeUntil||0)-clock),immune:Math.max(0,(f.immuneUntil||0)-clock),invuln:Math.max(0,(f.invulnUntil||0)-clock)},e:{x:e.x,y:ground-e.y,hp:e.hp},anim:g.anim,action:g.action,punchPose:g.punchPose};}
window.MoxVisual={
 character(context,f,e,clock,ground=f.y){bind(context,f,e,clock,ground);ctx.save();ctx.translate(0,ground);fighter(game.p);ctx.restore();},
 back(context,f,e,clock){bind(context,f,e,clock);for(const fx of f.mox.fx)if(['ghost','slam','shift'].includes(fx.k))effect(fx);},
 front(context,f,e,clock){bind(context,f,e,clock);if(game.action?.k==='r'&&game.action.form){ctx.save();ctx.translate(e.x,e.y-85);ctx.rotate(clock*.7);ctx.strokeStyle='#ff7745';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,58,0,7);ctx.stroke();for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);line([[45,0],[72,0]],'#ff7745',2);}ctx.restore();}
 for(const b of f.mox.balls){if(b.age<0)continue;if(b.k==='w'||b.k==='r'){fireRibbon(b,b.age/b.duration);continue;}let pts=b.trail;for(let i=1;i<pts.length;i++){let a=i/pts.length;ctx.save();ctx.globalAlpha=a*.65;line([[pts[i-1].x,-pts[i-1].y],[pts[i].x,-pts[i].y]],'#ef572a',a*10);ctx.restore();}orb(b.x,-b.y,9,'#ff6233');}
 for(const fx of f.mox.fx)if(!['ghost','slam','shift','dash'].includes(fx.k)){if(fx.k==='ribbon'&&fx.ball.progress!==undefined)fireRibbon(fx.ball,fx.ball.progress,Math.pow(fx.life/fx.max,1.5),false);else effect(fx);}
 if(e.burn?.owner===f.id&&e.burn.remaining>0){ctx.save();ctx.translate(e.x,e.y);for(let i=0;i<5;i++){let phase=(clock*1.8+i*.23)%1;ctx.save();ctx.globalAlpha=1-phase;orb(Math.sin(i*13+clock)*30,-20-phase*110,5*(1-phase)+2);ctx.restore();}ctx.restore();}},
};
})();
