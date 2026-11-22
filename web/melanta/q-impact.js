// Preserve the GIF's per-frame durations exactly, using the simulation clock.
(()=>{
 'use strict';
 const source=window.MelantaQSource,{width:W,height:H,columns:COLS}=source;
 const ends=[];let end=0;for(const ms of source.durationsMs)ends.push(end+=ms);
 const duration=end/1000,leadIn=source.durationsMs[0]/1000;
 function frameAt(age){if(age<0||age>=duration)return -1;const ms=age*1000+1e-6;let lo=0,hi=ends.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(ms<ends[mid])hi=mid;else lo=mid+1;}return lo;}
 const foot=document.createElement('canvas');foot.width=512;foot.height=96;
 const base=foot.getContext('2d');base.scale(1,96/512);
 const glow=base.createRadialGradient(256,256,0,256,256,256);
 glow.addColorStop(0,'#f2b4ffab');glow.addColorStop(.28,'#ce51f282');glow.addColorStop(.68,'#a238db38');glow.addColorStop(1,'#9130c900');base.fillStyle=glow;base.fillRect(0,0,512,512);
 const image=new Image();image.decoding='async';let loaded=false;
 const ready=new Promise(resolve=>{image.onload=async()=>{try{await image.decode?.();}catch{}loaded=true;resolve(true);};image.onerror=()=>resolve(false);});
 image.src='melanta/vfx/q-impact-source.webp?v=2-soft-edge';
 const widthScale=1.12;
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 window.MelantaQImpact={duration,leadIn,frameAt,ready,kind:'source-timeline',count:ends.length,
  draw(ctx,e,ground){
   const frame=frameAt(e.t);if(!loaded||frame<0)return;
   const radius=e.radius||190,scale=radius*2.45/source.originalCellWidth,y=e.worldY??(ground-(e.y||0)),impactAge=e.t-leadIn;
   ctx.save();ctx.globalAlpha=smooth(impactAge/.025)*(1-smooth((impactAge-.55)/.45))*.8;
   ctx.drawImage(foot,e.x-radius*.95*widthScale,y-13,radius*1.9*widthScale,38);
   ctx.globalAlpha=1;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.translate(e.x,y);ctx.scale((e.dir||1)*scale*widthScale,scale);
   const [px,py]=source.groundPivot;
   ctx.drawImage(image,frame%COLS*W,Math.floor(frame/COLS)*H,W,H,-px,-py,W,H);ctx.restore();
  }
 };
})();
