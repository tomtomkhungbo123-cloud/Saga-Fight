import assert from 'node:assert/strict';
import {test} from 'node:test';
import {api} from '../worker/core.mjs';
import {localDB} from '../scripts/local-db.mjs';

function harness(t) {
 const DB=localDB();
 t.after(()=>DB.close());
 async function call(path,{user,body,token,origin='https://duel.test'}={}) {
  const headers = new Headers();
  if(user){
   headers.set('oai-authenticated-user-id',user);
   headers.set('oai-authenticated-user-email',user+'@test.com');
  }
  if(token)headers.set('Authorization','Bearer '+token);
  if(body){
   headers.set('Content-Type','application/json');
   headers.set('Origin',origin);
  }
  const response=await api(new Request('https://duel.test/api/'+path,{
   headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined
  }),{DB});
  return {status:response.status,...await response.json()};
 }
 const shop=(user,action,itemId)=>call('account/shop',{user,body:action?{action,itemId}:undefined});
 const ageMatch=id=>DB.prepare('UPDATE game_matches SET created_at=? WHERE id=?').bind(Date.now()-60_000,id).run();
 const grant=(user,amount)=>DB.prepare("INSERT INTO scoin_ledger VALUES(?,'pve',?,?,?)")
  .bind(user,crypto.randomUUID(),amount,Date.now()-120_000).run();
 const priorPurchase=(user,item,price)=>DB.prepare("INSERT INTO scoin_ledger VALUES(?,'purchase',?,?,?)")
  .bind(user,item,-price,Date.now()-60_000).run();
 return {call,shop,ageMatch,grant,priorPurchase};
}

test('catalog is public and purchases, equip slots and balances are account-bound',async t=>{
 const {call,shop,grant}=harness(t);
 const guest=await shop();
 assert.equal(guest.account,null);
 assert.deepEqual(guest.catalog.map(item=>item.id),['thunder-jade','thunder-crimson','soul-amethyst','cylast-gold']);
 assert.equal((await shop(null,'buy','thunder-jade')).status,401);
 assert.equal((await call('account/shop',{user:'a',body:{action:'buy',itemId:'thunder-jade'},origin:'https://other.test'})).status,403);
 assert.equal((await shop('a','buy','thunder-jade')).status,409);
 assert.equal((await shop('a','equip','thunder-jade')).status,403);
 await grant('a',430);
 const [first,duplicate]=await Promise.all([shop('a','buy','thunder-jade'),shop('a','buy','thunder-jade')]);
 assert.equal(first.account.balance,250);
 assert.equal(duplicate.account.balance,250);
 const [soul,ice]=await Promise.all([shop('a','buy','soul-amethyst'),shop('a','buy','cylast-gold')]);
 assert.deepEqual([soul.status,ice.status].sort(),[200,409]);
 assert.equal((await shop('a','equip','thunder-jade')).account.equipped['skin:thunder'],'thunder-jade');
 assert.equal((await shop('a','unequip','thunder-jade')).account.equipped['skin:thunder'],undefined);
 assert.equal((await shop('b')).account.balance,0);
 assert.deepEqual((await shop('b')).account.owned,[]);
});

test('temporarily delisted pets and accessories cannot be bought but existing owners can equip them',async t=>{
 const {shop,grant,priorPurchase}=harness(t);
 const removed=['ember-fox','frost-owl','jade-familiar','dawn-sigil','moon-sigil','rime-sigil'];
 assert.deepEqual((await shop()).retired.map(item=>item.id),removed);
 await grant('a',1000);
 for(const item of removed)assert.equal((await shop('a','buy',item)).status,409);
 assert.equal((await shop('a')).account.balance,1000);
 await priorPurchase('a','ember-fox',280);
 await priorPurchase('a','dawn-sigil',120);
 assert.deepEqual(new Set((await shop('a')).account.owned),new Set(['ember-fox','dawn-sigil']));
 assert.equal((await shop('a','equip','ember-fox')).account.equipped.pet,'ember-fox');
 assert.equal((await shop('a','equip','dawn-sigil')).account.equipped.accessory,'dawn-sigil');
 assert.equal((await shop('a','unequip','dawn-sigil')).account.equipped.accessory,undefined);
 assert.equal((await shop('a')).account.balance,600);
});

test('PvE pays once to the signed-in participant after an eligible completion',async t=>{
 const {call,shop,ageMatch}=harness(t);
 const id=crypto.randomUUID();
 await call('account/pve-start',{user:'a',body:{id,fighter:'thunder'}});
 await ageMatch(id);
 const finish=(user,winner)=>call('account/pve-finish',{user,body:{id,winner}});
 assert.equal((await finish('b',0)).status,403);
 const results=await Promise.all([finish('a',0),finish('a',0)]);
 assert.deepEqual(results.map(r=>r.scoin),[40,40]);
 assert.equal((await finish('a',1)).status,409);
 assert.equal((await shop('a')).account.balance,40);
 const quick=crypto.randomUUID();
 await call('account/pve-start',{user:'a',body:{id:quick,fighter:'thunder'}});
 assert.equal((await call('account/pve-finish',{user:'a',body:{id:quick,winner:1}})).scoin,0);
});

test('Online freezes equipped cosmetics and pays both different accounts only after agreeing',async t=>{
 const {call,shop,ageMatch,grant}=harness(t);
 await grant('a',360);
 await shop('a','buy','thunder-crimson');
 await shop('a','equip','thunder-crimson');
 const host=await call('rooms/create',{user:'a',body:{p1:'thunder'}});
 const guest=await call('rooms/join',{user:'b',body:{code:host.code,fighter:'soul'}});
 const ready=(who,revision)=>call('rooms/lobby',{token:who.token,body:{code:host.code,action:'ready',value:true,revision}});
 const h=await ready(host,guest.config.lobby.revision);
 const g=await ready(guest,h.config.lobby.revision);
 assert.deepEqual(g.config.cosmetics,[{'skin:thunder':'thunder-crimson'},{}]);
 const id=g.config.lobby.matchId;
 await ageMatch(id);
 const finish=(who,winner)=>call('rooms/result',{token:who.token,body:{code:host.code,id,winner,confirm:true}});
 const first=await finish(guest,1);
 assert.equal(first.pending,true);
 assert.equal((await shop('b')).account.balance,0);
 assert.equal((await finish(host,1)).scoin,25);
 assert.equal((await finish(guest,1)).scoin,70);
 assert.equal((await finish(guest,0)).status,409);
 assert.equal((await finish(host,1)).pending,false);
 assert.equal((await shop('a')).account.balance,145);
 assert.equal((await shop('b')).account.balance,70);
});
