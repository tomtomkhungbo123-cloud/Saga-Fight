'use strict';
// Hand-traced impact contours in the supplied Skill 4 reference's coordinates.
// Broad red mass, uneven outward blade tips and a dark rear layer; no circular ring.
window.drawSoulSlam = (() => {
 const rear = new Path2D('M 154 153 L 101 145 L 133 141 L 58 115 Q 50 110 59 110 L 121 121 L 80 92 L 153 113 L 84 73 L 164 103 L 144 79 L 191 107 L 188 80 L 205 108 L 218 86 L 224 103 L 245 79 L 241 112 L 280 76 L 264 109 L 315 61 L 285 108 L 373 88 Q 380 87 372 94 L 336 119 L 400 105 Q 406 105 399 111 L 359 132 L 411 116 L 375 133 L 319 145 L 278 153 Z');
 const front = new Path2D('M 165 155 Q 151 153 140 148 L 104 133 L 144 141 L 81 105 L 126 120 L 53 73 Q 47 68 55 70 Q 106 85 159 109 L 126 78 Q 117 68 128 73 L 194 111 L 184 87 L 204 115 L 212 96 L 219 117 L 237 86 L 237 114 L 267 79 Q 277 70 270 80 L 251 108 L 299 70 L 278 105 L 353 49 Q 358 46 353 52 L 304 107 L 351 94 L 305 120 Q 298 125 306 124 L 363 109 L 307 141 Q 296 150 273 152 Q 219 157 165 155 Z');
 const streaks = new Path2D('M 47 150 Q 70 147 98 151 Q 77 154 47 151 Z M 101 143 L 128 146 L 146 151 L 109 147 Z M 320 140 L 367 126 L 343 138 Z M 369 127 L 406 116 L 397 123 L 368 132 Z M 301 77 L 326 55 L 311 73 Z');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 return function drawSoulSlam(ctx,e){
  const z=clamp(e.age/e.life,0,1);
  const expand=1-Math.pow(1-clamp(z/.19,0,1),3);
  const fade=1-clamp((z-.48)/.52,0,1);
  if(expand<=0||fade<=0)return;
  ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.size/180*expand,e.size/180*expand*.82);ctx.translate(-225,-153);
  ctx.globalAlpha=fade;ctx.shadowBlur=0;ctx.fillStyle='#71333d';ctx.fill(rear);
  // Restrained bloom preserves the hard, graphic edges of the reference.
  ctx.save();ctx.globalAlpha*=.22;ctx.shadowColor='#ff425f';ctx.shadowBlur=8;ctx.fillStyle='#ff5269';ctx.fill(front);ctx.restore();
  ctx.fillStyle='#ff5269';ctx.fill(front);ctx.fill(streaks);ctx.restore();
 };
})();
