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
 const relevant=path.startsWith('/api/account')||['/api/rooms/create','/api/rooms/join'].includes(path);
 if(token&&relevant){
  const config=authConfig(env);if(!config)return new Response(JSON.stringify({error:'Tài khoản chưa được cấu hình.'}),{status:503,headers:{'Content-Type':'application/json'}});
  if(token.length>12000)throw Object.assign(Error('Phiên đăng nhập không hợp lệ.'),{status:401});
  let response;try{response=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});}catch{throw Object.assign(Error('Chưa kết nối được dịch vụ tài khoản.'),{status:503});}
  if(!response.ok)throw Object.assign(Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'),{status:response.status>=500?503:401});
  const user=await response.json();if(!user.id||!user.email)throw Object.assign(Error('Tài khoản không hợp lệ.'),{status:401});
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
 try{const request=await accountRequest(original,env);if(request instanceof Response)return request;return await handler(request,env);}
 catch(error){return new Response(JSON.stringify({error:error.status?error.message:'Chưa tải được tài khoản.'}),{status:error.status||503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
}
