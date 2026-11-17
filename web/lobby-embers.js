// Small, bounded compositor animations. No timers, JS animation loop or combat state.
(()=>{
 'use strict';
 const menu=document.getElementById('menu');if(!menu)return;
 const layer=document.createElement('div');layer.className='lobby-embers';layer.setAttribute('aria-hidden','true');menu.prepend(layer);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),compact=window.matchMedia('(max-width: 1000px), (pointer: coarse)');
 const weak=(navigator.hardwareConcurrency||8)<=4;
 const particles=[];
 // All nodes and gradients are created once. Only transform and opacity animate.
 for(let i=0;i<18;i++){
  const dot=document.createElement('i');const seed=(i*73+19)%101;
  dot.style.cssText=`left:${(i*37+7)%100}%;--ember-size:${i%5===0?4:2+i%2}px;--ember-drift:${(i%2?1:-1)*(12+seed*.6)}px;--ember-duration:${7+seed*.07}s;--ember-delay:${-(seed*.17)}s;--ember-peak:${.3+(i%4)*.13};`;
  particles.push(dot);layer.append(dot);
 }
 function sync(){
  const quality=document.getElementById('graphicsQuality')?.value||'auto';
  const count=quality==='low'?4:weak?6:compact.matches?8:quality==='balanced'?10:18;
  const paused=menu.hidden||document.hidden||reduced.matches||!!document.querySelector('dialog[open]');
  layer.style.setProperty('--ember-play',paused?'paused':'running');
  layer.hidden=menu.hidden||reduced.matches;
  particles.forEach((dot,i)=>{dot.hidden=i>=count;});
 }
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{const height=entries[0]?.contentRect.height;if(height>0)layer.style.setProperty('--ember-rise',Math.ceil(height+30)+'px');}).observe(menu);
 const observer=new MutationObserver(sync);observer.observe(menu,{attributes:true,attributeFilter:['hidden']});
 for(const dialog of document.querySelectorAll('dialog'))observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 document.addEventListener('visibilitychange',sync);
 document.getElementById('graphicsQuality')?.addEventListener('change',sync);
 reduced.addEventListener('change',sync);compact.addEventListener('change',sync);
 sync();
})();
