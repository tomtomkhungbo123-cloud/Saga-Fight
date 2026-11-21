// Actual uploaded video artwork. Source frames include the white core, purple
// fringe and pointed crescents. Hard video matte edges are cleaned offline.
(()=>{
 'use strict';
 const source=window.MelantaRSource,normalSource=window.MelantaNormalSlashSource;
 const tracks=window.MelantaRTracks,images=[];
 let loaded=false,normalLoaded=false;
 function loadImage(image,url){
  return new Promise(resolve=>{
   image.decoding='async';
   image.onload=async()=>{try{await image.decode?.();}catch{}resolve(true);};
   image.onerror=()=>resolve(false);
   image.src=url;
  });
 }
 let pending;
 function preload(){
 if(pending)return pending;
 const rReady=Promise.all(source.pages.map(page=>{
  const image=new Image();
  images.push(image);
  return loadImage(image,page.url);
 })).then(ok=>(loaded=ok.every(Boolean)));

 const normalReady=loadImage(normalImage,normalSource.url).then(ok=>(normalLoaded=ok));
 return pending=Promise.all([rReady,normalReady]).then(results=>results.every(Boolean));
 }
 const normalImage=new Image();
 function frameAt(time){
  if(time<0)return -1;
  // The complete reference is already the combined slash of both blades.
  // It has one timeline, without a second copy or per-blade phase offset.
  const at=time%source.duration;
  return Math.min(source.count-1,Math.floor((at+1e-8)*source.fps));
 }
 function placement(a,ground){
  // Stable shared swing space spans the existing +/-420-unit weapon reach.
  // Do not attach the entire two-blade composition to either moving endpoint.
  return {x:a.sx,y:ground-204,scale:840/source.originalWidth,mirror:a.dir||1};
 }
 // Track angles follow the local direction of motion. Limit turns through
 // near-stationary frames so the cutting edge doesn't flick back and forth.
 const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
 const trackAngles=tracks?.map(track=>{
  let angle=Math.atan2(track[2][1]-track[0][1],track[2][0]-track[0][0]);
  return track.map((_,i)=>{
   const before=track[Math.max(0,i-2)],after=track[Math.min(track.length-1,i+2)];
   const dx=after[0]-before[0],dy=after[1]-before[1];
   if(Math.hypot(dx,dy)>5){
    const turn=angleDelta(angle,Math.atan2(dy,dx));
    angle+=Math.max(-.68,Math.min(.68,turn));
   }
   return angle;
  });
 });
 function bladeTip(a,time,end){
  const track=tracks?.[end];
  if(!track)return null;
  // Sprite and blade tracks share one clock and coordinate transform. The
  // subframe interpolation keeps the blades moving at render frequency.
  const frame=Math.max(0,Math.min(track.length-1,time*source.fps));
  const index=Math.floor(frame),next=Math.min(index+1,track.length-1),mix=frame-index;
  const before=track[index],after=track[next],angles=trackAngles[end],p=placement(a,0);
  const direction=angles[index]+mix*(angles[next]-angles[index]);
  const [px,py]=source.pivot;
  return {
   x:p.x+(before[0]+mix*(after[0]-before[0])-px)*p.scale*p.mirror,
   y:p.y+(before[1]+mix*(after[1]-before[1])-py)*p.scale,
   angle:p.mirror===1?direction:Math.PI-direction
  };
 }
 function drawAtlasFrame(ctx,index,pivotX,pivotY){
  const [page,x,y,w,h,ox,oy]=source.frames[index];
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(images[page],x,y,w,h,ox-pivotX,oy-pivotY,w,h);
 }
 function drawNormal(ctx,a,age,head,tail,ground,opacity){
  if(!normalLoaded||opacity<=0||window.MelantaWorkbench?.effects===false)return;
  const variant=(a.dir===-1?3:0)+(a.n||1)-1;
  const frames=normalSource.frames[variant];
  const {swingDuration,fadeDuration,swingFrames,fadeFrames}=normalSource;
  const sample=age<=swingDuration?age/swingDuration*swingFrames:
   swingFrames+(age-swingDuration)/fadeDuration*fadeFrames;
  const frame=frames[Math.max(1,Math.min(frames.length-1,Math.round(sample)))];
  if(!frame)return;
  const [sx,sy,sw,sh,x,y,w,h,tailX,tailY]=frame;
  ctx.save();
  ctx.translate(head.x,ground+head.y);
  // Align both ends with the live trajectory when the fighter moves or falls.
  // Preserve the width across the track and limit stretch on tight turns.
  const dot=tailX*tailX+tailY*tailY;
  if(dot>900){
   const dx=tail.x-head.x-tailX,dy=tail.y-head.y-tailY;
   const fit=Math.min(1,.48*Math.sqrt(dot)/(Math.hypot(dx,dy)||1))/dot;
   ctx.transform(1+dx*tailX*fit,dy*tailX*fit,dx*tailY*fit,1+dy*tailY*fit,0,0);
  }
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.globalAlpha*=opacity;
  ctx.drawImage(normalImage,sx,sy,sw,sh,x,y,w,h);
  ctx.restore();
 }
 function draw(ctx,a,ground){
  if(!loaded||a.k!=='r'||a.phase==='plunge'||a.t<=0||a.t>=4||window.MelantaWorkbench?.effects===false)return;
  const p=placement(a,ground);
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.mirror*p.scale,p.scale);
  ctx.globalAlpha*=Math.min(1,a.t/.12,(4-a.t)/.23);
  // Common full-frame pivot preserves registration as the packed crop changes.
  drawAtlasFrame(ctx,frameAt(a.t),...source.pivot);ctx.restore();
  return true;
 }
 window.MelantaRSlash={draw,drawNormal,frameAt,placement,bladeTip,preload,get ready(){return preload();},kind:'original-video-frames',source};
})();
