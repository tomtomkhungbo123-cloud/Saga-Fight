import test from 'node:test';import assert from 'node:assert/strict';
import {localDB} from '../scripts/local-db.mjs';
import {inventoryDatabase,inventoryMigration} from '../worker/inventory-store.mjs';
import {mutateShop,shopAccount,shopLoadouts,savePveScoin} from '../worker/shop.mjs';

test('Supabase cutover freezes purchases, verifies imports and keeps purchases outside D1 with retryable reward outbox',async()=>{
 const DB=localDB(),prior=globalThis.fetch,env={DB,SAGA_INVENTORY_KEY:'server-only-fixture',SUPABASE_URL:'https://supabase.test',SUPABASE_PUBLISHABLE_KEY:'public-fixture'};
 const wallets=new Map(),seen=new Set();let unavailable=false,bootstraps=0;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://supabase.test/rest/v1/rpc/saga_inventory_rpc');const {p_key,p_action:a,p_data:p}=JSON.parse(options.body);assert.equal(p_key,'server-only-fixture');if(unavailable)throw Error('network failure');
  if(a==='bootstrap'&&!wallets.has(p.user)){bootstraps++;wallets.set(p.user,structuredClone(p.snapshot));for(const e of p.snapshot.ledger)seen.add(p.user+e.kind+e.source_id);}
  const state=wallets.get(p.user);if(!state)return Response.json({missing:true});
  for(const e of p.events||[]){const k=p.user+e.kind+e.source_id;if(!seen.has(k)){seen.add(k);state.balance+=e.amount;}}
  for(const e of p.gifts||[])if(!state.owned.includes(e.item_id))state.owned.push(e.item_id);
  if(a==='buy'&&!state.owned.includes(p.item)){if(state.balance<p.price)return Response.json({status:409,error:'insufficient'});state.balance-=p.admin?0:p.price;state.owned.push(p.item);}
  if(a==='equip')state.equipped[p.slot]=p.item;
  return Response.json(state);
 };
 const migrate=async(action,authorized=true)=>inventoryMigration(new Request('https://game.test/api/internal/inventory-migration',{method:'POST',headers:{Authorization:authorized?'Bearer server-only-fixture':'Bearer wrong'},body:JSON.stringify({action})}),env);
 try{
  await DB.prepare("INSERT INTO scoin_ledger VALUES('owner','pve','legacy',1000,1000)").run();
  assert.equal((await migrate('freeze',false)).status,403);assert.equal((await migrate('freeze')).status,200);
  let wrapped=await inventoryDatabase(env);assert.equal((await mutateShop(wrapped,'owner',{action:'buy',itemId:'thunder-jade'},2000)).status,503);
  assert.equal((await migrate('activate')).status,409);const batch=await(await migrate('migrate')).json();assert.equal(batch.verified,1);assert.equal((await migrate('activate')).status,200);
  wrapped=await inventoryDatabase(env);const bought=await mutateShop(wrapped,'owner',{action:'buy',itemId:'thunder-jade'},2000);assert.equal(bought.account.balance,820);
  assert.equal((await DB.prepare("SELECT COUNT(*) n FROM scoin_ledger WHERE kind='purchase'").first()).n,0,'D1 no longer owns purchases');
  await mutateShop(wrapped,'owner',{action:'equip',itemId:'thunder-jade'},2001);assert.equal((await shopLoadouts(wrapped,['owner',null]))[0]['skin:thunder'],'thunder-jade');
  await DB.prepare("INSERT INTO game_matches(id,mode,p1,host_user_id,created_at) VALUES('next-match','pve','thunder','owner',?)").bind(Date.now()-60000).run();await savePveScoin(wrapped,'next-match',0,Date.now());assert.equal((await shopAccount(wrapped,'owner')).balance,860);
  await DB.prepare("INSERT INTO cosmetic_inventory VALUES('owner','soul-amethyst','mail',4000)").run();assert.ok((await shopAccount(wrapped,'owner')).owned.includes('soul-amethyst'));
  // Simulate a committed remote reward whose local acknowledgement is lost.
  await DB.prepare("INSERT INTO scoin_ledger VALUES('owner','online','new-match',70,5000)").run();const batchOriginal=DB.batch;DB.batch=async()=>{throw Error('lost ack');};await assert.rejects(()=>shopAccount(wrapped,'owner'));DB.batch=batchOriginal;
  assert.equal((await shopAccount(wrapped,'owner')).balance,930,'retry cannot credit an applied reward twice');
  unavailable=true;await assert.rejects(()=>shopAccount(wrapped,'owner'));unavailable=false;assert.equal((await shopAccount(wrapped,'owner')).balance,930);
  await assert.rejects(()=>inventoryDatabase({DB}),'missing runtime credential cannot fall back to the old bag');
  assert.equal(bootstraps,1,'existing Supabase wallet is never replaced by stale D1');assert.equal((await migrate('freeze')).status,409);
 }finally{globalThis.fetch=prior;DB.close();}
});
