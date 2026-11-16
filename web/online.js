 'use strict';
(()=>{
 const G=window.riftGame,el=id=>document.getElementById(id),HZ=60,STEP=1/120,BUILD='6.25.6';
 if(window.SagaGameBuild!==BUILD||window.SagaRollback?.build!==BUILD){el('netError').textContent='Các file game khác phiên bản hoặc thiếu rollback-core.js. Hãy cập nhật đầy đủ bản '+BUILD+' và tải lại cả hai máy.';el('createRoom').disabled=el('joinRoom').disabled=true;return;}
 let session=null;
 const connectionChoice=el('connectionMode');let connectionMode='auto';try{if(localStorage.getItem('saga.connection.v1')==='direct')connectionMode='direct';}catch{}connectionChoice.value=connectionMode;connectionChoice.addEventListener('change',()=>{connectionMode=connectionChoice.value==='direct'?'direct':'auto';try{localStorage.setItem('saga.connection.v1',connectionMode);}catch{}});
 function directRequired(n){return n.config?.connection==='direct';}
 function directUnavailable(n,notify=true){if(session!==n||n.directFailed)return;if(notify)signal(n,'fallback',{reason:'direct-required'});n.directFailed=true;n.transportReady=false;n.directDisabled=true;closeDirect(n);if(n.started)suspend(n);const message='Phòng chỉ dùng DIRECT. Không thiết lập được DIRECT. Cùng Wi-Fi vẫn có thể bị giới hạn bởi trình duyệt hoặc router. ICE: '+(n.metrics.directIce?.state||n.pc?.iceConnectionState||'chưa kết nối')+'; ứng viên máy này: '+Object.values(n.metrics.directIce?.local||{}).reduce((a,b)=>a+b,0)+'. Hãy rời phòng và tạo lại, hoặc chọn Tự động để dùng server dự phòng.';error(message);el('lobbyState').textContent=message;if(n.started){el('netCurtain').querySelector('strong').textContent='KHÔNG KẾT NỐI ĐƯỢC DIRECT';el('netCurtain').querySelector('p').textContent=message;}status('CHỈ DIRECT · KHÔNG KẾT NỐI ĐƯỢC');}

 function paintPing(n){const node=el('netBadge'),value=Number.isFinite(n?.peerPing)?Math.max(0,Math.round(n.peerPing)):null;node.textContent=(value??'—')+' ms';const jitter=n?.jitter||0;node.dataset.quality=n?.suspended?'bad':value===null?'pending':value>150||jitter>80?'bad':value>80||jitter>40?'fair':'good';node.hidden=!n;node.setAttribute?.('aria-label','Ping '+(value===null?'đang đo':value+' mili giây')+' · '+{good:'tốt',fair:'trung bình',bad:'yếu hoặc gián đoạn',pending:'đang đo'}[node.dataset.quality]);}
 const status=text=>{el('netBadge').title=text;paintPing(session);};const error=text=>el('netError').textContent=text;
 async function api(path,body={},token){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);try{const r=await fetch('/api/rooms/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Không kết nối được phòng.');return data;}finally{clearTimeout(timer);}}
 function wire(n,message){if(directRequired(n)&&n.activeRoute!=='direct'&&['rb-input','rb-hash','ping','pong'].includes(message?.type))return null;if(message?.type?.startsWith('rb-')&&message.type!=='rb-input'&&message.type!=='rb-hash')return n.channel;return n.activeRoute==='direct'&&message?.type!=='server-ping'?n.directChannel:n.channel;}
 function signal(n,kind,data={}){if(session!==n||n.channel?.readyState!=='open')return false;try{n.channel.send(JSON.stringify({type:'direct',kind,...(['offer','answer','candidate','ready','fallback'].includes(kind)?{attempt:n.directGeneration||0}:{}),...data}));return true;}catch{return false;}}
 function closeDirect(n){
  clearTimeout(n.directTimer);n.directTimer=null;clearTimeout(n.iceDisconnectTimer);
  if(n.directChannel){n.directChannel.onopen=n.directChannel.onmessage=n.directChannel.onclose=n.directChannel.onerror=null;try{n.directChannel.close();}catch{}n.directChannel=null;}
  if(n.pc){n.pc.onicecandidate=n.pc.onicecandidateerror=n.pc.oniceconnectionstatechange=n.pc.ondatachannel=null;try{n.pc.close();}catch{}n.pc=null;}
  n.directCandidates=[];n.localDirectReady=false;n.peerDirectReady=false;
 }
 function applyRoute(n,mode){if(mode==='ws'&&directRequired(n)){directUnavailable(n);return;}
  n.activeRoute=mode;n.route=mode==='direct'?'DIRECT':'SERVER WS';n.metrics.transport=mode==='direct'?'webrtc-direct':'websocket';n.transportReady=true;
  n.peerPing=null;n.peerRtt=null;n.jitter=0;n.probes.clear();n.lastProbe=-1000;n.lastPeer=performance.now();n.lastState=performance.now();n.lastStateAck=performance.now();
  clearTimeout(n.directTimer);n.directTimer=null;
  if(mode==='ws'){n.directDisabled=true;closeDirect(n);n.directRetryAt=performance.now()+15000;}
  badge(n);
 }
 function selectRoute(n,mode){
  if(session!==n||n.role!=='host')return;if(mode==='ws'&&directRequired(n)){directUnavailable(n);return;}
  if(n.pendingRoute?.mode===mode)return;
  if(mode==='direct'&&(n.directDisabled||!n.localDirectReady||!n.peerDirectReady||n.directChannel?.readyState!=='open'))return;
  if(n.started){suspend(n);n.awaitingResume=false;}
  n.transportReady=false;n.pendingRoute={id:(n.routeSerial||0)+1,mode};n.routeSerial=n.pendingRoute.id;n.routeSelectAt=performance.now();n.routeSelectSent=performance.now();
  signal(n,'select',n.pendingRoute);
 }
 function fallback(n,notify=true){
  if(session!==n)return;if(directRequired(n)){directUnavailable(n,notify);return;}
  n.directDisabled=true;
  if(n.activeRoute==='ws'&&n.transportReady&&n.started&&!n.pendingRoute){closeDirect(n);n.directRetryAt=performance.now()+30000;if(notify)signal(n,'fallback');return;}
  if(n.activeRoute==='direct'&&n.started)suspend(n);
  if(n.role==='host')selectRoute(n,'ws');else if(notify)signal(n,'fallback');
 }
 function probeDirect(n){if(session!==n||n.directDisabled||n.directChannel?.readyState!=='open'||n.localDirectReady||performance.now()-n.lastDirectProbe<300)return;n.lastDirectProbe=performance.now();try{n.directChannel.send(JSON.stringify({type:'direct-probe'}));}catch{fallback(n);}}
 function directChannel(n,dc){
  if(session!==n||n.directDisabled){try{dc.close();}catch{}return;}
  n.directChannel=dc;n.lastDirectProbe=-Infinity;
  dc.onopen=()=>probeDirect(n);
  dc.onmessage=event=>{
   if(session!==n||n.directDisabled||typeof event.data!=='string'||event.data.length>85000)return;
   let message;try{message=JSON.parse(event.data);}catch{return;}if(!message||typeof message!=='object'||Array.isArray(message))return;
   if(message.type==='direct-probe'){try{dc.send(JSON.stringify({type:'direct-probe-ack'}));}catch{fallback(n);}return;}
   if(message.type==='direct-probe-ack'){n.localDirectReady=true;signal(n,'ready');if(n.role==='host'&&n.peerDirectReady)selectRoute(n,'direct');return;}
   if(n.activeRoute==='direct')n.channel?.onmessage?.(event);
  };
  dc.onclose=dc.onerror=()=>{if(session===n&&!n.directDisabled)fallback(n);};probeDirect(n);
 }
 function peerConnection(n){
  if(n.pc)return n.pc;
  if(!window.RTCPeerConnection)throw Error('No WebRTC');
  const pc=n.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],bundlePolicy:'max-bundle'});
  pc.onicecandidate=e=>{if(session!==n||n.directDisabled)return;const d=n.metrics.directIce??={local:{},remote:{}};if(!e.candidate){d.gathering='complete';return;}const c=e.candidate.toJSON?e.candidate.toJSON():e.candidate,type=e.candidate.type||/ typ (\w+)/.exec(c.candidate||'')?.[1]||'unknown';d.local[type]=(d.local[type]||0)+1;signal(n,'candidate',{candidate:c});};pc.onicecandidateerror=e=>{n.metrics.directIce??={local:{},remote:{}};n.metrics.directIce.stunError=e.errorCode;};
  pc.oniceconnectionstatechange=()=>{if(session!==n||n.directDisabled)return;n.metrics.directIce??={local:{},remote:{}};n.metrics.directIce.state=pc.iceConnectionState;clearTimeout(n.iceDisconnectTimer);if(pc.iceConnectionState==='failed')fallback(n);else if(pc.iceConnectionState==='disconnected')n.iceDisconnectTimer=setTimeout(()=>{if(session===n&&n.pc===pc&&pc.iceConnectionState==='disconnected')fallback(n);},2500);};
  pc.ondatachannel=e=>directChannel(n,e.channel);return pc;
 }
 async function drainCandidates(n){const pc=n.pc;if(!pc?.remoteDescription)return;for(const c of n.directCandidates||[])await pc.addIceCandidate(c);n.directCandidates=[];}
 async function startDirect(n,background=false){
  if(session!==n||n.pc||n.pendingRoute||n.waitingStart||n.initPacket||n.started&&!background)return;
  if(!background&&n.directAttempt)return;n.directAttempt=true;if(!n.started)n.transportReady=false;
  if(!window.RTCPeerConnection){fallback(n);return;}if(n.role!=='host')return;
  n.directDisabled=false;n.directGeneration=(n.directGeneration||0)+1;n.directAttempts=(n.directAttempts||0)+1;n.metrics.directAttempts=n.directAttempts;
  const generation=n.directGeneration;
  n.directTimer=setTimeout(()=>{if(session===n&&n.directGeneration===generation&&n.activeRoute!=='direct')fallback(n);},12000);
  try{const pc=peerConnection(n);directChannel(n,pc.createDataChannel('saga-direct',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());if(session===n&&!n.directDisabled)signal(n,'offer',{description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});}catch{fallback(n);}
 }
 async function directSignal(n,m){
  if(session!==n)return;
  if(m.kind==='select'&&n.role==='guest'){if(m.mode==='ws'&&directRequired(n)){directUnavailable(n);return;}
   if(!Number.isSafeInteger(m.id)||m.id<1||!['direct','ws'].includes(m.mode)||m.id<(n.appliedRouteSerial||0))return;
   if(m.mode==='direct'&&(!n.localDirectReady||n.directChannel?.readyState!=='open')){signal(n,'fallback');return;}
   if(m.id!==(n.appliedRouteSerial||0)){if(n.started)suspend(n);n.appliedRouteSerial=m.id;applyRoute(n,m.mode);}
   signal(n,'ack',{id:m.id,mode:m.mode});return;
  }
  if(m.kind==='ack'&&n.role==='host'){
   if(!n.pendingRoute||m.id!==n.pendingRoute.id||m.mode!==n.pendingRoute.mode)return;
   const mode=n.pendingRoute.mode;n.pendingRoute=null;applyRoute(n,mode);if(n.started)recover(n);else maybeStart(n);return;
  }
  if(m.kind==='candidate'&&Number.isSafeInteger(m.attempt)&&m.attempt===(n.directGeneration||0)+1&&n.activeRoute!=='direct'){
   n.earlyCandidates??=[];if(n.earlyCandidates.length<64)n.earlyCandidates.push({attempt:m.attempt,candidate:m.candidate});return;
  }
  if(m.kind==='offer'&&n.role==='guest'&&n.activeRoute!=='direct'){
   if(!Number.isSafeInteger(m.attempt)||m.attempt<1||m.attempt<=(n.directGeneration||0))return;
   closeDirect(n);n.directCandidates=(n.earlyCandidates||[]).filter(c=>c.attempt===m.attempt).map(c=>c.candidate);n.earlyCandidates=[];n.directGeneration=m.attempt;n.directDisabled=false;n.answeringDirect=false;
  }
  if(m.kind==='fallback'&&m.reason==='direct-required'&&directRequired(n)){directUnavailable(n,false);return;}
  if(['offer','answer','candidate','ready','fallback'].includes(m.kind)&&m.attempt!==n.directGeneration)return;
  if(m.kind==='fallback'){fallback(n,false);return;}
  if(n.directDisabled)return;
  try{
   if(m.kind==='offer'&&n.role==='guest'){
    if(n.answeringDirect)return;n.answeringDirect=true;const pc=peerConnection(n);await pc.setRemoteDescription(m.description);await drainCandidates(n);await pc.setLocalDescription(await pc.createAnswer());if(session===n&&!n.directDisabled)signal(n,'answer',{description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});
   }else if(m.kind==='answer'&&n.role==='host'){
    const pc=n.pc;if(pc&&!pc.remoteDescription){await pc.setRemoteDescription(m.description);await drainCandidates(n);}
   }else if(m.kind==='candidate'){
    const d=n.metrics.directIce??={local:{},remote:{}};const type=/ typ (\w+)/.exec(m.candidate?.candidate||'')?.[1]||'unknown';d.remote[type]=(d.remote[type]||0)+1;
    if(n.pc?.remoteDescription)await n.pc.addIceCandidate(m.candidate);else if((n.directCandidates??=[]).length<64)n.directCandidates.push(m.candidate);
   }else if(m.kind==='ready'){
    n.peerDirectReady=true;if(n.role==='host'&&n.localDirectReady)selectRoute(n,'direct');
   }
  }catch(e){n.metrics.directIce??={local:{},remote:{}};n.metrics.directIce.error=e.name||'ICEError';fallback(n);}
 }
 function routeTick(n,now){
  probeDirect(n);
  if(n.pendingRoute&&now-n.routeSelectSent>=300){n.routeSelectSent=now;signal(n,'select',n.pendingRoute);}
  if(n.pendingRoute?.mode==='direct'&&now-n.routeSelectAt>2000)selectRoute(n,'ws');
 }
 function send(message){const n=session,target=n&&wire(n,message);if(!n||target?.readyState!=='open'||target.bufferedAmount>(message.type==='state'?4096:16384)){if(n)n.metrics.sendSkips=(n.metrics.sendSkips||0)+1;return false;}const text=JSON.stringify(message);if(text.length>(message.type==='rb-init'?512000:85000))return false;try{target.send(text);n.metrics.bytesSent+=text.length;return true;}catch{return false;}}
 function resetInputs(){G.remote(0);G.resetPrediction?.();}
 function beforeStep(){}
 function confirm(){if(!session)return;action(G.getPhase()==='paused'?'pause':'ready');}
 function action(k){const n=session;if(n?.rb&&n.synced&&!n.suspended)n.rb.queue(k);}
 function networkFrame(dt){const n=session;if(!n?.rb||!n.synced||n.suspended||performance.now()<n.startAt)return;n.rbAcc=Math.min((n.rbAcc||0)+dt,.08);let steps=0,stalled=false;if(n.clockSkew>2&&n.rbAcc>=STEP){n.rbAcc-=STEP;n.clockSkew--;n.metrics.clockHolds=(n.metrics.clockHolds||0)+1;}while(n.rbAcc>=STEP&&steps++<10){if(!n.rb.advance(document.hidden?0:G.getMove())){n.rbAcc=0;stalled=true;break;}n.rbAcc-=STEP;}G.rollback.present(dt,stalled?1:n.rbAcc/STEP);n.metrics.frameMs=dt*1000;n.metrics.render=G.renderMetrics?.();n.metrics.rollback={...n.rb.stats,tick:n.rb.tick,confirmed:n.rb.confirmed,predicted:n.rb.tick-n.rb.confirmed};n.metrics.rttMs=n.peerPing;n.metrics.jitterMs=n.jitter;n.metrics.transport=n.activeRoute==='direct'?'webrtc-direct':'websocket';}
 function suspend(n){if(n.suspended)return;n.suspended=true;n.synced=false;n.lostAt=performance.now();n.rbAcc=0;window.sagaAudio?.stopCombat();window.sagaAudio?.syncMusic?.('pause');el('netCurtain').hidden=false;status('ONLINE · MẤT ĐỒNG BỘ · ĐANG KHÔI PHỤC');}
 function requestCheckpoint(n,reason='desync',detail={}){n.metrics.lastRecovery={reason,epoch:n.epoch,tick:n.rb?.tick,...detail};suspend(n);if(n.role==='host')recover(n);else requestResync(n);}
 function requestResync(n){const now=performance.now();if(n.waitingStart||n.lastResyncEpoch===n.epoch&&now-(n.lastResyncSent||0)<1000)return;n.lastResyncEpoch=n.epoch;n.lastResyncSent=now;send({type:'rb-resync',epoch:n.epoch});}
 function ackCheckpoint(n){n.lastAckSent=performance.now();send({type:'rb-ack',epoch:n.epoch});}
 function makeRollback(n,state){n.clockSkew=0;n.probeTicks=new Map();G.rollback.restore(window.SagaRollback.unpack(state));G.rollback.resetView?.();n.rb=new window.SagaRollback.Rollback({player:n.role==='host'?0:1,adapter:G.rollback});n.rbAcc=0;n.lastHash=0;n.peerHashQueue=new Map();n.lastState=n.lastStateAck=performance.now();}
 function initRollback(n,state){n.startPacket=null;n.metrics.recoveries=(n.metrics.recoveries||0)+1;n.epoch++;n.synced=false;n.suspended=true;n.lostAt=performance.now();makeRollback(n,state);n.initPacket={type:'rb-init',epoch:n.epoch,state,config:n.config};send(n.initPacket);n.initSent=performance.now();}
 function recover(n){if(n.directFailed||n.role!=='host'||!n.suspended||n.initPacket||n.pendingRoute||!n.transportReady)return;const state=n.rb?.checkpoint();if(state)initRollback(n,state);}
 function maybeStart(n){if(n.role==='host'&&n.joined&&n.peerHello&&!n.started&&n.transportReady){if(!window.SagaRollback||!G.rollback){error('Thiếu rollback-core.js. Hãy tải lên đầy đủ bản game.');return;}G.configure(n.config);G.begin();G.rollback.seed(0x53414741);n.started=true;initRollback(n,window.SagaRollback.pack(G.rollback.capture()));}}
 function rollbackMessage(n,m){
  if(m.type==='rb-init'&&n.role==='guest'){
   if(!Number.isSafeInteger(m.epoch)||m.epoch<n.epoch)return;
   if(n.rb&&m.epoch===n.epoch){ackCheckpoint(n);return;}
   if(!m.config||!['cavern','forest'].includes(m.config.map)||!['thunder','soul','mox','cylast','melanta','fairi','aether'].includes(m.config.p1)||!['thunder','soul','mox','cylast','melanta','fairi','aether'].includes(m.config.p2))return;
   n.epoch=m.epoch;G.configure(m.config);if(!n.started){G.begin();G.rollback.seed(0x53414741);}n.started=true;n.synced=false;n.suspended=true;n.lostAt=performance.now();makeRollback(n,m.state);n.waitingStart=true;ackCheckpoint(n);return;
  }
  if(m.epoch!==n.epoch)return;
  if(m.type==='rb-ack'&&n.role==='host'){
   if(n.initPacket){n.initPacket=null;n.synced=true;n.suspended=false;const controlRtt=Math.max(0,performance.now()-n.initSent),wait=Math.max(120,Math.min(1000,Math.ceil(controlRtt*.75+30)));n.startAt=performance.now()+wait;n.metrics.startControlRttMs=controlRtt;n.startPacket={type:'rb-start',epoch:n.epoch,wait,controlRtt};}
   if(n.startPacket&&!n.pendingRoute&&n.transportReady)send({...n.startPacket,wait:Math.max(0,n.startAt-performance.now())});return;
  }
  if(m.type==='rb-start'&&n.role==='guest'&&n.rb){if(n.synced&&!n.suspended)return;n.waitingStart=false;n.synced=true;n.suspended=false;const wait=Number.isFinite(m.wait)?Math.max(0,Math.min(1000,m.wait)):120,rtt=Number.isFinite(m.controlRtt)?Math.max(0,Math.min(5000,m.controlRtt)):0;n.metrics.startControlRttMs=rtt;n.startAt=performance.now()+Math.max(0,wait-rtt/2);return;}
  if(m.type==='rb-resync'){if(n.role==='host'&&!n.initPacket){requestCheckpoint(n,'peer-request');}return;}
  if(!n.rb||n.suspended)return;
  if(m.type==='rb-input'){if(!n.rb.receive(m)){requestCheckpoint(n,'invalid-input');return;}n.lastState=n.lastStateAck=performance.now();n.peerHashQueue??=new Map();for(const [t,h]of n.peerHashQueue)if(t<=n.rb.confirmed){n.peerHashQueue.delete(t);const ours=n.rb.digest(t);if(ours&&ours.hash!==h){requestCheckpoint(n,'checksum',{hashTick:t,localHash:ours.hash,remoteHash:h});return;}}return;}
  if(m.type==='rb-hash'&&Number.isSafeInteger(m.tick)&&m.tick>=0&&m.tick<=n.rb.tick+240&&typeof m.hash==='string'&&m.hash.length<=16){if(m.tick<=n.rb.confirmed){const ours=n.rb.digest(m.tick);if(ours&&ours.hash!==m.hash)requestCheckpoint(n,'checksum',{hashTick:m.tick,localHash:ours.hash,remoteHash:m.hash});}else{n.peerHashQueue??=new Map();if(n.peerHashQueue.size<16)n.peerHashQueue.set(m.tick,m.hash);}}
 }
 function channel(dc){const n=session;if(!n)return;if(n.channel&&n.channel!==dc){n.channel.onopen=n.channel.onmessage=n.channel.onclose=n.channel.onerror=null;n.channel.close();}n.channel=dc;dc.onopen=()=>{if(session!==n)return;n.lastPeer=performance.now();send({type:'hello',version:90});};dc.onmessage=event=>{if(session!==n||typeof event.data!=='string'||event.data.length>512000)return;let m;try{m=JSON.parse(event.data);}catch{return;}if(!m||typeof m!=='object'||Array.isArray(m))return;n.metrics.bytesReceived+=event.data.length;
 if(!['hello','ping','pong','rb-input','rb-init','rb-ack','rb-start','rb-hash','rb-resync'].includes(m.type))return;n.lastPeer=performance.now();if(m.type.startsWith('rb-')){try{rollbackMessage(n,m);}catch(e){n.metrics.rollbackError=String(e.message);requestCheckpoint(n,'exception',{message:String(e.message)});}return;}
 if(m.type==='hello'){if(m.version!==90){status('Hai máy cần tải lại cùng phiên bản game.');return;}n.peerHello=true;if(!m.reply)send({type:'hello',version:90,reply:true});maybeStart(n);return;}
 if(m.type==='ping'){send({type:'pong',id:m.id,stamp:m.stamp,epoch:n.epoch,peerTick:n.synced?n.rb?.tick:null});n.peerRtt=Number.isFinite(m.rtt)?m.rtt:null;return;}
 if(m.type==='pong'){const sent=n.probes.get(m.id);if(sent!==undefined){n.probes.delete(m.id);const probe=n.probeTicks?.get(m.id);n.probeTicks?.delete(m.id);if(probe&&probe.epoch===n.epoch&&m.epoch===n.epoch&&n.rb&&n.synced&&!n.suspended&&Number.isSafeInteger(m.peerTick)&&m.peerTick>=0){const skew=(probe.tick+n.rb.tick)/2-m.peerTick;if(Math.abs(skew)<=120)n.clockSkew=n.clockSkew==null?skew:n.clockSkew*.5+skew*.5;n.metrics.clockSkewTicks=n.clockSkew;}const value=performance.now()-sent;n.jitter=n.peerPing==null?0:.8*n.jitter+.2*Math.abs(value-n.peerPing);n.peerPing=value;n.lastPong=performance.now();if(n.suspended)recover(n);badge(n);}return;}
 };dc.onerror=()=>suspend(n);dc.onclose=()=>{if(session===n)suspend(n);};}
 function badge(n){paintPing(n);el('netBadge').title=(n.activeRoute==='direct'?'DIRECT':directRequired(n)?'CHỜ DIRECT':'SERVER WS')+' · RTT '+(n.peerPing==null?'đang đo':Math.round(n.peerPing)+' ms')+' · dao động '+Math.round(n.jitter||0)+' ms';}
 async function inspectRoute(n){n.route=n.activeRoute==='direct'?'DIRECT':directRequired(n)?'CHỜ DIRECT':'SERVER WS';n.metrics.route={type:n.route,protocol:n.activeRoute==='direct'?'webrtc':directRequired(n)?'pending':'wss',rttMs:n.peerPing};if(n.activeRoute==='direct'&&n.pc?.getStats){try{const stats=await n.pc.getStats();let pair;for(const row of stats.values())if(row.type==='transport'&&row.selectedCandidatePairId)pair=stats.get(row.selectedCandidatePairId);if(pair){const local=stats.get(pair.localCandidateId),remote=stats.get(pair.remoteCandidateId);n.metrics.route.local=local?.candidateType;n.metrics.route.remote=remote?.candidateType;n.metrics.route.protocol=local?.protocol||'webrtc';}}catch{}}badge(n);}
 function connected(n){return wire(n)?.readyState==='open';}
 function connectionGuard(n){if(session!==n)return;if(n.directFailed){el('netCurtain').hidden=!n.started;return;}const now=performance.now(),stall=Math.max(1500,Math.min(4000,(n.peerPing||0)*4+(n.jitter||0)*4));if(!n.started)el('lobbyState').textContent=n.joined?(n.transportReady===false?(directRequired(n)?'Đang kết nối DIRECT · Không dùng server dự phòng':'Đang thử kết nối trực tiếp · Có server dự phòng'):'Đã đủ hai người · Đang đồng bộ trận đấu…'):'Đang chờ đối thủ · WebSocket server';if(n.started&&!n.initPacket&&!n.waitingStart&&(now-n.lastPeer>stall||n.role==='guest'&&now-n.lastState>stall||n.role==='host'&&now-n.lastStateAck>stall+500)){if(n.activeRoute==='direct')fallback(n);else suspend(n);}if((n.suspended&&now-n.lostAt>15000)||(n.reconnectAt&&now-n.reconnectAt>15000)||(!n.started&&n.joined&&now-n.joinedAt>20000)){leave();G.menu();error('Kết nối server bị gián đoạn quá lâu. Hãy kiểm tra mạng và tạo phòng mới.');return;}el('netCurtain').hidden=!n.suspended;}
 function connectSocket(n){
  if(session!==n)return;
  if(!window.WebSocket){error('Trình duyệt cần hỗ trợ WebSocket để chơi Online.');return;}
  const url=new URL('/ws',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(url.href);n.socket=socket;let authenticated=false;
  const dc={get readyState(){return authenticated&&socket.readyState===1?'open':'connecting';},get bufferedAmount(){return socket.bufferedAmount||0;},send:text=>socket.send(text),close:()=>socket.close()};
  channel(dc);
  socket.onopen=()=>{if(session===n&&n.socket===socket)socket.send(JSON.stringify({type:'auth',version:90,code:n.room,token:n.token}));};
  socket.onmessage=event=>{
   if(session!==n||n.socket!==socket||typeof event.data!=='string')return;
   let message;try{message=JSON.parse(event.data);}catch{return;}if(!message||typeof message!=='object'||Array.isArray(message))return;
   if(message.type==='direct'){directSignal(n,message);return;}
   if(message.type!=='relay'){if(n.activeRoute!=='direct'||message.type?.startsWith('rb-')&& !['rb-input','rb-hash'].includes(message.type))dc.onmessage?.(event);return;}
   if(message.event==='server-pong'){const sent=n.serverProbes?.get(message.id);if(sent!==undefined){n.serverPing=performance.now()-sent;n.serverProbes.delete(message.id);n.metrics.serverRttMs=n.serverPing;badge(n);}return;}
   if(message.event==='authenticated'){
    authenticated=true;n.reliable=true;n.reconnectAt=0;n.retryDelay=500;n.route=directRequired(n)?'CHỜ DIRECT':'SERVER WS';n.metrics.transport=directRequired(n)?'direct-pending':'websocket';if(!n.started){n.suspended=false;n.transportReady=false;}error('');dc.onopen?.();
   }else if(message.event==='ready'){
    n.joined=true;n.joinedAt=performance.now();n.config=message.config;connectionChoice.value=directRequired(n)?'direct':'auto';n.metrics.connectionMode=directRequired(n)?'direct':'auto';n.peerHello=false;n.lastPeer=performance.now();
    if(n.started||n.directDisabled){n.directDisabled=true;if(directRequired(n))directUnavailable(n);else if(n.role==='host')selectRoute(n,'ws');}else startDirect(n);send({type:'hello',version:90});
   }else if(message.event==='peer-disconnected'){
    n.directDisabled=true;n.activeRoute='ws';closeDirect(n);if(directRequired(n))directUnavailable(n,false);else{if(n.started)suspend(n);status('ONLINE · ĐỐI THỦ MẤT KẾT NỐI · ĐANG CHỜ');}
   }else if(message.event==='room-closed'){
    leave();G.menu();error('Đối thủ đã rời phòng. Hãy tạo phòng mới.');
   }
  };
  socket.onerror=()=>{if(session===n&&n.socket===socket&&n.started)dc.onerror?.();};
  socket.onclose=event=>{
   authenticated=false;if(session!==n||n.socket!==socket)return;n.directDisabled=true;n.activeRoute='ws';closeDirect(n);
   dc.onclose?.();if(directRequired(n))directUnavailable(n,false);
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
 function fast(n){if(session!==n)return;const now=performance.now();routeTick(n,now);if(connected(n)){
 if(n.role==='host'&&n.activeRoute==='ws'&&n.synced&&!n.suspended&&!n.pc&&window.RTCPeerConnection&&(n.directAttempts||0)<4&&n.directRetryAt!=null&&now>=n.directRetryAt)startDirect(n,true);
 if(!n.peerHello)send({type:'hello',version:90});
 if(now-n.lastProbe>=500){n.lastProbe=now;for(const [id,t]of n.probes)if(now-t>3000){n.probes.delete(id);n.probeTicks?.delete(id);}const id=++n.probeId;n.probes.set(id,now);n.probeTicks??=new Map();if(n.rb&&n.synced)n.probeTicks.set(id,{tick:n.rb.tick,epoch:n.epoch});send({type:'ping',id,rtt:n.peerPing});}
 if(now-(n.lastServerProbe||0)>=1000){n.lastServerProbe=now;n.serverProbes??=new Map();for(const [id,t]of n.serverProbes)if(now-t>5000)n.serverProbes.delete(id);const id=++n.probeId;n.serverProbes.set(id,now);send({type:'server-ping',id});}
 if(now-n.lastStats>2000){n.lastStats=now;inspectRoute(n);}
 if(!n.directFailed&&n.initPacket&&now-n.initSent>=500){send(n.initPacket);n.initSent=now;}
 if(n.waitingStart&&now-(n.lastAckSent||0)>=500)ackCheckpoint(n);
 if(n.suspended&&!n.initPacket){if(n.role==='guest')requestResync(n);else recover(n);}
 if(n.rb&&n.synced&&!n.suspended){send({type:'rb-input',epoch:n.epoch,...n.rb.packet()});const confirmed=n.rb.confirmed;if(confirmed-n.lastHash>=30){const d=n.rb.digest(Math.floor(confirmed/30)*30);if(d&&send({type:'rb-hash',epoch:n.epoch,...d}))n.lastHash=d.tick;}}
 }connectionGuard(n);}
 function beginSession(data){if(el('mapSelect')){el('mapSelect').disabled=true;el('mapSelect').value=data.config?.map||'cavern';}resetInputs();connectionChoice.disabled=true;el('netCurtain').querySelector('strong').textContent='ĐANG KẾT NỐI LẠI…';connectionChoice.value=data.config?.connection==='direct'?'direct':'auto';el('netCurtain').querySelector('p').textContent='Giữ game mở trên cả hai thiết bị. Trận đấu đang tạm dừng.';const now=performance.now(),n=session={...data,room:data.code,config:data.config,epoch:1,started:false,synced:false,suspended:false,lastPeer:now,lastState:now,lastStateAck:now,lastProbe:-1000,lastStats:-3000,probes:new Map(),probeId:0,peerPing:null,peerRtt:null,jitter:0,metrics:{bytesSent:0,bytesReceived:0}};el('netBadge').hidden=false;el('lobbyCard').hidden=false;el('lobbyCode').textContent=n.room;el('lobbyState').textContent='Đang kết nối WebSocket server…';el('createRoom').disabled=el('joinRoom').disabled=true;G.lobby();status('ONLINE · ĐANG KẾT NỐI');n.fastTimer=setInterval(()=>fast(n),1000/HZ);connectSocket(n);poll(n);}
 async function create(){if(session)return;error('');el('createRoom').disabled=el('joinRoom').disabled=true;try{const requested=connectionChoice.value==='direct'?'direct':'auto',r=await api('create',{p1:el('select0').value,p2:el('select1').value,connection:requested,map:el('mapSelect')?.value||'cavern'});if(requested==='direct'&&r.config?.connection!=='direct'){await api('leave',{code:r.code},r.token).catch(()=>{});throw Error('Server chưa cập nhật chế độ Chỉ DIRECT. Hãy cập nhật đầy đủ worker/index.mjs và scripts/relay.mjs rồi deploy lại.');}beginSession(r);}catch(e){error(e.message);el('createRoom').disabled=el('joinRoom').disabled=false;}}
 async function join(){if(session)return;error('');const code=el('roomCode').value.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code)){error('Nhập mã phòng gồm 6 ký tự.');return;}el('createRoom').disabled=el('joinRoom').disabled=true;try{const r=await api('join',{code,fighter:el('select0').value});beginSession(r);}catch(e){error(e.message);el('createRoom').disabled=el('joinRoom').disabled=false;}}
 function leave(){if(el('mapSelect'))el('mapSelect').disabled=false;connectionChoice.disabled=false;const n=session;if(!n)return;session=null;closeDirect(n);clearInterval(n.fastTimer);clearTimeout(n.pollTimer);clearTimeout(n.reconnectTimer);for(const dc of [n.channel])if(dc){dc.onopen=dc.onmessage=dc.onclose=dc.onerror=null;try{dc.close();}catch{}}const closing=api('leave',{code:n.room},n.token).catch(()=>{});G.resetPrediction?.();G.remote(0);el('netBadge').hidden=true;el('netCurtain').hidden=true;el('lobbyCard').hidden=true;el('createRoom').disabled=el('joinRoom').disabled=false;el('continue').disabled=false;return closing;}
 el('createRoom').onclick=create;el('joinRoom').onclick=join;el('leaveRoom').onclick=()=>{leave();G.menu();};el('netLeave').onclick=()=>{leave();G.menu();};
 el('roomCode').addEventListener('input',()=>{el('roomCode').value=el('roomCode').value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);});el('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();join();}});
 el('copyRoom').onclick=async()=>{if(!session)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',session.room);try{await navigator.clipboard.writeText(url.toString());el('copyRoom').textContent='ĐÃ SAO CHÉP ✓';}catch{error('Mã phòng: '+session.room+' · Gửi mã này cho bạn bè.');}};
 window.riftNet={get fullRollback(){return !!session;},get room(){return session?.room||null;},get role(){return session?.role||null;},get blocked(){return !!session&&(!session.synced||session.suspended);},action,confirm,leave,frame:networkFrame,beforeStep,metrics:()=>session?.metrics||null};
 const code=new URL(location.href).searchParams.get('room');if(code&&/^[A-Z2-9]{6}$/.test(code.toUpperCase())){document.querySelector('[data-mode="online"]').click();el('roomCode').value=code.toUpperCase();}
})();
