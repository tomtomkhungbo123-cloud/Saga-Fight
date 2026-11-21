// Authored motion from reference cell 8 (row 2, column 3); original frame durations.
(()=>{
const C={frames:27,tile:448,columns:7,duration:1.2,frameEnds:[0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.56, 0.6, 0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.92, 0.96, 1.0, 1.08, 1.12, 1.16, 1.2],asset:'/mox/assets/explosion-cell08.webp?v=8497da98ed77'};
let atlas;
function sample(u){const elapsed=Math.max(0,Math.min(1,u))*C.duration;let frame=C.frameEnds.findIndex(end=>elapsed<end);if(frame<0)frame=C.frames-1;return {frame,elapsed,visible:u>=0&&u<1};}
function prepare(){if(!atlas){atlas=new Image();atlas.decoding='async';atlas.src=C.asset;}return atlas;}
function draw(c,x,y,u,radius=48){const s=sample(u);if(!s.visible)return;const texture=prepare();if(!texture.complete||!texture.naturalWidth)return;const size=radius*2.8;c.save();c.drawImage(texture,s.frame%C.columns*C.tile,Math.floor(s.frame/C.columns)*C.tile,C.tile,C.tile,x-size/2,y-size/2,size,size);c.restore();}
window.MoxExplosion={C,sample,prepare,draw};if(typeof Image==='function')prepare();
})();
