import {api} from './core.mjs';
import {authConfig} from './account-auth.mjs';
import {bridgeApi,bridgeWebSocket} from './render-bridge.mjs';
export {api};
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/ws')return bridgeWebSocket(request);
 if(url.pathname==='/healthz')return new Response(JSON.stringify({ok:true,build:'6.36.0',protocol:94,transport:'hybrid',runtime:'site-preview-bridge',relay:'https://saga-fight.onrender.com',accountConfigured:!!authConfig(env)}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/api/'))return bridgeApi(request,env);
 const key=url.pathname==='/'?'/index.html':url.pathname,file=FILES[key];if(!file)return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(file[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':file[0],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}};
