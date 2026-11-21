import test from 'node:test';import assert from 'node:assert/strict';import {client} from './rollback-harness.mjs';import {localDB} from '../scripts/local-db.mjs';
const flush=()=>new Promise(setImmediate);
async function hybridPair(connects=true,dropFirstProbe=false){
 const {default:http}=await import('node:http');const {WebSocket}=await import('ws');const {attachRelay}=await import('../scripts/relay.mjs');
 const DB=localDB(),server=http.createServer(),relay=attachRelay(server,DB);server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const origin='http://127.0.0.1:'+server.address().port,sockets=[],pcs=new Map(),wireCounts={wsCombat:0,directCombat:0};let serial=0;
 class DirectChannel{
  constructor(){this.readyState='connecting';this.bufferedAmount=0;}
  send(data){if(this.readyState!=='open')throw Error('closed');const message=JSON.parse(data);if(dropFirstProbe&&message.type==='direct-probe'&&!this.droppedProbe){this.droppedProbe=true;return;}if(['rb-input'].includes(message.type))wireCounts.directCombat++;queueMicrotask(()=>{if(this.other?.readyState==='open')this.other.onmessage?.({data});});}
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
   else if(typeof connects==='function'?connects():connects){const guest=pcs.get(Number(description.sdp.split(':')[1]));const remote=new DirectChannel();guest.dc=remote;guest.ondatachannel?.({channel:remote});this.dc.other=remote;remote.other=this.dc;this.dc.readyState=remote.readyState='open';this.iceConnectionState=guest.iceConnectionState='connected';queueMicrotask(()=>this.dc.onopen?.());queueMicrotask(()=>remote.onopen?.());}
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
 const wait=async(check)=>{const end=Date.now()+4000;while(!check()){if(Date.now()>end)throw Error('Hybrid condition timed out');for(const c of [host,guest]){await c.run('window.testTransport.poll(window.testTransport.session())');c.run('if(window.testTransport.session())window.testTransport.fast(window.testTransport.session())');}await new Promise(r=>setTimeout(r,5));}};
 await host.el('createRoom').onclick();guest.el('roomCode').value=host.el('lobbyCode').textContent;guest.el('select0').value='soul';await guest.el('joinRoom').onclick();
 await host.run("window.riftNet.roomAction('ready',{value:true})");await host.run("window.riftNet.roomAction('ready',{value:true})");await guest.run("window.riftNet.roomAction('ready',{value:true})");
 return {DB,host,guest,wait,pcs,wireCounts,async close(){for(const c of [host,guest])c.run('window.riftNet.leave()');await flush();for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();}};
}


async function pump(f,n=400){for(let i=0;i<n;i++){for(const c of [f.host,f.guest])c.run('window.testTransport.session().startAt=0;window.riftNet.frame(1/120);');if(i%2===0){for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,3));}}for(let i=0;i<6;i++){await flush();for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');}}
async function synced(f){await f.wait(()=>[f.host,f.guest].every(c=>!c.run('window.riftNet.blocked')));}

test('compact badge shows measured peer RTT and color without server RTT',async()=>{const fs=await import('node:fs');assert.match(fs.readFileSync(new URL('../web/style.css',import.meta.url),'utf8'),/#netBadge\[hidden\]\{display:none\}/);const f=await hybridPair();try{await synced(f);const h=f.host;for(const [ping,jitter,quality]of [[35,0,'good'],[110,0,'fair'],[220,0,'bad'],[35,90,'bad'],[null,0,'pending']]){h.ctx.ping=ping;h.ctx.jitter=jitter;h.run('var n=window.testTransport.session();n.peerPing=ping;n.jitter=jitter;n.serverPing=9;window.testTransport.paintPing(n)');assert.equal(h.el('netBadge').textContent,(ping??'—')+' ms');assert.equal(h.el('netBadge').dataset.quality,quality);assert.ok(!h.el('netBadge').textContent.includes('SERVER'));}}finally{await f.close();}});
test('AUTO keeps an active WS match stable when DIRECT becomes available later',async()=>{let available=false;const f=await hybridPair(()=>available);try{await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));f.host.expireDirect();await synced(f);await pump(f,400);const epoch=f.host.run('window.testTransport.session().epoch'),attempts=f.host.run('window.testTransport.session().directAttempts');available=true;f.host.run('window.testTransport.session().directRetryAt=0;window.testTransport.fast(window.testTransport.session())');await pump(f,80);for(const c of [f.host,f.guest]){assert.equal(c.run('window.testTransport.session().activeRoute'),'ws');assert.equal(c.run('window.testTransport.session().epoch'),epoch);assert.equal(c.run('window.riftNet.blocked'),false);assert.equal(c.run('!!window.testTransport.session().pc'),false);}assert.equal(f.host.run('window.testTransport.session().directAttempts'),attempts);assert.equal(f.wireCounts.directCombat,0);assert.ok(f.wireCounts.wsCombat>0);}finally{await f.close();}});

test('lost initial DIRECT probes retry without TURN or WS gameplay',async()=>{const f=await hybridPair(true,true);try{await synced(f);await f.wait(()=>[f.host,f.guest].every(c=>c.run('window.testTransport.session().activeRoute')==='direct'));await pump(f,410);assert.equal(f.wireCounts.wsCombat,0);assert.ok(f.wireCounts.directCombat>0);for(const c of [f.host,f.guest])assert.equal(c.run('window.testTransport.session().directFailed'),undefined);}finally{await f.close();}});
