const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const hash=async str=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const fighter=v=>['thunder','soul','cylast','mox','melanta','fairi'].includes(v)?v:'thunder';
export async function api(request,env){
 const url=new URL(request.url),now=Date.now();
 if(request.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Không cho phép yêu cầu từ trang khác.'},403);
 if(Number(request.headers.get('Content-Length')||0)>85000)return json({error:'Dữ liệu quá lớn.'},413);
 let text=await request.text();if(text.length>85000)return json({error:'Dữ liệu quá lớn.'},413);
 let data;try{data=JSON.parse(text);}catch{return json({error:'Dữ liệu không hợp lệ.'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Dữ liệu không hợp lệ.'},400);
 try{
  if(!env.DB)fail('Online chưa sẵn sàng. Vui lòng thử lại.',503);
  if(url.pathname==='/api/rooms/create'){
   // Expired rooms are disposable; bounded cleanup keeps the live table small.
   await env.DB.prepare('DELETE FROM duel_rooms WHERE code IN (SELECT code FROM duel_rooms WHERE expires_at < ? LIMIT 100)').bind(now).run();
   const secret=token(),key=await hash(secret),config={p1:fighter(data.p1),p2:fighter(data.p2),connection:data.connection==='direct'?'direct':'auto'},alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   for(let attempt=0;attempt<4;attempt++){
    const bytes=crypto.getRandomValues(new Uint8Array(6)),code=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
    try{await env.DB.prepare('INSERT INTO duel_rooms(code,host_key,config,status,host_seen,expires_at) VALUES(?,?,?,?,?,?)').bind(code,key,JSON.stringify(config),'waiting',now,now+7200000).run();return json({code,token:secret,role:'host',config},201);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
   }fail('Chưa tạo được phòng. Vui lòng thử lại.',503);
  }
  const code=String(data.code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))fail('Mã phòng gồm 6 ký tự.');
  let room=await env.DB.prepare('SELECT * FROM duel_rooms WHERE code = ? AND expires_at > ?').bind(code,now).first();
  if(!room||room.status==='closed')fail('Phòng không tồn tại hoặc đã đóng.',404);
  if(url.pathname==='/api/rooms/join'){
   if(room.host_seen<now-30000)fail('Chủ phòng không còn kết nối. Hãy tạo phòng mới.',409);
   if(room.guest_key)fail('Phòng đã đủ hai người.',409);
   const secret=token(),config={...JSON.parse(room.config),p2:fighter(data.fighter)};
   const result=await env.DB.prepare("UPDATE duel_rooms SET guest_key=?,config=?,guest_seen=?,status='joined' WHERE code=? AND guest_key IS NULL AND status='waiting'").bind(await hash(secret),JSON.stringify(config),now,code).run();
   if(!result.meta?.changes)fail('Phòng đã đủ hai người.',409);
   return json({code,token:secret,role:'guest',config});
  }
  const secret=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!secret||secret.length>200)fail('Phiên chơi không hợp lệ.',401);
  const key=await hash(secret),role=key===room.host_key?'host':key===room.guest_key?'guest':null;if(!role)fail('Phiên chơi không hợp lệ.',401);
  if(url.pathname==='/api/rooms/leave'){
   await env.DB.prepare("UPDATE duel_rooms SET status='closed' WHERE code=?").bind(code).run();return json({closed:true});
  }
  if(url.pathname!=='/api/rooms/sync')fail('Không tìm thấy.',404);
  if(role==='host'){
   if(data.snapshot!==undefined){const s=data.snapshot;if(!s||!Array.isArray(s.fighters)||s.fighters.length!==2||!Number.isFinite(s.tick)||JSON.stringify(s).length>64000)fail('Trạng thái trận đấu không hợp lệ.');}
   const sig=data.offer===undefined?room.offer:JSON.stringify(data.offer);if(sig&&sig.length>20000)fail('Tín hiệu quá lớn.');
   await env.DB.prepare('UPDATE duel_rooms SET host_seen=?,snapshot=?,offer=? WHERE code=?').bind(now,data.snapshot===undefined?room.snapshot:JSON.stringify(data.snapshot),sig,code).run();
  }else{
   if(data.input!==undefined){const v=data.input;if(!v||!Number.isInteger(v.seq)||!Array.isArray(v.events)||v.events.length>32||![-1,0,1].includes(v.move)||v.events.some(e=>!Number.isInteger(e.id)||!['attack','q','w','e','r','jump','drop','pause','ready'].includes(e.k)))fail('Điều khiển không hợp lệ.');}
   const sig=data.answer===undefined?room.answer:JSON.stringify(data.answer);if(sig&&sig.length>20000)fail('Tín hiệu quá lớn.');
   await env.DB.prepare('UPDATE duel_rooms SET guest_seen=?,guest_input=?,answer=? WHERE code=?').bind(now,data.input===undefined?room.guest_input:JSON.stringify(data.input),sig,code).run();
  }
  room=await env.DB.prepare('SELECT * FROM duel_rooms WHERE code=?').bind(code).first();
  return json({status:room.status,config:JSON.parse(room.config),peerSeen:role==='host'?room.guest_seen:room.host_seen,now,
   ...(role==='host'?{input:room.guest_input?JSON.parse(room.guest_input):null,answer:room.answer?JSON.parse(room.answer):null}:{snapshot:room.snapshot?JSON.parse(room.snapshot):null,offer:room.offer?JSON.parse(room.offer):null})});
 }catch(e){return json({error:e.status?e.message:'Không kết nối được phòng. Vui lòng thử lại.'},e.status||500);}
}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api(request,env);let p=url.pathname==='/'?'/index.html':url.pathname;let f=FILES[p];if(!f)return new Response('Not found',{status:404});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const headers={'Content-Type':f[0],'Cache-Control':p.endsWith('.png')?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(f[1]),c=>c.charCodeAt(0)),{headers});}};
