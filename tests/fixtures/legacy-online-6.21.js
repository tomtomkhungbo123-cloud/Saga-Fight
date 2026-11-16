 'use strict';
(()=>{
 const G=window.riftGame,el=id=>document.getElementById(id),HZ=60,STEP=1/120;
 let session=null,eventId=0,pending=[],frames=[],hostFrames=[],inputSeq=0,appliedSeq=0,ack=0,tick=0,lastTick=-1,lastQueued=0,ready=[false,false],acc=0;
 const status=text=>{el('netBadge').textContent=text;el('netBadge').hidden=!session;};const error=text=>el('netError').textContent=text;
 async function api(path,body={},token){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);try{const r=await fetch('/api/rooms/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Không kết nối được phòng.');return data;}finally{clearTimeout(timer);}}
 function wire(n,message){return n.activeRoute==='direct'&&message?.type!=='server-ping'?n.directChannel:n.channel;}
 function signal(n,kind,data={}){if(session!==n||n.channel?.readyState!=='open')return false;try{n.channel.send(JSON.stringify({type:'direct',kind,...data}));return true;}catch{return false;}}
 function closeDirect(n){
  clearTimeout(n.directTimer);n.directTimer=null;
  if(n.directChannel){n.directChannel.onopen=n.directChannel.onmessage=n.directChannel.onclose=n.directChannel.onerror=null;try{n.directChannel.close();}catch{}n.directChannel=null;}
  if(n.pc){n.pc.onicecandidate=n.pc.oniceconnectionstatechange=n.pc.ondatachannel=null;try{n.pc.close();}catch{}n.pc=null;}
  n.directCandidates=[];n.localDirectReady=false;n.peerDirectReady=false;
 }
 function applyRoute(n,mode){
  n.activeRoute=mode;n.route=mode==='direct'?'DIRECT':'SERVER WS';n.metrics.transport=mode==='direct'?'webrtc-direct':'websocket';n.transportReady=true;
  n.peerPing=null;n.peerRtt=null;n.jitter=0;n.probes.clear();n.lastProbe=-1000;n.lastPeer=performance.now();n.lastState=performance.now();n.lastStateAck=performance.now();
  clearTimeout(n.directTimer);n.directTimer=null;
  if(mode==='ws'){n.directDisabled=true;closeDirect(n);}
  badge(n);
 }
 function selectRoute(n,mode){
  if(session!==n||n.role!=='host')return;
  if(n.pendingRoute?.mode===mode)return;
  if(mode==='direct'&&(n.directDisabled||!n.localDirectReady||!n.peerDirectReady||n.directChannel?.readyState!=='open'))return;
  if(n.started){suspend(n);n.awaitingResume=false;}
  n.transportReady=false;n.pendingRoute={id:(n.routeSerial||0)+1,mode};n.routeSerial=n.pendingRoute.id;n.routeSelectAt=performance.now();n.routeSelectSent=performance.now();
  signal(n,'select',n.pendingRoute);
 }
 function fallback(n){
  if(session!==n)return;
  n.directDisabled=true;
  if(n.activeRoute==='direct'&&n.started)suspend(n);
  if(n.role==='host')selectRoute(n,'ws');else signal(n,'fallback');
 }
 function directChannel(n,dc){
  if(session!==n||n.directDisabled){try{dc.close();}catch{}return;}
  n.directChannel=dc;
  dc.onopen=()=>{if(session===n&&!n.directDisabled)try{dc.send(JSON.stringify({type:'direct-probe'}));}catch{fallback(n);}};
  dc.onmessage=event=>{
   if(session!==n||n.directDisabled||typeof event.data!=='string'||event.data.length>85000)return;
   let message;try{message=JSON.parse(event.data);}catch{return;}
   if(message.type==='direct-probe'){try{dc.send(JSON.stringify({type:'direct-probe-ack'}));}catch{fallback(n);}return;}
   if(message.type==='direct-probe-ack'){n.localDirectReady=true;signal(n,'ready');if(n.role==='host'&&n.peerDirectReady)selectRoute(n,'direct');return;}
   if(n.activeRoute==='direct')n.channel?.onmessage?.(event);
  };
  dc.onclose=dc.onerror=()=>{if(session===n&&!n.directDisabled)fallback(n);};
 }
 function peerConnection(n){
  if(n.pc)return n.pc;
  if(!window.RTCPeerConnection)throw Error('No WebRTC');
  const pc=n.pc=new RTCPeerConnection({iceServers:[],bundlePolicy:'max-bundle'});
  pc.onicecandidate=e=>{if(session===n&&!n.directDisabled&&e.candidate)signal(n,'candidate',{candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});};
  pc.oniceconnectionstatechange=()=>{if(session===n&&!n.directDisabled&&['failed','disconnected'].includes(pc.iceConnectionState))fallback(n);};
  pc.ondatachannel=e=>directChannel(n,e.channel);return pc;
 }
 async function drainCandidates(n){const pc=n.pc;if(!pc?.remoteDescription)return;for(const c of n.directCandidates||[])await pc.addIceCandidate(c);n.directCandidates=[];}
 async function startDirect(n){
  if(session!==n||n.directAttempt||n.started)return;
  n.directAttempt=true;n.transportReady=false;
  if(!window.RTCPeerConnection){fallback(n);return;}
  if(n.role!=='host')return;
  n.directTimer=setTimeout(()=>{if(session===n&&!n.transportReady)fallback(n);},4000);
  try{const pc=peerConnection(n);directChannel(n,pc.createDataChannel('saga-direct',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());if(session===n&&!n.directDisabled)signal(n,'offer',{description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});}catch{fallback(n);}
 }
 async function directSignal(n,m){
  if(session!==n)return;
  if(m.kind==='select'&&n.role==='guest'){
   if(!Number.isSafeInteger(m.id)||m.id<1||!['direct','ws'].includes(m.mode)||m.id<(n.appliedRouteSerial||0))return;
   if(m.mode==='direct'&&(!n.localDirectReady||n.directChannel?.readyState!=='open')){signal(n,'fallback');return;}
   if(m.id!==(n.appliedRouteSerial||0)){if(n.started)suspend(n);n.appliedRouteSerial=m.id;applyRoute(n,m.mode);}
   signal(n,'ack',{id:m.id,mode:m.mode});return;
  }
  if(m.kind==='ack'&&n.role==='host'){
   if(!n.pendingRoute||m.id!==n.pendingRoute.id||m.mode!==n.pendingRoute.mode)return;
   const mode=n.pendingRoute.mode;n.pendingRoute=null;applyRoute(n,mode);if(n.started)recover(n);else maybeStart(n);return;
  }
  if(m.kind==='fallback'){n.directDisabled=true;if(n.role==='host')selectRoute(n,'ws');return;}
  if(n.directDisabled||n.activeRoute==='ws'&&n.transportReady)return;
  try{
   if(m.kind==='offer'&&n.role==='guest'){
    if(n.answeringDirect)return;n.answeringDirect=true;const pc=peerConnection(n);await pc.setRemoteDescription(m.description);await drainCandidates(n);await pc.setLocalDescription(await pc.createAnswer());if(session===n&&!n.directDisabled)signal(n,'answer',{description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});
   }else if(m.kind==='answer'&&n.role==='host'){
    const pc=n.pc;if(pc&&!pc.remoteDescription){await pc.setRemoteDescription(m.description);await drainCandidates(n);}
   }else if(m.kind==='candidate'){
    if(n.pc?.remoteDescription)await n.pc.addIceCandidate(m.candidate);else if((n.directCandidates??=[]).length<64)n.directCandidates.push(m.candidate);
   }else if(m.kind==='ready'){
    n.peerDirectReady=true;if(n.role==='host'&&n.localDirectReady)selectRoute(n,'direct');
   }
  }catch{fallback(n);}
 }
 function routeTick(n,now){
  if(n.pendingRoute&&now-n.routeSelectSent>=300){n.routeSelectSent=now;signal(n,'select',n.pendingRoute);}
  if(n.pendingRoute?.mode==='direct'&&now-n.routeSelectAt>2000)selectRoute(n,'ws');
 }
 function send(message){const n=session,target=n&&wire(n,message);if(!n||target?.readyState!=='open'||target.bufferedAmount>(message.type==='state'?4096:16384)){if(n)n.metrics.sendSkips=(n.metrics.sendSkips||0)+1;return false;}const text=JSON.stringify(message);if(text.length>85000)return false;try{target.send(text);n.metrics.bytesSent+=text.length;return true;}catch{return false;}}
 function snapshot(){return {...G.snapshot(),tick:++tick,simulationTick:G.simulationTick?.()||0,ack,inputAck:appliedSeq,epoch:session.epoch,ready:[...ready]};}
 function sendState(){const n=session;if(n?.role!=='host'||!n.started||!connected(n)||wire(n).bufferedAmount>4096){if(n)n.metrics.stateSkips=(n.metrics.stateSkips||0)+1;return;}const at=performance.now(),value=n.codec.encode(snapshot());n.metrics.snapshotEncodeMs=performance.now()-at;if(send({type:'state',epoch:n.epoch,value}))n.lastStateSent=performance.now();}
 function sendInput(){const n=session;if(n?.role!=='guest'||!n.synced||n.suspended)return;
  const fresh=n.reliable?frames.filter(f=>f.seq>(n.sentInputSeq||0)).slice(0,120):frames.slice(0,120);
  const events=n.reliable?pending.filter(e=>e.id>(n.sentEventId||0)).slice(0,32):pending.slice(0,32);
  if(n.reliable&&!fresh.length&&!events.length&&n.sentStateAck===n.codec.last)return;
  const runs=[];for(const f of fresh){const last=runs.at(-1);if(last&&last[0]+last[1]===f.seq&&last[2]===f.move)last[1]++;else runs.push([f.seq,1,f.move]);}
  const message={type:'input',epoch:n.epoch,...(n.reliable?{runs}:{frames:fresh}),events,clientTick:inputSeq,stateAck:n.codec.last};
  if(send(message)){n.lastInputSent=performance.now();if(n.reliable){if(fresh.length)n.sentInputSeq=fresh.at(-1).seq;if(events.length)n.sentEventId=events.at(-1).id;n.sentStateAck=n.codec.last;}}
 }
 function consume(m){const n=session;if(m.epoch!==n.epoch)return;n.codec.ack=m.stateAck||0;let incoming=m.frames;
 if(m.runs!==undefined){if(!Array.isArray(m.runs)||m.runs.length>120)return;incoming=[];for(const run of m.runs){if(!Array.isArray(run)||run.length!==3||!Number.isSafeInteger(run[0])||run[0]<1||!Number.isInteger(run[1])||run[1]<1||run[1]>120||![-1,0,1].includes(run[2])||incoming.length+run[1]>120)return;for(let i=0;i<run[1];i++)incoming.push({seq:run[0]+i,move:run[2]});}}
 if(!Array.isArray(incoming)||incoming.length>120||!Array.isArray(m.events)||m.events.length>32)return;
 for(const f of incoming)if(Number.isInteger(f.seq)&&f.seq===lastQueued+1&&[-1,0,1].includes(f.move)&&hostFrames.length<240){hostFrames.push({seq:f.seq,move:f.move});lastQueued=f.seq;}
 // Events resend until acknowledged; apply only contiguous IDs, never skip a hole.
 for(const e of m.events){if(e.id!==ack+1)continue;if(!['attack','q','w','e','r','jump','drop','pause','ready'].includes(e.k))continue;ack=e.id;if(e.k==='ready'){ready[1]=true;checkReady();}else G.action(1,e.k);}
 if(G.getPhase()!=='fight'){appliedSeq=lastQueued;hostFrames=[];G.remote(0);}
 }
 function beforeStep(){const n=session;if(n?.role==='host'&&n.synced&&!n.suspended){if(hostFrames.length>3){const stale=hostFrames.splice(0,hostFrames.length-2);appliedSeq=stale.at(-1).seq;n.metrics.staleMovesSkipped=(n.metrics.staleMovesSkipped||0)+stale.length;}const f=hostFrames.shift();if(f){appliedSeq=f.seq;G.remote(f.move);}}}
 function receive(m){const n=session;if(m.epoch<n.epoch||n.suspended&&m.epoch===n.epoch)return;if(m.epoch>n.epoch){n.epoch=m.epoch;resetInputs();n.codec.reset();}const s=n.codec.decode(m.value);if(!s){if(m.value?.id>n.codec.last)send({type:'stateAck',epoch:n.epoch,id:0});return;}if(s.tick<=lastTick)return;lastTick=s.tick;n.lastState=performance.now();n.started=true;n.synced=true;n.suspended=false;ack=s.ack||0;pending=pending.filter(e=>e.id>ack);frames=frames.filter(f=>f.seq>(s.inputAck||0));ready=s.ready||[false,false];G.receive(s);const at=performance.now();G.reconcilePrediction?.(frames,pending,s);n.metrics.reconcileMs=performance.now()-at;n.metrics.prediction=G.predictionMetrics?.();updateReady();send({type:'stateAck',epoch:n.epoch,id:n.codec.last});}
 function resetInputs(){pending=[];frames=[];hostFrames=[];eventId=0;inputSeq=0;appliedSeq=0;ack=0;lastQueued=0;acc=0;if(session){session.sentInputSeq=0;session.sentEventId=0;session.sentStateAck=0;}G.remote(0);G.resetPrediction?.();}
 function updateReady(){if(!session||!['roundover','matchover'].includes(G.getPhase()))return;const id=session.role==='host'?0:1;el('continue').disabled=ready[id];el('continue').textContent=ready[id]?'ĐANG CHỜ ĐỐI THỦ…':'SẴN SÀNG';}
 function checkReady(){if(session?.role==='host'&&ready.every(Boolean)&&['roundover','matchover'].includes(G.getPhase())){ready=[false,false];G.continue();}updateReady();}
 function confirm(){if(!session)return;if(G.getPhase()==='paused'){action('pause');return;}if(!['roundover','matchover'].includes(G.getPhase()))return;if(session.role==='host'){ready[0]=true;checkReady();}else{ready[1]=true;action('ready');updateReady();}}
 function action(k){const n=session;if(!n||!n.synced||n.suspended)return;if(n.role==='host')G.action(0,k);else if(pending.length<32){const event={id:++eventId,k,seq:inputSeq};pending.push(event);const at=performance.now();G.predictAction?.(event);sendInput();n.metrics.localActionMs=performance.now()-at;}}
 function networkFrame(dt){const n=session;if(n){n.metrics.frameMs=dt*1000;n.metrics.rttMs=n.peerPing;n.metrics.serverRttMs=n.serverPing??null;n.metrics.socketBufferedBytes=wire(n)?.bufferedAmount||0;n.metrics.jitterMs=n.jitter;n.metrics.inputBacklog=frames.length;n.metrics.hostBacklog=hostFrames.length;}if(!n||n.role!=='guest'||!n.synced||n.suspended||G.getPhase()!=='fight')return;acc+=Math.min(dt,.08);let count=0;while(acc>=STEP&&count++<10){if(frames.length>=240){suspend(n);break;}const f={seq:++inputSeq,move:document.hidden?0:G.getMove()};frames.push(f);G.predictStep?.(f,STEP);acc-=STEP;}if(n.lastMove!==G.getMove()){n.lastMove=G.getMove();sendInput();}}
 function suspend(n){if(n.suspended)return;n.suspended=true;n.synced=false;n.lostAt=performance.now();G.resetPrediction?.();G.remote(0);if(n.role==='host'&&['fight','countdown','finishing'].includes(G.getPhase())){n.autoPaused=true;G.pause();}el('netCurtain').hidden=false;status('ONLINE · MẤT ĐỒNG BỘ · ĐANG KHÔI PHỤC');}
 function recover(n){if(n.role!=='host'||!n.suspended||n.awaitingResume||n.pendingRoute||n.transportReady===false)return;n.epoch++;resetInputs();n.codec.reset();n.awaitingResume=true;sendState();n.lastRecoverySent=performance.now();}
 function maybeStart(n){if(n.role==='host'&&n.joined&&n.peerHello&&!n.started&&n.transportReady!==false){G.configure(n.config);n.started=true;n.synced=true;n.lastState=performance.now();G.begin();sendState();}}
 function channel(dc){const n=session;if(!n)return;if(n.channel&&n.channel!==dc){n.channel.onopen=n.channel.onmessage=n.channel.onclose=n.channel.onerror=null;n.channel.close();}n.channel=dc;dc.onopen=()=>{if(session!==n)return;n.lastPeer=performance.now();send({type:'hello',version:92});};dc.onmessage=event=>{if(session!==n||typeof event.data!=='string'||event.data.length>85000)return;let m;try{m=JSON.parse(event.data);}catch{return;}n.metrics.bytesReceived+=event.data.length;
 if(!['hello','ping','pong','input','state','stateAck','resync'].includes(m.type))return;n.lastPeer=performance.now();
 if(m.type==='hello'){if(m.version!==92){status('Hai máy cần tải lại cùng phiên bản game.');return;}n.peerHello=true;if(!m.reply)send({type:'hello',version:92,reply:true});maybeStart(n);return;}
 if(m.type==='ping'){send({type:'pong',id:m.id,stamp:m.stamp});n.peerRtt=Number.isFinite(m.rtt)?m.rtt:null;return;}
 if(m.type==='pong'){const sent=n.probes.get(m.id);if(sent!==undefined){n.probes.delete(m.id);const value=performance.now()-sent;n.jitter=n.peerPing==null?0:.8*n.jitter+.2*Math.abs(value-n.peerPing);n.peerPing=value;n.lastPong=performance.now();if(n.suspended)recover(n);badge(n);}return;}
 if(n.role==='host'&&m.type==='resync'&&m.epoch===n.epoch){suspend(n);return;}
 if(n.role==='host'&&m.type==='stateAck'&&m.epoch===n.epoch){n.codec.ack=m.id;if(m.id>0){n.lastStateAck=performance.now();if(n.awaitingResume){n.awaitingResume=false;n.suspended=false;n.synced=true;if(n.autoPaused&&G.getPhase()==='paused'){n.autoPaused=false;G.pause();}}}return;}
 if(n.role==='host'&&m.type==='input'&&n.synced&&!n.suspended)consume(m);
 if(n.role==='guest'&&m.type==='state')try{receive(m);}catch{send({type:'stateAck',epoch:n.epoch,id:0});}
 };dc.onerror=()=>suspend(n);dc.onclose=()=>{if(session===n)suspend(n);};}
 function badge(n){if(n.suspended)return;const own=n.peerPing==null?'đang đo':Math.round(n.peerPing)+'ms',peer=n.peerRtt==null?'đang đo':Math.round(n.peerRtt)+'ms';status('ONLINE · '+(n.route||'đang đo đường truyền')+' · P1 '+(n.role==='host'?own:peer)+' · P2 '+(n.role==='guest'?own:peer)+(n.serverPing!=null?' · SERVER '+Math.round(n.serverPing)+'ms':'')+(n.jitter>70?' · MẠNG DAO ĐỘNG':n.peerPing>250?' · ĐỘ TRỄ CAO':''));}
 async function inspectRoute(n){n.route=n.activeRoute==='direct'?'DIRECT':'SERVER WS';n.metrics.route={type:n.route,protocol:n.activeRoute==='direct'?'webrtc':'wss',rttMs:n.peerPing};if(n.activeRoute==='direct'&&n.pc?.getStats){try{const stats=await n.pc.getStats();let pair;for(const row of stats.values())if(row.type==='transport'&&row.selectedCandidatePairId)pair=stats.get(row.selectedCandidatePairId);if(pair){const local=stats.get(pair.localCandidateId),remote=stats.get(pair.remoteCandidateId);n.metrics.route.local=local?.candidateType;n.metrics.route.remote=remote?.candidateType;n.metrics.route.protocol=local?.protocol||'webrtc';}}catch{}}badge(n);}
 function connected(n){return wire(n)?.readyState==='open';}
 function connectionGuard(n){if(session!==n)return;const now=performance.now(),stall=Math.max(1500,Math.min(4000,(n.peerPing||0)*4+(n.jitter||0)*4));if(!n.started)el('lobbyState').textContent=n.joined?(n.transportReady===false?'Đang thử kết nối trực tiếp · Có server dự phòng':'Đã đủ hai người · Đang đồng bộ trận đấu…'):'Đang chờ đối thủ · WebSocket server';if(n.started&&(now-n.lastPeer>stall||n.role==='guest'&&now-n.lastState>stall||n.role==='host'&&now-n.lastStateAck>stall+500)){if(n.activeRoute==='direct')fallback(n);else suspend(n);}if((n.suspended&&now-n.lostAt>15000)||(n.reconnectAt&&now-n.reconnectAt>15000)||(!n.started&&n.joined&&now-n.joinedAt>20000)){leave();G.menu();error('Kết nối server bị gián đoạn quá lâu. Hãy kiểm tra mạng và tạo phòng mới.');return;}el('netCurtain').hidden=!n.suspended;}
 function connectSocket(n){
  if(session!==n)return;
  if(!window.WebSocket){error('Trình duyệt cần hỗ trợ WebSocket để chơi Online.');return;}
  const url=new URL('/ws',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(url.href);n.socket=socket;let authenticated=false;
  const dc={get readyState(){return authenticated&&socket.readyState===1?'open':'connecting';},get bufferedAmount(){return socket.bufferedAmount||0;},send:text=>socket.send(text),close:()=>socket.close()};
  channel(dc);
  socket.onopen=()=>{if(session===n&&n.socket===socket)socket.send(JSON.stringify({type:'auth',version:92,code:n.room,token:n.token}));};
  socket.onmessage=event=>{
   if(session!==n||n.socket!==socket||typeof event.data!=='string')return;
   let message;try{message=JSON.parse(event.data);}catch{return;}
   if(message.type==='direct'){directSignal(n,message);return;}
   if(message.type!=='relay'){if(n.activeRoute!=='direct')dc.onmessage?.(event);return;}
   if(message.event==='server-pong'){const sent=n.serverProbes?.get(message.id);if(sent!==undefined){n.serverPing=performance.now()-sent;n.serverProbes.delete(message.id);n.metrics.serverRttMs=n.serverPing;badge(n);}return;}
   if(message.event==='authenticated'){
    authenticated=true;n.reliable=true;n.reconnectAt=0;n.retryDelay=500;n.route='SERVER WS';n.metrics.transport='websocket';if(!n.started){n.suspended=false;n.transportReady=false;}error('');dc.onopen?.();
   }else if(message.event==='ready'){
    n.joined=true;n.joinedAt=performance.now();n.config=message.config;n.peerHello=false;n.lastPeer=performance.now();
    if(n.started||n.directDisabled){n.directDisabled=true;if(n.role==='host')selectRoute(n,'ws');}else startDirect(n);send({type:'hello',version:92});
   }else if(message.event==='peer-disconnected'){
    n.directDisabled=true;n.activeRoute='ws';closeDirect(n);if(n.started)suspend(n);status('ONLINE · ĐỐI THỦ MẤT KẾT NỐI · ĐANG CHỜ');
   }else if(message.event==='room-closed'){
    leave();G.menu();error('Đối thủ đã rời phòng. Hãy tạo phòng mới.');
   }
  };
  socket.onerror=()=>{if(session===n&&n.socket===socket&&n.started)dc.onerror?.();};
  socket.onclose=event=>{
   authenticated=false;if(session!==n||n.socket!==socket)return;n.directDisabled=true;n.activeRoute='ws';closeDirect(n);
   dc.onclose?.();
   if(event.code>=4000&&event.code<4100){leave();G.menu();error(event.code===4004?'Phiên chơi đã được mở ở kết nối khác.':'Phòng hoặc phiên chơi không hợp lệ. Hai máy hãy tải lại cùng bản game và tạo phòng mới.');return;}
   n.reconnectAt||=performance.now()||.001;
   const delay=n.retryDelay||500;n.retryDelay=Math.min(delay*2,4000);
   clearTimeout(n.reconnectTimer);n.reconnectTimer=setTimeout(()=>connectSocket(n),delay+Math.random()*200);
   status('ONLINE · ĐANG KẾT NỐI LẠI SERVER');
  };
 }
 async function poll(n){if(session!==n)return;const start=performance.now();try{
  const r=await api('sync',{code:n.room},n.token);if(session!==n)return;n.metrics.apiRtt=performance.now()-start;
  if(r.status==='joined'&&!n.joined){n.joined=true;n.joinedAt=performance.now();n.config=r.config;}maybeStart(n);
 }catch(e){if(session!==n)return;if(/đã đóng|không tồn tại|không hợp lệ|đã rời/.test(e.message)){leave();G.menu();error(e.message);return;}}
 if(session===n)n.pollTimer=setTimeout(()=>poll(n),n.reliable&&connected(n)&&n.started?10000:1600);}
 function fast(n){if(session!==n)return;const now=performance.now();routeTick(n,now);if(connected(n)){if(!n.peerHello)send({type:'hello',version:92});if(now-n.lastProbe>=500){n.lastProbe=now;for(const [id,sent] of n.probes)if(now-sent>3000)n.probes.delete(id);const id=++n.probeId;n.probes.set(id,now);send({type:'ping',id,stamp:now,rtt:n.peerPing});}if(n.reliable&&now-(n.lastServerProbe||0)>=1000){n.lastServerProbe=now;n.serverProbes??=new Map();for(const [id,sent] of n.serverProbes)if(now-sent>5000)n.serverProbes.delete(id);const id=++n.probeId;n.serverProbes.set(id,now);send({type:'server-ping',id});}if(now-n.lastStats>2000){n.lastStats=now;inspectRoute(n);}if(n.suspended){if(n.role==='guest')send({type:'resync',epoch:n.epoch});else if(n.awaitingResume&&now-(n.lastRecoverySent||0)>=100){sendState();n.lastRecoverySent=now;}}if(n.synced&&!n.suspended){const rtt=n.peerPing||0,congested=wire(n).bufferedAmount>4096;const hz=congested?15:rtt>160?20:n.activeRoute==='direct'?60:30;n.metrics.snapshotHz=hz;const interval=1000/hz;if(n.role==='host'){if(now+.5>=(n.nextStateAt??-1000)){sendState();n.nextStateAt=Math.max((n.nextStateAt??now)+interval,now);}}else{const inputInterval=1000/(n.activeRoute==='direct'?60:30);if(now+.5>=(n.nextInputAt??-1000)){sendInput();n.nextInputAt=Math.max((n.nextInputAt??now)+inputInterval,now);}}}}connectionGuard(n);updateReady();}
 function beginSession(data){resetInputs();tick=0;lastTick=-1;ready=[false,false];const now=performance.now(),n=session={...data,room:data.code,config:data.config,epoch:1,codec:new window.SagaNetCodec(),started:false,synced:false,suspended:false,lastPeer:now,lastState:now,lastStateAck:now,lastProbe:-1000,lastStats:-3000,probes:new Map(),probeId:0,peerPing:null,peerRtt:null,jitter:0,metrics:{bytesSent:0,bytesReceived:0}};el('netBadge').hidden=false;el('lobbyCard').hidden=false;el('lobbyCode').textContent=n.room;el('lobbyState').textContent='Đang kết nối WebSocket server…';el('createRoom').disabled=el('joinRoom').disabled=true;G.lobby();status('ONLINE · ĐANG KẾT NỐI');n.fastTimer=setInterval(()=>fast(n),1000/HZ);connectSocket(n);poll(n);}
 async function create(){if(session)return;error('');el('createRoom').disabled=el('joinRoom').disabled=true;try{const r=await api('create',{p1:el('select0').value,p2:el('select1').value});beginSession(r);}catch(e){error(e.message);el('createRoom').disabled=el('joinRoom').disabled=false;}}
 async function join(){if(session)return;error('');const code=el('roomCode').value.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code)){error('Nhập mã phòng gồm 6 ký tự.');return;}el('createRoom').disabled=el('joinRoom').disabled=true;try{const r=await api('join',{code,fighter:el('select0').value});beginSession(r);}catch(e){error(e.message);el('createRoom').disabled=el('joinRoom').disabled=false;}}
 function leave(){const n=session;if(!n)return;session=null;closeDirect(n);clearInterval(n.fastTimer);clearTimeout(n.pollTimer);clearTimeout(n.reconnectTimer);for(const dc of [n.channel])if(dc){dc.onopen=dc.onmessage=dc.onclose=dc.onerror=null;try{dc.close();}catch{}}const closing=api('leave',{code:n.room},n.token).catch(()=>{});pending=[];frames=[];hostFrames=[];G.resetPrediction?.();G.remote(0);el('netBadge').hidden=true;el('netCurtain').hidden=true;el('lobbyCard').hidden=true;el('createRoom').disabled=el('joinRoom').disabled=false;el('continue').disabled=false;return closing;}
 el('createRoom').onclick=create;el('joinRoom').onclick=join;el('leaveRoom').onclick=()=>{leave();G.menu();};el('netLeave').onclick=()=>{leave();G.menu();};
 el('roomCode').addEventListener('input',()=>{el('roomCode').value=el('roomCode').value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);});el('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();join();}});
 el('copyRoom').onclick=async()=>{if(!session)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',session.room);try{await navigator.clipboard.writeText(url.toString());el('copyRoom').textContent='ĐÃ SAO CHÉP ✓';}catch{error('Mã phòng: '+session.room+' · Gửi mã này cho bạn bè.');}};
 window.riftNet={get room(){return session?.room||null;},get role(){return session?.role||null;},get blocked(){return !!session&&(!session.synced||session.suspended);},action,confirm,leave,frame:networkFrame,beforeStep,metrics:()=>session?.metrics||null};
 const code=new URL(location.href).searchParams.get('room');if(code&&/^[A-Z2-9]{6}$/.test(code.toUpperCase())){document.querySelector('[data-mode="online"]').click();el('roomCode').value=code.toUpperCase();}
})();
