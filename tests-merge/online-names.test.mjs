import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../worker/core.mjs';
import {bridgeApi} from '../worker/render-bridge.mjs';
import {localDB} from '../scripts/local-db.mjs';
import {hybridPair,pump,synced,equalConfirmedWorld} from './hybrid-fixture.mjs';

test('room identities come from profiles, preserve slot order and expose no email or user ID',async t=>{
 const DB=localDB();t.after(()=>DB.close());
 for(const [id,name] of [['h','sagadmin'],['g','tomidess']])await DB.prepare('INSERT INTO player_profiles VALUES(?,?,?)').bind(id,name,Date.now()).run();
 async function call(action,body,user,token){const r=await api(new Request('https://game.test/api/rooms/'+action,{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@players.sagafight.invalid'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}),{DB});assert.equal(r.status<300,true);return r.json();}
 const host=await call('create',{p1:'thunder',p2:'soul',players:['pretend','admin']},'h');assert.deepEqual(host.config.players,['sagadmin',null]);
 const guest=await call('join',{code:host.code,fighter:'soul',username:'FAKE',players:['spoof','spoof']},'g');assert.deepEqual(guest.config.players,['sagadmin','tomidess']);
 for(const token of [host.token,guest.token]){const result=await call('sync',{code:host.code},null,token);assert.deepEqual(result.config.players,['sagadmin','tomidess']);assert.ok(!JSON.stringify(result.config.players).includes('@'));}
 const ready=await call('lobby',{code:host.code,revision:guest.config.lobby.revision,action:'ready',value:true,players:['fake']},null,host.token);assert.deepEqual(ready.config.players,['sagadmin','tomidess']);
 const waiting=await call('create',{},null);assert.deepEqual(waiting.config.players,['Khách 1',null]);
 const joined=await call('join',{code:waiting.code,fighter:'soul'},null);assert.deepEqual(joined.config.players,['Khách 1','Khách 2']);
 await DB.prepare("UPDATE duel_rooms SET config=? WHERE code=?").bind(JSON.stringify({...joined.config,players:undefined}),waiting.code).run();
 assert.deepEqual((await call('sync',{code:waiting.code},null,waiting.token)).config.players,['Khách 1','Khách 2']);
});

test('Site Render bridge verifies account profiles locally, ignoring upstream and payload names',async()=>{
 const DB=localDB(),oldFetch=globalThis.fetch;
 const env={DB,SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
 globalThis.fetch=async(url,options)=>{
  if(url==='https://auth.test/auth/v1/user'){const name=options.headers.Authorization==='Bearer host-auth'?'sagadmin':'tomidess';return new Response(JSON.stringify({id:name+'-id',email:name+'@players.sagafight.invalid'}));}
  const action=String(url).split('/').at(-1);return new Response(JSON.stringify({code:'ABCDEF',token:action==='create'?'host-room':'guest-room',role:action==='create'?'host':'guest',config:{p1:'thunder',p2:'soul',map:'forest',players:['spoofed upstream','not verified']}}),{status:action==='create'?201:200,headers:{'Content-Type':'application/json'}});
 };
 async function call(action,auth,body){const response=await bridgeApi(new Request('https://game.test/api/rooms/'+action,{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json','X-Saga-Auth':auth},body:JSON.stringify(body)}),env);assert.ok(response.ok);return response.json();}
 try{const host=await call('create','host-auth',{});assert.deepEqual(host.config.players,['sagadmin',null]);const guest=await call('join','guest-auth',{code:host.code,fighter:'soul',players:['bad']});assert.deepEqual(guest.config.players,['sagadmin','tomidess']);}
 finally{globalThis.fetch=oldFetch;DB.close();}
});

for(const direct of [true,false])test('account names persist in lobby, HUD and rematch over '+(direct?'DIRECT':'WS'),async()=>{
 const f=await hybridPair(direct,'thunder','soul','forest',false);
 try{
  for(const [id,name] of [['h','sagadmin'],['g','tomidess']])await f.DB.prepare('INSERT INTO player_profiles VALUES(?,?,?)').bind(id,name,Date.now()).run();
  await f.DB.prepare('UPDATE duel_rooms SET host_user_id=?,guest_user_id=? WHERE code=?').bind('h','g',f.host.run('window.riftNet.room')).run();
  if(!direct){await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));f.host.expireDirect();}
  await f.wait(()=>[f.host,f.guest].every(c=>c.el('roomPlayer1').textContent==='tomidess'));
  for(const c of [f.host,f.guest]){assert.equal(c.el('roomPlayer0').textContent,'sagadmin');c.run('var n=window.testTransport.session();window.testTransport.applyRoomConfig(n,{...n.config,players:["spoofed","stolen"]})');assert.equal(c.el('roomPlayer0').textContent,'sagadmin');}
  await f.host.run("window.riftNet.roomAction('ready',{value:true})");await f.guest.run("window.riftNet.roomAction('ready',{value:true})");await synced(f);await pump(f,80);
  for(const c of [f.host,f.guest]){assert.equal(c.el('label0').textContent,'sagadmin');assert.equal(c.el('label1').textContent,'tomidess');assert.equal(c.run('document.body.classList.contains("online-match")'),true);}
  equalConfirmedWorld(f);
  await f.host.run("window.riftNet.roomAction('return')");await f.wait(()=>[f.host,f.guest].every(c=>c.run('window.riftNet.inLobby')));
  for(const c of [f.host,f.guest])assert.equal(c.el('roomPlayer1').textContent,'tomidess');
 }finally{await f.close();}
});
