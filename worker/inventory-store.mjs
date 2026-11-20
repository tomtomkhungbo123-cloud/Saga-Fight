// Secrets stay in server runtime variables. No browser inventory is authoritative.
export async function inventoryRpc(env,action,data){
 if(!env.SAGA_INVENTORY_KEY||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw Error('Inventory backend is not configured');
 const response=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/saga_inventory_rpc',{
  method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000),
  body:JSON.stringify({p_key:env.SAGA_INVENTORY_KEY,p_action:action,p_data:data})
 });
 if(!response.ok)throw Error('Inventory backend unavailable ('+response.status+')');
 return response.json();
}
export async function inventorySnapshot(DB,user){
 const row=await DB.prepare(`SELECT
  (SELECT COALESCE(SUM(amount),0) FROM scoin_ledger WHERE user_id=?) balance,
  (SELECT json_group_array(item_id) FROM (SELECT source_id item_id FROM scoin_ledger WHERE user_id=? AND kind='purchase' UNION SELECT item_id FROM cosmetic_inventory WHERE user_id=?)) owned,
  (SELECT json_group_object(slot,item_id) FROM cosmetic_loadouts WHERE user_id=?) equipped,
  (SELECT json_group_array(json_object('kind',kind,'source_id',source_id,'amount',amount,'created_at',created_at)) FROM scoin_ledger WHERE user_id=?) ledger`).bind(user,user,user,user,user).first();
 return {balance:row.balance,owned:JSON.parse(row.owned),equipped:JSON.parse(row.equipped),ledger:JSON.parse(row.ledger)};
}
export function inventoryClient(env,DB){
 const rpc=(action,user,data={})=>inventoryRpc(env,action,{user,...data});
 async function sync(user,mutation){
  let state;
  if(!await DB.prepare('SELECT 1 ready FROM supabase_inventory_imports WHERE user_id=?').bind(user).first())await rpc('bootstrap',user,{snapshot:await inventorySnapshot(DB,user)});
  // D1 ledger is a durable reward outbox. Remote event keys make all retries idempotent.
  for(let batch=0;batch<20;batch++){
   const events=(await DB.prepare(`SELECT l.kind,l.source_id,l.amount,l.created_at FROM scoin_ledger l
    LEFT JOIN supabase_inventory_synced s ON s.user_id=l.user_id AND s.kind=l.kind AND s.source_id=l.source_id
    WHERE l.user_id=? AND s.user_id IS NULL ORDER BY l.created_at,l.kind,l.source_id LIMIT 50`).bind(user).all()).results;
   const gifts=(await DB.prepare('SELECT item_id,source,created_at FROM cosmetic_inventory WHERE user_id=?').bind(user).all()).results;
   const action=mutation&&events.length<50?mutation.action:'sync';
   state=await rpc(action,user,{events,gifts,...(action==='sync'?{}:mutation.data)});
   if(state.missing)throw Error('Inventory authority is missing an imported wallet');
   if(events.length)await DB.batch(events.map(e=>DB.prepare('INSERT OR IGNORE INTO supabase_inventory_synced(user_id,kind,source_id) VALUES(?,?,?)').bind(user,e.kind,e.source_id)));
   if(events.length<50){await DB.prepare('INSERT OR IGNORE INTO supabase_inventory_imports(user_id,migrated_at) VALUES(?,?)').bind(user,Date.now()).run();return state;}
  }
  throw Error('Inventory rewards are still synchronizing; retry safely');
 }
 return {sync,mutate:(user,item,action,now,admin)=>sync(user,{action,data:{item:item.id,slot:item.kind==='skin'?'skin:'+item.fighter:item.kind,price:item.price,now,admin}})};
}
export async function inventoryDatabase(env){
 const DB=env.DB;if(!DB)return DB;
 const {mode}=await DB.prepare('SELECT mode FROM inventory_storage_control WHERE id=1').first();
 if(mode==='legacy')return DB;
 if(!env.SAGA_INVENTORY_KEY)throw Error('Supabase inventory credentials are missing; refusing legacy fallback');
 return {prepare:sql=>DB.prepare(sql),batch:statements=>DB.batch(statements),inventory:{mode,...inventoryClient(env,DB)}};
}
const inventoryUsers=`SELECT user_id FROM (SELECT user_id FROM player_profiles UNION SELECT user_id FROM scoin_ledger UNION SELECT user_id FROM cosmetic_inventory UNION SELECT user_id FROM cosmetic_loadouts)`;
export async function inventoryMigration(request,env){
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 // Use Authorization so platform request logs redact the migration credential.
 if(!env.SAGA_INVENTORY_KEY||request.headers.get('Authorization')!=='Bearer '+env.SAGA_INVENTORY_KEY)return reply({error:'Forbidden'},403);
 if(request.method!=='POST')return reply({error:'POST required'},405);
 const data=await request.json(),DB=env.DB;let {mode}=await DB.prepare('SELECT mode FROM inventory_storage_control WHERE id=1').first();
 if(data.action==='freeze'){
  if(mode==='supabase')return reply({error:'Already migrated'},409);
  await DB.prepare("UPDATE inventory_storage_control SET mode='migrating' WHERE id=1 AND mode='legacy'").run();return reply({mode:'migrating'});
 }
 if(data.action==='status')return reply({mode,users:(await DB.prepare('SELECT COUNT(*) n FROM ('+inventoryUsers+')').first()).n,imported:(await DB.prepare('SELECT COUNT(*) n FROM supabase_inventory_imports').first()).n});
 if(mode!=='migrating')return reply({error:'Freeze inventory writes before migration'},409);
 if(data.action==='migrate'){
  const users=(await DB.prepare(inventoryUsers+' WHERE user_id>? ORDER BY user_id LIMIT 10').bind(String(data.after||'')).all()).results;
  const client=inventoryClient(env,DB);let verified=0;
  for(const {user_id:user} of users){
   const migrated=await client.sync(user),legacy=await inventorySnapshot(DB,user);
   const sorted=a=>JSON.stringify([...a].sort()),slots=a=>JSON.stringify(Object.entries(a).sort());
   if(migrated.balance!==legacy.balance||sorted(migrated.owned)!==sorted(legacy.owned)||slots(migrated.equipped)!==slots(legacy.equipped))return reply({error:'Migration verification failed',verified},409);
   verified++;
  }
  return reply({verified,after:users.at(-1)?.user_id||null,done:users.length<10});
 }
 if(data.action==='activate'){
  const pending=await DB.prepare('SELECT COUNT(*) n FROM ('+inventoryUsers+') u LEFT JOIN supabase_inventory_imports i USING(user_id) WHERE i.user_id IS NULL').first();
  if(pending.n)return reply({error:'Accounts remain to migrate',pending:pending.n},409);
  await DB.prepare("UPDATE inventory_storage_control SET mode='supabase' WHERE id=1 AND mode='migrating'").run();return reply({mode:'supabase'});
 }
 return reply({error:'Unknown action'},400);
}
