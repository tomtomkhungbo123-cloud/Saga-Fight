// Device-local touch layout. Only runs on settings/viewport changes, never per frame.
(()=>{
 const $=id=>document.getElementById(id),key='saga-fight.controls.scale.v1';
 let percent=100;
 try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved)&&saved>=80&&saved<=140)percent=Math.round(saved/5)*5;}catch{}
 function apply(save=false){
  const pad=$('touch'),portrait=window.matchMedia('(orientation:portrait)').matches;
  const narrow=portrait&&innerWidth<=560,base=narrow?(innerWidth<=350?42:44):innerHeight<=450&&!portrait?51:56;
  const style=getComputedStyle(pad),width=pad.getBoundingClientRect().width||innerWidth;
  const usable=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-(parseFloat(style.columnGap)||0);
  const unit=Math.max(35,Math.min(base*percent/100,usable/(narrow?6.82:7.02)));
  pad.style.setProperty('--pad-unit',unit+'px');
  $('controlSize').value=percent;$('controlSizeValue').textContent=percent+'%';
  $('settings').style.setProperty('--preview-size',44*percent/100+'px');
  if(save)try{localStorage.setItem(key,String(percent));}catch{}
 }
 $('controlSize').addEventListener('input',()=>{percent=Math.max(80,Math.min(140,Number($('controlSize').value)||100));apply(true);});
 $('resetControlSize').onclick=()=>{percent=100;apply(true);};
 $('closeSettings').onclick=()=>$('settings').close();
 $('settings').addEventListener('close',()=>{if(!$('help').open)document.body.classList.remove('help-open');});
 window.controlSettings={refresh:()=>apply(),open(){apply();document.body.classList.add('help-open');$('settings').showModal();}};
 window.addEventListener('resize',()=>apply());window.addEventListener('pageshow',()=>apply());
 apply();
})();
