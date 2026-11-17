const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const hash=async str=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const fighter=v=>['thunder','soul','cylast','mox','melanta','fairi','aether'].includes(v)?v:'thunder';
const accountId=r=>r.headers.get('oai-authenticated-user-id')&&r.headers.get('oai-authenticated-user-email')?r.headers.get('oai-authenticated-user-id'):null;
const RESULTS=`WITH results AS (
 SELECT host_user_id user_id,p1 fighter,mode,CASE WHEN winner=0 THEN 1 ELSE 0 END won,finished_at FROM game_matches WHERE winner IS NOT NULL AND host_user_id IS NOT NULL AND (mode='pve' OR COALESCE(host_user_id,'')<>COALESCE(guest_user_id,''))
 UNION ALL SELECT guest_user_id,p2,mode,CASE WHEN winner=1 THEN 1 ELSE 0 END,finished_at FROM game_matches WHERE winner IS NOT NULL AND mode='online' AND guest_user_id IS NOT NULL AND COALESCE(host_user_id,'')<>COALESCE(guest_user_id,''))`;
async function playerStats(DB,id){const total=await DB.prepare(RESULTS+' SELECT COUNT(*) played,COALESCE(SUM(won),0) wins FROM results WHERE user_id=?').bind(id).first();const favorite=await DB.prepare(RESULTS+' SELECT fighter,COUNT(*) games FROM results WHERE user_id=? GROUP BY fighter ORDER BY games DESC,MAX(finished_at) DESC,fighter ASC LIMIT 1').bind(id).first();const rank=await DB.prepare(RESULTS+", ranks AS (SELECT user_id,DENSE_RANK() OVER (ORDER BY SUM(won) DESC,CAST(SUM(won) AS REAL)/COUNT(*) DESC) position FROM results WHERE mode='online' GROUP BY user_id) SELECT position FROM ranks WHERE user_id=?").bind(id).first();return {rank:rank?.position??null,played:total.played,wins:total.wins,losses:total.played-total.wins,winRate:total.played?Math.round(total.wins/total.played*1000)/10:0,favorite:favorite?{type:favorite.fighter,games:favorite.games}:null};}
export async function api(request,env){
 const url=new URL(request.url),now=Date.now();
 if(url.pathname==='/api/account'){
  if(request.method!=='GET')return json({error:'Chỉ hỗ trợ GET.'},405);
  const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');if(!id||!email)return json({authenticated:false,user:null});
  let name=null;const full=request.headers.get('oai-authenticated-user-full-name');if(full&&request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(full);}catch{}}
  const username=/^[a-z0-9_]{3,24}@players\.sagafight\.invalid$/.test(email)?email.split('@')[0]:null;
  return json({authenticated:true,user:{displayName:(name||username||email).slice(0,120),email,...(username?{username}:{})}});
 }

 if(url.pathname==='/api/account/stats'){
  if(request.method!=='GET')return json({error:'Chỉ hỗ trợ GET.'},405);const id=accountId(request);if(!id)return json({error:'Vui lòng đăng nhập để xem thống kê.'},401);if(!env.DB)return json({error:'Thống kê chưa sẵn sàng.'},503);try{return json({stats:await playerStats(env.DB,id)});}catch{return json({error:'Chưa tải được thống kê.'},503);}
 }
 if(request.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Không cho phép yêu cầu từ trang khác.'},403);
 if(Number(request.headers.get('Content-Length')||0)>85000)return json({error:'Dữ liệu quá lớn.'},413);
 let text=await request.text();if(text.length>85000)return json({error:'Dữ liệu quá lớn.'},413);
 let data;try{data=JSON.parse(text);}catch{return json({error:'Dữ liệu không hợp lệ.'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Dữ liệu không hợp lệ.'},400);
 try{
  if(!env.DB)fail('Online chưa sẵn sàng. Vui lòng thử lại.',503);
  if(url.pathname==='/api/account/pve-start'||url.pathname==='/api/account/pve-finish'){
   const id=accountId(request);if(!id)fail('Vui lòng đăng nhập để lưu thống kê.',401);if(typeof data.id!=='string'||!/^[-a-f0-9]{36}$/i.test(data.id))fail('Mã trận không hợp lệ.');
   if(url.pathname.endsWith('pve-start')){if(fighter(data.fighter)!==data.fighter)fail('Chiến binh không hợp lệ.');await env.DB.prepare("INSERT OR IGNORE INTO game_matches(id,mode,p1,host_user_id,created_at) VALUES(?,'pve',?,?,?)").bind(data.id,data.fighter,id,now).run();const match=await env.DB.prepare('SELECT * FROM game_matches WHERE id=?').bind(data.id).first();if(match.host_user_id!==id||match.mode!=='pve'||match.p1!==data.fighter)fail('Trận đấu không thuộc tài khoản này.',403);return json({id:match.id});}
   const match=await env.DB.prepare('SELECT * FROM game_matches WHERE id=?').bind(data.id).first();if(!match||match.host_user_id!==id||match.mode!=='pve')fail('Trận đấu không thuộc tài khoản này.',403);if(![0,1].includes(data.winner))fail('Kết quả không hợp lệ.');if(match.winner!=null&&match.winner!==data.winner)fail('Trận đấu đã được ghi nhận.',409);await env.DB.prepare('UPDATE game_matches SET winner=?,finished_at=? WHERE id=? AND winner IS NULL').bind(data.winner,now,data.id).run();return json({saved:true});
  }
  if(url.pathname==='/api/rooms/create'){
   // Expired rooms are disposable; bounded cleanup keeps the live table small.
   await env.DB.prepare('DELETE FROM duel_rooms WHERE code IN (SELECT code FROM duel_rooms WHERE expires_at < ? LIMIT 100)').bind(now).run();
   const secret=token(),key=await hash(secret),config={p1:fighter(data.p1),p2:fighter(data.p2),map:data.map==='forest'?'forest':'cavern',connection:data.connection==='direct'?'direct':'auto',lobby:{stage:'lobby',revision:0,generation:0,ready:[false,false]}},alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   for(let attempt=0;attempt<4;attempt++){
    const bytes=crypto.getRandomValues(new Uint8Array(6)),code=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
    try{await env.DB.prepare('INSERT INTO duel_rooms(code,host_key,config,status,host_seen,expires_at,host_user_id) VALUES(?,?,?,?,?,?,?)').bind(code,key,JSON.stringify(config),'waiting',now,now+7200000,accountId(request)).run();return json({code,token:secret,role:'host',config},201);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
   }fail('Chưa tạo được phòng. Vui lòng thử lại.',503);
  }
  const code=String(data.code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))fail('Mã phòng gồm 6 ký tự.');
  let room=await env.DB.prepare('SELECT * FROM duel_rooms WHERE code = ? AND expires_at > ?').bind(code,now).first();
  if(!room||room.status==='closed'&&url.pathname!=='/api/rooms/result')fail('Phòng không tồn tại hoặc đã đóng.',404);
  if(url.pathname==='/api/rooms/join'){
   if(room.host_seen<now-30000)fail('Chủ phòng không còn kết nối. Hãy tạo phòng mới.',409);
   if(room.guest_key)fail('Phòng đã đủ hai người.',409);
   const secret=token(),config={...JSON.parse(room.config),p2:fighter(data.fighter)};config.lobby={...(config.lobby||{generation:0}),stage:'lobby',revision:(config.lobby?.revision||0)+1,ready:[false,false]};
   const result=await env.DB.prepare("UPDATE duel_rooms SET guest_key=?,config=?,guest_seen=?,guest_user_id=?,status='joined' WHERE code=? AND guest_key IS NULL AND status='waiting' AND config=?").bind(await hash(secret),JSON.stringify(config),now,accountId(request),code,room.config).run();
   if(!result.meta?.changes)fail('Phòng đã đủ hai người.',409);
   return json({code,token:secret,role:'guest',config});
  }
  const secret=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!secret||secret.length>200)fail('Phiên chơi không hợp lệ.',401);
  const key=await hash(secret),role=key===room.host_key?'host':key===room.guest_key?'guest':null;if(!role)fail('Phiên chơi không hợp lệ.',401);
  if(url.pathname==='/api/rooms/result'){
   if(role!=='host')fail('Chỉ chủ phòng được xác nhận kết quả.',403);if(![0,1].includes(data.winner)||typeof data.id!=='string')fail('Kết quả không hợp lệ.');const match=await env.DB.prepare("SELECT * FROM game_matches WHERE id=? AND room_code=? AND mode='online'").bind(data.id,code).first();if(!match)fail('Không tìm thấy trận đấu.',404);if(match.winner!=null&&match.winner!==data.winner)fail('Trận đấu đã được ghi nhận.',409);await env.DB.prepare('UPDATE game_matches SET winner=?,finished_at=? WHERE id=? AND winner IS NULL').bind(data.winner,now,data.id).run();return json({saved:true});
  }
  if(url.pathname==='/api/rooms/leave'){
   await env.DB.prepare("UPDATE duel_rooms SET status='closed' WHERE code=?").bind(code).run();return json({closed:true});
  }
  if(url.pathname==='/api/rooms/lobby'){
   const config=JSON.parse(room.config),l=config.lobby||{stage:'lobby',revision:0,generation:0,ready:[false,false]},id=role==='host'?0:1;
   if(!Number.isInteger(data.revision)||data.revision!==l.revision)return json({error:'Lựa chọn đã thay đổi. Vui lòng kiểm tra và bấm lại.',config},409);
   if(data.action==='return'){
    if(l.stage==='playing'){l.stage='lobby';l.ready=[false,false];}
   }else{
    if(l.stage!=='lobby')fail('Trận đấu đã bắt đầu.',409);
    if(data.action==='select'){
     if(l.ready[id])fail('Hủy sẵn sàng trước khi đổi lựa chọn.',409);
     if(data.map!==undefined&&role!=='host')fail('Chỉ chủ phòng được chọn đấu trường.',403);
     if(data.fighter!==undefined){if(fighter(data.fighter)!==data.fighter)fail('Chiến binh không hợp lệ.');config[id?'p2':'p1']=data.fighter;}
     if(data.map!==undefined){if(!['forest','cavern'].includes(data.map))fail('Đấu trường không hợp lệ.');config.map=data.map;}
     l.ready=[false,false];
    }else if(data.action==='ready'){
     if(typeof data.value!=='boolean')fail('Trạng thái sẵn sàng không hợp lệ.');
     if(data.value&&!room.guest_key)fail('Đang chờ người chơi thứ hai.',409);
     l.ready[id]=data.value;if(l.ready.every(Boolean)){l.stage='playing';l.generation++;l.matchId=crypto.randomUUID();}
    }else fail('Thao tác phòng không hợp lệ.');
   }
   l.revision++;config.lobby=l;
   const update=env.DB.prepare('UPDATE duel_rooms SET config=? WHERE code=? AND config=?').bind(JSON.stringify(config),code,room.config);let changed;
   if(l.stage==='playing'&&data.action==='ready'){
    // This batch commits the frozen participants and ready transition atomically.
    const insert=env.DB.prepare("INSERT OR IGNORE INTO game_matches(id,mode,room_code,generation,p1,p2,host_user_id,guest_user_id,created_at) SELECT ?,'online',code,?,?,?,host_user_id,guest_user_id,? FROM duel_rooms WHERE code=? AND config=?").bind(l.matchId,l.generation,config.p1,config.p2,now,code,JSON.stringify(config));
    [changed]=await env.DB.batch([update,insert]);
   }else changed=await update.run();
   if(!changed.meta?.changes)return json({error:'Lựa chọn vừa thay đổi. Vui lòng bấm lại.',config:JSON.parse((await env.DB.prepare('SELECT * FROM duel_rooms WHERE code=?').bind(code).first()).config)},409);
   return json({config});
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
