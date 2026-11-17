import {WebSocketServer,WebSocket} from 'ws';
import {createHash} from 'node:crypto';

// One instance owns its rooms. Both players simulate combat; host coordinates checkpoints.
export function attachRelay(server,DB,{heartbeatMs=10000,authTimeoutMs=5000}={}){
 const wss=new WebSocketServer({noServer:true,maxPayload:512000,perMessageDeflate:false});
 const rooms=new Map();
 const control=(ws,event,extra={})=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'relay',event,...extra}));};
 const close=(ws,code,reason)=>{if(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CONNECTING){ws.close(code,reason);const timer=setTimeout(()=>ws.terminate(),1000);timer.unref();}};
 const reject=(socket,status)=>{socket.end('HTTP/1.1 '+status+'\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');};
 server.on('upgrade',(req,socket,head)=>{
  let url;try{const protocol=req.headers['x-forwarded-proto']==='https'?'https':'http';url=new URL(req.url,protocol+'://'+req.headers.host);}catch{return reject(socket,'400 Bad Request');}
  if(url.pathname!=='/ws')return reject(socket,'404 Not Found');
  if(req.headers.origin!==url.origin)return reject(socket,'403 Forbidden');
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 wss.on('connection',ws=>{
  let member=null,authenticating=false,alive=true,windowAt=Date.now(),messages=0;
  const authTimer=setTimeout(()=>close(ws,4001,'Authentication required'),authTimeoutMs);authTimer.unref();
  ws.on('error',()=>{});
  ws.on('pong',()=>{alive=true;});
  ws.on('message',async(bytes,binary)=>{
   if(binary)return close(ws,4003,'Text messages required');
   if(Date.now()-windowAt>=1000){windowAt=Date.now();messages=0;}
   if(++messages>300)return close(ws,4003,'Too many messages');
   let message;try{message=JSON.parse(bytes.toString());}catch{return close(ws,4003,'Invalid JSON');}
   if(!message||typeof message!=='object'||Array.isArray(message))return close(ws,4003,'Invalid message');
   if(!member){
    if(authenticating||message.type!=='auth'||message.version!==94||typeof message.token!=='string'||message.token.length>200||!/^[A-Z2-9]{6}$/.test(message.code||''))return close(ws,4001,'Invalid session or version');
    authenticating=true;
    try{
     const row=await DB.prepare('SELECT * FROM duel_rooms WHERE code=? AND expires_at>?').bind(message.code,Date.now()).first();
     if(!row||row.status==='closed')return close(ws,4002,'Room closed');
     const hash=createHash('sha256').update(message.token).digest('hex');
     const role=hash===row.host_key?'host':hash===row.guest_key?'guest':null;
     if(!role)return close(ws,4001,'Invalid session');
     if(ws.readyState!==WebSocket.OPEN)return;
     let room=rooms.get(row.code);if(!room){room={code:row.code,host:null,guest:null,connection:JSON.parse(row.config).connection};rooms.set(row.code,room);}
     const old=room[role];room[role]=ws;member={room,role};clearTimeout(authTimer);
     if(old&&old!==ws)close(old,4004,'Session replaced');
     control(ws,'authenticated',{role});
     if(room.host?.readyState===WebSocket.OPEN&&room.guest?.readyState===WebSocket.OPEN){
      for(const peer of [room.host,room.guest])control(peer,'ready',{config:JSON.parse(row.config)});
     }else control(ws,'waiting');
    }catch{close(ws,1011,'Room service unavailable');}
    return;
   }
   if(message.type==='server-ping'){if(Number.isSafeInteger(message.id))control(ws,'server-pong',{id:message.id});return;}
   if(message.type==='direct'){
    const kind=message.kind,role=member.role;
    const allowed=role==='host'?['offer','candidate','ready','select','fallback']:['answer','candidate','ready','ack','fallback'];
    if(!allowed.includes(kind)||bytes.length>24000)return close(ws,4003,'Invalid direct signal');
    if(['offer','answer'].includes(kind)&&(!message.description||message.description.type!==kind||typeof message.description.sdp!=='string'||message.description.sdp.length>20000))return close(ws,4003,'Invalid description');
    if(kind==='candidate'&&(!message.candidate||typeof message.candidate.candidate!=='string'||message.candidate.candidate.length>2000))return close(ws,4003,'Invalid candidate');
    if(['select','ack'].includes(kind)&&(!Number.isSafeInteger(message.id)||message.id<1||!['direct','ws'].includes(message.mode)))return close(ws,4003,'Invalid route selection');
    const peer=member.room[role==='host'?'guest':'host'];if(peer?.readyState===WebSocket.OPEN&&peer.bufferedAmount<32768)peer.send(bytes,{binary:false});return;
   }
   const allowed=member.role==='host'?['hello','ping','pong','state','rb-init','rb-start','rb-input','rb-hash']:['hello','ping','pong','input','stateAck','resync','rb-ack','rb-input','rb-hash','rb-resync'];
   if(bytes.length>(message.type==='rb-init'?512000:85000))return close(ws,4003,'Message too large');
   if(!allowed.includes(message.type))return close(ws,4003,'Invalid player message');
   if(member.room.connection==='direct'&&['rb-input','rb-hash','input','state'].includes(message.type))return close(ws,4003,'DIRECT-only room forbids relayed combat');
   const peer=member.room[member.role==='host'?'guest':'host'];
   if(peer?.readyState!==WebSocket.OPEN)return;
   // Never keep an unbounded queue of old game snapshots behind a slow peer.
   if(peer.bufferedAmount>262144){peer.terminate();return;}
   if(message.type==='state'&&peer.bufferedAmount>8192)return;
   peer.send(bytes,{binary:false});
  });
  ws.on('close',()=>{
   clearTimeout(authTimer);
   if(!member||member.room[member.role]!==ws)return;
   const {room,role}=member;room[role]=null;
   const peer=room[role==='host'?'guest':'host'];
   if(peer)control(peer,'peer-disconnected');
   if(!room.host&&!room.guest)rooms.delete(room.code);
  });
  ws.checkAlive=()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();};
 });
 const timer=setInterval(()=>{for(const ws of wss.clients)if(ws.readyState===WebSocket.OPEN)ws.checkAlive();},heartbeatMs);timer.unref();
 return {
  roomClosed(code){const room=rooms.get(code);if(!room)return;rooms.delete(code);for(const ws of [room.host,room.guest])if(ws){control(ws,'room-closed');close(ws,4002,'Room closed');}},
  close(){clearInterval(timer);for(const ws of wss.clients)close(ws,1012,'Server restarting');wss.close();}
 };
}
