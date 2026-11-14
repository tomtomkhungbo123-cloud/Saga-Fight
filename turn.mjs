const STUN=[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
export function createTurnProvider(env=process.env,fetcher=fetch,now=Date.now){
 const cache=new Map(),pending=new Map();
 return async function getIceServers(sessionKey){
  const id=env.CLOUDFLARE_TURN_KEY_ID?.trim(),secret=env.CLOUDFLARE_TURN_API_TOKEN?.trim();
  if(!id&&!secret)return {iceServers:STUN,iceTransportPolicy:'all',turnConfigured:false};
  const failure=()=>Object.assign(new Error('Không lấy được TURN. Kiểm tra CLOUDFLARE_TURN_KEY_ID và CLOUDFLARE_TURN_API_TOKEN trên Render.'),{status:503});
  if(!id||!secret||!/^[a-zA-Z0-9_-]{1,200}$/.test(id))throw failure();
  const cached=cache.get(sessionKey);if(cached&&cached.until>now())return cached.value;
  if(pending.has(sessionKey))return pending.get(sessionKey);
  const task=(async()=>{
   try{
    const response=await fetcher('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(id)+'/credentials/generate-ice-servers',{
     method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({ttl:7200}),signal:AbortSignal.timeout(3500)
    });
    if(!response.ok)throw failure();
    const data=await response.json();if(!Array.isArray(data.iceServers))throw failure();
    const servers=[];
    for(const item of data.iceServers){
     if(!item||typeof item!=='object')continue;
     const urls=(Array.isArray(item.urls)?item.urls:[item.urls]).filter(url=>typeof url==='string'&&/^(stun|turn|turns):/.test(url)&&!/:53(?:\?|$)/.test(url));
     if(!urls.length)continue;
     if(urls.some(url=>/^turns?:/.test(url))){if(typeof item.username!=='string'||typeof item.credential!=='string')continue;servers.push({urls,username:item.username,credential:item.credential});}
     else servers.push({urls});
    }
    if(!servers.some(s=>s.urls.some(u=>/^turns?:/.test(u))))throw failure();
    const value={iceServers:servers,iceTransportPolicy:env.TURN_RELAY_ONLY==='true'?'relay':'all',turnConfigured:true};
    for(const [key,entry] of cache)if(entry.until<=now())cache.delete(key);
    if(cache.size>=1000)cache.delete(cache.keys().next().value);
    cache.set(sessionKey,{value,until:now()+600000});return value;
   }catch{throw failure();}
  })();
  pending.set(sessionKey,task);
  try{return await task;}finally{pending.delete(sessionKey);}
 };
}
