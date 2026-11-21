import test from 'node:test';
import assert from 'node:assert/strict';
import {hybridPair,pump,synced,equalConfirmedWorld} from './hybrid-fixture.mjs';

const peers=f=>[f.host,f.guest];
const session=c=>c.run('window.testTransport.session()');
const flush=()=>new Promise(setImmediate);

async function waitForSocket(check){
 const end=Date.now()+3000;
 while(!check()){
  assert.ok(Date.now()<end,'WebSocket event arrived');
  await new Promise(resolve=>setTimeout(resolve,5));
 }
}

function captureDirect(f){
 return peers(f).map(c=>({pc:session(c).pc,channel:session(c).directChannel,epoch:session(c).epoch}));
}

function assertDirectUnchanged(f,before){
 for(const [i,c]of peers(f).entries()){
  const n=session(c);
  assert.equal(n.activeRoute,'direct');
  assert.equal(n.pc,before[i].pc,'signaling events preserve the existing peer connection');
  assert.equal(n.directChannel,before[i].channel,'signaling events preserve the existing data channel');
  assert.equal(n.epoch,before[i].epoch,'signaling events do not restart the simulation');
  assert.equal(c.run('window.riftNet.blocked'),false);
  assert.equal(c.el('netCurtain').hidden,true);
 }
}

for(const policy of ['direct','auto'])for(const role of ['host','guest']){
 test(`${policy}: ${role} signaling outage and reconnect preserve live DIRECT`,async()=>{
  const f=await hybridPair(true,'thunder','soul','cavern',true,policy);
  try{
   await synced(f);await pump(f,80);
   const before=captureDirect(f),socket=session(f[role]).socket;
   socket.onerror?.({type:'error'});
   assertDirectUnchanged(f,before);
   socket.terminate();
   await waitForSocket(()=>socket.readyState===3&&session(f[role]).reconnectAt>0);
   // Process the relay's peer-disconnected event on the other client as well.
   await pump(f,40);
   assertDirectUnchanged(f,before);

   // The signaling deadline must not become a gameplay deadline. P2P traffic
   // is current; only the already-closed server connection is older than 15s.
   f[role].run('var continuitySession=window.testTransport.session();continuitySession.reconnectAt=performance.now()-20000;window.testTransport.connectionGuard(continuitySession)');
   assertDirectUnchanged(f,before);
   equalConfirmedWorld(f);

   f[role].reconnect();
   await waitForSocket(()=>session(f[role]).channel.readyState==='open');
   await pump(f,80);
   assertDirectUnchanged(f,before);
   equalConfirmedWorld(f);
   assert.equal(f.wireCounts.wsCombat,0,'combat never moves to the signaling socket');
   for(const c of peers(f))assert.equal(c.run('window.riftNet.metrics().transport'),'webrtc-direct');
  }finally{await f.close();}
 });
}

test('duplicate readiness notifications do not reselect an active DIRECT route',async()=>{
 const f=await hybridPair(true,'thunder','soul','cavern',true,'direct');
 try{
  await synced(f);await pump(f,80);const before=captureDirect(f);
  await f.host.run('window.testTransport.directSignal(window.testTransport.session(),{kind:"ready",attempt:window.testTransport.session().directGeneration})');
  assertDirectUnchanged(f,before);
  for(const c of peers(f)){
   const n=session(c);
   n.directChannel.onmessage({data:JSON.stringify({type:'direct-probe-ack'})});
   n.socket.onmessage({data:JSON.stringify({type:'relay',event:'ready',config:n.config})});
  }
  await pump(f,60);assertDirectUnchanged(f,before);equalConfirmedWorld(f);
 }finally{await f.close();}
});

for(const maxMessageSize of [16384,4096])test(`large checksum recovery uses ${maxMessageSize}-byte DIRECT chunks while signaling is offline`,async()=>{
 const f=await hybridPair(true,'thunder','soul','cavern',true,'direct');
 try{
  await synced(f);await pump(f,80);
  const before=captureDirect(f),host=session(f.host),guest=session(f.guest);
  const sockets=peers(f).map(c=>session(c).socket);
  for(const socket of sockets)socket.terminate();
  await waitForSocket(()=>sockets.every(socket=>socket.readyState===3));
  await pump(f,20);assertDirectUnchanged(f,before);

  const packets=[];
  for(const c of peers(f)){
   const n=session(c),dc=n.directChannel,original=dc.send.bind(dc);
   n.pc.sctp={maxMessageSize};
   dc.send=text=>{
    const bytes=Buffer.byteLength(text,'utf8');
    assert.ok(bytes<=maxMessageSize,`DIRECT message is within negotiated limit: ${bytes}`);
    packets.push({role:n.role,bytes,message:JSON.parse(text)});
    return original(text);
   };
  }

  // Enlarge a valid authoritative checkpoint without changing game behavior.
  // Escapes and Unicode ensure the test checks bytes after JSON encoding.
  const padding='⚡"\\\n😀'.repeat(10000);
  f.host.ctx.continuityPadding=padding;
  f.host.run('var continuityRb=window.testTransport.session().rb;var continuityCheckpoint=continuityRb.checkpoint.bind(continuityRb);continuityRb.checkpoint=()=>{const state=window.SagaRollback.unpack(continuityCheckpoint());state.fighters[0].continuityPadding=continuityPadding;return window.SagaRollback.pack(state);};');

  host.directChannel.bufferedAmount=65536;
  const digest=host.rb.digest();
  guest.directChannel.send(JSON.stringify({type:'rb-hash',epoch:host.epoch,tick:digest.tick,hash:digest.hash==='0'?'1':'0'}));
  await flush();
  assert.equal(f.host.run('window.riftNet.blocked'),true,'a real checksum mismatch still pauses simulation');
  assert.ok(host.initPacket,'checkpoint remains pending while transport is backpressured');
  await pump(f,10);
  assert.equal(packets.filter(p=>p.message.type==='rb-chunk').length,0,'a full send buffer holds checkpoint fragments');
  assert.equal(host.pc,before[0].pc,'recovery preserves DIRECT even while signaling is offline');

  host.directChannel.bufferedAmount=0;
  await synced(f);await pump(f,80);
  const chunks=packets.filter(p=>p.message.type==='rb-chunk');
  assert.ok(chunks.length>1,'large checkpoint is fragmented');
  assert.ok(chunks.every(p=>p.bytes<=maxMessageSize));
  assert.ok(chunks.every(p=>p.message.epoch===host.epoch));
  assert.ok(packets.some(p=>p.message.type==='rb-ack'),'checkpoint acknowledgement travels DIRECT');
  assert.ok(packets.some(p=>p.message.type==='rb-start'),'resume command travels DIRECT');
  assert.equal(host.epoch,before[0].epoch+1,'one checksum mismatch creates one recovery checkpoint');
  for(const [i,c]of peers(f).entries()){
   assert.equal(session(c).pc,before[i].pc);
   assert.equal(session(c).activeRoute,'direct');
   assert.equal(c.run('window.riftNet.blocked'),false);
   assert.equal(c.run('fighters[0].continuityPadding'),padding,'escaped Unicode state survives chunk reassembly exactly');
   assert.equal(session(c).socket.readyState,3,'recovery does not require signaling to reconnect');
  }
  equalConfirmedWorld(f);assert.equal(f.wireCounts.wsCombat,0);

  // A delayed duplicate transfer or a fragment from the previous epoch must
  // not restore an old snapshot or leave a fresh assembly waiting forever.
  const resumedGuestRollback=guest.rb;
  for(const {message}of chunks)guest.directChannel.onmessage({data:JSON.stringify(message)});
  guest.directChannel.onmessage({data:JSON.stringify({...chunks[0].message,id:chunks.at(-1).message.id+1,epoch:host.epoch-1})});
  await flush();
  assert.equal(guest.rb,resumedGuestRollback);
  assert.equal(guest.directReceive,null);
  assert.equal(f.guest.run('window.riftNet.blocked'),false);

  const diagnostic=await f.host.run('window.riftNet.diagnostics()');
  assert.equal(diagnostic.networkBuild,'6.36.0-pvpfix2');
  assert.equal(diagnostic.simulation,'6360-mel70-pvpfix2');
  assert.equal(diagnostic.session.started,true);
  assert.equal(diagnostic.session.synced,true);
  assert.equal(diagnostic.session.suspended,false);
  assert.equal(diagnostic.session.epoch,host.epoch);
  assert.equal(diagnostic.lastRecovery.reason,'checksum');
  assert.equal(diagnostic.lastRecovery.hashTick,digest.tick);
  assert.ok(diagnostic.rollback);
  assert.ok(Array.isArray(diagnostic.recentEvents));
  assert.ok(diagnostic.signaling);
 }finally{await f.close();}
});

test('an incomplete checkpoint survives the input watchdog and signaling reconnect before resuming',async()=>{
 const f=await hybridPair(true,'thunder','soul','cavern',true,'direct');
 try{
  await synced(f);await pump(f,60);
  const before=captureDirect(f),host=session(f.host),guest=session(f.guest),dc=host.directChannel;
  host.pc.sctp={maxMessageSize:1024};
  const original=dc.send.bind(dc);
  dc.send=text=>{original(text);if(JSON.parse(text).type==='rb-chunk')dc.bufferedAmount=65536;};
  const digest=host.rb.digest();
  guest.directChannel.send(JSON.stringify({type:'rb-hash',epoch:host.epoch,tick:digest.tick,hash:digest.hash==='0'?'1':'0'}));
  await flush();
  assert.equal(guest.directReceive?.index,1,'the first checkpoint fragment arrived');
  assert.ok(guest.directReceive.total>1,'checkpoint assembly is incomplete');
  assert.equal(guest.epoch,before[1].epoch,'epoch changes only after the complete checkpoint validates');
  assert.equal(guest.suspended,true,'checkpoint reception pauses simulation before assembly completes');

  f.guest.run('var receivingSession=window.testTransport.session();receivingSession.lastState=performance.now()-5000;receivingSession.lastPeer=performance.now();window.testTransport.connectionGuard(receivingSession)');
  assert.equal(guest.pc,before[1].pc,'valid recovery traffic is not mistaken for a failed connection');
  assert.equal(guest.activeRoute,'direct');
  assert.equal(guest.directReceive.index,1);
  assert.ok(!guest.directFailed);

  const socket=guest.socket;socket.terminate();
  await waitForSocket(()=>socket.readyState===3&&guest.reconnectAt>0);
  f.guest.reconnect();
  await waitForSocket(()=>guest.channel.readyState==='open');
  await pump(f,10);
  assert.equal(guest.pc,before[1].pc,'signaling reconnect preserves a suspended DIRECT transfer');
  assert.equal(guest.directReceive.index,1,'signaling reconnect does not discard checkpoint fragments');
  assert.equal(host.pc,before[0].pc);

  dc.send=original;dc.bufferedAmount=0;
  await synced(f);await pump(f,60);
  for(const [i,c]of peers(f).entries()){
   assert.equal(session(c).pc,before[i].pc);
   assert.equal(session(c).epoch,before[i].epoch+1);
   assert.equal(c.run('window.riftNet.blocked'),false);
  }
  equalConfirmedWorld(f);
 }finally{await f.close();}
});

test('a replaced authenticated session still ends a healthy DIRECT match',async()=>{
 const f=await hybridPair(true,'thunder','soul','cavern',true,'direct');
 let replacement;
 try{
  await synced(f);await pump(f,40);
  const n=session(f.host);
  replacement=new n.socket.constructor();
  await new Promise((resolve,reject)=>{replacement.once('open',resolve);replacement.once('error',reject);});
  replacement.send(JSON.stringify({type:'auth',version:94,code:n.room,token:n.token}));
  await waitForSocket(()=>f.host.run('window.riftNet.room')===null);
  assert.equal(f.host.run('phase'),'menu');
  assert.match(f.host.el('netError').textContent,/kết nối khác/);
 }finally{replacement?.terminate();await f.close();}
});
