import test from 'node:test';import assert from 'node:assert/strict';import {client} from './rollback-harness.mjs';import {localDB} from '../scripts/local-db.mjs';
const flush=()=>new Promise(setImmediate);
async function hybridPair(connects=true,p1='thunder',p2='soul',arena='cavern'){
 const {default:http}=await import('node:http');const {WebSocket}=await import('ws');const {attachRelay}=await import('../scripts/relay.mjs');
 const DB=localDB(),server=http.createServer(),relay=attachRelay(server,DB);server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const origin='http://127.0.0.1:'+server.address().port,sockets=[],pcs=new Map(),wireCounts={wsCombat:0,directCombat:0};let serial=0;
 class DirectChannel{
  constructor(){this.readyState='connecting';this.bufferedAmount=0;}
  send(data){if(this.readyState!=='open')throw Error('closed');const message=JSON.parse(data);if(['rb-input'].includes(message.type))wireCounts.directCombat++;queueMicrotask(()=>{if(this.other?.readyState==='open')this.other.onmessage?.({data});});}
  close(){if(this.readyState==='closed')return;this.readyState='closed';const other=this.other;if(other)other.readyState='closed';queueMicrotask(()=>{this.onclose?.();other?.onclose?.();});}
 }
 class Peer{
  constructor(config){assert.ok(config.iceServers.some(s=>s.urls==='stun:stun.cloudflare.com:3478'));assert.ok(config.iceServers.every(s=>!String(s.urls).includes('turn:')));this.id=++serial;pcs.set(this.id,this);this.iceConnectionState='new';this.remoteDescription=null;this.candidates=[];}
  createDataChannel(name,config){assert.equal(config.ordered,true);return this.dc=new DirectChannel();}
  async createOffer(){return {type:'offer',sdp:'offer:'+this.id};}
  async createAnswer(){return {type:'answer',sdp:'answer:'+this.id};}
  async setLocalDescription(description){this.localDescription={...description,toJSON:()=>description};queueMicrotask(()=>this.onicecandidate?.({candidate:{candidate:'candidate:fake 1 udp 1 host.local 5000 typ host',sdpMid:'0',sdpMLineIndex:0}}));}
  async setRemoteDescription(description){
   this.remoteDescription=description;
   if(description.type==='offer')this.host=pcs.get(Number(description.sdp.split(':')[1]));
   else if(connects){const guest=pcs.get(Number(description.sdp.split(':')[1]));const remote=new DirectChannel();guest.dc=remote;guest.ondatachannel?.({channel:remote});this.dc.other=remote;remote.other=this.dc;this.dc.readyState=remote.readyState='open';this.iceConnectionState=guest.iceConnectionState='connected';queueMicrotask(()=>this.dc.onopen?.());queueMicrotask(()=>remote.onopen?.());}
  }
  async addIceCandidate(candidate){assert.ok(this.remoteDescription,'candidate waits for remote description');this.candidates.push(candidate);}
  async getStats(){return new Map([['transport',{type:'transport',selectedCandidatePairId:'pair'}],['pair',{localCandidateId:'local',remoteCandidateId:'remote'}],['local',{candidateType:'host',protocol:'udp'}],['remote',{candidateType:'host',protocol:'udp'}]]);}
  close(){this.dc?.close();this.iceConnectionState='closed';}
 }
 class BrowserSocket extends WebSocket{
  constructor(){super(origin.replace('http:','ws:')+'/ws',{origin});sockets.push(this);}
  send(text,...args){const message=JSON.parse(text);if(['rb-input'].includes(message.type))wireCounts.wsCombat++;return super.send(text,...args);}
 }
 const host=client(DB),guest=client(DB);
 for(const c of [host,guest]){c.ctx.window.WebSocket=c.ctx.WebSocket=BrowserSocket;c.ctx.window.RTCPeerConnection=c.ctx.RTCPeerConnection=Peer;c.run("mode='online'");}
 const wait=async(check)=>{const end=Date.now()+4000;while(!check()){if(Date.now()>end)throw Error('Hybrid condition timed out');for(const c of [host,guest])c.run('if(window.testTransport.session())window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,5));}};
 host.el('select0').value=p1;host.el('mapSelect').value=arena;await host.el('createRoom').onclick();guest.el('roomCode').value=host.el('lobbyCode').textContent;guest.el('select0').value=p2;await guest.el('joinRoom').onclick();
 return {DB,host,guest,wait,pcs,wireCounts,async close(){for(const c of [host,guest])c.run('window.riftNet.leave()');await flush();for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();}};
}


async function pump(f,n=400){for(let i=0;i<n;i++){for(const c of [f.host,f.guest])c.run('window.testTransport.session().startAt=0;window.riftNet.frame(1/120);');if(i%2===0){for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,3));}}for(let i=0;i<6;i++){await flush();for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');}}
async function synced(f){await f.wait(()=>[f.host,f.guest].every(c=>!c.run('window.riftNet.blocked')));}
test('production symmetric rollback over DIRECT, checkpoint fallback to real WS and desync repair',async()=>{const f=await hybridPair();try{await synced(f);await pump(f,400);assert.equal(f.host.run('phase'),'fight');assert.equal(f.guest.run('phase'),'fight');f.host.run("keys.KeyD=true;window.riftNet.action('q')");f.guest.run("keys.KeyA=true;window.riftNet.action('q')");await pump(f,140);for(const c of [f.host,f.guest])c.run('keys={}');await pump(f,60);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));assert.equal(f.wireCounts.wsCombat,0);assert.ok(f.wireCounts.directCombat>0);
 const epoch=f.host.run('window.testTransport.session().epoch');f.guest.run('window.testTransport.session().directChannel.close()');await synced(f);await pump(f,90);assert.ok(f.host.run('window.testTransport.session().epoch')>epoch);assert.ok(f.wireCounts.wsCombat>0);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));
 const before=f.host.run('window.testTransport.session().epoch');f.guest.run('fighters[0].hp-=17');await pump(f,100);await synced(f);await pump(f,100);assert.ok(f.host.run('window.testTransport.session().epoch')>before);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));
 }catch(e){console.error('NETWORKFAIL',e);throw e;}finally{await f.close();}});
test('blocked DIRECT starts both clients over WS; socket reconnect resumes a confirmed checkpoint',async()=>{const f=await hybridPair(false);try{await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));f.host.expireDirect();await synced(f);await pump(f,400);assert.equal(f.host.run('phase'),'fight');const epoch=f.host.run('window.testTransport.session().epoch');f.host.run('window.testTransport.session().socket.terminate()');await f.wait(()=>f.host.run('window.testTransport.session().reconnectAt>0'));f.host.reconnect();await synced(f);await pump(f,90);assert.ok(f.host.run('window.testTransport.session().epoch')>epoch);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));}catch(e){console.error('NETWORKFAIL',e);throw e;}finally{await f.close();}});

test('Fairi mirror match synchronizes clones and R over production DIRECT',async()=>{const f=await hybridPair(true,'fairi','fairi');try{await synced(f);await pump(f,400);for(const c of [f.host,f.guest])assert.equal(c.run('fighters.every(f=>!!f.fairi&&f.hp===900)'),true);f.host.run("window.riftNet.action('e')");f.guest.run("window.riftNet.action('e')");await pump(f,70);for(const c of [f.host,f.guest])assert.equal(c.run('fighters.every(f=>f.fairi.clones.length===4)'),true);f.host.run("window.riftNet.action('r')");f.guest.run("window.riftNet.action('q')");await pump(f,180);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));assert.equal(f.wireCounts.wsCombat,0);assert.ok(f.wireCounts.directCombat>0);}finally{await f.close();}});

for(const direct of [true,false])test('forest owner selection and world rollback synchronize over '+(direct?'DIRECT':'WS'),async()=>{const f=await hybridPair(direct,'fairi','mox','forest');try{if(!direct){await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));f.host.expireDirect();}await synced(f);await pump(f,410);for(const c of [f.host,f.guest]){assert.equal(c.run('activeMap'),'forest');assert.equal(c.run('W'),3200);assert.equal(c.el('mapSelect').disabled,true);}f.host.run("window.riftNet.action('e')");f.guest.run("window.riftNet.action('q')");await pump(f,150);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));}finally{await f.close();}});
