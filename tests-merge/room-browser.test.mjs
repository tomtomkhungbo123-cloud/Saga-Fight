import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../worker/core.mjs';
import {bridgeApi} from '../worker/render-bridge.mjs';
import {localDB} from '../scripts/local-db.mjs';

const request = (action, body, token) => new Request('https://duel.test/api/rooms/'+action, {
 method:'POST', headers:{Origin:'https://duel.test','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
 body:JSON.stringify(body)
});

test('Room browser lists only live public rooms with a free slot and returns display fields only', async () => {
 const DB=localDB();
 try {
  const call=async(action,body={},token)=>api(request(action,body,token),{DB});
  const create=async(listed)=>(await call('create',{listed,p1:'melanta',map:'forest',connection:'direct'})).json();
  await DB.prepare('INSERT INTO player_profiles VALUES(?,?,?)').bind('host-id','saga_host',Date.now()).run();
  const hostRequest=request('create',{listed:true,p1:'melanta',map:'forest',connection:'direct',players:['spoofed']});
  hostRequest.headers.set('oai-authenticated-user-id','host-id');
  hostRequest.headers.set('oai-authenticated-user-email','server-verified@example.test');
  const available=await (await api(hostRequest,{DB})).json();
  const privateRoom=await create(false);
  const expired=await create(true);
  const stale=await create(true);
  const closed=await create(true);
  await DB.prepare('UPDATE duel_rooms SET expires_at=? WHERE code=?').bind(1,expired.code).run();
  await DB.prepare('UPDATE duel_rooms SET host_seen=? WHERE code=?').bind(Date.now()-31000,stale.code).run();
  await call('leave',{code:closed.code},closed.token);
  const response=await call('list');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await response.json(),{rooms:[{code:available.code,hostName:'saga_host',map:'forest',connection:'direct'}]});
  const [first,second]=await Promise.all([call('join',{code:available.code,fighter:'aether'}),call('join',{code:available.code,fighter:'mox'})]);
  assert.deepEqual([first.status,second.status].sort(),[200,409]);
  assert.deepEqual(await (await call('list')).json(),{rooms:[]});
  assert.equal((await call('join',{code:privateRoom.code})).status,200,'private codes still support manual join');
 } finally {DB.close();}
});

test('Game test lists rooms locally when the Render relay has no room browser', async () => {
 const DB=localDB(),fetch=globalThis.fetch;
 globalThis.fetch=async url=>{
  assert.equal(String(url),'https://saga-fight.onrender.com/relay-api/rooms/create');
  return Response.json({code:'ECHO42',token:'host-room-token',config:{p1:'mox',p2:'aether',map:'cavern',connection:'auto'}},{status:201});
 };
 try {
  const host=await bridgeApi(request('create',{listed:true}),{DB});
  assert.equal(host.status,201);
  const list=await bridgeApi(request('list',{}),{DB});
  assert.deepEqual(await list.json(),{rooms:[{code:'ECHO42',hostName:'Khách 1',map:'cavern',connection:'auto'}]});
 } finally {globalThis.fetch=fetch;DB.close();}
});
