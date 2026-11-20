'use strict';
// Soulblade explosions share the solid liquid material used by Q and W.
(()=>{
 const C=window.SoulDesign.weaponPalette,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},frames=28;
 // Ground impact retains its authored silhouette; bleed follows the liquid donor.
 function flatten(d){const t=d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g),out=[];let i=0,p=[0,0];while(i<t.length){const cmd=t[i++];if(cmd==='M'||cmd==='L'){p=[+t[i++],+t[i++]];out.push(p);}else if(cmd==='Q'){const c=[+t[i++],+t[i++]],end=[+t[i++],+t[i++]],from=p;for(let j=1;j<=8;j++){const u=j/8,v=1-u;out.push([v*v*from[0]+2*v*u*c[0]+u*u*end[0],v*v*from[1]+2*v*u*c[1]+u*u*end[1]]);}p=end;}}return out;}
 const groundBase=flatten('M 165 155 Q 151 153 140 148 L 104 133 L 144 141 L 81 105 L 126 120 L 53 73 Q 47 68 55 70 Q 106 85 159 109 L 126 78 Q 117 68 128 73 L 194 111 L 184 87 L 204 115 L 212 96 L 219 117 L 237 86 L 237 114 L 267 79 Q 277 70 270 80 L 251 108 L 299 70 L 278 105 L 353 49 Q 358 46 353 52 L 304 107 L 351 94 L 305 120 Q 298 125 306 124 L 363 109 L 307 141 Q 296 150 273 152 Q 219 157 165 155 Z').map(([x,y])=>[(x-225)/180,(y-153)/180*.82]);
 const fallback=base=>{const p=new Path2D();base.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;};
 const groundFallback=fallback(groundBase);
 // Cache vector outlines once; zooming no longer magnifies a raster explosion.
 const contours=window.SoulExplosionFrames;
 const groundFrames=contours.ground.map(d=>new Path2D(d)),burstFrames=contours.burst.map(d=>new Path2D(d));
 function canvas(w,h){const c=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):null;if(c){c.width=w;c.height=h;}return c;}
 const halo=canvas(128,128),spark=canvas(32,32),waveLight=canvas(128,128);
 if(waveLight){const g=waveLight.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,C[3]+'14');r.addColorStop(.35,C[3]+'24');r.addColorStop(.65,C[2]+'18');r.addColorStop(1,C[2]+'00');g.fillStyle=r;g.fillRect(0,0,128,128);}
 if(halo){const g=halo.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,C[3]+'b0');r.addColorStop(.35,C[2]+'78');r.addColorStop(1,C[2]+'00');g.fillStyle=r;g.fillRect(0,0,128,128);}
 if(spark){const g=spark.getContext('2d'),r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'#fff0f2');r.addColorStop(.2,C[3]+'a0');r.addColorStop(1,C[2]+'00');g.fillStyle=r;g.fillRect(0,0,32,32);}
 function paint(ctx,e,ground,quality){const u=clamp(e.age/e.life,0,1);if(u<=0||u>=1)return false;const frame=Math.min(frames-1,Math.floor(u*(frames-1))),power=1+Math.min(10,e.stacks||0)*.015,size=ground?e.size:225*power,fade=1-smooth((u-.48)/.52),ready=quality!=='low';ctx.save();ctx.translate(e.x,e.y);ctx.shadowBlur=0;
  if(ready&&halo){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=fade*.65;const h=ground?size*.85:size*2.1;ctx.drawImage(halo,-size*1.15,ground?-size*.65:-size*1.05,size*2.3,h);ctx.restore();}
  ctx.save();ctx.scale(size,size);ctx.fillStyle=C[2];ctx.globalAlpha*=1-smooth((u-.90)/.10);
  if(ground&&u<.20){const grow=1-(1-clamp(u/.12,0,1))**3;ctx.scale(grow,grow);ctx.fill(groundFallback);}
  else ctx.fill(ground?groundFrames[frame]:burstFrames[frame],'evenodd');
  ctx.restore();
  // A low-opacity, feathered light wash replaces the solid pressure rings.
  if(waveLight){const radius=size*(.38+.88*(1-(1-u)**3)),height=radius*(ground?.28:.82);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.42*smooth(u/.06)*(1-u)**1.3;ctx.drawImage(waveLight,-radius,-height,radius*2,height*2);ctx.restore();}
  if(ready&&spark){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const a=i*2.399,r=size*(.25+u*.75),x=Math.cos(a)*r,y=ground?-Math.abs(Math.sin(a))*size*.45*Math.sin(Math.PI*u):Math.sin(a)*r*.78,w=9+i%3*3;ctx.globalAlpha=fade*Math.sin(Math.PI*u)**2*.65;ctx.drawImage(spark,x-w/2,y-w/2,w,w);}ctx.restore();}ctx.restore();return true;
 }
 window.drawSoulSlam=(ctx,e,quality='high')=>paint(ctx,e,true,quality);
 window.drawSoulBleedBurst=(ctx,e,quality='high')=>paint(ctx,{...e,x:0,y:0},false,quality);
})();
