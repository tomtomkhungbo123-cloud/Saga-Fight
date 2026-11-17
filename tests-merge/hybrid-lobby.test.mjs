import test from 'node:test';
import assert from 'node:assert/strict';
import {hybridPair,pump,synced,equalConfirmedWorld} from './hybrid-fixture.mjs';
import {client} from './rollback-harness.mjs';
import {localDB} from '../scripts/local-db.mjs';

for(const direct of [true,false])test(`Render ${direct?'DIRECT':'WebSocket fallback'}: select, ready, same-room rematch retains rollback and channel`,async()=>{
 const f=await hybridPair(direct,'fairi','aether','forest',false);
 try{
  await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));
  if(!direct)f.host.expireDirect();
  await f.wait(()=>[f.host,f.guest].every(c=>c.run('window.testTransport.session().transportReady&&window.testTransport.session().peerHello')));
  for(const c of [f.host,f.guest])assert.equal(c.run('window.testTransport.session().started'),false,'must not start before Ready');
  const room=f.host.run('window.riftNet.room'),channel=f.host.run('window.testTransport.session().channel'),dc=f.host.run('window.testTransport.session().directChannel');
  await f.host.run("window.riftNet.roomAction('select',{fighter:'soul',map:'cavern'})");
  await f.guest.run("window.riftNet.roomAction('select',{fighter:'mox'})");
  await f.wait(()=>f.host.run('window.testTransport.session().config.p2')==='mox');
  await f.host.run("window.riftNet.roomAction('ready',{value:true})");
  assert.equal(f.host.run('window.riftNet.canEdit(0)'),false);
  assert.equal(f.host.run('window.testTransport.session().started'),false);
  await f.guest.run("window.riftNet.roomAction('ready',{value:true})");
  await synced(f);await pump(f,420);equalConfirmedWorld(f);
  assert.equal(f.host.run('fighters[0].type'),'soul');assert.equal(f.host.run('fighters[1].type'),'mox');
  assert.equal(f.host.run('window.testTransport.session().activeRoute'),direct?'direct':'ws');
  const oldInit=f.host.run('({type:"rb-init",epoch:window.testTransport.session().epoch,state:window.SagaRollback.pack(window.riftGame.rollback.capture()),config:window.testTransport.session().config})');
  f.host.run("phase='matchover'");await f.host.run('window.riftNet.confirm()');
  await f.wait(()=>[f.host,f.guest].every(c=>c.run('window.riftNet.inLobby')));
  for(const c of [f.host,f.guest]){assert.equal(c.run('phase'),'lobby');assert.equal(c.run('window.testTransport.session().rb'),null);}
  f.guest.ctx.staleInit=oldInit;
  f.guest.run('window.testTransport.session().channel.onmessage({data:JSON.stringify(staleInit)})');
  assert.equal(f.guest.run('window.riftNet.inLobby'),true,'stale checkpoint must not restart old match');
  await f.host.run("window.riftNet.roomAction('select',{fighter:'fairi',map:'forest'})");
  await f.guest.run("window.riftNet.roomAction('select',{fighter:'aether'})");
  await f.wait(()=>f.host.run('window.testTransport.session().config.p2')==='aether');
  await Promise.all([f.host.run("window.riftNet.roomAction('ready',{value:true})"),f.guest.run("window.riftNet.roomAction('ready',{value:true})")]);
  await synced(f);await pump(f,420);equalConfirmedWorld(f);
  assert.equal(f.host.run('window.riftNet.room'),room);assert.equal(f.host.run('window.testTransport.session().channel'),channel);
  assert.equal(f.host.run('window.testTransport.session().directChannel'),dc);
  assert.equal(f.host.run('window.testTransport.session().config.lobby.generation'),2);
  assert.equal(f.host.run('fighters[0].type'),'fairi');assert.equal(f.host.run('fighters[1].type'),'aether');
  if(direct){assert.equal(f.wireCounts.wsCombat,0);assert.ok(f.wireCounts.directCombat>0);}else assert.ok(f.wireCounts.wsCombat>0);
 }finally{await f.close();}
});

test('Chỉ DIRECT preserves its policy when peer connectivity is unavailable',async()=>{
 const f=await hybridPair(false,'thunder','soul','cavern',false,'direct');
 try{
  await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));
  f.host.expireDirect();
  await f.wait(()=>f.host.run('!!window.testTransport.session().directFailed'));
  assert.equal(f.host.run('window.testTransport.session().config.connection'),'direct');
  assert.notEqual(f.host.run('window.testTransport.session().activeRoute'),'ws');
  assert.equal(f.wireCounts.wsCombat,0);assert.equal(f.host.run('window.testTransport.session().started'),false);
 }finally{await f.close();}
});

test('Fairi finisher owner and timeline survive rollback restore/replay',()=>{
 const DB=localDB(),c=client(DB,null,'window.riftNet = {room:null};');
 try{
  c.run("window.riftGame.configure({p1:'fairi',p2:'thunder',map:'forest'});window.riftGame.begin();var A=window.riftGame.rollback;A.seed(99);phase='fight';fighters[1].hp=0;fairiKiller=0;beginFinisher();var saved=window.SagaRollback.pack(A.capture());for(let i=0;i<90;i++)A.step([{m:0,a:[]},{m:0,a:[]}]);var expected=window.SagaRollback.hash(window.SagaRollback.pack(A.capture()));fairiKiller=null;A.restore(window.SagaRollback.unpack(saved));");
  assert.equal(c.run('fairiKiller'),0);assert.equal(c.run('phase'),'finishing');
  c.run('for(let i=0;i<90;i++)A.step([{m:0,a:[]},{m:0,a:[]}]);');
  assert.equal(c.run('window.SagaRollback.hash(window.SagaRollback.pack(A.capture()))'),c.run('expected'));
 }finally{DB.close();}
});
