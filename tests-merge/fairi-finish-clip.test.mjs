import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const script = readFileSync(new URL('../web/fairi/finish-clip.js', import.meta.url), 'utf8');

function harness(ios, {canPlay = true, requiresMute = true} = {}) {
 const frames = [], calls = [];
 const video = {
  style: {}, children: [], readyState: 0, currentTime: 0, paused: true,
  setAttribute(){}, addEventListener(){},
  append(source){ this.children.push(source); },
  get lastElementChild(){ return this.children.at(-1); },
  pause(){ this.paused = true; },
  async play(){
   calls.push(this.muted);
   if (!canPlay || (requiresMute && !this.muted)) throw Object.assign(Error(), {name:'NotAllowedError'});
   this.readyState = 2;
   this.paused = false;
  }
 };
 const window = {sagaAudio:{connectCinematic:() => true}};
 runInNewContext(script,{
  window, Image:class { constructor(){ frames.push(this); } },
  document:{
   documentElement:{classList:{contains:() => ios}},
   createElement:tag => tag === 'video' ? video : {addEventListener(){}},
   body:{append(){}}
  }
 });
 const draws = [];
 const canvas = {globalAlpha:1, save(){}, restore(){}, fillRect(){},
  setTransform(...args){ assert.deepEqual(args,[1,0,0,1,0,0]); },
  drawImage(...args){ draws.push(args); }
 };
 return {clip:window.FairiFinishClip, video, frames, canvas, calls, draws};
}

test('iOS selects inline H.264 first and starts playback before any frame is decoded', async () => {
 const {clip,video,frames,calls,canvas,draws} = harness(true);
 clip.prepare();
 assert.match(video.children[0].src,/\.mp4\?v=3$/);
 assert.equal(video.playsInline,true);
 assert.equal(video.defaultMuted,true);
 assert.equal(frames.length,5);
 assert.equal(video.readyState,0);
 clip.sync(.01,false);
 await new Promise(setImmediate);
 assert.deepEqual(calls,[false,true]);
 assert.equal(clip.draw(canvas,1280,720,.2,true),true);
 assert.deepEqual(draws[0],[video,0,0,1280,720]);
 clip.sync(null,false);
 assert.equal(video.paused,true);
});

test('If iOS blocks video playback, the new clip uses timestamped frames at the game viewport aspect ratio', async () => {
 const {clip,frames,canvas,draws} = harness(true,{canPlay:false});
 clip.prepare();
 for(const frame of frames){
  frame.complete = true;
  frame.naturalWidth = 1792;
 }
 clip.sync(2,false);
 await new Promise(setImmediate);
 assert.equal(clip.draw(canvas,1600,1100,2,true),true);
 assert.deepEqual(draws[0],[frames[2],0,252,448,252,0,100,1600,900]);
 assert.equal(clip.draw(canvas,1280,720,4.4,true),false);
 assert.equal(clip.draw(canvas,1280,720,4.4,false),true);
 assert.deepEqual(draws[1].slice(0,5),[frames[4],0,756,448,252]);
});

test('Desktop keeps WebM preferred and can start before preload finishes', async () => {
 const {clip,video,frames,calls} = harness(false,{requiresMute:false});
 clip.prepare();
 assert.match(video.children[0].src,/\.webm\?v=3$/);
 assert.equal(frames.length,0);
 clip.sync(0,false);
 await new Promise(setImmediate);
 assert.deepEqual(calls,[false]);
 assert.equal(video.readyState,2);
});
