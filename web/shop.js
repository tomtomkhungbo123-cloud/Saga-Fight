(()=>{
'use strict';

const el=id=>document.getElementById(id);
const dialog=el('shopDialog');
const money=n=>n.toLocaleString('vi-VN')+' Scoin';
const kinds={skin:'Skin',pet:'Linh thú',accessory:'Phụ kiện'};
const shopFighters={all:'Tất cả chiến binh',thunder:'Thunder Stance',soul:'Soulblade',cylast:'Cylast',mox:'Mox',melanta:'Melanta',aether:'Aether',fairi:'Fairi'};
const shopSorts={default:'Mặc định',asc:'Giá: thấp đến cao',desc:'Giá: cao đến thấp'};
const catalog=new Map();
let rules, user=null, account=null, accountGeneration=0, refreshId=0, busyItem='', needsLoad=true;
let view='shop', filter='all', fighterFilter='all', priceSort='default', opener, displayedMatch;
let fighterLoadouts=[{},{}];

function accountBadge(){
 const visible=!!user&&!!account;
 for(const id of ['shopBalance','lobbyScoin','accountScoin']){
  el(id).hidden=!visible;
  if(visible)el(id).textContent=account.unlimited?'∞ Scoin':money(account.balance);
 }
 el('shopLogin').hidden=!!user;
}

function registerCatalog(items){
 for(const item of items){
  catalog.set(item.id,item);
  if(item.palette){
   window.FighterPalette?.register(item.palette,item.hue);
   const effectPalette=item.palette+'-fx';
   window.FighterPalette?.registerEffect(effectPalette,item.color);
   if(item.fighter==='cylast')window.CylastVisual?.warmEffectPalette(effectPalette);
  }
 }
}

async function request(payload){
 const headers=await window.SagaAccount?.headers()||{};
 if(payload)headers['Content-Type']='application/json';
 const response=await fetch('/api/account/shop',{
  cache:'no-store', credentials:'same-origin', headers, signal:AbortSignal.timeout(8000),
  ...(payload?{method:'POST',body:JSON.stringify(payload)}:{})
 });
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Chưa tải được cửa hàng.');
 return data;
}

function status(message){
 el('shopStatus').textContent=message;
}

async function refresh(){
 const version=accountGeneration, id=++refreshId;
 try{
  const data=await request();
  if(version!==accountGeneration||id!==refreshId)return;
  if(user&&!data.account)throw Error('Chưa xác nhận được hòm đồ. Vui lòng thử lại hoặc đăng nhập lại.');
  catalog.clear();
  registerCatalog([...data.catalog,...(data.retired??[])]);
  rules=data.rules;
  if(!busyItem)account=user?data.account:null;
  needsLoad=false;
  setRules();
  accountBadge();
  if(dialog.open)render();
 }catch(error){
  if(version===accountGeneration&&id===refreshId&&dialog.open){
   status(error.message||'Kiểm tra kết nối rồi thử lại.');
   render();
  }
 }
}

function signedIn(email){
 const active=email||null;
 if(active===user)return;
 user=active;
 accountGeneration++;
 account=null;
 busyItem='';
 needsLoad=true;
 accountBadge();
 if(dialog.open){status('');render();}
 void refresh();
}

function setRules(){
 if(!rules)return;
 el('shopRewards').textContent='PvE thắng +'+rules.pve.win+' / thua +'+rules.pve.loss+
  ' · Online thắng +'+rules.online.win+' / thua +'+rules.online.loss+' Scoin';
 el('shopRules').textContent='Thưởng trận hoàn tất từ '+rules.minimumSeconds+
  ' giây khi đã đăng nhập. Online cần hai tài khoản khác nhau và cùng xác nhận kết quả. Vật phẩm chỉ đổi ngoại hình.';
}

function make(tag,className,label){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(label)node.textContent=label;
 return node;
}
function slot(item){return item.kind==='skin'?'skin:'+item.fighter:item.kind;}
function card(item){
 const owned=account?.owned.includes(item.id);
 const equipped=account?.equipped[slot(item)]===item.id;
 const article=make('article','shop-card');
 article.style.setProperty('--item-color',item.color);
 const art=make('div','shop-art');
 const canvas=make('canvas');
 canvas.setAttribute('aria-hidden','true');
 if(item.fighter){
  canvas.width=210;
  canvas.height=160;
  window.SagaRoster?.portrait(canvas,item.fighter,item.palette);
 }else{
  canvas.width=canvas.height=100;
  const sprite=window.SagaShopArt.thumbnail(item);
  if(sprite)canvas.getContext('2d').drawImage(sprite,0,0);
 }
 art.append(canvas,make('span','shop-kind',kinds[item.kind]));
 const footer=make('div','shop-card-copy');
 const name=make('h3','',item.name);
 const text=make('p','',item.description);
 const button=make('button','shop-item-action',equipped?'Tháo vật phẩm':owned?'Trang bị':'Mua · '+money(item.price));
 const action=equipped?'unequip':owned?'equip':'buy';
 button.dataset.item=item.id;
 button.type='button';
 button.disabled=!!busyItem||!account;
 button.setAttribute('aria-label',(equipped?'Tháo ':owned?'Trang bị ':'Mua ')+item.name+(owned?'':' · '+money(item.price)));
 button.addEventListener('click',()=>act(item,action));
 footer.append(name,text,button);
 if(equipped)art.append(make('span','shop-equipped','Đang dùng'));
 article.append(art,footer);
 return article;
}

function render(){
 const grid=el('shopGrid'), active=document.activeElement?.dataset.item;
 const available=[...catalog.values()].filter(item=>view==='shop'?item.forSale!==false:account?.owned.includes(item.id));
 const categories=new Set(available.map(item=>item.kind));
 if(view==='shop'&&filter!=='all'&&!categories.has(filter))filter='all';
 const visible=available.filter(item=>(filter==='all'||item.kind===filter)&&(fighterFilter==='all'||item.kind==='skin'&&item.fighter===fighterFilter));
 if(priceSort!=='default')visible.sort((a,b)=>priceSort==='asc'?a.price-b.price:b.price-a.price);
 el('shopFighterValue').textContent=shopFighters[fighterFilter];
 el('shopSortValue').textContent=shopSorts[priceSort];
 el('shopResultCount').textContent=visible.length+' vật phẩm';
 for(const option of dialog.querySelectorAll('[data-shop-fighter]'))option.setAttribute('aria-pressed',String(option.dataset.shopFighter===fighterFilter));
 for(const option of dialog.querySelectorAll('[data-shop-sort]'))option.setAttribute('aria-pressed',String(option.dataset.shopSort===priceSort));
 grid.replaceChildren(...visible.map(card));
 for(const button of dialog.querySelectorAll('[data-shop-view],[data-shop-filter]')){
  const category=button.dataset.shopFilter;
  if(category)button.hidden=view==='shop'&&category!=='all'&&!categories.has(category);
  button.setAttribute('aria-pressed',String(button.dataset.shopView===view||category===filter));
 }
 el('shopEmpty').hidden=visible.length>0;
 if(!visible.length){
  el('shopEmpty').textContent=needsLoad?'Đang tải vật phẩm…':view==='shop'?'Chưa có vật phẩm trong danh mục này.':
   !user?'Đăng nhập để xem túi đồ.':'Túi đồ chưa có vật phẩm trong danh mục này.';
  if(!needsLoad&&fighterFilter!=='all'&&(view==='shop'||user))el('shopEmpty').textContent=(view==='shop'?'Chưa có skin của ':'Túi đồ chưa có skin của ')+shopFighters[fighterFilter]+'. Thử chọn chiến binh khác hoặc Tất cả chiến binh.';
 }
 if(active)grid.querySelector('button[data-item="'+active+'"]:not(:disabled)')?.focus({preventScroll:true});
}

async function act(item,action){
 if(!account||busyItem)return;
 if(action==='buy'&&!account.unlimited&&account.balance<item.price){
  status('Bạn cần thêm '+money(item.price-account.balance)+' để mua '+item.name+'.');
  return;
 }
 const version=accountGeneration;
 busyItem=item.id;
 refreshId++;
 render();
 try{
  const data=await request({itemId:item.id,action});
  if(version!==accountGeneration)return;
  account=data.account;
  accountBadge();
  status((action==='buy'?'Đã mua ':action==='equip'?'Đã trang bị ':'Đã tháo ')+item.name+'.');
 }catch(error){
  if(version!==accountGeneration)return;
  status(error.message||'Chưa lưu được thao tác.');
  needsLoad=true;
 }finally{
  if(version===accountGeneration){
   busyItem='';
   render();
   dialog.querySelector('button[data-item="'+item.id+'"]')?.focus({preventScroll:true});
   if(needsLoad)void refresh();
  }
 }
}

function open(tab='shop'){
 if(window.riftGame.getPhase()!=='menu'||window.riftNet?.room)return;
 opener=document.activeElement;
 window.SagaAccount?.close();
 view=tab;
 filter=fighterFilter==='all'?'all':'skin';
 closeShopFilters();
 status('');
 accountBadge();
 render();
 if(!dialog.open)dialog.showModal();
 el('closeShop').focus();
 void refresh();
}

function closeShopFilters(){for(const dropdown of dialog.querySelectorAll('.shop-dropdown'))dropdown.open=false;}
for(const dropdown of dialog.querySelectorAll('.shop-dropdown')){
 dropdown.addEventListener('toggle',()=>{if(dropdown.open)for(const other of dialog.querySelectorAll('.shop-dropdown'))if(other!==dropdown)other.open=false;});
 dropdown.addEventListener('keydown',event=>{if(event.key==='Escape'&&dropdown.open){event.preventDefault();event.stopPropagation();dropdown.open=false;dropdown.querySelector('summary').focus();}});
}
el('shopOpen').addEventListener('click',()=>open());
el('openAccountInventory').addEventListener('click',()=>open('inventory'));
el('shopLogin').addEventListener('click',()=>{
 dialog.close();
 window.SagaAccount?.open('login');
});
el('closeShop').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
 closeShopFilters();
 if(!el('accountDialog').open&&window.riftGame.getPhase()==='menu'){
  (opener?.getClientRects().length?opener:el('shopOpen')).focus({preventScroll:true});
 }
});
dialog.addEventListener('click',event=>{
 if(event.target===dialog){
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  return;
 }
 if(!event.target.closest('.shop-dropdown'))closeShopFilters();
 const button=event.target.closest('[data-shop-view],[data-shop-filter],[data-shop-fighter],[data-shop-sort]');
 if(!button)return;
 if(button.dataset.shopView){view=button.dataset.shopView;filter=fighterFilter==='all'?'all':'skin';}
 else if(button.dataset.shopFighter){fighterFilter=button.dataset.shopFighter;if(fighterFilter!=='all')filter='skin';}
 else if(button.dataset.shopSort)priceSort=button.dataset.shopSort;
 else {filter=button.dataset.shopFilter;if(filter!=='skin')fighterFilter='all';}
 const dropdown=button.closest('.shop-dropdown');
 closeShopFilters();
 if(dropdown)dropdown.querySelector('summary').focus({preventScroll:true});
 status('');
 render();
});

function start(mode,roomLoadouts){
 if(dialog.open)dialog.close();
 fighterLoadouts=mode==='online'&&Array.isArray(roomLoadouts)?roomLoadouts:[account?.equipped||{},{}];
 matchState(null);
}
function matchState(id){
 displayedMatch=id;
 el('matchScoin').hidden=true;
 el('matchScoin').textContent='';
}
function matchReward(id,amount,message){
 if(amount&&user)void refresh();
 if(id!==displayedMatch)return;
 const output=el('matchScoin');
 output.textContent=amount?'+'+money(amount):message||'';
 output.hidden=!output.textContent;
}
function skin(fighter){
 return catalog.get(fighterLoadouts[fighter.id]?.['skin:'+fighter.type])?.palette;
}
function decor(g,fighter,time){
 const loadout=fighterLoadouts[fighter.id];
 if(!loadout||fighter.hp<=0||fighter.fairi?.stealth>0)return;
 const pet=catalog.get(loadout.pet),accessory=catalog.get(loadout.accessory);
 const side=fighter.dir||1, bob=Math.sin(4*time+fighter.id*2);
 if(pet)window.SagaShopArt.draw(g,pet,fighter.x-side*87,fighter.y-112+bob*6,side,55);
 if(accessory)window.SagaShopArt.draw(g,accessory,fighter.x+side*31,fighter.y-165+bob*2,side,30);
}
window.SagaShop={refresh,signedIn,start,matchState,matchReward,skin,decor};
accountBadge();
void refresh();
})();
