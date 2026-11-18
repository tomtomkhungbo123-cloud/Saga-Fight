'use strict';
// Hand-traced impact contours in the supplied Skill 4 reference's coordinates.
// Broad red mass, uneven outward blade tips and a dark rear layer; no circular ring.
window.drawSoulSlam = (() => {
 const rear = new Path2D('M 154 153 L 101 145 L 133 141 L 58 115 Q 50 110 59 110 L 121 121 L 80 92 L 153 113 L 84 73 L 164 103 L 144 79 L 191 107 L 188 80 L 205 108 L 218 86 L 224 103 L 245 79 L 241 112 L 280 76 L 264 109 L 315 61 L 285 108 L 373 88 Q 380 87 372 94 L 336 119 L 400 105 Q 406 105 399 111 L 359 132 L 411 116 L 375 133 L 319 145 L 278 153 Z');
 const front = new Path2D('M 165 155 Q 151 153 140 148 L 104 133 L 144 141 L 81 105 L 126 120 L 53 73 Q 47 68 55 70 Q 106 85 159 109 L 126 78 Q 117 68 128 73 L 194 111 L 184 87 L 204 115 L 212 96 L 219 117 L 237 86 L 237 114 L 267 79 Q 277 70 270 80 L 251 108 L 299 70 L 278 105 L 353 49 Q 358 46 353 52 L 304 107 L 351 94 L 305 120 Q 298 125 306 124 L 363 109 L 307 141 Q 296 150 273 152 Q 219 157 165 155 Z');
 const streaks = new Path2D('M 47 150 Q 70 147 98 151 Q 77 154 47 151 Z M 101 143 L 128 146 L 146 151 L 109 147 Z M 320 140 L 367 126 L 343 138 Z M 369 127 L 406 116 L 397 123 L 368 132 Z M 301 77 L 326 55 L 311 73 Z');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let halo,spark;
 function canvas(w,h){const c=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):null;if(c){c.width=w;c.height=h;}return c;}
 function prepare(){if(halo)return true;
  halo=canvas(128,128);if(!halo)return false;let h=halo.getContext('2d'),g=h.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,223,228,.85)');g.addColorStop(.24,'rgba(255,103,145,.48)');g.addColorStop(1,'rgba(240,37,94,0)');h.fillStyle=g;h.fillRect(0,0,128,128);
  spark=canvas(48,48);h=spark.getContext('2d');g=h.createRadialGradient(24,24,0,24,24,24);g.addColorStop(0,'rgba(255,252,244,1)');g.addColorStop(.2,'rgba(255,180,207,.85)');g.addColorStop(1,'rgba(255,65,127,0)');h.fillStyle=g;h.fillRect(0,0,48,48);h.fillStyle='#fff2ee';h.beginPath();h.moveTo(24,10);h.quadraticCurveTo(25,22,36,24);h.quadraticCurveTo(25,25,24,38);h.quadraticCurveTo(23,26,12,24);h.quadraticCurveTo(23,23,24,10);h.fill();return true;
 }
 const seeds=Array.from({length:18},(_,i)=>({angle:i*2.399,delay:(i%3)*.025,height:40+i%5*19,size:11+i%4*3}));
 return function drawSoulSlam(ctx,e,quality='high'){
  const z=clamp(e.age/e.life,0,1),expand=1-Math.pow(1-clamp(z/.19,0,1),3),fade=1-clamp((z-.48)/.52,0,1);
  if(expand<=0||fade<=0)return;
  const ready=prepare();ctx.save();ctx.globalAlpha*=fade;
  if(ready){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.55;ctx.drawImage(halo,e.x-e.size*.65,e.y-70,e.size*1.3,105);ctx.restore();}
  ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.size/180*expand,e.size/180*expand*.82);ctx.translate(-225,-153);
  ctx.shadowBlur=0;ctx.fillStyle='#74303d';ctx.fill(rear);ctx.fillStyle='#ff617d';ctx.fill(front);ctx.fillStyle='#ffadbd';ctx.fill(streaks);ctx.restore();
  if(ready){ctx.save();ctx.globalCompositeOperation='lighter';const count=quality==='low'?8:18;
   for(let i=0;i<count;i++){const seed=seeds[i],u=clamp((z-seed.delay)/(1-seed.delay),0,1);if(u<=0||u>=1)continue;const twinkle=.45+.55*Math.sin(u*9+seed.angle)**2,alpha=Math.min(1,u/.06)*(1-u)**1.4*twinkle,x=e.x+Math.cos(seed.angle)*e.size*(.12+.75*u),y=e.y-12-Math.sin(Math.PI*u)*seed.height-u*28,size=seed.size*(.7+.3*Math.sin(Math.PI*u));ctx.globalAlpha=fade*alpha;ctx.drawImage(spark,x-size/2,y-size/2,size,size);}
   ctx.restore();}
  ctx.restore();
 };
})();
