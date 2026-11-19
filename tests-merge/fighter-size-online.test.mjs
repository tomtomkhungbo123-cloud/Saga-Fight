import test from 'node:test';import {hybridPair,pump,synced,equalConfirmedWorld} from './hybrid-fixture.mjs';
for(const type of ['cylast','aether','melanta','fairi'])for(const direct of [true,false])test(type+' resized actor movement/projectiles converge over '+(direct?'DIRECT':'WS'),async()=>{
 const f=await hybridPair(direct,type,'thunder','cavern');try{
  if(!direct){await f.wait(()=>f.host.run('!!window.testTransport.session().pc?.remoteDescription'));f.host.expireDirect();}
  await synced(f);await pump(f,400);f.host.run('keys.KeyD=true');await pump(f,50);f.host.run('keys.KeyD=false');await pump(f,50);
  for(const k of ['attack','q','w','e','r']){f.host.ctx.sizeAction=k;f.host.run('window.riftNet.action(sizeAction)');await pump(f,150);equalConfirmedWorld(f);}
 }finally{await f.close();}
});
