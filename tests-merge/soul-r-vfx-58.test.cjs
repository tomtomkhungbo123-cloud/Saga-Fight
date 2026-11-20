const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{performance}=require('perf_hooks'),{createCanvas,Path2D}=require('@napi-rs/canvas');
let paths=0,canvases=0;class CachedPath extends Path2D{constructor(...a){super(...a);paths++;}}
const c={window:{SoulDesign:{weaponPalette:['#a52e3e','#c63c4c','#dc4c54','#ff8a96']}},Math,Path2D:CachedPath,OffscreenCanvas:class{constructor(w,h){canvases++;return createCanvas(w,h);}}};vm.createContext(c);for(const file of ['vfx/soul-r-frames.js','soul-slam.js'])vm.runInContext(fs.readFileSync('web/'+file,'utf8'),c);
const cv=createCanvas(1200,700),ctx=cv.getContext('2d'),warmPaths=paths,warmCanvases=canvases,times=[];ctx.stroke=()=>{throw Error('no internal explosion strokes');};
for(const kind of ['slam','bleed'])for(const quality of ['high','low'])for(let i=1;i<60;i++){const e={x:600,y:500,size:420,age:i/60*.8,life:.8,stacks:10},before=JSON.stringify(e);ctx.resetTransform();ctx.clearRect(0,0,1200,700);const t=performance.now();if(kind==='slam')c.window.drawSoulSlam(ctx,e,quality);else{ctx.translate(600,350);c.window.drawSoulBleedBurst(ctx,e,quality);}times.push(performance.now()-t);assert.equal(JSON.stringify(e),before);}
assert.equal(paths,warmPaths);assert.equal(canvases,warmCanvases);assert.equal(c.window.drawSoulSlam(ctx,{age:.8,life:.8}),false);
// Geometry must physically separate and vanish, not fade an unchanged star.
function area(d){ctx.resetTransform();ctx.clearRect(0,0,1200,700);ctx.translate(600,350);ctx.scale(200,200);ctx.fill(new Path2D(d),'evenodd');const data=ctx.getImageData(0,0,1200,700).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)n++;return n;}
for(const kind of ['ground','burst']){const f=c.window.SoulExplosionFrames[kind];assert.equal(f.length,28);assert.ok(area(f[18])<area(f[5])*.45);assert.equal(area(f[27]),0);}
assert.ok(!fs.readFileSync('web/soul-slam.js','utf8').includes('new Image'),'body edges use resolution-independent paths');
assert.ok(c.window.SoulExplosionFrames.burst[5].includes('Q'),'bleed uses curved donor contours');
times.sort((a,b)=>a-b);console.log('PASS vector impact and direct-reference bleed: curved contour breakup, empty final frame, no strokes/raster body, finite/read-only, high/low, no runtime path/canvas allocation. Mean '+(times.reduce((a,b)=>a+b)/times.length).toFixed(2)+'ms; p95 '+times[Math.floor(times.length*.95)].toFixed(2)+'ms');
