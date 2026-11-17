import test from 'node:test';
import assert from 'node:assert/strict';
import {authConfig,authenticatedApi} from '../worker/account-auth.mjs';
import {api} from '../worker/core.mjs';
import {localDB} from '../scripts/local-db.mjs';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
const origin='https://saga.test';
test('only publishable credentials can reach the browser',async()=>{
 assert.equal(authConfig({...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_private'}),null);
 const response=await authenticatedApi(new Request(origin+'/api/auth/config'),env,api);
 assert.deepEqual(await response.json(),{configured:true,url:env.SUPABASE_URL,key:env.SUPABASE_PUBLISHABLE_KEY});
});
test('server rejects spoofed identity and validates Supabase session before saving PvE identity',async()=>{
 const DB=localDB(),original=globalThis.fetch;let verified=0;
 globalThis.fetch=async(url,options)=>{assert.equal(url,env.SUPABASE_URL+'/auth/v1/user');assert.equal(options.headers.Authorization,'Bearer valid-session');verified++;return Response.json({id:'player-uuid',email:'player@example.test',user_metadata:{display_name:'Chiến binh'}});};
 const call=(path,body,headers={})=>authenticatedApi(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...headers},...(body?{body:JSON.stringify(body)}:{})}),{...env,DB},api);
 try{
  let response=await call('/api/account',null,{'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'spoof@example.test'});assert.equal((await response.json()).authenticated,false);
  response=await call('/api/account',null,{'X-Saga-Auth':'valid-session'});assert.equal((await response.json()).user.displayName,'Chiến binh');assert.equal(verified,1);
  response=await call('/api/account/pve-start',{id:crypto.randomUUID(),fighter:'fairi'},{'X-Saga-Auth':'valid-session'});assert.equal(response.status,200);
  const row=await DB.prepare('SELECT host_user_id FROM game_matches').first();assert.equal(row.host_user_id,'player-uuid');
  globalThis.fetch=async()=>Response.json({error:'invalid'},{status:401});response=await call('/api/account',null,{'X-Saga-Auth':'invalid-session'});assert.equal(response.status,401);
 }finally{globalThis.fetch=original;DB.close();}
});
