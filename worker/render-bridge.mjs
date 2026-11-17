import {api} from './core.mjs';
import {authenticatedApi} from './account-auth.mjs';
const RENDER_ORIGIN='https://saga-fight.onrender.com';
const bridgeJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const bridgeHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const bridgeFighter=value=>['thunder','soul','cylast','mox','melanta','fairi','aether'].includes(value)?value:'thunder';
async function upstreamRoom(action,data,authorization=''){
 const headers={'Content-Type':'application/json',Origin:RENDER_ORIGIN};if(authorization)headers.Authorization=authorization;
 const response=await fetch(RENDER_ORIGIN+'/api/rooms/'+action,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
 if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Render HTTP '+response.status+' returned '+(response.headers.get('Content-Type')||'unknown content type'));
 return response;
}
export async function bridgeApi(original,env){return authenticatedApi(original,env,bridgeAuthenticatedApi);}
async function bridgeAuthenticatedApi(request,env){
 const url=new URL(request.url),action=url.pathname.slice('/api/rooms/'.length);
 if(!url.pathname.startsWith('/api/rooms/')||request.method!=='POST')return api(request,env);
 const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return bridgeJson({error:'Không cho phép yêu cầu từ trang khác.'},403);
 if(Number(request.headers.get('Content-Length')||0)>85000)return bridgeJson({error:'Dữ liệu quá lớn.'},413);
 let text,data;try{text=await request.clone().text();if(text.length>85000)return bridgeJson({error:'Dữ liệu quá lớn.'},413);data=JSON.parse(text);}catch{return bridgeJson({error:'Dữ liệu không hợp lệ.'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return bridgeJson({error:'Dữ liệu không hợp lệ.'},400);
 if(!env.DB)return bridgeJson({error:'Online chưa sẵn sàng.'},503);
 try{
  if(action==='create'){
   const remote=await upstreamRoom('create',data),result=await remote.json();if(!remote.ok)return bridgeJson(result,remote.status);
   const now=Date.now(),config={...result.config,lobby:{stage:'lobby',revision:0,generation:0,ready:[false,false]}};
   try{await env.DB.prepare('DELETE FROM duel_rooms WHERE expires_at < ?').bind(now).run();await env.DB.prepare('INSERT INTO duel_rooms(code,host_key,config,status,host_seen,expires_at,host_user_id) VALUES(?,?,?,?,?,?,?)').bind(result.code,await bridgeHash(result.token),JSON.stringify(config),'waiting',now,now+7200000,request.headers.get('oai-authenticated-user-id')).run();}
   catch(error){await upstreamRoom('leave',{code:result.code},'Bearer '+result.token).catch(()=>{});throw error;}
   return bridgeJson({...result,config},remote.status);
  }
  if(action==='join'){
   const code=String(data.code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))return bridgeJson({error:'Mã phòng gồm 6 ký tự.'},400);
   const room=await env.DB.prepare('SELECT * FROM duel_rooms WHERE code=? AND expires_at>?').bind(code,Date.now()).first();
   if(!room||room.status==='closed')return bridgeJson({error:'Phòng không tồn tại. Hai máy cần dùng cùng link test này.'},404);
   if(room.guest_key)return bridgeJson({error:'Phòng đã đủ hai người.'},409);
   const remote=await upstreamRoom('join',{...data,code}),result=await remote.json();if(!remote.ok)return bridgeJson(result,remote.status);
   const config={...JSON.parse(room.config),p2:bridgeFighter(data.fighter)};config.lobby={...config.lobby,stage:'lobby',revision:config.lobby.revision+1,ready:[false,false]};
   const changed=await env.DB.prepare("UPDATE duel_rooms SET guest_key=?,config=?,guest_seen=?,guest_user_id=?,status='joined' WHERE code=? AND guest_key IS NULL").bind(await bridgeHash(result.token),JSON.stringify(config),Date.now(),request.headers.get('oai-authenticated-user-id'),code).run();
   if(!changed.meta?.changes){await upstreamRoom('leave',{code},'Bearer '+result.token).catch(()=>{});return bridgeJson({error:'Phòng đã thay đổi. Hãy tạo phòng mới.'},409);}
   return bridgeJson({...result,config},remote.status);
  }
  const local=await api(request,env);
  if(local.ok&&['sync','leave'].includes(action)){const remote=await upstreamRoom(action,data,request.headers.get('Authorization')||'');if(!remote.ok&&action==='sync')return remote;}
  return local;
 }catch(error){console.error('[render-bridge]',action,error.name,String(error.message).slice(0,240));return bridgeJson({error:'Chưa kết nối được server Render. Chờ server khởi động rồi tạo phòng lại.'},503);}
}
export async function bridgeWebSocket(request){
 const url=new URL(request.url);if(request.headers.get('Origin')!==url.origin)return new Response('Forbidden',{status:403});
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket upgrade required',{status:426});
 const headers=new Headers();for(const name of ['Upgrade','Connection','Sec-WebSocket-Key','Sec-WebSocket-Version','Sec-WebSocket-Protocol','Sec-WebSocket-Extensions']){const value=request.headers.get(name);if(value)headers.set(name,value);}
 headers.set('Origin',RENDER_ORIGIN);
 let relayVersion=94;try{const health=await (await fetch(RENDER_ORIGIN+'/healthz',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(3000)})).json();if(/^6\.25\./.test(health.clientBuild||health.build||''))relayVersion=93;}catch{}
 const response=await fetch(RENDER_ORIGIN+'/ws',{method:'GET',headers});
 if(response.status!==101||!response.webSocket)return response;
 const pair=new WebSocketPair(),client=pair[0],server=pair[1],remote=response.webSocket;
 server.accept();remote.accept();
 const close=(socket,code,reason)=>{try{socket.close(code===1000||code>=3000&&code<=4999?code:1011,reason||'Relay closed');}catch{}};
 server.addEventListener('message',event=>{try{let payload=event.data;if(relayVersion===93&&typeof payload==='string'){try{const message=JSON.parse(payload);if(message.type==='auth'&&message.version===94)payload=JSON.stringify({...message,version:93});}catch{}}remote.send(payload);}catch{close(server,1011,'Relay send failed');}});
 remote.addEventListener('message',event=>{try{server.send(event.data);}catch{close(remote,1011,'Client send failed');}});
 server.addEventListener('close',event=>close(remote,event.code,event.reason));
 remote.addEventListener('close',event=>close(server,event.code,event.reason));
 server.addEventListener('error',()=>close(remote,1011,'Client connection failed'));
 remote.addEventListener('error',()=>close(server,1011,'Render connection failed'));
 return new Response(null,{status:101,webSocket:client});
}
