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
let inventoryKind='skin', selectedInventoryItem='';
const compactLayout=window.matchMedia('(max-width:540px), (orientation:landscape) and (max-height:500px)');
const itemPages={shop:0,inventory:0};
const inventoryFighter=el('inventoryFighter');
const inventorySlots=dialog.querySelectorAll('[data-inventory-kind]');
const inventoryFilters=dialog.querySelectorAll('[data-inventory-filter]');
for(const [fighter,name] of Object.entries(shopFighters)){
 if(fighter==='all')continue;
 const option=new Option(name,fighter);
 inventoryFighter.add(option);
}

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
 selectedInventoryItem='';
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
 const rewards='PvE thắng +'+rules.pve.win+' / thua +'+rules.pve.loss+
  ' · Online thắng +'+rules.online.win+' / thua +'+rules.online.loss+' Scoin';
 const detail='Thưởng trận hoàn tất từ '+rules.minimumSeconds+
  ' giây khi đã đăng nhập. Online cần hai tài khoản khác nhau và cùng xác nhận kết quả. Vật phẩm chỉ đổi ngoại hình.';
 el('shopRewards').textContent=el('shopCompactRewards').textContent=rewards;
 el('shopRules').textContent=el('shopCompactRules').textContent=detail;
}

function make(tag,className,label){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(label)node.textContent=label;
 return node;
}
function slot(item){return item.kind==='skin'?'skin:'+item.fighter:item.kind;}
function itemArt(item,{scale=1,zoom=1,animate=false}={}){
 const canvas=make('canvas');
 canvas.setAttribute('aria-hidden','true');
 if(item.fighter){
  canvas.width=210*scale;
  canvas.height=160*scale;
  window.SagaRoster?.portrait(canvas,item.fighter,item.palette,{zoom,animate});
 }else{
  canvas.width=canvas.height=100;
  const sprite=window.SagaShopArt.thumbnail(item);
  if(sprite)canvas.getContext('2d').drawImage(sprite,0,0);
 }
 return canvas;
}
function card(item){
 const owned=account?.owned.includes(item.id);
 const equipped=account?.equipped[slot(item)]===item.id;
 const article=make('article','shop-card');
 article.style.setProperty('--item-color',item.color);
 const art=make('div','shop-art');
 art.append(itemArt(item),make('span','shop-kind',kinds[item.kind]));
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

function inventoryCard(item,selected){
 const button=make('button','inventory-item');
 button.type='button';
 button.dataset.item=item.id;
 button.setAttribute('aria-pressed',String(selected));
 button.style.setProperty('--item-color',item.color);
 button.append(itemArt(item,{scale:2,animate:true}),make('strong','',item.name));
 if(account.equipped[slot(item)]===item.id)button.append(make('span','inventory-equipped','Đang dùng'));
 button.addEventListener('click',()=>{
  selectedInventoryItem=item.id;
  renderInventory();
 });
 return button;
}

function pageItems(kind,items,pageSize){
 const controls=el(kind+'Pagination');
 const count=compactLayout.matches?Math.ceil(items.length/pageSize):1;
 controls.hidden=count<=1;
 itemPages[kind]=Math.max(0,Math.min(itemPages[kind],count-1));
 if(!compactLayout.matches)return items;
 const page=itemPages[kind];
 if(count>1){
  const [previous,next]=controls.querySelectorAll('button');
  controls.querySelector('span').textContent=(page+1)+' / '+count;
  previous.disabled=page===0;
  next.disabled=page===count-1;
 }
 return items.slice(page*pageSize,(page+1)*pageSize);
}

compactLayout.addEventListener('change',()=>{if(dialog.open)render();});

for(const kind of ['shop','inventory']){
 el(kind+'Pagination').addEventListener('click',event=>{
  const button=event.target.closest('[data-shop-page]');
  if(!button)return;
  itemPages[kind]+=Number(button.dataset.shopPage);
  status('');
  render();
  if(button.disabled)el(kind+'Pagination').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 });
}

function renderInventory(){
 const fighter=inventoryFighter.value;
 for(const button of inventoryFilters){
  button.setAttribute('aria-pressed',String(button.dataset.inventoryFilter===inventoryKind));
 }
 for(const button of inventorySlots){
  const kind=button.dataset.inventoryKind;
  const key=kind==='skin'?'skin:'+fighter:kind;
  const item=catalog.get(account?.equipped[key]);
  const art=make('span','inventory-slot-art');
  if(kind==='skin')art.append(itemArt(item||{fighter},{scale:3,zoom:1.24,animate:true}));
  else if(item)art.append(itemArt(item));
  else {
   art.classList.add('inventory-slot-placeholder');
   art.append(itemArt({art:kind==='pet'?'fox':'moon'}));
  }
  button.style.setProperty('--item-color',item?.color||'#b19acf');
  button.setAttribute('aria-pressed',String(kind===inventoryKind));
  button.replaceChildren(art,make('strong','inventory-slot-label',kinds[kind]),
   make('span',item?'inventory-slot-name':'inventory-slot-caption',item?.name||(kind==='skin'?'Mặc định':'Chưa trang bị')));
  if(item)button.append(make('span','inventory-equipped','Đang dùng'));
 }
 const items=[...catalog.values()].filter(item=>account?.owned.includes(item.id)&&item.kind===inventoryKind&&
  (item.kind!=='skin'||item.fighter===fighter));
 const visible=pageItems('inventory',items,2);
 const selected=visible.find(item=>item.id===selectedInventoryItem);
 if(!selected)selectedInventoryItem='';
 const list=el('inventoryItems'), active=document.activeElement?.dataset.item;
 list.replaceChildren(...visible.map(item=>inventoryCard(item,item===selected)));
 if(active)list.querySelector('button[data-item="'+active+'"]')?.focus({preventScroll:true});
 const empty=el('inventoryEmpty');
 empty.hidden=items.length>0;
 if(!items.length){
  empty.textContent=!user?'Đăng nhập để xem đồ đã sở hữu.':needsLoad?'Đang tải kho đồ…':
   inventoryKind==='skin'?'Bạn chưa sở hữu skin của '+shopFighters[fighter]+'.':'Bạn chưa sở hữu '+kinds[inventoryKind].toLocaleLowerCase('vi')+'.';
 }
 const action=el('inventoryAction');
 const equipped=selected&&account.equipped[slot(selected)]===selected.id;
 action.hidden=!selected;
 action.disabled=!!busyItem;
 action.textContent=equipped?'Tháo vật phẩm':'Trang bị';
 action.onclick=selected?()=>act(selected,equipped?'unequip':'equip'):null;
}

function render(){
 const inventory=view==='inventory';
 dialog.dataset.view=view;
 el('shopTitle').textContent=inventory?'Kho đồ':'Cửa hàng';
 el('inventoryToolbar').hidden=!inventory;
 el('shopInventory').hidden=!inventory;
 el('shopGrid').hidden=inventory;
 for(const button of dialog.querySelectorAll('[data-shop-view]')){
  button.setAttribute('aria-pressed',String(button.dataset.shopView===view));
 }
 if(inventory){
  el('shopPagination').hidden=true;
  el('shopEmpty').hidden=true;
  renderInventory();
  return;
 }
 const grid=el('shopGrid'), active=document.activeElement?.dataset.item;
 const available=[...catalog.values()].filter(item=>item.forSale!==false);
 const categories=new Set(available.map(item=>item.kind));
 dialog.dataset.singleKind=String(categories.size<=1);
 if(filter!=='all'&&!categories.has(filter))filter='all';
 const visible=available.filter(item=>(filter==='all'||item.kind===filter)&&(fighterFilter==='all'||item.kind==='skin'&&item.fighter===fighterFilter));
 if(priceSort!=='default')visible.sort((a,b)=>priceSort==='asc'?a.price-b.price:b.price-a.price);
 el('shopFighterValue').textContent=shopFighters[fighterFilter];
 el('shopSortValue').textContent=shopSorts[priceSort];
 el('shopResultCount').textContent=visible.length+' vật phẩm';
 for(const option of dialog.querySelectorAll('[data-shop-fighter]'))option.setAttribute('aria-pressed',String(option.dataset.shopFighter===fighterFilter));
 for(const option of dialog.querySelectorAll('[data-shop-sort]'))option.setAttribute('aria-pressed',String(option.dataset.shopSort===priceSort));
 grid.replaceChildren(...pageItems('shop',visible,4).map(card));
 for(const button of dialog.querySelectorAll('[data-shop-filter]')){
  const category=button.dataset.shopFilter;
  button.hidden=category!=='all'&&!categories.has(category);
  button.setAttribute('aria-pressed',String(category===filter));
 }
 el('shopEmpty').hidden=visible.length>0;
 if(!visible.length){
  el('shopEmpty').textContent=needsLoad?'Đang tải vật phẩm…':fighterFilter==='all'?'Chưa có vật phẩm trong danh mục này.':
   'Chưa có skin của '+shopFighters[fighterFilter]+'. Thử chọn chiến binh khác hoặc Tất cả chiến binh.';
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
   const items=el(view==='inventory'?'inventoryItems':'shopGrid');
   items.querySelector('button[data-item="'+item.id+'"]')?.focus({preventScroll:true});
   if(needsLoad)void refresh();
  }
 }
}

function open(tab='shop'){
 if(window.riftGame.getPhase()!=='menu'||window.riftNet?.room)return;
 opener=document.activeElement;
 window.SagaAccount?.close();
 view=tab;
 inventoryFighter.value=el('select0').value;
 inventoryKind='skin';
 selectedInventoryItem='';
 itemPages.shop=itemPages.inventory=0;
 filter=fighterFilter==='all'?'all':'skin';
 closeShopFilters();
 status('');
 accountBadge();
 render();
 if(!dialog.open)dialog.showModal();
 el('shopContent').scrollTop=0;
 el('closeShop').focus();
 void refresh();
}

function closeShopFilters(){for(const dropdown of dialog.querySelectorAll('.shop-dropdown'))dropdown.open=false;}
for(const dropdown of dialog.querySelectorAll('.shop-dropdown')){
 dropdown.addEventListener('toggle',()=>{if(dropdown.open)for(const other of dialog.querySelectorAll('.shop-dropdown'))if(other!==dropdown)other.open=false;});
 dropdown.addEventListener('keydown',event=>{if(event.key==='Escape'&&dropdown.open){event.preventDefault();event.stopPropagation();dropdown.open=false;dropdown.querySelector('summary').focus();}});
}
inventoryFighter.addEventListener('change',()=>{
 inventoryKind='skin';
 itemPages.inventory=0;
 selectedInventoryItem='';
 status('');
 renderInventory();
});
for(const button of [...inventorySlots,...inventoryFilters]){
 button.addEventListener('click',()=>{
  const kind=button.dataset.inventoryFilter||button.dataset.inventoryKind;
  if(kind===inventoryKind)return;
  inventoryKind=kind;
  itemPages.inventory=0;
  selectedInventoryItem='';
  status('');
  renderInventory();
 });
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
 if(button.dataset.shopView){
  if(view!==button.dataset.shopView)el('shopContent').scrollTop=0;
  view=button.dataset.shopView;
  filter=fighterFilter==='all'?'all':'skin';
 }
 else if(button.dataset.shopFighter){fighterFilter=button.dataset.shopFighter;if(fighterFilter!=='all')filter='skin';}
 else if(button.dataset.shopSort)priceSort=button.dataset.shopSort;
 else {filter=button.dataset.shopFilter;if(filter!=='skin')fighterFilter='all';}
 if(!button.dataset.shopView)itemPages.shop=0;
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
