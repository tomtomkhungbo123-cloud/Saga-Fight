import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { hybridPair, pump, synced, equalConfirmedWorld } from './hybrid-fixture.mjs';

for (const direct of [true, false]) {
 test('Changing fighters mid-round keeps both players in the same '+(direct?'DIRECT':'WS')+' room', async () => {
  const f = await hybridPair(direct, 'thunder', 'soul', 'forest');
  const clients = [f.host, f.guest];
  try {
   if (!direct) {
    await f.wait(() => f.host.run('!!window.testTransport.session().pc?.remoteDescription'));
    f.host.expireDirect();
   }
   await synced(f);
   await pump(f, 400);
   const initiator = direct ? f.guest : f.host;
   const opponent = direct ? f.host : f.guest;
   assert.equal(initiator.run('window.riftGame.getPhase()'), 'fight');
   const generation = initiator.run('window.testTransport.session().config.lobby.generation');
   const room = initiator.run('window.riftNet.room');
   for (const c of clients) c.run('var originalSocket=window.testTransport.session().socket;var originalChannel=window.testTransport.session().directChannel;');
   initiator.el('pause').onclick();
   await pump(f, 30);
   assert.equal(initiator.el('back').textContent, 'CHỌN LẠI · GIỮ PHÒNG');
   assert.equal(initiator.run('window.riftGame.getPhase()'), 'paused');
   await initiator.el('back').onclick();
   // Do not force a poll. The active transport must notify the opponent.
   for (let i=0; i<200 && !opponent.run('window.riftNet.inLobby'); i++) await delay(5);
   for (const c of clients) {
    assert.equal(c.run('window.riftNet.inLobby'), true);
    assert.equal(c.run('window.riftNet.room'), room);
    assert.equal(c.run('window.testTransport.session().socket===originalSocket'), true);
    assert.equal(c.run('window.testTransport.session().directChannel===originalChannel'), true);
    assert.equal(c.run('JSON.stringify(window.testTransport.session().config.lobby.ready)'), '[false,false]');
   }
   await initiator.run("window.riftNet.roomAction('select',{fighter:'melanta'})");
   await f.wait(() => opponent.run("Object.values(window.testTransport.session().config).includes('melanta')"));
   await initiator.el('lobbyReady').onclick();
   await opponent.el('lobbyReady').onclick();
   await synced(f);
   await pump(f, 75);
   for (const c of clients) {
    assert.equal(c.run('window.riftNet.room'), room);
    assert.equal(c.run('window.testTransport.session().config.lobby.generation'), generation+1);
    assert.equal(c.run(`fighters[${direct?1:0}].type`), 'melanta');
   }
   equalConfirmedWorld(f);
  } finally {
   await f.close();
  }
 });
}

for (const result of ['roundover', 'matchover']) {
 test('Choosing again from '+result+' keeps the room even if the local game mode is stale', async () => {
  const f = await hybridPair(true, 'thunder', 'soul', 'forest');
  try {
   await synced(f);
   const room = f.host.run('window.riftNet.room');
   f.host.run(`phase='${result}';mode='pve';showMessage('ONLINE','KẾT QUẢ','','SẴN SÀNG');`);
   assert.equal(f.host.el('back').textContent, 'CHỌN LẠI · GIỮ PHÒNG');
   await f.host.el('back').onclick();
   await f.wait(() => [f.host,f.guest].every(c => c.run('window.riftNet.inLobby')));
   for (const c of [f.host,f.guest]) assert.equal(c.run('window.riftNet.room'), room);
   const stored = await f.DB.prepare('SELECT status FROM duel_rooms WHERE code=?').bind(room).first();
   assert.equal(stored.status, 'joined');
   await f.host.el('leaveRoom').onclick();
   await f.wait(() => !f.guest.run('window.riftNet.room'));
   assert.equal((await f.DB.prepare('SELECT status FROM duel_rooms WHERE code=?').bind(room).first()).status, 'closed');
  } finally {
   await f.close();
  }
 });
}
