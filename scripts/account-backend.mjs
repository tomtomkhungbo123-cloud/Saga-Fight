// Account data has one durable authority; Render only keeps disposable relay rooms locally.
export const ACCOUNT_ORIGIN='https://sagafight.neat-bowl-4907.chatgpt.site';
export function accountBackend(env=process.env){
 const configured=env.ACCOUNT_BACKEND_ORIGIN||(env.RENDER==='true'||env.NODE_ENV==='production'?ACCOUNT_ORIGIN:'');
 if(!configured)return null;
 const target=new URL(configured);
 const testLoopback=env.NODE_ENV==='test'&&target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname);
 if((target.protocol!=='https:'&&!testLoopback)||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw Error('ACCOUNT_BACKEND_ORIGIN must be an HTTPS origin');
 return target.origin;
}
export async function forwardAccountRequest(request,backend,fetcher=fetch){
 const source=new URL(request.url),origin=request.headers.get('Origin');
 const reply=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&origin!==source.origin)return reply('Không cho phép yêu cầu từ trang khác.',403);
 if(source.origin===backend)return reply('Cấu hình máy chủ dữ liệu không hợp lệ.',503);
 const headers=new Headers({Origin:backend,Accept:'application/json','User-Agent':'SagaFight-Account-Backend/1.0'});
 for(const key of ['Content-Type','X-Saga-Auth','Authorization']){const value=request.headers.get(key);if(value)headers.set(key,value);}
 try{
  const response=await fetcher(backend+source.pathname+source.search,{method:request.method,headers,redirect:'error',signal:AbortSignal.timeout(15000),...(request.method==='POST'?{body:await request.arrayBuffer()}:{})});
  if(!response.headers.get('Content-Type')?.includes('application/json'))return reply('Chưa kết nối được kho dữ liệu. Vui lòng thử lại; hòm đồ không bị thay đổi.',503);
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return reply('Chưa kết nối được kho dữ liệu. Vui lòng thử lại; hòm đồ không bị thay đổi.',503);}
}
