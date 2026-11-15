'use strict';
(()=>{
// A graph, not a JSON clone: attacks/projectiles must share the same use object.
const skip=new Set(['poseLayers','poseClock','poseKey','pveAI','netDrawX','netDrawY','netX','netY','netTurn']);
function pack(value){const seen=new Map(),nodes=[];function visit(v){if(v===undefined)return {u:1};if(typeof v==='number'&&!Number.isFinite(v))return {n:String(v)};if(v===null||typeof v!=='object')return v;if(seen.has(v))return {r:seen.get(v)};const id=nodes.length;seen.set(v,id);const node={a:Array.isArray(v),v:[]};nodes.push(node);for(const k of Object.keys(v).sort())if(!skip.has(k)&&typeof v[k]!=='function')node.v.push([k,visit(v[k])]);return {r:id};}return {root:visit(value),nodes};}
function unpack(graph){if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length>30000)throw Error('Invalid checkpoint');const objects=graph.nodes.map(n=>n.a?[]:{});function read(v){if(v&&typeof v==='object'){if('r'in v){if(!Number.isInteger(v.r)||!objects[v.r])throw Error('Invalid reference');return objects[v.r];}if(v.u)return undefined;if(v.n)return v.n==='NaN'?NaN:v.n==='Infinity'?Infinity:-Infinity;throw Error('Invalid value');}return v;}graph.nodes.forEach((n,i)=>{if(!Array.isArray(n.v))throw Error('Invalid node');for(const [k,v]of n.v){if(['__proto__','prototype','constructor'].includes(k))throw Error('Unsafe key');objects[i][k]=read(v);}});return read(graph.root);}
// Normalize sub-nanosecond/sub-pixel noise before it can accumulate across JS engines.
function canonicalize(value,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);for(const k of Object.keys(value)){if(skip.has(k))continue;const v=value[k];if(typeof v==='number'&&Number.isFinite(v)&&!Number.isInteger(v))value[k]=Math.round(v*1e9)/1e9;else if(v&&typeof v==='object')canonicalize(v,seen);}}
function hash(graph){const s=JSON.stringify(graph);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
const validActions=new Set(['attack','q','w','e','r','jump','drop','pause','ready']);
class Rollback {
 constructor({player,adapter,delay=2,maxLead=48,history=180}){this.player=player;this.adapter=adapter;this.delay=delay;this.maxLead=maxLead;this.limit=history;this.tick=0;this.remote=delay;this.ack=delay;this.confirmed=0;this.peerTick=0;this.local=new Map();this.inputs=new Map();this.used=new Map();this.states=new Map([[0,pack(adapter.capture())]]);this.actions=[];this.stats={rollbacks:0,replayedTicks:0,maxReplay:0,waits:0};for(let t=1;t<=delay;t++){this.local.set(t,{t,m:0,a:[]});this.inputs.set(t,{t,m:0,a:[]});}}
 queue(k){if(validActions.has(k)&&this.actions.length<16)this.actions.push(k);}
 input(t){if(this.inputs.has(t))return this.inputs.get(t);let p=t-1;while(p>0&&!this.inputs.has(p))p--;return {t,m:this.inputs.get(p)?.m||0,a:[]};}
 simulate(t,replay=false){this.adapter.beforeAdvance?.(replay);const local=this.local.get(t),remote=this.input(t);this.used.set(t,JSON.stringify(remote));const pair=this.player===0?[local,remote]:[remote,local];this.adapter.step(pair);this.adapter.afterAdvance?.(replay);this.states.set(t,pack(this.adapter.capture()));}
 advance(move=0){if(this.tick-this.remote>=this.maxLead||this.tick-this.ack>=this.maxLead){this.stats.waits++;return false;}const t=this.tick+this.delay+1;this.local.set(t,{t,m:[-1,0,1].includes(move)?move:0,a:this.actions.splice(0)});this.simulate(++this.tick);this.commit();return true;}
 receive(packet){if(!packet||!Array.isArray(packet.frames)||packet.frames.length>120||!Number.isSafeInteger(packet.ack)||packet.ack<0||packet.ack>this.tick+this.delay||!Number.isSafeInteger(packet.tick)||packet.tick<0||packet.tick>this.tick+240)return false;let dirty=Infinity;const batch=new Set();for(const f of packet.frames){if(!f||!Number.isSafeInteger(f.t)||f.t<1||f.t>this.tick+240||![-1,0,1].includes(f.m)||!Array.isArray(f.a)||f.a.length>16||f.a.some(k=>!validActions.has(k))||batch.has(f.t))return false;batch.add(f.t);if(f.t<=this.confirmed&&!this.inputs.has(f.t))continue;const old=this.inputs.get(f.t);if(old&&JSON.stringify(old)!==JSON.stringify(f))return false;}
 this.ack=Math.max(this.ack,packet.ack);this.peerTick=Math.max(this.peerTick,packet.tick);
 for(const f of packet.frames){if(f.t<=this.confirmed&&!this.inputs.has(f.t))continue;this.inputs.set(f.t,{t:f.t,m:f.m,a:[...f.a]});if(f.t<=this.tick&&this.used.get(f.t)!==JSON.stringify(f))dirty=Math.min(dirty,f.t);}
 while(this.inputs.has(this.remote+1))this.remote++;
 if(dirty!==Infinity){const state=this.states.get(dirty-1);if(!state)return false;this.adapter.beforeRollback?.();this.adapter.restore(unpack(state));const count=this.tick-dirty+1;for(let t=dirty;t<=this.tick;t++)this.simulate(t,true);this.stats.rollbacks++;this.stats.replayedTicks+=count;this.stats.maxReplay=Math.max(count,this.stats.maxReplay);this.adapter.corrected?.();}
 this.commit();return true;}
 commit(){const next=Math.min(this.tick,this.remote,this.ack);for(let t=this.confirmed+1;t<=next;t++)this.adapter.commit?.(unpack(this.states.get(t)),t);this.confirmed=next;const oldest=Math.max(0,this.confirmed-this.limit);for(const map of [this.states,this.local,this.inputs,this.used])for(const t of map.keys())if(t<oldest)map.delete(t);}
 packet(){return {tick:this.tick,ack:this.remote,frames:[...this.local.values()].filter(f=>f.t>this.ack).slice(0,120)};}
 checkpoint(){return this.states.get(this.confirmed);}
 digest(t=this.confirmed){const s=this.states.get(t);return s?{tick:t,hash:hash(s)}:null;}
}
window.SagaRollback={build:'6.23.0',Rollback,pack,unpack,hash,canonicalize};
})();
