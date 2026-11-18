// Home Screen mode is independent of the optional browser Fullscreen API.
(()=>{
 const standalone=window.matchMedia?.('(display-mode: standalone)'),fullscreen=window.matchMedia?.('(display-mode: fullscreen)');
 const touchDevice=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||window.matchMedia?.('(pointer: coarse)')?.matches;
 document.documentElement.classList.toggle('touch-layout',!!touchDevice);
 function viewport(){
  if(!touchDevice)return;
  const height=window.visualViewport?.height||innerHeight,root=document.documentElement;
  root.style.setProperty('--lobby-viewport',height+'px');
  const typing=document.activeElement?.matches?.('input,textarea,[contenteditable="true"]');
  root.classList.toggle('lobby-keyboard',!!typing&&height<innerHeight*.75);
 }
 document.addEventListener('focusin',viewport);document.addEventListener('focusout',viewport);
 viewport();window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);
 function sync(){viewport();document.documentElement.classList.toggle('app-mode',navigator.standalone===true||!!standalone?.matches||!!fullscreen?.matches);}
 sync();standalone?.addEventListener?.('change',sync);fullscreen?.addEventListener?.('change',sync);window.addEventListener('pageshow',sync);
})();
