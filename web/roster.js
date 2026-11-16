// Small previews share the live character art; only selected cards animate (30Hz).
(()=>{
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
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
 const change=document.createElement('span');change.className='fighter-change';change.textContent='ĐỔI CHIẾN BINH ↗';card.append(change);field.append(card);
 grid.className='fighter-picker-grid';grid.setAttribute('aria-label','Danh sách chiến binh');grid.removeAttribute('aria-labelledby');body.append(grid);panels.push(grid);
 summaries.push({card,type:select.value,player,canvas:card.querySelector('canvas'),fighter:makeFighter(select.value,player),painted:false,summary:true});
 card.addEventListener('click',()=>open(player));
}
function sync(){for(const p of previews){const selected=$('select'+p.player).value===p.type;p.card.classList.toggle('selected',selected);p.card.setAttribute('aria-pressed',String(selected));p.card.removeAttribute('aria-expanded');p.card.querySelector('.card-check')?.setAttribute('aria-hidden','true');p.card.setAttribute('aria-label','Chọn '+names[p.type]);p.card.hidden=false;}
 for(let player=0;player<2;player++){panels[player].hidden=activePlayer!==player;const p=summaries[player],type=$('select'+player).value,option=previews.find(v=>v.player===player&&v.type===type);if(p.type!==type){p.type=type;p.fighter=makeFighter(type,player);p.painted=false;}
 p.card.style.setProperty('--fighter-color',colors[type]);p.card.querySelector('.card-name').textContent=names[type];p.card.querySelector('.card-style').textContent=option.card.querySelector('.card-style').textContent;p.card.querySelector('.card-index').textContent=option.card.querySelector('.card-index').textContent;
 p.card.setAttribute('aria-expanded',String(picker.open&&activePlayer===player));p.card.setAttribute('aria-label','Đổi chiến binh '+(player?'đối thủ':'P1')+': '+names[type]);}
}
function restoreFocus(){activePlayer=null;document.body.classList.remove('fighter-picker-open');sync();summaries[returnPlayer].card.focus();}
function close(){if(!picker.open)return;picker.close();restoreFocus();}
function open(player){if(phase!=='menu'||window.riftNet?.room)return;activePlayer=returnPlayer=player;$('fighterPickerPlayer').textContent=$('rosterLabel'+player).textContent;sync();picker.showModal();summaries[player].card.setAttribute('aria-expanded','true');document.body.classList.add('fighter-picker-open');previews.find(p=>p.player===player&&p.type===$('select'+player).value)?.card.focus();}
for(const p of previews)p.card.addEventListener('click',()=>{if(phase!=='menu'||window.riftNet?.room||activePlayer!==p.player)return;$('select'+p.player).value=p.type;sync();$('select'+p.player).dispatchEvent(new Event('change',{bubbles:true}));close();});
for(const id of ['select0','select1'])$(id).addEventListener('change',()=>{sync();close();});
$('closeFighterPicker').addEventListener('click',close);
picker.addEventListener('cancel',e=>{e.preventDefault();close();});
picker.addEventListener('close',()=>{if(!picker.open)restoreFocus();});
picker.addEventListener('click',e=>{if(e.target!==picker)return;const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
picker.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const list=previews.filter(p=>p.player===activePlayer),index=list.findIndex(p=>p.card===document.activeElement);if(index<0)return;e.preventDefault();const columns=getComputedStyle(panels[activePlayer]).gridTemplateColumns.split(' ').length,delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-columns:columns,next=e.key==='Home'?0:e.key==='End'?list.length-1:(index+delta+list.length)%list.length;list[next].card.focus();});
function draw(p,clock){const g=p.canvas.getContext('2d'),f=p.fighter;g.clearRect(0,0,210,160);g.save();g.scale(.58,.58);f.x=181;f.y=258;f.dir=1;
const pool=g.createRadialGradient(181,237,1,181,237,91);pool.addColorStop(0,colors[p.type]+'30');pool.addColorStop(1,colors[p.type]+'00');g.fillStyle=pool;g.fillRect(85,145,192,125);
if(p.type==='aether')window.AetherVisual.character(g,f,null,clock,()=>258,'high');else if(p.type==='melanta')window.MelantaVisual.character(g,f,f,clock,258);else if(p.type==='fairi')window.FairiVisual.character(g,f,null,clock,{surface:()=>258,viewer:'enemy'});else if(p.type==='mox')window.MoxVisual.character(g,f,f,clock,258);
else if(p.type==='soul')window.drawSoul(g,f,clock,true);
else if(p.type==='cylast')window.CylastVisual.character(g,f,clock);
else{const image=art.idle;if(!image.complete||!image.naturalWidth){g.restore();return;}if(image.complete&&image.naturalWidth){const height=220,width=height*image.naturalWidth/image.naturalHeight,bob=Math.sin(clock*2.8)*3,top=246+bob-height,seam=.42;g.save();g.translate(181,0);g.drawImage(image,0,0,image.naturalWidth,image.naturalHeight*seam+1,-width/2,top,width,height*seam+.5);g.translate(0,top+height*seam);g.transform(1,0,Math.sin(clock*2.5)*1.2/(height*(1-seam)),1,0,0);g.drawImage(image,0,image.naturalHeight*seam,image.naturalWidth,image.naturalHeight*(1-seam),-width/2,0,width,height*(1-seam)+.5);g.restore();const x=238,y=61+bob,halo=g.createRadialGradient(x,y,1,x,y,25);halo.addColorStop(0,'#fffbc7dd');halo.addColorStop(.35,'#fff36c77');halo.addColorStop(1,'#fff36c00');g.fillStyle=halo;g.fillRect(x-25,y-25,50,50);}}
g.restore();p.painted=true;}
const renderPreviews=[...summaries,...previews];
let last=0;function frame(now){requestAnimationFrame(frame);const locked=!!window.riftNet?.room;if(picker.open&&(phase!=='menu'||$('menu').hidden||locked))close();if(document.hidden||$('menu').hidden||now-last<1000/30)return;last=now;
 for(const p of summaries)if(p.card.disabled!==locked)p.card.disabled=locked;
 for(const p of renderPreviews){if(p.summary?picker.open||(p.player===1&&$('opponentLabel').hidden):!picker.open||p.player!==activePlayer)continue;
 const active=!reducedMotion?.matches&&(p.summary||$('select'+p.player).value===p.type||p.card===document.activeElement||p.card.matches(':hover'));if(active||!p.painted)draw(p,active?now/1000:0);}
}
sync();requestAnimationFrame(frame);
})();
