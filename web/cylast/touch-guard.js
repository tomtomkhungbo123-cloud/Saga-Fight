'use strict';
(() => {
 let lastEnd=-Infinity;
 const protectedPlay=event=>document.body.classList.contains('playing')&&!document.getElementById('help').open&&!document.getElementById('settings')?.open&&!event.target?.closest?.('input,select,textarea,[contenteditable="true"]');
 const stop=event=>{if(event.cancelable!==false)event.preventDefault();};
 // Safari's gesture events can zoom even when rapid fingers land in HUD/gaps.
 for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(type,event=>{if(protectedPlay(event))stop(event);},{capture:true,passive:false});
 for(const type of ['touchstart','touchmove'])document.addEventListener(type,event=>{if(protectedPlay(event)&&event.touches.length>1)stop(event);},{capture:true,passive:false});
 document.addEventListener('touchend',event=>{
  if(!protectedPlay(event)){lastEnd=-Infinity;return;}
  const now=event.timeStamp,pad=event.target?.closest?.('#touch');
  if(pad||now-lastEnd<350){
   // Gamepad actions already fire on pointerdown. Other UI buttons need their
   // click restored because cancelling touchend suppresses Safari's native click.
   if(!pad&&event.cancelable!==false)event.target?.closest?.('button')?.click();
   stop(event);
  }
  lastEnd=now;
 },{capture:true,passive:false});
})();
