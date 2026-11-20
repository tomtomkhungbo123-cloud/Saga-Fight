import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../worker/core.mjs';
import {authenticatedApi} from '../worker/account-auth.mjs';
import {localDB} from '../scripts/local-db.mjs';

function harness(t){
 const DB=localDB();t.after(()=>DB.close());
 async function profile(id,name){await DB.prepare('INSERT INTO player_profiles(user_id,display_name,updated_at) VALUES(?,?,?)').bind(id,name,Date.now()).run();}
 async function call(path,{user='andy',admin=false,body,origin='https://game.test',method}={}){
  const headers=new Headers();if(user){headers.set('oai-authenticated-user-id',user);headers.set('oai-authenticated-user-email',user+'@players.sagafight.invalid');}
  if(admin)headers.set('oai-saga-admin','true');if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin);}
  const r=await api(new Request('https://game.test/api/'+path,{headers,method:method||(body?'POST':'GET'),...(body?{body:JSON.stringify(body)}:{})}),{DB});
  return {status:r.status,...await r.json()};
 }
 const draft=(values={})=>({operation:crypto.randomUUID(),title:'Quà chào mừng',body:'Cảm ơn chiến binh!',audience:'one',username:'andy',itemId:'thunder-jade',...values});
 return {DB,profile,call,draft};
}

test('mailbox and send endpoints require identity, admin metadata and same-origin POST',async t=>{
 const {call,draft}=harness(t);
 assert.equal((await call('account/mailbox',{user:null})).status,401);
 assert.equal((await call('admin/mailbox')).status,403);
 assert.equal((await call('admin/mailbox',{body:draft({admin:true})})).status,403);
 assert.equal((await call('admin/mailbox',{admin:true,body:draft(),origin:'https://evil.test'})).status,403);
 assert.equal((await call('account/mailbox',{method:'DELETE'})).status,405);
 assert.equal((await call('admin/mailbox',{admin:true,body:draft({title:'',itemId:'missing'})})).status,400);
});

test('admin has unlimited Scoin, buys without debits and ordinary users cannot buy free',async t=>{
 const {call,DB}=harness(t);
 const admin=await call('account/shop',{user:'sagadmin',admin:true});assert.equal(admin.account.unlimited,true);assert.equal(admin.account.balance,null);
 assert.equal((await call('account',{user:'sagadmin',admin:true})).permissions.manageMailbox,true);
 const bought=await call('account/shop',{user:'sagadmin',admin:true,body:{action:'buy',itemId:'thunder-crimson'}});
 assert.ok(bought.account.owned.includes('thunder-crimson'));
 assert.equal((await DB.prepare('SELECT COUNT(*) count FROM scoin_ledger').first()).count,0);
 assert.equal((await call('account/shop',{body:{action:'buy',itemId:'thunder-crimson',admin:true,unlimited:true}})).status,409);
 const equipped=await call('account/shop',{user:'sagadmin',admin:true,body:{action:'equip',itemId:'thunder-crimson'}});assert.equal(equipped.account.equipped['skin:thunder'],'thunder-crimson');
});

test('targeted gifts are private, claim once, become equippable and survive retries',async t=>{
 const {call,profile,draft,DB}=harness(t);await profile('andy','Andy');await profile('other','other');
 const body=draft({username:'AnDy'});
 assert.equal((await call('admin/mailbox',{user:'sagadmin',admin:true,body})).recipients,1);
 assert.equal((await call('admin/mailbox',{user:'sagadmin',admin:true,body})).alreadyApplied,true);
 assert.equal((await call('admin/mailbox',{user:'sagadmin',admin:true,body:{...body,title:'Changed'}})).status,409);
 assert.equal((await call('account/mailbox',{user:'other'})).total,0);
 assert.equal((await call('account/mailbox',{user:'other',body:{action:'claim',id:body.operation}})).status,404);
 const mail=await call('account/mailbox');assert.equal(mail.unread,1);assert.equal(mail.messages[0].item.id,'thunder-jade');
 assert.equal((await call('account/shop',{body:{action:'equip',itemId:'thunder-jade'}})).status,403);
 await Promise.all([call('account/mailbox',{body:{action:'claim',id:body.operation}}),call('account/mailbox',{body:{action:'claim',id:body.operation}})]);
 assert.equal((await call('account/mailbox')).unread,0);
 assert.equal((await DB.prepare('SELECT COUNT(*) count FROM cosmetic_inventory WHERE user_id=?').bind('andy').first()).count,1);
 const owned=await call('account/shop');assert.deepEqual(owned.account.owned,['thunder-jade']);
 assert.equal((await call('account/shop',{body:{action:'equip',itemId:'thunder-jade'}})).account.equipped['skin:thunder'],'thunder-jade');
 assert.equal((await call('account/shop',{body:{action:'buy',itemId:'thunder-jade'}})).status,200);
 assert.equal((await DB.prepare('SELECT COUNT(*) count FROM scoin_ledger').first()).count,0);
 const history=await call('admin/mailbox',{user:'sagadmin',admin:true});assert.equal(history.history[0].claimed,1);
});

test('broadcast snapshots current accounts; notification-only messages mark read, never grant items',async t=>{
 const {call,profile,draft}=harness(t);await profile('andy','andy');await profile('other','other');
 const body=draft({audience:'all',itemId:null,body:'<img src=x onerror=alert(1)> được hiển thị như văn bản'});
 assert.equal((await call('admin/mailbox',{admin:true,body})).recipients,2);
 await profile('future','future');
 assert.equal((await call('admin/mailbox',{admin:true,body})).recipients,2);
 assert.equal((await call('account/mailbox',{user:'future'})).total,0);
 assert.equal((await call('account/mailbox')).messages[0].item,null);
 assert.equal((await call('account/mailbox',{body:{action:'claim',id:body.operation}})).status,400);
 await call('account/mailbox',{body:{action:'read',id:body.operation}});
 assert.equal((await call('account/mailbox')).unread,0);
 assert.equal((await call('account/mailbox',{user:'other'})).unread,1);
 assert.equal((await call('admin/mailbox',{admin:true,body:draft({username:'missing'})})).status,404);
 assert.equal((await call('admin/mailbox',{admin:true,body:draft({itemId:'ember-fox'})})).status,400);
});

test('gift inventory deduplicates two gifts of the same skin and supports mailbox pagination',async t=>{
 const {call,profile,draft}=harness(t);await profile('andy','andy');
 for(let i=0;i<22;i++){const body=draft();await call('admin/mailbox',{admin:true,body});await call('account/mailbox',{body:{action:'claim',id:body.operation}});}
 const first=await call('account/mailbox'),last=await call('account/mailbox?page=2');
 assert.equal(first.messages.length,20);assert.equal(last.messages.length,2);assert.equal(first.total,22);
 assert.deepEqual((await call('account/shop')).account.owned,['thunder-jade']);
});

test('public authentication wrapper strips forged admin and identity headers',async()=>{
 const original=new Request('https://game.test/api/admin/mailbox',{headers:{'oai-saga-admin':'true','oai-authenticated-user-id':'sagadmin','oai-authenticated-user-email':'sagadmin@players.sagafight.invalid'}});
 const result=await authenticatedApi(original,{},request=>api(request,{}));assert.equal(result.status,401);
});
