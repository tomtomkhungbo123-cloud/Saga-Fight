import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {localDB} from '../scripts/local-db.mjs';
import {api} from '../worker/core.mjs';
import {accountBackend,forwardAccountRequest,ACCOUNT_ORIGIN} from '../scripts/account-backend.mjs';

test('production cannot silently use an ephemeral account DB; proxy rejects spoofing, redirects and outages',async()=>{
 assert.equal(accountBackend({RENDER:'true'}),ACCOUNT_ORIGIN);
 assert.equal(accountBackend({NODE_ENV:'production'}),ACCOUNT_ORIGIN);
 assert.equal(accountBackend({}),null);
 assert.throws(()=>accountBackend({ACCOUNT_BACKEND_ORIGIN:'http://unsafe.test'}));
 const req=new Request('https://render.test/api/account/shop',{headers:{Origin:'https://render.test','X-Saga-Auth':'verified-fixture','oai-saga-admin':'true',Cookie:'do-not-forward'}});
 const result=await forwardAccountRequest(req,ACCOUNT_ORIGIN,async(url,options)=>{
  assert.equal(url,ACCOUNT_ORIGIN+'/api/account/shop');assert.equal(options.headers.get('X-Saga-Auth'),'verified-fixture');
  assert.equal(options.headers.get('oai-saga-admin'),null);assert.equal(options.headers.get('cookie'),null);assert.equal(options.redirect,'error');
  return new Response(JSON.stringify({account:{owned:['thunder-jade']}}),{headers:{'Content-Type':'application/json'}});
 });assert.equal(result.status,200);
 assert.equal((await forwardAccountRequest(req,ACCOUNT_ORIGIN,async()=>{throw Error('offline');})).status,503);
 assert.equal((await forwardAccountRequest(req,ACCOUNT_ORIGIN,async()=>new Response('bad gateway',{status:502}))).status,503);
 assert.equal((await forwardAccountRequest(new Request(req,{headers:{Origin:'https://evil.test'}}),ACCOUNT_ORIGIN,()=>{throw Error('must not fetch');})).status,403);
});

test('purchases, Scoin and equipment survive Render replacement with a fresh empty filesystem',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'saga-durable-')),DB=localDB(path.join(root,'authority.sqlite'));
 const now=Date.now();await DB.prepare("INSERT INTO scoin_ledger VALUES(?,'pve',?,?,?)").bind('alice','existing-reward',1000,now).run();
 // This authority simulates the existing D1 account store, outside either Render instance.
 let offline=false,forwarded=0;
 const authority=http.createServer(async(req,res)=>{
  forwarded++;if(offline){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'temporary outage'}));return;}
  assert.equal(req.headers['oai-saga-admin'],undefined);
  const headers=new Headers(req.headers),body=[];for await(const b of req)body.push(b);
  headers.delete('oai-authenticated-user-id');headers.delete('oai-saga-admin');
  // Only the fixture token is accepted; production authority verifies Supabase tokens.
  if(headers.get('X-Saga-Auth')==='fixture-alice'){headers.set('oai-authenticated-user-id','alice');headers.set('oai-authenticated-user-email','alice@players.sagafight.invalid');}
  const response=await api(new Request(origin+req.url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(body)}:{})}),{DB});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 });await new Promise(r=>authority.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+authority.address().port;
 let child;
 async function stop(){if(!child)return;const exit=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');if(child.exitCode===null)await exit;child=null;}
 t.after(async()=>{await stop();await new Promise(r=>authority.close(r));DB.close();await rm(root,{recursive:true,force:true});});
 async function start(name){const dir=path.join(root,name);child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',RENDER:'true',PORT:'0',DATA_DIR:dir,ACCOUNT_BACKEND_ORIGIN:origin},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('startup timeout')),8000);child.once('exit',code=>{clearTimeout(timer);reject(Error('server exited '+code));});child.stdout.on('data',b=>{text+=b;const m=text.match(/listening on port (\d+)/);if(m){clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);}});});}
 let base=await start('release-one');
 async function call(action,itemId){const response=await fetch(base+'/api/account/shop',{headers:{'X-Saga-Auth':'fixture-alice','oai-saga-admin':'true',...(action?{'Content-Type':'application/json'}:{})},...(action?{method:'POST',body:JSON.stringify({action,itemId})}:{})});return {status:response.status,...await response.json()};}
 assert.equal((await call('buy','thunder-jade')).account.balance,820);assert.equal((await call('equip','thunder-jade')).account.equipped['skin:thunder'],'thunder-jade');
 await stop();await rm(path.join(root,'release-one'),{recursive:true,force:true});base=await start('release-two');
 const saved=await call();assert.equal(saved.status,200);assert.deepEqual(saved.account.owned,['thunder-jade']);assert.equal(saved.account.balance,820);assert.equal(saved.account.equipped['skin:thunder'],'thunder-jade');
 assert.equal((await call('buy','thunder-jade')).account.balance,820,'repeat purchase cannot charge twice');
 const guest=await (await fetch(base+'/api/account/shop')).json();assert.equal(guest.account,null);
 const before=forwarded;const room=await fetch(base+'/relay-api/rooms/create',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(room.status,201);assert.equal(forwarded,before,'relay-only room creation does not loop back through authority');
 offline=true;assert.equal((await call()).status,503);offline=false;assert.equal((await call()).account.balance,820,'outage never falls back to empty local inventory');
 assert.equal((await (await fetch(base+'/healthz')).json()).accountStorage,'durable-shared');
});

test('rolling upgrade falls back only when Render lacks the relay endpoint, never on an authoritative room 404',async()=>{
 const {bridgeApi}=await import('../worker/render-bridge.mjs');const DB=localDB(),original=globalThis.fetch;
 const paths=[];let upgraded=false;
 globalThis.fetch=async url=>{paths.push(new URL(url).pathname);if(String(url).includes('/relay-api/'))return new Response(JSON.stringify({error:'room absent'}),{status:404,headers:{'Content-Type':'application/json',...(upgraded?{'X-Saga-Relay-API':'1'}:{})}});return new Response(JSON.stringify({code:'ABCDEF',token:'temporary-room-token',config:{p1:'thunder',p2:'soul',map:'forest'}}),{status:201,headers:{'Content-Type':'application/json'}});};
 const call=()=>bridgeApi(new Request('https://game.test/api/rooms/create',{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json'},body:'{}'}),{DB});
 try{assert.equal((await call()).status,201);assert.deepEqual(paths,['/relay-api/rooms/create','/api/rooms/create']);upgraded=true;paths.length=0;assert.equal((await call()).status,404);assert.deepEqual(paths,['/relay-api/rooms/create']);}finally{globalThis.fetch=original;DB.close();}
});
