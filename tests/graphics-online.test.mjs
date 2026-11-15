import test from 'node:test';import assert from 'node:assert/strict';import {client} from './rollback-harness.mjs';import {localDB} from '../scripts/local-db.mjs';
const flush=()=>new Promise(setImmediate);
async function hybridPair(connects=true){
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
 await host.el('createRoom').onclick();guest.el('roomCode').value=host.el('lobbyCode').textContent;guest.el('select0').value='soul';await guest.el('joinRoom').onclick();
 return {DB,host,guest,wait,pcs,wireCounts,async close(){for(const c of [host,guest])c.run('window.riftNet.leave()');await flush();for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();}};
}


async function pump(f,n=400){for(let i=0;i<n;i++){for(const c of [f.host,f.guest])c.run('window.testTransport.session().startAt=0;window.riftNet.frame(1/120);');if(i%2===0){for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,3));}}for(let i=0;i<6;i++){await flush();for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');}}
async function synced(f){await f.wait(()=>[f.host,f.guest].every(c=>!c.run('window.riftNet.blocked')));}

test('different graphics/FPS settings paint at 30/60 while online combat remains synchronized',async()=>{const f=await hybridPair();try{await synced(f);f.host.run("setGraphics('low',30,false)");f.guest.run("setGraphics('high',60,false)");for(const c of [f.host,f.guest])c.run('window.testTransport.session().startAt=0;var paints=0;render=()=>{paints++;viewportDirty=false;};');const epoch=f.host.run('window.testTransport.session().epoch');for(let i=0;i<250;i++){if(i===190){f.host.run('keys.KeyD=true');f.guest.run('keys.KeyA=true');}for(const c of [f.host,f.guest])c.run('frame(last+1000/60);window.testTransport.fast(window.testTransport.session())');await new Promise(r=>setTimeout(r,7));}for(let i=0;i<8;i++){await flush();for(const c of [f.host,f.guest])c.run('window.testTransport.fast(window.testTransport.session())');}assert.ok(f.host.run('paints')>=120&&f.host.run('paints')<=127);assert.ok(f.guest.run('paints')>=246&&f.guest.run('paints')<=252);assert.equal(f.host.run('window.testTransport.session().rb.digest().hash'),f.guest.run('window.testTransport.session().rb.digest().hash'));assert.equal(f.host.run('window.testTransport.session().epoch'),epoch);for(const c of [f.host,f.guest]){assert.equal(c.run('window.riftNet.blocked'),false);assert.equal(c.run('phase'),'fight');}}finally{await f.close();}});
test('graphics preferences survive reload; corrupt or unavailable storage safely defaults',()=>{for(const initial of [{quality:'low',fps:30},{quality:'constructor',fps:17},null]){const DB=localDB(),data={'saga.graphics.v1':JSON.stringify(initial)},storage={getItem:k=>data[k],setItem:(k,v)=>data[k]=v};const c=client(DB,null,'window.riftNet = {room:null};',null,{storage});try{assert.equal(c.run('graphicsQuality'),initial?.quality==='low'?'low':'auto');assert.equal(c.run('graphicsFps'),initial?.fps===30?30:60);c.run("setGraphics('balanced',30)");const fresh=client(DB,null,'window.riftNet = {room:null};',null,{storage});assert.equal(fresh.run('graphicsQuality'),'balanced');assert.equal(fresh.run('graphicsFps'),30);}finally{DB.close();}}const DB=localDB();try{const c=client(DB,null,'window.riftNet = {room:null};',null,{storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});assert.equal(c.run('graphicsQuality'),'auto');c.run("setGraphics('low',30)");assert.equal(c.run('graphicsFps'),30);}finally{DB.close();}});
