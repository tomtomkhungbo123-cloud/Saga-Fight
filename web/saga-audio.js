// Local playback only. Authoritative combat cues arrive through the arena bridge.
(()=>{
 const $=id=>document.getElementById(id),storageKey='saga.audio.v1';
 let enabled=false,volume=.6,musicVolume=.6,context,master,effectsBus,compressor,loading,ready=false,failed=false;
 const bank=new Map(),voices=new Set(),limits=new Map(),zones=new Map();
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){enabled=!!saved.enabled;const legacy=Number.isFinite(saved.volume)?saved.volume:.6;volume=Math.max(0,Math.min(1,Number.isFinite(saved.sfxVolume)?saved.sfxVolume:legacy));musicVolume=Math.max(0,Math.min(1,Number.isFinite(saved.musicVolume)?saved.musicVolume:legacy));}}catch{}
 const manifest=fetch('/sfx/manifest.json?v=94').then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(m=>m.sounds);
 manifest.catch(()=>{failed=true;refresh();});
 function refresh(){
  $('sound').textContent='ÂM THANH: '+(enabled?'BẬT':'TẮT');$('sound').setAttribute('aria-pressed',String(enabled));
  $('soundEnabled').checked=enabled;$('soundVolume').value=Math.round(volume*100);$('soundVolumeValue').textContent=Math.round(volume*100)+'%';$('musicVolume').value=Math.round(musicVolume*100);$('musicVolumeValue').textContent=Math.round(musicVolume*100)+'%';
  $('audioStatus').textContent=failed?'Không tải được âm thanh. Tải lại game để thử lại.':ready?'Âm thanh đã sẵn sàng.'+(musicFailed?' Nhạc nền chưa tải được.':musicData?' Nhạc nền: Dư Âm Dưới Đá.':' Tùy chọn tự lưu trên thiết bị.'):loading?'Đang tải bộ âm thanh…':'Chạm hoặc bấm phím để khởi tạo âm thanh.';
 }
 function save(){try{localStorage.setItem(storageKey,JSON.stringify({enabled,volume,sfxVolume:volume,musicVolume}));}catch{}}
 function dispose(voice){voices.delete(voice);try{voice.source.disconnect();voice.gain.disconnect();voice.pan?.disconnect();}catch{}}
 function stopVoice(voice,fade=.025){
  voices.delete(voice);try{const t=context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setValueAtTime(voice.gain.gain.value,t);voice.gain.gain.linearRampToValueAtTime(0,t+fade);voice.source.stop(t+fade);}catch{dispose(voice);}
 }
 function stopCombat(){zones.clear();for(const v of [...voices])if(!v.ui)stopVoice(v,.12);}
 function setGain(){if(master&&context){const t=context.currentTime;for(const [bus,level] of [[master,enabled?.45:0],[effectsBus,volume],[musicBus,(musicData?.config.gain??.35)*musicVolume]])if(bus){bus.gain.cancelScheduledValues(t);bus.gain.setTargetAtTime(level,t,.015);}}}
 function unlock(){
  try{
   if(!context){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    context=new Audio();master=context.createGain();effectsBus=context.createGain();effectsBus.connect(master);compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=6;compressor.attack.value=.003;compressor.release.value=.15;
    master.connect(compressor).connect(context.destination);setGain();
    // Starting a silent buffer in the trusted gesture unlocks older iOS Safari.
    const silent=context.createBufferSource();silent.buffer=context.createBuffer(1,1,context.sampleRate);silent.connect(context.destination);silent.onended=()=>silent.disconnect();silent.start();
   }
   if(context.state!=='running')context.resume().catch(()=>{});
   if(!loading){
    loading=manifest.then(async sounds=>{
     // Four concurrent decodes keep mobile load bounded; buffers are reused.
     let next=0;
     await Promise.all(Array.from({length:4},async()=>{while(next<sounds.length){const cue=sounds[next++],r=await fetch('/sfx/'+cue.file+'?v='+(cue.sha256||'56'));if(!r.ok)throw Error(cue.id);const buffer=await context.decodeAudioData(await r.arrayBuffer());bank.set(cue.id,{...cue,buffer});}}));
     ready=true;refresh();
    }).catch(()=>{failed=true;refresh();});refresh();
   }
  }catch{failed=true;refresh();}
 }
 const important=new Set(['ko','victory','round_start','thunder_r_strike','mox_r_slam','soulblade_bleed_explode','cylast_r_storm','soulblade_r_cast']);
 const quiet=new Set(['cylast_w_rain_hit','cylast_lifesteal']);
 function play(id,options={}){
  // Never queue a stale combat hit while locked/loading or after app backgrounding.
  if((!enabled||!volume)&&!options.loopKey||!ready||context?.state!=='running'||document.hidden)return false;
  const cue=bank.get(id);if(!cue)return false;
  const now=context.currentTime,key=id+':'+(options.owner??''),interval=cue.min_interval_ms?cue.min_interval_ms/1000:id==='ui_hover'?.09:id==='cylast_w_rain_hit'?.1:id==='cylast_lifesteal'?.2:0;
  if(interval&&now-(limits.get(key)??-99)<interval)return false;limits.set(key,now);
  const priority=options.loopKey?5:important.has(id)?4:id.startsWith('combo_')?3:cue.priority;
  const siblings=[...voices].filter(v=>v.id===id);if(cue.max_instances&&siblings.length>=cue.max_instances)stopVoice(siblings[0],.04);
  if(voices.size>=16){const oldest=[...voices].sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];if(oldest.priority>priority)return false;stopVoice(oldest,.025);}
  const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner?.();
  source.buffer=cue.buffer;source.playbackRate.value=options.pitch||1;source.loop=!!options.loopKey;if(source.loop){source.loopStart=cue.loopStart||0;source.loopEnd=cue.loopEnd||cue.buffer.duration;}
  const level=cue.gain*(source.loop?.55:quiet.has(id)?.38:id.startsWith('hit_')?.65:1);gain.gain.value=source.loop?0:level;if(source.loop)gain.gain.linearRampToValueAtTime(level,now+.08);
  source.connect(gain);if(pan){pan.pan.value=Math.max(-.8,Math.min(.8,((options.x??800)/800-1)*.8));gain.connect(pan).connect(effectsBus);}else gain.connect(effectsBus);
  const voice={id,source,gain,pan,priority,level,instance:options.instance,loopKey:options.loopKey,started:now,ui:cue.group==='UI'};voices.add(voice);source.onended=()=>dispose(voice);source.start(0,source.loop?(options.age||0)%(cue.loopEnd||4):0);return options.loopKey?voice:true;
 }
 // Reconcile authoritative zone instances, never tick/particle events. WAV length is not skill lifetime.
 function syncZones(active=[],speed=1){
  const wanted=new Set(active.map(z=>z.key));
  for(const [key,v] of zones)if(!wanted.has(key)){stopVoice(v,.12);zones.delete(key);}
  for(const v of [...voices])if(v.instance&&!wanted.has(v.instance))stopVoice(v,.12);
  for(const z of active){
   let v=zones.get(z.key);
   if(!v){v=play(z.id,{loopKey:z.key,instance:z.key,x:z.x,age:z.age});if(!v)continue;zones.set(z.key,v);}
   const left=z.life/Math.max(.001,speed);
   if(left<=.12&&!v.fading){v.fading=true;v.gain.gain.cancelScheduledValues(context.currentTime);v.gain.gain.setValueAtTime(v.gain.gain.value,context.currentTime);v.gain.gain.linearRampToValueAtTime(0,context.currentTime+Math.max(0,left));}
  }
 }
 // Map 01 is currently the single arena asset (assets/arena.png).
 // BGM has a separate bus and lifetime, outside the bounded combat voice pool.
 let musicState='off',musicLoading,musicData,musicBus,musicVoice,musicTail,musicOffset=0,musicFailed=false;
 function loadMusic(){
  if(musicLoading||!context||!enabled||musicState!=='play')return;
  musicLoading=fetch('/music/manifest.json?v=74').then(r=>{if(!r.ok)throw Error('music manifest');return r.json();}).then(async config=>{
   for(const entry of config.sources){try{const r=await fetch('/music/'+entry.file+'?v='+entry.sha256);if(!r.ok)throw Error('music file');const buffer=await context.decodeAudioData(await r.arrayBuffer());if(buffer.duration<config.loopEnd-.05)throw Error('short music buffer');musicData={config,buffer};musicFailed=false;syncMusic(musicState);refresh();return;}catch{}}
   throw Error('music decode');
  }).catch(()=>{musicFailed=true;refresh();});
 }
 function stopMusic(fade=0,keep=false){
  const voice=musicVoice;if(!voice)return;musicVoice=null;musicTail=voice;
  musicOffset=keep?(voice.offset+Math.max(0,context.currentTime-voice.started))%musicData.config.loopEnd:0;
  const t=context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setValueAtTime(voice.gain.gain.value,t);voice.gain.gain.linearRampToValueAtTime(0,t+fade);try{voice.source.stop(t+fade);}catch{};
 }
 function syncMusic(state='off'){
  musicState=state;
  if(state!=='play'||document.hidden){stopMusic(state==='off'?1.2:0,state!=='off');if(state==='off')musicOffset=0;return;}
  if(!context||context.state!=='running')return;
  if(!musicData){loadMusic();return;}
  if(musicVoice)return;
  const {config,buffer}=musicData;
  if(musicTail){try{musicTail.source.stop();}catch{}musicTail=null;}
  if(!musicBus){musicBus=context.createGain();musicBus.connect(master);}musicBus.gain.value=config.gain*musicVolume;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;source.loopStart=config.loopStart;source.loopEnd=config.loopEnd;
  source.connect(gain).connect(musicBus);gain.gain.value=0;gain.gain.linearRampToValueAtTime(1,context.currentTime+(musicOffset?.2:config.fadeInMs/1000));
  const voice={source,gain,offset:musicOffset,started:context.currentTime};musicVoice=voice;source.onended=()=>{if(musicTail===voice)musicTail=null;source.disconnect();gain.disconnect();};source.start(0,musicOffset);
 }
 function setEnabled(value){unlock();enabled=!!value;setGain();if(!enabled)for(const voice of [...voices])if(!voice.loopKey)stopVoice(voice);save();refresh();if(enabled){play('ui_confirm');syncMusic(musicState);}}
 window.sagaAudio={play,unlock,stopCombat,syncZones,syncMusic,toggle:()=>setEnabled(!enabled),get status(){return {enabled,volume,sfxVolume:volume,musicVolume,ready,failed,music:!!musicVoice,musicReady:!!musicData,musicFailed,voices:voices.size,loops:zones.size,buffers:bank.size,state:context?.state||'locked'};}};
 $('soundEnabled').addEventListener('change',()=>setEnabled($('soundEnabled').checked));
 $('soundVolume').addEventListener('input',()=>{unlock();volume=Math.max(0,Math.min(1,Number($('soundVolume').value)/100));setGain();save();refresh();});
 $('musicVolume').addEventListener('input',()=>{unlock();musicVolume=Math.max(0,Math.min(1,Number($('musicVolume').value)/100));setGain();save();refresh();});
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{if(e.isTrusted)unlock();},{capture:true,passive:true});
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('button');if(!button||button.closest('#hud,#touch')||button.id==='sound'||button.id==='soundEnabled')return;
  play(/back|close|leave/i.test(button.id)?'ui_back':'ui_confirm');
 });
 document.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'&&e.target.closest?.('button')&&!e.target.closest('#hud,#touch'))play('ui_hover');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic(0,true);zones.clear();for(const voice of [...voices])stopVoice(voice);context?.suspend().catch(()=>{});}});
 refresh();
})();
