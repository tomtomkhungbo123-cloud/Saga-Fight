const shopCatalog = [
 {id:'thunder-jade', kind:'skin', fighter:'thunder', name:'Lôi Ảnh Ngọc', description:'Lôi y ánh ngọc của Thunder Stance.', price:180, color:'#65e7ce', palette:'jade', hue:113},
 {id:'thunder-crimson', kind:'skin', fighter:'thunder', name:'Thunder Stance - Sét tử linh', description:'Lôi y đỏ thẫm với ánh điện đỏ quanh chiến binh.', price:240, color:'#bd3249', palette:'thunder-crimson', hue:310},
 {id:'soul-amethyst', kind:'skin', fighter:'soul', name:'Tử Tinh Kiếm', description:'Giáp tím và lưỡi kiếm ánh tử tinh của Soulblade.', price:220, color:'#c794ff', palette:'amethyst', hue:308},
 {id:'cylast-gold', kind:'skin', fighter:'cylast', name:'Kim Sương', description:'Áo băng sắc vàng hổ phách của Cylast.', price:240, color:'#ffc77b', palette:'amber', hue:203},
 {id:'ember-fox', forSale:false, kind:'pet', name:'Cáo Hỏa Linh', description:'Cáo nhỏ đuôi lửa bay theo chiến binh.', price:280, color:'#ff9657', art:'fox'},
 {id:'frost-owl', forSale:false, kind:'pet', name:'Cú Sương', description:'Linh cú xanh băng bay theo chiến binh.', price:300, color:'#80e2ff', art:'owl'},
 {id:'jade-familiar', forSale:false, kind:'pet', name:'Ngọc Long', description:'Rồng ngọc tí hon bay theo chiến binh.', price:360, color:'#84ecc0', art:'dragon'},
 {id:'dawn-sigil', forSale:false, kind:'accessory', name:'Ấn Bình Minh', description:'Huy hiệu vàng lơ lửng cạnh vai.', price:120, color:'#ffd57e', art:'sun'},
 {id:'moon-sigil', forSale:false, kind:'accessory', name:'Ấn Nguyệt Thực', description:'Huy hiệu trăng tím lơ lửng cạnh vai.', price:140, color:'#d5a5ff', art:'moon'},
 {id:'rime-sigil', forSale:false, kind:'accessory', name:'Trâm Băng Tinh', description:'Trâm pha lê xanh lơ lửng cạnh vai.', price:150, color:'#a3efff', art:'crystal'}
];
const shopById = new Map(shopCatalog.map(item => [item.id,item]));
const shopSlot = item => item.kind==='skin' ? 'skin:'+item.fighter : item.kind;
const scoinRules = {pve:{win:40,loss:15},online:{win:70,loss:25},minimumSeconds:15};
const balanceSQL = 'SELECT COALESCE(SUM(amount),0) FROM scoin_ledger WHERE user_id=?';

export function shopOffer() {
 return {
  catalog:shopCatalog.filter(item=>item.forSale!==false),
  retired:shopCatalog.filter(item=>item.forSale===false),
  rules:scoinRules
 };
}

function cosmeticsFor(rows,id) {
 return Object.fromEntries(rows.filter(row=>row.user_id===id && shopById.has(row.item_id))
  .map(row=>[row.slot,row.item_id]));
}

export async function shopLoadouts(DB,ids) {
 if(DB.inventory?.mode==='supabase')return Promise.all(ids.map(async id=>id?(await DB.inventory.sync(id)).equipped:{}));
 const rows = (await DB.prepare('SELECT user_id,slot,item_id FROM cosmetic_loadouts WHERE user_id IN (?,?)')
  .bind(ids[0],ids[1]).all()).results;
 return ids.map(id=>cosmeticsFor(rows,id));
}

export async function shopAccount(DB,id,admin=false) {
 if(DB.inventory?.mode==='supabase'){const state=await DB.inventory.sync(id);return {...state,balance:admin?null:state.balance,unlimited:admin};}
 const state = await DB.prepare(`SELECT (${balanceSQL}) AS balance,
  (SELECT json_group_array(item_id) FROM (SELECT source_id item_id FROM scoin_ledger WHERE user_id=? AND kind='purchase' UNION SELECT item_id FROM cosmetic_inventory WHERE user_id=?)) AS owned,
  (SELECT json_group_object(slot,item_id) FROM cosmetic_loadouts WHERE user_id=?) AS equipped`).bind(id,id,id,id).first();
 return {balance:admin?null:state.balance,unlimited:admin,owned:JSON.parse(state.owned),equipped:JSON.parse(state.equipped)};
}

export async function mutateShop(DB,id,data,now,admin=false) {
 const item = shopById.get(data.itemId);
 if(!item)return {status:404,error:'Không tìm thấy vật phẩm.'};
 const slot = shopSlot(item);
 if(DB.inventory){
  if(DB.inventory.mode==='migrating')return {status:503,error:'Đang chuyển hòm đồ sang Supabase. Vui lòng thử lại sau ít phút.'};
  if(!['buy','equip','unequip'].includes(data.action))return {status:400,error:'Thao tác không hợp lệ.'};
  if(data.action==='buy'&&item.forSale===false)return {status:409,error:'Vật phẩm này đang tạm ngừng bán.'};
  const state=await DB.inventory.mutate(id,item,data.action,now,admin);
  return state.error?state:{account:{...state,balance:admin?null:state.balance,unlimited:admin}};
 }
 if(data.action==='buy') {
  if(item.forSale===false)return {status:409,error:'Vật phẩm này đang tạm ngừng bán.'};
  const owned=await DB.prepare("SELECT 1 owned FROM scoin_ledger WHERE user_id=? AND kind='purchase' AND source_id=? UNION ALL SELECT 1 FROM cosmetic_inventory WHERE user_id=? AND item_id=? LIMIT 1").bind(id,item.id,id,item.id).first();
  if(owned)return {account:await shopAccount(DB,id,admin)};
  if(admin){
   await DB.prepare("INSERT OR IGNORE INTO cosmetic_inventory(user_id,item_id,source,created_at) VALUES(?,?,'admin',?)").bind(id,item.id,now).run();
  }else{
  // One write checks the current balance and records ownership and cost together.
  const purchase = await DB.prepare(`INSERT OR IGNORE INTO scoin_ledger(user_id,kind,source_id,amount,created_at)
   SELECT ?,'purchase',?, ?,? WHERE (${balanceSQL})>=? AND NOT EXISTS(SELECT 1 FROM cosmetic_inventory WHERE user_id=? AND item_id=?)`)
   .bind(id,item.id,-item.price,now,id,item.price,id,item.id).run();
  if(!purchase.meta.changes) {
   const prior = await DB.prepare("SELECT 1 AS owned FROM scoin_ledger WHERE user_id=? AND kind='purchase' AND source_id=? UNION ALL SELECT 1 owned FROM cosmetic_inventory WHERE user_id=? AND item_id=?").bind(id,item.id,id,item.id).first();
   if(!prior)return {status:409,error:'Bạn chưa đủ Scoin.'};
  }
  }
 } else if(data.action==='equip') {
  const equipped = await DB.prepare(`INSERT INTO cosmetic_loadouts(user_id,slot,item_id)
   SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM scoin_ledger WHERE user_id=? AND kind='purchase' AND source_id=? UNION ALL SELECT 1 FROM cosmetic_inventory WHERE user_id=? AND item_id=?)
   ON CONFLICT(user_id,slot) DO UPDATE SET item_id=excluded.item_id`)
   .bind(id,slot,item.id,id,item.id,id,item.id).run();
  if(!equipped.meta.changes)return {status:403,error:'Bạn chưa sở hữu vật phẩm này.'};
 } else if(data.action==='unequip') {
  await DB.prepare('DELETE FROM cosmetic_loadouts WHERE user_id=? AND slot=? AND item_id=?').bind(id,slot,item.id).run();
 } else {
  return {status:400,error:'Thao tác không hợp lệ.'};
 }
 return {account:await shopAccount(DB,id,admin)};
}

export async function savePveScoin(DB,id,winner,now) {
 const write = DB.prepare('UPDATE game_matches SET winner=?,finished_at=? WHERE id=? AND winner IS NULL').bind(winner,now,id);
 const award = DB.prepare(`INSERT OR IGNORE INTO scoin_ledger(user_id,kind,source_id,amount,created_at)
  SELECT host_user_id,'pve',id,CASE winner WHEN 0 THEN ? ELSE ? END,finished_at FROM game_matches
  WHERE id=? AND winner=? AND finished_at=? AND finished_at-created_at>=?
    AND NOT EXISTS(SELECT 1 FROM scoin_ledger AS recent WHERE recent.user_id=game_matches.host_user_id
     AND recent.kind='pve' AND recent.created_at>game_matches.finished_at-?)`)
  .bind(scoinRules.pve.win,scoinRules.pve.loss,id,winner,now,scoinRules.minimumSeconds*1000,scoinRules.minimumSeconds*1000);
 await DB.batch([write,award]);
 if(DB.inventory?.mode==='supabase'){const match=await DB.prepare('SELECT host_user_id FROM game_matches WHERE id=?').bind(id).first();if(match?.host_user_id)await DB.inventory.sync(match.host_user_id);}
}

export async function saveOnlineScoin(DB,match,player,winner,now) {
 const readMatch = 'SELECT winner FROM game_matches WHERE id=?';
 const report = DB.prepare('INSERT OR IGNORE INTO online_score_reports(match_id,player,winner) VALUES(?,?,?)').bind(match.id,player,winner);
 const agree = `EXISTS(SELECT 1 FROM online_score_reports a JOIN online_score_reports b ON a.match_id=b.match_id
  WHERE a.match_id=game_matches.id AND a.player=0 AND b.player=1 AND a.winner=game_matches.winner AND b.winner=a.winner)`;
 const statements = [report];
 if(player===0)statements.push(DB.prepare('UPDATE game_matches SET winner=?,finished_at=? WHERE id=? AND winner IS NULL').bind(winner,now,match.id));
 statements.push(DB.prepare(`INSERT OR IGNORE INTO scoin_ledger(user_id,kind,source_id,amount,created_at)
  SELECT host_user_id,'online',id,CASE winner WHEN 0 THEN ? ELSE ? END,? FROM game_matches
   WHERE id=? AND host_user_id IS NOT NULL AND guest_user_id IS NOT NULL AND host_user_id<>guest_user_id
     AND finished_at-created_at>=? AND ${agree}
  UNION ALL
  SELECT guest_user_id,'online',id,CASE winner WHEN 1 THEN ? ELSE ? END,? FROM game_matches
   WHERE id=? AND host_user_id IS NOT NULL AND guest_user_id IS NOT NULL AND host_user_id<>guest_user_id
     AND finished_at-created_at>=? AND ${agree}`)
  .bind(scoinRules.online.win,scoinRules.online.loss,now,match.id,scoinRules.minimumSeconds*1000,
   scoinRules.online.win,scoinRules.online.loss,now,match.id,scoinRules.minimumSeconds*1000));
 await DB.batch(statements);
 if(DB.inventory?.mode==='supabase')for(const user of new Set([match.host_user_id,match.guest_user_id].filter(Boolean)))await DB.inventory.sync(user);
 const settled = await DB.prepare(readMatch).bind(match.id).first();
 const reports = (await DB.prepare('SELECT player,winner FROM online_score_reports WHERE match_id=?').bind(match.id).all()).results;
 return {pending:reports.length<2,conflict:reports.some(value=>value.player===player && value.winner!==winner)
  || reports.length===2 && reports.some(value=>value.winner!==settled.winner)};
}

export async function matchScoin(DB,id,user,kind) {
 if(!user)return 0;
 const row = await DB.prepare('SELECT amount FROM scoin_ledger WHERE user_id=? AND kind=? AND source_id=?').bind(user,kind,id).first();
 return row?.amount??0;
}
