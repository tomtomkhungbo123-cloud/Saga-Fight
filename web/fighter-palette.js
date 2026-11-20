// Fighter skins and mirror palettes. Recolor sprites once; no per-frame filters.
(()=>{
 const angles={thunder:155,soul:205,cylast:100,mox:165,melanta:130,fairi:145,aether:145},contexts=new WeakMap(),images=new WeakMap(),caches={};
 const effects=new Map(),contextTypes=new WeakMap(),tints=new WeakMap();
 const matrices={
  // Turn Thunder Stance's gold into dark reds while keeping the garment's shading.
  'thunder-crimson':[.67,.24,-.13, -.09,.24,.04, 0,.25,-.02]
 };
 function matrix(type){if(matrices[type])return matrices[type];if(type==='defeated')return matrices[type]=[.213,.715,.072,.213,.715,.072,.213,.715,.072];const a=angles[type]*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return matrices[type]=[.213+.787*c-.213*s,.715-.715*c-.715*s,.072-.072*c+.928*s,.213-.213*c+.143*s,.715+.285*c+.140*s,.072-.072*c-.283*s,.213-.213*c-.787*s,.715-.715*c+.715*s,.072+.928*c+.072*s];}
 const byte=v=>Math.max(0,Math.min(255,Math.round(v)));
 function rotate(r,g,b,type){const effect=effects.get(type);if(effect){const low=Math.min(r,g,b),chroma=Math.max(r,g,b)-low,base=Math.max(0,low-effect.boost[chroma]),edge=low+chroma-base;return effect.channels.map(channel=>base+channel[edge]);}const m=matrix(type);return [byte(m[0]*r+m[1]*g+m[2]*b),byte(m[3]*r+m[4]*g+m[5]*b),byte(m[6]*r+m[7]*g+m[8]*b)];}
 function color(value,type){if(typeof value!=='string')return value;const cache=caches[type]??=new Map();if(cache.has(value))return cache.get(value);let match=value.match(/^#([\da-f]{3,8})$/i),rgb,alpha='';if(match){let hex=match[1];if(hex.length<=4)hex=[...hex].map(c=>c+c).join('');if(![6,8].includes(hex.length))return value;rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));alpha=hex.slice(6);const result='#'+rotate(...rgb,type).map(v=>v.toString(16).padStart(2,'0')).join('')+alpha;if(cache.size<512)cache.set(value,result);return result;}match=value.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);if(!match)return value;const result=`rgba(${rotate(+match[1],+match[2],+match[3],type).join(',')},${match[4]??1})`;if(cache.size<512)cache.set(value,result);return result;}
 function image(source,type){
  if(!source||!(source.width||source.naturalWidth))return source;
  let cache=images.get(source);if(!cache)images.set(source,cache={});
  if(cache[type])return cache[type];
  const c=document.createElement('canvas');c.width=source.naturalWidth||source.width;c.height=source.naturalHeight||source.height;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);
  const pixels=g.getImageData(0,0,c.width,c.height),p=pixels.data,effect=effects.get(type);
  if(effect){
   const {boost,channels:[red,green,blue]}=effect;
   for(let i=0;i<p.length;i+=4)if(p[i+3]){
    const low=Math.min(p[i],p[i+1],p[i+2]),high=Math.max(p[i],p[i+1],p[i+2]),base=Math.max(0,low-boost[high-low]),edge=high-base;
    p[i]=base+red[edge];p[i+1]=base+green[edge];p[i+2]=base+blue[edge];
   }
  }else{
   const m=matrix(type);
   for(let i=0;i<p.length;i+=4)if(p[i+3]){
    const r=p[i],g=p[i+1],b=p[i+2];
    p[i]=byte(m[0]*r+m[1]*g+m[2]*b);p[i+1]=byte(m[3]*r+m[4]*g+m[5]*b);p[i+2]=byte(m[6]*r+m[7]*g+m[8]*b);
   }
  }
  g.putImageData(pixels,0,0);return cache[type]=c;
 }
 // These atlases carry alpha silhouettes; native source-in tint avoids scanning millions of pixels.
 function tint(source,value,drawContext){
  const type=contextTypes.get(drawContext),target=type?color(value,type):value;
  let cache=tints.get(source);if(!cache)tints.set(source,cache=new Map());
  const key=(type||'base')+':'+target;if(cache.has(key))return cache.get(key);
  const output=document.createElement('canvas');output.width=source.naturalWidth||source.width;output.height=source.naturalHeight||source.height;
  const g=output.getContext('2d');g.drawImage(source,0,0);g.globalCompositeOperation='source-in';g.fillStyle=target;g.fillRect(0,0,output.width,output.height);
  // The matching context must not recolor this already-tinted image a second time.
  if(type)images.set(output,{[type]:output});
  if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,output);return output;
 }
 function context(ctx,type){let cache=contexts.get(ctx);if(!cache)contexts.set(ctx,cache={});if(cache[type])return cache[type];const methods=new Map();const proxy=new Proxy(ctx,{set(target,key,value){target[key]=['fillStyle','strokeStyle','shadowColor'].includes(key)?color(value,type):value;return true;},get(target,key){const value=target[key];if(typeof value!=='function')return value;if(methods.has(key))return methods.get(key);let fn;if(key==='drawImage')fn=(source,...args)=>target.drawImage(image(source,type),...args);else if(key==='createLinearGradient'||key==='createRadialGradient')fn=(...args)=>{const gradient=value.apply(target,args),add=gradient.addColorStop.bind(gradient);gradient.addColorStop=(offset,c)=>add(offset,color(c,type));return gradient;};else fn=value.bind(target);methods.set(key,fn);return fn;}});contextTypes.set(proxy,type);return cache[type]=proxy;}
 function register(type,angle){
  if(Object.hasOwn(angles,type))return;
  angles[type]=angle;
  angles[type+'-mirror']=(angle+155)%360;
 }
 function registerEffect(type,reference){
  const rgb=[1,3,5].map(i=>parseInt(reference.slice(i,i+2),16));
  const peak=Math.max(...rgb);
  // Keep the white core and the original brightness ramp while replacing the hue of colored layers.
  const low=Math.min(...rgb);
  const strength=.24+(1-peak/255)*1.7;
  const boost=Uint8Array.from({length:256},(_,index)=>byte(index*strength));
  const channels=rgb.map(value=>{
   const ratio=(value-low)/(peak-low||1);
   const gain=1-(1-peak/255)*.64;
   return Uint8Array.from({length:256},(_,index)=>byte(index*(.12+.88*ratio)*gain));
  });
  effects.set(type,{boost,channels});
 }
 window.FighterPalette={context,color,image,tint,register,registerEffect};
})();
