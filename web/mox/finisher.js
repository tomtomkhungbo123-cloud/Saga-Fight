// Deterministic close-up, composited once per frame so fading never reveals body joints.
(()=>{
const C={duration:2.4,fadeIn:.2,fadeOut:.3},sat=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=sat(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
function sample(t){t=Math.max(0,Math.min(C.duration,t));const enter=smooth(t/.46),raise=smooth((t-.18)/.35),strike=smooth((t-.55)/.26),settle=smooth((t-.84)/.55);return {t,enter,raise,strike,settle,alpha:smooth(t/C.fadeIn)*(1-smooth((t-(C.duration-C.fadeOut))/C.fadeOut)),x:-140*(1-enter)+22*strike-8*settle,y:65*(1-enter)-18*raise,roll:-.025+.015*strike,hand:{x:mix(730,935,raise)+130*strike-12*settle,y:mix(520,340,raise)-30*strike+8*settle}};}
let frame,background,halo;
function prepare(){if(frame)return;frame=document.createElement('canvas');background=document.createElement('canvas');background.width=1600;background.height=900;const c=background.getContext('2d'),g=c.createLinearGradient(0,900,1600,0);g.addColorStop(0,'#ffc99f');g.addColorStop(.5,'#ffba8e');g.addColorStop(1,'#ffd5af');c.fillStyle=g;c.fillRect(0,0,1600,900);// Cached soft directional brushwork: translucent tapered streaks, no square-ended bands.
 for(let i=0;i<48;i++){const x=(i*347%2300)-350,y=(i*223%1500)-240,len=330+i%7*85,width=8+i%5*8;c.save();c.translate(x,y);c.rotate(-.56);const brush=c.createLinearGradient(-len*.5,0,len*.5,0);brush.addColorStop(0,'#ffe5c500');brush.addColorStop(.4,i%3?'#fff0d73c':'#ed8e4a24');brush.addColorStop(.65,i%3?'#ffe9ca55':'#ed8e4a20');brush.addColorStop(1,'#ffe5c500');c.fillStyle=brush;c.beginPath();c.moveTo(-len*.5,0);c.bezierCurveTo(-len*.25,-width,len*.25,-width,len*.5,0);c.bezierCurveTo(len*.25,width,-len*.25,width,-len*.5,0);c.fill();c.restore();}
 for(let i=0;i<15;i++){const x=(i*421%2100)-300,y=(i*287%1300)-100,len=480+i%4*120;c.save();c.translate(x,y);c.rotate(-.56);const g=c.createLinearGradient(-len*.5,0,len*.5,0);g.addColorStop(0,'#fff1d800');g.addColorStop(.65,'#fff1d860');g.addColorStop(1,'#fff1d800');c.fillStyle=g;c.beginPath();c.moveTo(-len*.5,0);c.quadraticCurveTo(0,-3-i%3,len*.5,0);c.quadraticCurveTo(0,3+i%3,-len*.5,0);c.fill();c.restore();}

 halo=document.createElement('canvas');halo.width=halo.height=160;const h=halo.getContext('2d'),r=h.createRadialGradient(80,80,0,80,80,80);r.addColorStop(0,'#ffb466a0');r.addColorStop(.34,'#ff7f3f70');r.addColorStop(1,'#e5481c00');h.fillStyle=r;h.fillRect(0,0,160,160);}
function glow(c,x,y,r,alpha){c.save();c.globalAlpha=alpha;c.globalCompositeOperation='lighter';c.drawImage(halo,x-r,y-r,r*2,r*2);c.restore();}
function shape(c,d,color){c.fillStyle=color;c.fill(new Path2D(d));}
function glove(c,x,y,scale,angle,t){glow(c,x,y,scale*110,.6);c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);shape(c,'M -57 -28 L -59 -77 Q -56 -93 -40 -88 L -9 -68 Q 6 -100 29 -94 L 61 -89 Q 74 -77 76 -47 Q 116 7 85 57 Q 66 85 8 89 Q -37 88 -43 59 Z','#e94e29');c.restore();}
function arm(c,s,e,w,color){c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(s.x,s.y);c.quadraticCurveTo(e.elx,e.ely,e.x,e.y);c.stroke();}
const beamPaths=[[[590,590],[900,840],[1470,450],[2040,60]],[[380,740],[700,1060],[1480,570],[2210,80]]];
function beamPoint(index,q){const p=beamPaths[index],v=1-q;return {x:v*v*v*p[0][0]+3*v*v*q*p[1][0]+3*v*q*q*p[2][0]+q*q*q*p[3][0],y:v*v*v*p[0][1]+3*v*v*q*p[1][1]+3*v*q*q*p[2][1]+q*q*q*p[3][1]};}
function beamSample(t,index){const start=index?.98:.84,travel=sat((t-start)/.52),lag=sat((t-start-.105)/.52),progress=q=>.12*q+.88*q*q;return {u:progress(travel),tail:progress(lag),fade:smooth((t-start)/.045)*(1-smooth((t-start-.57)/.15))};}
function beam(c,t,index,quality){const {u,tail,fade}=beamSample(t,index);if(u<=0||fade<=0)return;const n=quality==='low'?22:42,pts=[];
 for(let i=0;i<=n;i++){const v=i/n,q=tail+(u-tail)*v,a=beamPoint(index,Math.max(0,q-.002)),b=beamPoint(index,Math.min(1,q+.002)),r=beamPoint(index,q),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;pts.push({...r,nx:-dy/l,ny:dx/l,w:(index?82:62)*Math.pow(v,1.5)*(1+.07*Math.sin(v*4-t*10))});}
 const band=(mult,color,opacity)=>{c.fillStyle=color;c.globalAlpha=fade*opacity;c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](p.x+p.nx*p.w*mult,p.y+p.ny*p.w*mult));const tip=pts.at(-1),prev=pts.at(-2),len=Math.hypot(tip.x-prev.x,tip.y-prev.y)||1,tx=(tip.x-prev.x)/len*tip.w*mult*1.6,ty=(tip.y-prev.y)/len*tip.w*mult*1.6;c.bezierCurveTo(tip.x+tip.nx*tip.w*mult+tx,tip.y+tip.ny*tip.w*mult+ty,tip.x-tip.nx*tip.w*mult+tx,tip.y-tip.ny*tip.w*mult+ty,tip.x-tip.nx*tip.w*mult,tip.y-tip.ny*tip.w*mult);for(let i=pts.length-1;i>=0;i--){const p=pts[i];c.lineTo(p.x-p.nx*p.w*mult,p.y-p.ny*p.w*mult);}c.closePath();c.fill();};c.save();band(1.55,'#f67237',.08);band(1.15,'#e25428',.16);band(1,'#c84223',.85);band(.5,'#e8582b',.32);band(.12,'#f98a43',.25);
 c.restore();}
function draw(ctx,w,h,t,quality='high',skin){prepare();const v=sample(t);if(!v.alpha||w<=0||h<=0)return;if(frame.width!==w||frame.height!==h){frame.width=w;frame.height=h;}const raw=frame.getContext('2d'),whiteFire=skin&&skin===window.MoxWhiteFire?.palette;
 const c=whiteFire?window.FighterPalette.context(raw,skin+'-fx'):raw;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);const cover=Math.max(w/1600,h/900),drift=(t-C.duration*.5)*65;c.drawImage(background,(w-2080*cover)*.5+drift*cover,(h-1170*cover)*.5-drift*.63*cover,2080*cover,1170*cover);
 const unit=Math.min(w/1600,h/900);c.save();c.translate((w-1600*unit)/2,(h-900*unit)/2);c.scale(unit,unit);
 beam(c,t,0,quality);
 c.save();c.translate(v.x,v.y);c.translate(570,570);c.rotate(v.roll);c.translate(-570,-570);
 // A continuous trunk and shoulder silhouette; arms overlap well inside their sockets.
 const rear={x:310-20*v.strike,y:650+12*v.strike,elx:325,ely:470};arm(c,{x:420,y:413},rear,104,'#ff964b');glove(c,rear.x,rear.y,.83,-.3,t);
 shape(c,'M 428 335 Q 374 349 348 410 Q 326 460 373 533 Q 404 568 398 641 L 390 1000 L 728 1000 Q 686 775 726 561 Q 771 464 717 388 Q 669 330 596 336 Z','#ff964b');
 shape(c,'M 467 274 L 554 276 L 594 384 L 442 384 Z','#ff964b');
 c.save();c.translate(502,221);c.rotate(-.04+.025*v.strike);c.scale(6.5,6.7);shape(c,'M -16 -9 L -21 -25 Q -17 -27 -11 -22 L -13 -30 Q -4 -31 1 -24 L -2 -32 Q 7 -31 12 -25 L 12 -29 Q 21 -25 21 -13 Q 21 4 13 14 Q 5 20 -7 15 Q -16 9 -17 -2 Z','#ff964b');c.restore();
 const hand={...v.hand,elx:790+110*v.strike,ely:530-50*v.raise-28*v.strike};arm(c,{x:679,y:410},hand,116,'#ff964b');glove(c,hand.x,hand.y,1.12+.05*v.strike,-.25+.18*v.strike,t);
 // Soft pressure around the active fist, with no outline on the glove.
 if(t>.6&&t<1.65){const alpha=smooth((t-.6)/.22)*(1-smooth((t-1.2)/.45));for(let i=0;i<3;i++)glow(c,hand.x-40-i*24,hand.y-36+Math.sin(t*5+i)*14,95-i*15,alpha*.19);}
 if(whiteFire)window.MoxWhiteFire.aura(raw,530,410,t,true,2.5);
 c.restore();beam(c,t,1,quality);c.restore();ctx.save();ctx.globalAlpha*=v.alpha;ctx.drawImage(frame,0,0);ctx.restore();}
window.MoxFinish={C,sample,beamSample,beamPoint,prepare,draw};
})();
