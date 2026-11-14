import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {attachRelay} from '../scripts/relay.mjs';
import {localDB} from '../scripts/local-db.mjs';
import {api} from '../worker/index.mjs';

async function fixture(){
 const DB=localDB(),server=http.createServer();const relay=attachRelay(server,DB,{authTimeoutMs:100,heartbeatMs:200});
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 const sockets=[];
 async function call(name,data,token){const r=await api(new Request(origin+'/api/rooms/'+name,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)}),{DB});return r.json();}
 async function socket(session,options={}){
  const ws=new WebSocket(origin.replace('http:','ws:')+'/ws',{origin,...options});sockets.push(ws);const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));
  await once(ws,'open');if(session)ws.send(JSON.stringify({type:'auth',version:84,code:session.code,token:session.token}));
  return {ws,messages};
 }
 async function wait(check){const end=Date.now()+3000;while(!check()){if(Date.now()>end)throw Error('Timed out waiting for relay');await new Promise(r=>setTimeout(r,5));}}
 return {DB,server,relay,origin,call,socket,wait,async close(){for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));DB.close();}};
}
test('real WebSockets relay host state and guest input, isolate rooms and recover a new socket',async()=>{
 const f=await fixture();try{
  const host=await f.call('create',{}),guest=await f.call('join',{code:host.code}),other=await f.call('create',{});
  const h=await f.socket(host),g=await f.socket(guest),o=await f.socket(other);
  await f.wait(()=>h.messages.some(m=>m.event==='ready')&&g.messages.some(m=>m.event==='ready'));
  h.ws.send(JSON.stringify({type:'state',epoch:1,value:{id:1,fighters:[{hp:1000},{hp:900}]}}));
  g.ws.send(JSON.stringify({type:'input',epoch:1,events:[{id:1,k:'q'}],frames:[{seq:1,move:1}]}));
  await f.wait(()=>g.messages.some(m=>m.type==='state')&&h.messages.some(m=>m.type==='input'));
  assert.equal(o.messages.some(m=>['state','input'].includes(m.type)),false);
  assert.equal(g.messages.find(m=>m.type==='state').value.fighters[1].hp,900);
  g.ws.terminate();await f.wait(()=>h.messages.some(m=>m.event==='peer-disconnected'));
  const replacement=await f.socket(guest);await f.wait(()=>replacement.messages.some(m=>m.event==='ready'));
  h.ws.send(JSON.stringify({type:'state',epoch:2,value:{id:2}}));await f.wait(()=>replacement.messages.some(m=>m.type==='state'&&m.epoch===2));
  f.relay.roomClosed(host.code);await f.wait(()=>h.ws.readyState===WebSocket.CLOSED&&replacement.ws.readyState===WebSocket.CLOSED);
 }finally{await f.close();}
});
test('relay rejects bad credentials, unauthenticated sockets and guest state injection',async()=>{
 const f=await fixture();try{
  const host=await f.call('create',{}),guest=await f.call('join',{code:host.code});
  const bad=await f.socket({...host,token:'wrong'});await f.wait(()=>bad.ws.readyState===WebSocket.CLOSED);
  const empty=await f.socket(null);await f.wait(()=>empty.ws.readyState===WebSocket.CLOSED);
  const h=await f.socket(host),g=await f.socket(guest);await f.wait(()=>g.messages.some(m=>m.event==='ready'));
  g.ws.send(JSON.stringify({type:'state',epoch:1,value:{id:99}}));await f.wait(()=>g.ws.readyState===WebSocket.CLOSED);
  assert.equal(h.messages.some(m=>m.type==='state'),false);
 }finally{await f.close();}
});
test('relay rejects cross-origin upgrade and handles HTTPS proxy origin',async()=>{
 const f=await fixture();try{
  const bad=new WebSocket(f.origin.replace('http:','ws:')+'/ws',{origin:'https://other.test'});
  const [error]=await once(bad,'error');assert.match(error.message,/403/);
  const host=await f.call('create',{});
  const secure=await f.socket(host,{origin:f.origin.replace('http:','https:'),headers:{'X-Forwarded-Proto':'https'}});
  await f.wait(()=>secure.messages.some(m=>m.event==='authenticated'));
 }finally{await f.close();}
});

test('direct server probe is echoed locally and never forwarded to opponent',async()=>{
 const f=await fixture();try{
  const host=await f.call('create',{}),guest=await f.call('join',{code:host.code});
  const h=await f.socket(host),g=await f.socket(guest);await f.wait(()=>h.messages.some(m=>m.event==='ready'));
  h.ws.send(JSON.stringify({type:'server-ping',id:123}));
  await f.wait(()=>h.messages.some(m=>m.event==='server-pong'&&m.id===123));
  assert.equal(g.messages.some(m=>m.type==='server-ping'||m.event==='server-pong'),false);
 }finally{await f.close();}
});

test('direct signaling is restricted to room peers and only host can select a route',async()=>{
 const f=await fixture();try{
  const host=await f.call('create',{}),guest=await f.call('join',{code:host.code}),other=await f.call('create',{});
  const h=await f.socket(host),g=await f.socket(guest),o=await f.socket(other);await f.wait(()=>h.messages.some(m=>m.event==='ready'));
  h.ws.send(JSON.stringify({type:'direct',kind:'offer',description:{type:'offer',sdp:'private-room-offer'}}));
  await f.wait(()=>g.messages.some(m=>m.type==='direct'&&m.kind==='offer'));
  assert.equal(o.messages.some(m=>m.type==='direct'),false);
  g.ws.send(JSON.stringify({type:'direct',kind:'select',id:1,mode:'direct'}));
  await f.wait(()=>g.ws.readyState===WebSocket.CLOSED);
  assert.equal(h.messages.some(m=>m.type==='direct'&&m.kind==='select'),false);
 }finally{await f.close();}
});
