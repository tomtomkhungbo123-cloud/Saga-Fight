import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {api} from './worker/index.mjs';
import {localDB} from './scripts/local-db.mjs';
import {attachRelay} from './scripts/relay.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const web=path.join(root,'web');
const dataDir=process.env.DATA_DIR||path.join(root,'.data');
fs.mkdirSync(dataDir,{recursive:true});
const DB=localDB(path.join(dataDir,'rooms.sqlite'));

const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{
 try{
  // Render terminates HTTPS at its proxy. Preserve the public origin for
  // the existing room API's same-origin validation.
  const protocol=req.socket.encrypted?'https':req.headers['x-forwarded-proto']==='https'?'https':'http';
  const url=new URL(req.url,protocol+'://'+req.headers.host);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if(url.pathname==='/healthz'){
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify({ok:true,build:'6.36.0-aether1',clientBuild:'6.36.0',sourceVersion:73,baseBuild:'6.25.10',protocol:94,transport:'hybrid',turnRequired:false}));return;
  }
  if(url.pathname.startsWith('/api/')){
   if(!['GET','POST'].includes(req.method)){res.writeHead(405);res.end();return;}
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>85000){res.writeHead(413,{'Connection':'close'});res.end();return;}chunks.push(chunk);}
   const headers=new Headers(req.headers);for(const name of [...headers.keys()])if(name.startsWith('oai-'))headers.delete(name);
   const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const leaveBody=url.pathname==='/api/rooms/leave'?await request.clone().json().catch(()=>null):null;
   const response=await api(request,{DB});
   if(leaveBody&&response.ok)relay.roomClosed(leaveBody.code);
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const filename=path.resolve(web,'.'+(name==='/'?'/index.html':name));
  if(!filename.startsWith(web+path.sep)||name.includes('\0')){res.writeHead(404);res.end();return;}
  const stat=await fs.promises.stat(filename).catch(()=>null);
  if(!stat?.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
  if(req.method==='HEAD'){res.end();return;}
  await pipeline(fs.createReadStream(filename),res);
 }catch(error){
  console.error('Request failed:',error.message);
  if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});
  res.end('Server error');
 }
});
const relay=attachRelay(server,DB);
server.requestTimeout=15000;
server.headersTimeout=10000;
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Saga Fight 6.36.0 Rollback listening on port '+server.address().port));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
 relay.close();server.close(()=>{DB.close();process.exit(0);});
 setTimeout(()=>process.exit(0),8000).unref();
});
