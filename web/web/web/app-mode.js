// Home Screen mode is independent of the optional browser Fullscreen API.
(()=>{
 const standalone=window.matchMedia?.('(display-mode: standalone)'),fullscreen=window.matchMedia?.('(display-mode: fullscreen)');
 function sync(){document.documentElement.classList.toggle('app-mode',navigator.standalone===true||!!standalone?.matches||!!fullscreen?.matches);}
 sync();standalone?.addEventListener?.('change',sync);fullscreen?.addEventListener?.('change',sync);window.addEventListener('pageshow',sync);
})();
