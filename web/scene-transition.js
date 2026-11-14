// Presentation only: combat and networking keep their existing clocks.
(() => {
 const veil=document.getElementById('sceneFade');
 let busy=false, timer=0;
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const lock=value=>{busy=value;document.body.classList.toggle('scene-changing',value);};
 const uncover=()=>{
  veil.classList.remove('covered');
  timer=setTimeout(()=>lock(false),reduced()?0:380);
 };
 window.sceneTransition={
  get busy(){return busy;},
  run(change){
   if(busy)return;
   window.sagaAudio?.play('scene_transition');lock(true);veil.classList.add('covered');
   timer=setTimeout(()=>{
    try{change();}finally{requestAnimationFrame(()=>requestAnimationFrame(uncover));}
   },reduced()?0:240);
  },
  reveal(){
   clearTimeout(timer);lock(true);veil.classList.add('covered');
   requestAnimationFrame(()=>requestAnimationFrame(uncover));
  }
 };
 // A fullscreen element needs the veil inside its own rendering subtree.
 document.addEventListener('fullscreenchange',()=>{
  (document.fullscreenElement||document.body).appendChild(veil);
 });
 window.addEventListener('pageshow',event=>{if(event.persisted)window.sceneTransition.reveal();});
})();
