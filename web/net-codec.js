// Acknowledged-baseline deltas. Lost/reordered packets cannot corrupt a baseline.
(()=>{
const copy=v=>JSON.parse(JSON.stringify(v));
function diff(a,b,path=[],out=[]){if(a===b)return out;if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){if(Array.isArray(b)&&a.length!==b.length){out.push([path,b]);return out;}for(const k of Object.keys(a))if(!(k in b))out.push([path.concat(k)]);for(const k of Object.keys(b))diff(a[k],b[k],path.concat(k),out);}else out.push([path,b]);return out;}
function apply(base,ops){let out=copy(base);for(const [path,value] of ops){if(path.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('path');if(!path.length){out=value;continue;}let node=out;for(let i=0;i<path.length-1;i++)node=node[path[i]];if(value===undefined)delete node[path.at(-1)];else node[path.at(-1)]=value;}return out;}
class Codec{
 constructor(){this.reset();}
 reset(){this.sent=new Map();this.received=new Map();this.ack=0;this.last=0;this.ids=new WeakMap();this.serial=0;this.births=new Map();}
 pack(snapshot){const s=copy(snapshot),fx={};const capture=(items,kind)=>items.map(e=>{let id=this.ids.get(e);if(!id){id=++this.serial;this.ids.set(e,id);this.births.set(id,{kind,at:s.time,data:copy(e)});}fx[id]=this.births.get(id);return id;});s.effects=capture(snapshot.effects,'arena');s.fighters.forEach((f,i)=>{if(f.mox){f.mox.fx=capture(snapshot.fighters[i].mox.fx,'mox');}});s.fx=fx;for(const id of this.births.keys())if(!fx[id])this.births.delete(id);return s;}
 encode(snapshot){const s=this.pack(snapshot),base=this.sent.get(this.ack);const full={id:s.tick,full:s},delta=base?{id:s.tick,base:this.ack,ops:diff(base,s)}:null;const message=delta&&JSON.stringify(delta).length<JSON.stringify(full).length?delta:full;this.sent.set(s.tick,s);while(this.sent.size>64)this.sent.delete(this.sent.keys().next().value);return message;}
 decode(message){if(!message||!Number.isInteger(message.id)||message.id<=this.last)return null;let s;if(message.full)s=message.full;else{const base=this.received.get(message.base);if(!base)return null;s=apply(base,message.ops);}if(!s||!Array.isArray(s.fighters)||s.fighters.length!==2||!Array.isArray(s.effects)||!s.fx||!Number.isFinite(s.time))throw Error("snapshot");const baseline=copy(s);s=copy(s);const expand=ids=>ids.map(id=>{const e=s.fx[id],data=copy(e.data),age=s.time-e.at;if(e.kind==='arena')data.age+=age;else data.life-=age;return data;});s.effects=expand(s.effects);s.fighters.forEach(f=>{if(f.mox){f.mox.fx=expand(f.mox.fx);}});delete s.fx;this.last=message.id;this.received.set(message.id,baseline);while(this.received.size>64)this.received.delete(this.received.keys().next().value);return s;}
}
window.SagaNetCodec=Codec;
})();
