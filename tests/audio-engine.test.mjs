import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const sounds=JSON.parse(fs.readFileSync('web/sfx/manifest.json')).sounds;
test('audio unlock, cached decode, voice limits, priority, persisted controls and mute cleanup',async()=>{
 const elements=new Map(),listeners={},saved=new Map();let loads=0,decodes=0,contexts=0,resumes=0,latestContext;const sources=[],requests=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'60',checked:false,textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){}});return elements.get(id);};
 const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
 const node=()=>({connect(target){this.target=target;return target||this;},disconnect(){},gain:param(),pan:param()});
 class Audio{constructor(){latestContext=this;contexts++;this.state='suspended';this.currentTime=0;this.sampleRate=48000;this.destination={};}createGain(){return node();}createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}createBufferSource(){const s={...node(),playbackRate:{value:1},start(...args){this.startArgs=args;if(this.buffer.silent)this.onended?.();},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;}createBuffer(){return {silent:true};}decodeAudioData(){decodes++;return Promise.resolve({duration:80});}createStereoPanner(){return node();}resume(){resumes++;this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}}
 const document={hidden:false,getElementById:el,addEventListener(k,f){(listeners[k]??=[]).push(f);}};
 const c={window:{webkitAudioContext:Audio},document,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},fetch:async path=>{requests.push(path);loads++;return {ok:true,json:async()=>path.includes('/music/')?JSON.parse(fs.readFileSync('web/music/manifest.json')):({sounds}),arrayBuffer:async()=>new ArrayBuffer(1)};},Map,Set,Math,JSON};vm.runInNewContext(fs.readFileSync('web/saga-audio.js','utf8'),c);
 const audio=c.window.sagaAudio;assert.equal(audio.status.state,'locked');assert.equal(audio.play('hit_1'),false);
 listeners.pointerdown[0]({isTrusted:false});assert.equal(contexts,0);listeners.pointerdown[0]({isTrusted:true});
 for(let i=0;i<30&&!audio.status.ready;i++)await new Promise(r=>setImmediate(r));
 assert.equal(audio.status.ready,true);assert.equal(decodes,56);assert.equal(loads,57);assert.equal(resumes,1);
 audio.unlock();audio.unlock();assert.equal(contexts,1);assert.equal(decodes,56);
 audio.toggle();assert.equal(audio.status.enabled,true);for(let i=0;i<30;i++)audio.play('hit_1');assert.equal(audio.status.voices,16);
 audio.stopCombat();assert.ok(audio.status.voices<=1);for(let i=0;i<16;i++)audio.play('ko');assert.equal(audio.status.voices,16);assert.equal(audio.play('ui_hover'),false);
 el('soundVolume').value='25';el('soundVolume').listeners.input();assert.equal(audio.status.volume,.25);assert.equal(JSON.parse(saved.get('saga.audio.v1')).volume,.25);
 audio.stopCombat();
 assert.ok(requests.every(p=>p.includes('?v=')));
 // Two ultimates: newest strike always starts, two tails max; slam tails retain full WAV.
 for(let i=0;i<20;i++)assert.equal(audio.play('thunder_r_strike',{owner:i%2}),true);
 assert.equal(sources.filter(s=>s.buffer&&!s.buffer.silent&&!s.stopped).length,2);
 audio.stopCombat();audio.play('mox_r_slam',{owner:0});audio.play('mox_r_slam',{owner:1});assert.equal(audio.status.voices,2);
 assert.equal(audio.play('mox_r_barrage_hit',{owner:0}),true);assert.equal(audio.play('mox_r_barrage_hit',{owner:0}),false);assert.equal(audio.play('mox_r_barrage_hit',{owner:1}),true);
 audio.stopCombat();
 const zones=[{key:'p0:w:1',id:'cylast_w_rain_loop',life:10,age:0,x:300},{key:'p1:r:1',id:'cylast_r_storm_loop',life:10,age:0,x:1200}];
 audio.play('cylast_w_rain_cast',{instance:zones[0].key});audio.syncZones(zones);const starts=sources.length;assert.equal(audio.status.loops,2);
 for(let i=0;i<1200;i++)audio.syncZones(zones.map(z=>({...z,age:i/120,life:10-i/120})));
 assert.equal(sources.length,starts,'loop sources do not restart across >2 WAV cycles');assert.equal(decodes,56);
 audio.toggle();assert.equal(audio.status.enabled,false);audio.syncZones(zones);assert.equal(sources.length,starts,'mute keeps loops silent via master, no restart');audio.toggle();assert.equal(audio.status.loops,2);
 audio.syncZones([zones[1]]);assert.equal(audio.status.loops,1);assert.equal(sources[starts-2].stopped,true); // W removed, R unaffected
 audio.syncZones([]);assert.equal(audio.status.loops,0);
 audio.syncZones(zones);audio.stopCombat();assert.equal(audio.status.loops,0);assert.ok(audio.status.voices<=1);
 audio.toggle();assert.equal(audio.status.voices,0);assert.equal(audio.play('hit_1'),false);
 document.hidden=true;listeners.visibilitychange[0]();assert.equal(audio.status.state,'suspended');document.hidden=false;listeners.keydown[0]({isTrusted:true});assert.equal(audio.status.state,'running');
 // Music is decoded once, outside SFX stealing, and retains its loop phase on pause.
 audio.toggle();audio.syncMusic('play');for(let i=0;i<30&&!audio.status.musicReady;i++)await new Promise(r=>setImmediate(r));
 assert.equal(audio.status.musicReady,true);assert.equal(audio.status.music,true);const musicStarts=sources.length;const music=sources.at(-1);assert.equal(music.loop,true);assert.equal(music.loopEnd,80);assert.equal(decodes,57);
 const musicBus=music.target.target,initialMusicGain=musicBus.gain.value;
 el('soundVolume').value='0';el('soundVolume').listeners.input();assert.equal(audio.status.sfxVolume,0);assert.equal(audio.status.musicVolume,.6);assert.equal(musicBus.gain.value,initialMusicGain);assert.equal(audio.status.music,true);
 el('musicVolume').value='20';el('musicVolume').listeners.input();assert.equal(audio.status.musicVolume,.2);assert.equal(audio.status.sfxVolume,0);assert.ok(Math.abs(musicBus.gain.value-.35*.2)<1e-10);assert.equal(sources.at(-1),music,'volume change does not recreate BGM');
 el('soundVolume').value='25';el('soundVolume').listeners.input();assert.equal(musicBus.gain.value,.35*.2);const stored=JSON.parse(saved.get('saga.audio.v1'));assert.equal(stored.sfxVolume,.25);assert.equal(stored.musicVolume,.2);
 el('musicVolume').value='0';el('musicVolume').listeners.input();assert.equal(musicBus.gain.value,0);assert.equal(audio.status.sfxVolume,.25);el('musicVolume').value='20';el('musicVolume').listeners.input();

 for(let i=0;i<3*80*60;i++)audio.syncMusic('play');assert.equal(sources.length,musicStarts);
 latestContext.currentTime=85;audio.syncMusic('pause');assert.equal(audio.status.music,false);assert.equal(music.stopped,true);audio.syncMusic('play');assert.equal(sources.at(-1).startArgs[1],5);assert.equal(decodes,57);
 audio.toggle();assert.equal(audio.status.enabled,false);audio.syncMusic('play');const mutedStarts=sources.length;assert.equal(audio.status.music,true);audio.toggle();assert.equal(sources.length,mutedStarts+1,'unmute only adds UI cue');
 audio.stopCombat();assert.equal(audio.status.music,true,'round/combat cleanup does not restart music');
 audio.syncMusic('off');assert.equal(audio.status.music,false);audio.syncMusic('play');assert.equal(sources.at(-1).startArgs[1],0);assert.equal(decodes,57);
 document.hidden=true;listeners.visibilitychange[0]();assert.equal(audio.status.music,false);document.hidden=false;listeners.pointerdown[0]({isTrusted:true});audio.syncMusic('play');assert.equal(audio.status.music,true);audio.syncMusic('off');
 vm.runInNewContext(fs.readFileSync('web/saga-audio.js','utf8'),c);assert.equal(c.window.sagaAudio.status.sfxVolume,.25);assert.equal(c.window.sagaAudio.status.musicVolume,.2,'independent mix survives reload');
 saved.set('saga.audio.v1',JSON.stringify({enabled:true,volume:.42}));vm.runInNewContext(fs.readFileSync('web/saga-audio.js','utf8'),c);assert.equal(c.window.sagaAudio.status.sfxVolume,.42);assert.equal(c.window.sagaAudio.status.musicVolume,.42,'legacy master volume migrates without loudness jump');


});
test('every cue maps to a valid supplied 48kHz mono PCM WAV',()=>{
 assert.equal(sounds.length,56);for(const cue of sounds){const b=fs.readFileSync('web/sfx/'+cue.file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),48000);assert.equal(b.readUInt16LE(34),16);assert.ok(b.length>44);}
});
