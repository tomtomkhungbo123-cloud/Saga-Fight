import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('Render adapter: HTTPS proxy, room lifecycle, assets and bounded requests',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'saga-render-'));
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
 try{
  const port=await new Promise((resolve,reject)=>{
   let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),8000);
   child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});
   child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/listening on port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
  });
  const base='http://127.0.0.1:'+port,publicOrigin='https://127.0.0.1:'+port;
  const call=async(name,body={},token,origin=publicOrigin)=>{
   const r=await fetch(base+'/api/rooms/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Proto':'https',Origin:origin,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
   return {status:r.status,body:await r.json()};
  };
  assert.equal((await (await fetch(base+'/healthz')).json()).ok,true);
  assert.match(await (await fetch(base+'/')).text(),/6\.22\.4/);
  assert.equal((await fetch(base+'/rollback-core.js')).status,200);assert.equal((await fetch(base+'/online.js')).status,200);
  const audio=await fetch(base+'/audio/bgm/does-not-exist.ogg');assert.equal(audio.status,404);
  assert.equal((await fetch(base+'/server.mjs')).status,404);
  assert.equal((await call('create',{},null,'https://other.example')).status,403);
  const host=await call('create',{p1:'cylast',p2:'soul'});assert.equal(host.status,201);
  const guest=await call('join',{code:host.body.code,fighter:'mox'});assert.equal(guest.body.role,'guest');
  await call('sync',{code:host.body.code,offer:{type:'offer',sdp:'integration-offer'}},host.body.token);
  const sync=await call('sync',{code:host.body.code,answer:{type:'answer',sdp:'integration-answer'}},guest.body.token);
  assert.equal(sync.body.offer.sdp,'integration-offer');
  const answer=await call('sync',{code:host.body.code},host.body.token);assert.equal(answer.body.answer.sdp,'integration-answer');
  const tooLarge=await fetch(base+'/api/rooms/create',{method:'POST',body:'x'.repeat(86000)});assert.equal(tooLarge.status,413);
  assert.equal((await call('leave',{code:host.body.code},guest.body.token)).body.closed,true);
  assert.equal((await call('sync',{code:host.body.code},host.body.token)).status,404);
 }finally{
  const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');if(child.exitCode===null)await exited;
  await rm(dataDir,{recursive:true,force:true});
 }
});
