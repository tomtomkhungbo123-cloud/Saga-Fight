// Small previews share the live character art; only selected cards animate (30Hz).
(()=>{
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const animatedPortraits=new Map();
const portraitVisibility=new IntersectionObserver(entries=>{
 for(const entry of entries){
  const portrait=animatedPortraits.get(entry.target);
  if(portrait)portrait.visible=entry.intersectionRatio>0;
 }
});
const cards=[...document.querySelectorAll('[data-roster-type]')];if(!cards.length)return;
const previews=cards.map(card=>({card,type:card.dataset.rosterType,player:+card.dataset.rosterPlayer,canvas:card.querySelector('canvas'),fighter:makeFighter(card.dataset.rosterType,+card.dataset.rosterPlayer),painted:false}));
// One native modal keeps the five-card roster out of the menu's narrow columns.
const picker=document.createElement('dialog');picker.id='fighterPicker';picker.setAttribute('aria-labelledby','fighterPickerTitle');picker.setAttribute('aria-describedby','fighterPickerHint');
picker.innerHTML='<header class="fighter-picker-header"><div><span id="fighterPickerPlayer" class="section-label"></span><h2 id="fighterPickerTitle">Chọn chiến binh</h2><p id="fighterPickerHint">Chọn chiến binh của bạn để bước vào đấu trường.</p></div><button type="button" id="closeFighterPicker" aria-label="Đóng danh sách chiến binh">ĐÓNG ×</button></header><div class="fighter-picker-body"></div><p class="fighter-picker-foot">7 CHIẾN BINH <span>Chạm để chọn · Esc để quay lại</span></p>';
document.body.append(picker);
const body=picker.querySelector('.fighter-picker-body'),summaries=[],panels=[];let activePlayer=null,returnPlayer=0;
for(let player=0;player<2;player++){
 const select=$('select'+player),field=select.parentElement,grid=field.querySelector('.roster-grid'),selected=previews.find(p=>p.player===player&&p.type===select.value);
 const card=selected.card.cloneNode(true);card.className='fighter-summary';card.id='rosterTrigger'+player;card.removeAttribute('data-roster-type');card.removeAttribute('data-roster-player');card.removeAttribute('aria-pressed');card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-controls','fighterPicker');card.querySelector('.card-check')?.remove();
 const change=document.createElement('span');change.className='fighter-change';change.textContent=player?'ĐỔI ĐỐI THỦ':'ĐỔI CHIẾN BINH';card.append(change);field.append(card);
 grid.className='fighter-picker-grid';grid.setAttribute('aria-label','Danh sách chiến binh');grid.removeAttribute('aria-labelledby');body.append(grid);panels.push(grid);
 summaries.push({card,type:select.value,player,canvas:card.querySelector('canvas'),fighter:makeFighter(select.value,player),painted:false,summary:true});
 card.addEventListener('click',()=>open(player));
}
function sync(){for(const p of previews){const selected=$('select'+p.player).value===p.type;p.card.classList.toggle('selected',selected);p.card.setAttribute('aria-pressed',String(selected));p.card.removeAttribute('aria-expanded');p.card.querySelector('.card-check')?.setAttribute('aria-hidden','true');p.card.setAttribute('aria-label','Chọn '+names[p.type]);p.card.hidden=false;}
 for(let player=0;player<2;player++){panels[player].hidden=activePlayer!==player;const p=summaries[player],type=$('select'+player).value,option=previews.find(v=>v.player===player&&v.type===type);if(p.type!==type){p.type=type;p.fighter=makeFighter(type,player);p.painted=false;}
 p.card.querySelector('.card-name').textContent=names[type];p.card.querySelector('.card-style').textContent=option.card.querySelector('.card-style').textContent;p.card.querySelector('.card-index').textContent=option.card.querySelector('.card-index').textContent;
 p.card.setAttribute('aria-expanded',String(picker.open&&activePlayer===player));p.card.setAttribute('aria-label','Đổi chiến binh '+(player?'đối thủ':'P1')+': '+names[type]);}
 refreshSkins();
}

function refreshSkins(){
 // The menu and online lobby both put the local account in the left seat.
 for(const p of renderPreviews){
  const skin=p.player===0?window.SagaShop?.equippedSkin(p.type):undefined;
  if(p.palette!==skin?.palette){
   p.palette=skin?.palette;
   p.painted=false;
  }
  if(p.summary)p.card.style.setProperty('--fighter-color',skin?.color??colors[p.type]);
 }
}
function restoreFocus(){activePlayer=null;document.body.classList.remove('fighter-picker-open');sync();summaries[returnPlayer].card.focus({preventScroll:true});}
function close(){if(!picker.open)return;picker.close();restoreFocus();}
function editable(player){return window.riftNet?.room?window.riftNet.canEdit(player):phase==='menu';}
function open(player){if(!editable(player))return;activePlayer=returnPlayer=player;$('fighterPickerPlayer').textContent=$('rosterLabel'+player).textContent;sync();picker.showModal();summaries[player].card.setAttribute('aria-expanded','true');document.body.classList.add('fighter-picker-open');previews.find(p=>p.player===player&&p.type===$('select'+player).value)?.card.focus();}
for(const p of previews)p.card.addEventListener('click',()=>{if(!editable(p.player)||activePlayer!==p.player)return;$('select'+p.player).value=p.type;sync();$('select'+p.player).dispatchEvent(new Event('change',{bubbles:true}));close();});
for(const id of ['select0','select1'])$(id).addEventListener('change',()=>{sync();close();});
$('closeFighterPicker').addEventListener('click',close);
picker.addEventListener('cancel',e=>{e.preventDefault();close();});
picker.addEventListener('close',()=>{if(!picker.open)restoreFocus();});
picker.addEventListener('click',e=>{if(e.target!==picker)return;const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
picker.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const list=previews.filter(p=>p.player===activePlayer),index=list.findIndex(p=>p.card===document.activeElement);if(index<0)return;e.preventDefault();const columns=getComputedStyle(panels[activePlayer]).gridTemplateColumns.split(' ').length,delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-columns:columns,next=e.key==='Home'?0:e.key==='End'?list.length-1:(index+delta+list.length)%list.length;list[next].card.focus();});
function draw(p,clock){
 const raw=p.canvas.getContext('2d'),g=p.palette?window.FighterPalette.context(raw,p.palette):raw,f=p.fighter;
 const pixelRatio=p.pixelRatio??1,zoom=p.zoom??1;
 g.clearRect(0,0,p.canvas.width,p.canvas.height);
 g.save();
 g.scale(pixelRatio,pixelRatio);
 // Anchor the closer portrait near the feet to leave room for the full silhouette.
 g.translate(105*(1-zoom),153*(1-zoom));
 g.scale(.58*zoom,.58*zoom);
 f.x=181;f.y=258;f.dir=1;
const pool=g.createRadialGradient(181,237,1,181,237,91);pool.addColorStop(0,colors[p.type]+'30');pool.addColorStop(1,colors[p.type]+'00');g.fillStyle=pool;g.fillRect(85,145,192,125);
if(p.type==='aether')window.AetherVisual.character(g,f,null,clock,()=>258,'high',{preview:true});else if(p.type==='melanta')window.MelantaVisual.character(g,f,f,clock,258);else if(p.type==='fairi')window.FairiVisual.character(g,f,null,clock,{surface:()=>258,viewer:'enemy'});else if(p.type==='mox')window.MoxVisual.character(g,f,f,clock,258,p.palette,p.palette?window.FighterPalette.context(raw,p.palette+'-fx'):raw);
else if(p.type==='soul'){
 if(p.animate){
  const motion=f.soulMotion??={};
  motion.bounce=-1.65*(1-Math.cos(clock*2.5));
  motion.hair=1.7*Math.sin(clock*2.5);
 }
 window.drawSoul(g,f,clock,true);
}
else if(p.type==='cylast')window.CylastVisual.character(g,f,clock,258,{preview:true});
else{window.FighterShadow?.draw(g,f,258,{preview:true});window.ThunderModel.update(f,Math.min(.05,Math.max(0,clock-(p.lastThunderClock??clock))),clock);p.lastThunderClock=clock;window.ThunderModel.draw(g,f,clock,true);}
g.restore();p.painted=true;}
const renderPreviews=[...summaries,...previews];
let last=0;function frame(now){requestAnimationFrame(frame);if(picker.open&&($('menu').hidden||!editable(activePlayer)))close();if(document.hidden||$('menu').hidden||now-last<1000/30)return;last=now;
 for(const p of summaries)p.card.disabled=!editable(p.player);
 for(const p of renderPreviews){if(p.summary?picker.open||(p.player===1&&$('opponentLabel').hidden):!picker.open||p.player!==activePlayer)continue;
 const active=!reducedMotion?.matches&&(p.summary||$('select'+p.player).value===p.type||p.card===document.activeElement||p.card.matches(':hover'));if(active||!p.painted)draw(p,active?now/1000:0);}
 for(const [canvas,portrait] of animatedPortraits){
  if(!canvas.isConnected){
   portraitVisibility.unobserve(canvas);
   animatedPortraits.delete(canvas);
  }else if(portrait.visible&&!reducedMotion?.matches){
   draw(portrait,now/1000);
  }
 }
}
window.SagaRoster={
 refresh:sync,
 refreshSkins,
 portrait(canvas,type,palette,{zoom=1,animate=false}={}){
  if(!names[type])return;
  const p={canvas,type,palette,zoom,animate,pixelRatio:canvas.width/210,player:0,fighter:makeFighter(type,0)};
  draw(p,0);
  if(animate){
   animatedPortraits.set(canvas,p);
   portraitVisibility.observe(canvas);
  }
 }
};
sync();
requestAnimationFrame(frame);
})();
