import {inventoryMigration} from './inventory-store.mjs';
import {api,videoByteRange} from './core.mjs';
import {authConfig} from './account-auth.mjs';
import {bridgeApi,bridgeWebSocket} from './render-bridge.mjs';
export {api};
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/internal/inventory-migration')return inventoryMigration(request,env);
 if(url.pathname==='/ws')return bridgeWebSocket(request);
 if(url.pathname==='/healthz')return new Response(JSON.stringify({ok:true,build:'6.36.0',protocol:94,transport:'hybrid',runtime:'site-preview-bridge',accountStorage:'durable-shared',inventoryStorage:env.DB?(await env.DB.prepare('SELECT mode FROM inventory_storage_control WHERE id=1').first()).mode:'unavailable',relay:'https://saga-fight.onrender.com',accountConfigured:!!authConfig(env)}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/api/'))return bridgeApi(request,env);
 const key=url.pathname==='/'?'/index.html':url.pathname,file=FILES[key];if(!file)return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const headers={'Content-Type':file[0],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
 const encoded=file[1];
 const size=encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
 let status=200,body=null;
 headers['Content-Length']=String(size);
 if(file[0].startsWith('video/')){
  headers['Accept-Ranges']='bytes';
  const range=request.headers.get('Range');
  if(range){
   const part=videoByteRange(range,size);
   if(!part)return new Response(null,{status:416,headers:{...headers,'Content-Length':'0','Content-Range':'bytes */'+size}});
   const {start,end}=part,length=end-start+1;
   status=206;
   headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
   headers['Content-Length']=String(length);
   if(request.method==='GET'){
    const offset=start%3;
    body=Uint8Array.from(atob(encoded.slice(Math.floor(start/3)*4,Math.ceil((end+1)/3)*4)).slice(offset,offset+length),c=>c.charCodeAt(0));
   }
  }
 }
 if(status===200&&request.method==='GET')body=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 return new Response(body,{status,headers});
}};
