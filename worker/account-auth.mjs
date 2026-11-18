// Only public client credentials are exposed. Never accept a service_role key.
export function authConfig(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),key=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 let publicKey=key.startsWith('sb_publishable_');
 if(!publicKey&&key.split('.').length===3){try{publicKey=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}}
 try{if(new URL(url).protocol!=='https:')return null;}catch{return null;}
 return publicKey?{url,key}:null;
}
export async function accountRequest(original,env){
 const headers=new Headers(original.headers);
 for(const name of [...headers.keys()])if(name.startsWith('oai-'))headers.delete(name);
 const path=new URL(original.url).pathname;
 const token=headers.get('X-Saga-Auth');headers.delete('X-Saga-Auth');
 const relevant=path.startsWith('/api/account')||path.startsWith('/api/admin/')||path==='/api/leaderboard'||['/api/rooms/create','/api/rooms/join'].includes(path);
 if(token&&relevant){
  const config=authConfig(env);if(!config)return new Response(JSON.stringify({error:'Tài khoản chưa được cấu hình.'}),{status:503,headers:{'Content-Type':'application/json'}});
  if(token.length>12000)throw Object.assign(Error('Phiên đăng nhập không hợp lệ.'),{status:401});
  let response;try{response=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});}catch{throw Object.assign(Error('Chưa kết nối được dịch vụ tài khoản.'),{status:503});}
  if(!response.ok)throw Object.assign(Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'),{status:response.status>=500?503:401});
  const user=await response.json();if(!user.id||!user.email)throw Object.assign(Error('Tài khoản không hợp lệ.'),{status:401});
  if(user.app_metadata?.saga_role==='admin')headers.set('oai-saga-admin','true');
  headers.set('oai-authenticated-user-id',user.id);headers.set('oai-authenticated-user-email',user.email);
  headers.set('oai-authenticated-user-full-name',encodeURIComponent(String(user.user_metadata?.display_name||user.email).slice(0,80)));
  headers.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8');
 }
 return new Request(original,{headers});
}
export async function authenticatedApi(original,env,handler){
 if(new URL(original.url).pathname==='/api/auth/config'){
  if(original.method!=='GET')return new Response(null,{status:405});
  const config=authConfig(env);return new Response(JSON.stringify({configured:!!config,...(config||{})}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }
 try{const request=await accountRequest(original,env);if(request instanceof Response)return request;const id=request.headers.get('oai-authenticated-user-id');
  if(id&&env.DB&&['/api/account','/api/rooms/create','/api/rooms/join'].includes(new URL(request.url).pathname)){
   const email=request.headers.get('oai-authenticated-user-email')||'';
   // Publish usernames only. Never expose email, auth metadata or real names.
   const name=/^[a-z0-9_]{3,24}@players\.sagafight\.invalid$/.test(email)?email.split('@')[0]:'Chiến binh ẩn danh';
   await env.DB.prepare('INSERT INTO player_profiles(user_id,display_name,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at WHERE player_profiles.display_name<>excluded.display_name').bind(id,name,Date.now()).run();
  }
  return await handler(request,env);}
 catch(error){return new Response(JSON.stringify({error:error.status?error.message:'Chưa tải được tài khoản.'}),{status:error.status||503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
}
