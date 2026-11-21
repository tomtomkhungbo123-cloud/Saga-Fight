// Device-local touch layout. Only runs on settings/viewport changes, never per frame.
(()=>{
 const $=id=>document.getElementById(id),key='saga-fight.controls.scale.v1';
 let percent=100,opacity=90,mode='buttons';
 try{const saved=JSON.parse(localStorage.getItem('saga-fight.controls.virtual.v1')||'null');if(saved){if(['buttons','fixed','floating'].includes(saved.mode))mode=saved.mode;if(Number.isFinite(saved.opacity))opacity=Math.max(20,Math.min(100,saved.opacity));}}catch{}
 try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved)&&saved>=80&&saved<=140)percent=Math.round(saved/5)*5;}catch{}
 function apply(save=false){
  const ios=document.documentElement.classList.contains('ios-controls');
  const pad=$('touch'),portrait=window.matchMedia('(orientation:portrait)').matches;
  const narrow=portrait&&innerWidth<=560,base=narrow?(innerWidth<=350?42:44):innerHeight<=450&&!portrait?51:56;
  const style=getComputedStyle(pad),width=pad.getBoundingClientRect().width||innerWidth;
  const usable=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-(parseFloat(style.columnGap)||0);
  const vertical=ios?(innerHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0)-88)/3.4:Infinity;
  const divisor=ios?(narrow?6.6:6.8):(narrow?6.82:7.02);
  const unit=Math.max(ios?44:35,Math.min(base*percent/100,usable/divisor,vertical));
  pad.style.setProperty('--pad-unit',unit+'px');
  pad.dataset.virtualControl=mode;
  document.documentElement.style.setProperty('--control-opacity',opacity/100);
  $('controlOpacity').value=opacity;$('controlOpacityValue').textContent=opacity+'%';
  document.querySelectorAll('[name="virtualControl"]').forEach(input=>input.checked=input.value===mode);
  $('controlSize').value=percent;$('controlSizeValue').textContent=percent+'%';
  $('settings').style.setProperty('--preview-size',44*percent/100+'px');
  if(save)try{localStorage.setItem(key,String(percent));localStorage.setItem('saga-fight.controls.virtual.v1',JSON.stringify({mode,opacity}));}catch{}
 }
 $('controlOpacity').addEventListener('input',()=>{opacity=Math.max(20,Math.min(100,Number($('controlOpacity').value)||90));apply(true);});
 document.querySelectorAll('[name="virtualControl"]').forEach(input=>input.addEventListener('change',()=>{window.virtualStick?.reset();mode=input.value;apply(true);}));
 $('controlSize').addEventListener('input',()=>{percent=Math.max(80,Math.min(140,Number($('controlSize').value)||100));apply(true);});
 $('resetControlSize').onclick=()=>{percent=100;apply(true);};
 $('closeSettings').onclick=()=>$('settings').close();
 // Require the gesture to begin and end on the backdrop, not on a slider or scroll area.
 const settings=$('settings');let backdropPress=false;
 function onBackdrop(event){const r=settings.getBoundingClientRect();return event.target===settings&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);}
 settings.addEventListener('pointerdown',event=>{backdropPress=event.button===0&&onBackdrop(event);});
 settings.addEventListener('pointercancel',()=>{backdropPress=false;});
 settings.addEventListener('click',event=>{const dismiss=backdropPress&&onBackdrop(event);backdropPress=false;if(dismiss&&settings.open)settings.close();});
 settings.addEventListener('close',()=>{backdropPress=false;});
 $('settings').addEventListener('close',()=>{if(!$('help').open)document.body.classList.remove('help-open');});
 window.controlSettings={refresh:()=>apply(),open(){apply();document.body.classList.add('help-open');$('settings').showModal();}};
 window.addEventListener('resize',()=>apply());window.addEventListener('pageshow',()=>apply());
 apply();
})();
