import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../web/online.js',import.meta.url),'utf8');
const begin=source.indexOf('const MAX_SETUP_ICE_RETRIES=2;');
const end=source.indexOf(' function fallback(',begin);
assert.ok(begin>0&&end>begin,'test reads the actual shipping ICE retry function');
const extracted=source.slice(begin,end);

function fixture(role='host'){
 const n={role,joined:true,started:false,activeRoute:'pending',directGeneration:1,
  autoIceRetries:0,iceRetryRequestedAt:-Infinity,metrics:{},createdAt:0};
 let now=10000;
 const timers=[],signals=[],starts=[],events=[];
 const bindings={session:n,performance:{now:()=>now},directRequired:()=>true,
  signal:(_n,kind,data)=>{signals.push({kind,...data});return true;},
  recordEvent:(_n,type,details)=>events.push({type,...details}),
  setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},
  resetRouteAttempt:state=>{state.resets=(state.resets||0)+1;state.pc=null;},
  startDirect:state=>{state.directGeneration++;starts.push(state.directGeneration);}};
 const retry=new Function('bindings',`const {session,performance,directRequired,signal,recordEvent,setTimeout,resetRouteAttempt,startDirect}=bindings;\n${extracted}\nreturn retrySetupIce;`)(bindings);
 return {n,retry,timers,signals,starts,events,setTime:t=>{now=t},fire:()=>timers.shift().fn()};
}

test('pre-match DIRECT host makes at most two automatic ICE retries',()=>{
 const f=fixture();
 assert.equal(f.retry(f.n,'failed'),true);
 assert.equal(f.retry(f.n,'duplicate-failed'),true);
 assert.equal(f.n.autoIceRetries,1,'duplicate state notifications do not consume retry budget');
 assert.equal(f.timers.length,1);
 f.fire();assert.equal(f.n.directGeneration,2);
 assert.equal(f.retry(f.n,'checking-timeout'),true);
 f.fire();assert.equal(f.n.directGeneration,3);
 assert.equal(f.retry(f.n,'failed'),false,'a third failed handshake is reported');
 assert.deepEqual(f.starts,[2,3]);
});

test('Guest asks Host for another offer and respects retry budget',()=>{
 const f=fixture('guest');
 assert.equal(f.retry(f.n,'failed'),true);
 assert.equal(f.signals.at(-1).kind,'fallback');
 assert.equal(f.signals.at(-1).reason,'ice-retry');
 assert.equal(f.retry(f.n,'duplicate-failure'),true);
 assert.equal(f.signals.length,1,'rate limited retry request');
 f.n.autoIceRetries=2;
 assert.equal(f.retry(f.n,'exhausted'),false);
});

test('ICE handshake retry cannot affect a running PVP FIX 2 match',()=>{
 const f=fixture();
 f.n.started=true;
 assert.equal(f.retry(f.n,'failed'),false);
 f.n.started=false;f.n.activeRoute='direct';
 assert.equal(f.retry(f.n,'failed'),false);
 assert.equal(f.timers.length,0);
});

test('fallback STUN retains host candidates and never configures TURN',()=>{
 assert.match(source,/stun:stun.cloudflare.com:3478/);
 assert.match(source,/stun:stun.l.google.com:19302/);
 assert.match(source,/iceTransportPolicy:'all'/);
 assert.doesNotMatch(source,/iceTransportPolicy:'relay'/);
 assert.match(source,/NET_BUILD='6.36.0-pvpfix2'/);
 assert.match(source,/SIMULATION='6360-aether31-pvpfix2-room2-fairiko1'/);
});
