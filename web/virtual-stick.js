// Event-driven only: no render loop, canvas, or synthetic keyboard events.
(() => {
 class VirtualStick {
  constructor(output) { this.output=output;this.id=null;this.direction=null; }
  start(id,x,y,cx,cy,radius,floating,limits=null) {
   if(this.id!==null)return false;
   Object.assign(this,{id,x:cx,y:cy,radius,floating,limits,armed:true,offsetX:x-cx,offsetY:y-cy});
   this.output.draw(cx,cy,0,0,true);return true;
  }
  move(id,x,y) {
   if(id!==this.id)return false;
   x-=this.offsetX;y-=this.offsetY;
   let dx=x-this.x,dy=y-this.y;
   const distance=Math.hypot(dx,dy),r=this.radius;
   if(this.floating&&distance>r){
    this.x+=dx*(1-r/distance);this.y+=dy*(1-r/distance);
    if(this.limits){this.x=Math.max(this.limits.left,Math.min(this.limits.right,this.x));this.y=Math.max(this.limits.top,Math.min(this.limits.bottom,this.y));}
    dx=x-this.x;dy=y-this.y;
   }
   const length=Math.hypot(dx,dy),scale=length>r?r/length:1;
   const direction=dx < -r*.22?'KeyA':dx > r*.22?'KeyD':null;
   if(direction!==this.direction){this.direction=direction;this.output.move(direction);}
   if(Math.abs(dy)<r*.32)this.armed=true;
   if(this.armed&&dy>r*.68){this.armed=false;this.output.action('drop');}
   this.output.draw(this.x,this.y,dx*scale,dy*scale,true);return true;
  }
  end(id=this.id) {
   if(id!==this.id||this.id===null)return false;
   this.id=null;this.direction=null;this.output.release();this.output.draw(this.x,this.y,0,0,false);return true;
  }
 }
 if(typeof module==='object'&&module.exports)module.exports=VirtualStick;
 if(typeof document==='undefined')return;
 const zone=document.getElementById('joystickZone'),pad=document.getElementById('touch');
 if(!zone||!pad)return;
 const base=zone.querySelector('.joystick-base'),thumb=zone.querySelector('.joystick-thumb');
 const stick=new VirtualStick({
  move:code=>window.SagaTouchInput?.move(code),
  release:()=>window.SagaTouchInput?.release(),
  action:code=>window.SagaTouchInput?.action(code),
  draw(x,y,dx,dy,active){
   base.style.left=x+'px';base.style.top=y+'px';
   thumb.style.transform=`translate(${dx}px,${dy}px)`;
   zone.classList.toggle('active',active);
  }
 });
 let bounds;
 function reset(){
  const id=stick.id;stick.end();
  if(id!==null&&zone.hasPointerCapture?.(id))try{zone.releasePointerCapture(id);}catch{}
  base.style.left='';base.style.top='';thumb.style.transform='';zone.classList.remove('active');
 }
 zone.addEventListener('pointerdown',event=>{
  const mode=pad.dataset.virtualControl;
  if(mode==='buttons'||!window.SagaTouchInput?.active()||event.button>0||stick.id!==null)return;
  event.preventDefault();bounds=zone.getBoundingClientRect();
  const floating=mode==='floating',size=base.getBoundingClientRect().width;
  const px=event.clientX-bounds.left,py=event.clientY-bounds.top;
  const limits={left:size/2,right:Math.max(size/2,bounds.width-size/2),top:size/2,bottom:Math.max(size/2,bounds.height-size/2)};
  const cx=floating?Math.max(limits.left,Math.min(limits.right,px)):bounds.width/2;
  const cy=floating?Math.max(limits.top,Math.min(limits.bottom,py)):bounds.height-size/2-6;
  if(!floating&&Math.hypot(px-cx,py-cy)>size*.6)return;
  stick.start(event.pointerId,px,py,cx,cy,size*.29,floating,limits);
  // A fixed stick responds immediately when its outer ring is touched.
  if(!floating){stick.offsetX=stick.offsetY=0;stick.move(event.pointerId,px,py);}
  try{zone.setPointerCapture(event.pointerId);}catch{}
 });
 zone.addEventListener('pointermove',event=>{
  if(event.pointerId!==stick.id)return;
  event.preventDefault();
  if(!window.SagaTouchInput?.active()){reset();return;}
  stick.move(event.pointerId,event.clientX-bounds.left,event.clientY-bounds.top);
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(name,event=>{if(event.pointerId===stick.id)reset();});
 window.addEventListener('blur',reset);
 window.addEventListener('resize',reset);
 document.addEventListener('visibilitychange',reset);
 document.getElementById('settings').addEventListener('close',reset);
 new MutationObserver(()=>{if(document.getElementById('message').hidden===false||!document.body.classList.contains('playing')||document.getElementById('settings').open)reset();}).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:false});
 new MutationObserver(reset).observe(document.getElementById('settings'),{attributes:true,attributeFilter:['open']});
 window.virtualStick={reset};
})();
