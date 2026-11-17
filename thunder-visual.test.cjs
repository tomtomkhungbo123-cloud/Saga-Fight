const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const scene=native.createCanvas(1200,650),elements={};
function el(id){return elements[id]??={value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:650}},getContext(){return scene.getContext('2d')},firstChild:{textContent:''}};}
const c=vm.createContext({console,Math,Image:native.Image,document:{createElement(){return native.createCanvas(1,1)},getElementById:el,querySelectorAll(){return []},activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false}}},addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},devicePixelRatio:1});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../web/game.js'),'utf8'),c);const run=s=>vm.runInContext(s,c);
(async()=>{
 for(const pose of ['idle','charge','shoot','lift','slam','dash','appear','ultimate']){c.poseName=pose;c.asset=await native.loadImage(path.join(__dirname,'../web/assets/'+pose+'.png'));run('art[poseName]=asset;');}
 // Comparable elapsed time yields identical springs at 30/60/120Hz; turning does not flip stored world momentum.
 const results=[];for(const hz of [30,60,120]){run('var f=makeFighter("thunder",0);f.vx=430;');run(`for(let i=0;i<${hz};i++)thunderCloth(f,1/${hz})`);results.push(run('f.thunderCloth.bend'));}
 assert(Math.max(...results)-Math.min(...results)<1e-9);run('f.dir=-1;');const before=run('f.thunderCloth.bend');run('thunderCloth(f,0)');assert.equal(run('f.thunderCloth.bend'),before);run('f.vx=0;for(let i=0;i<240;i++)thunderCloth(f,1/120)');assert(Math.abs(run('f.thunderCloth.bend'))<.001);
 for(const angle of [0,.7,1.57,3.14]){c.dx=Math.cos(angle)*600;c.dy=Math.sin(angle)*600;const paths=run('lightningPaths(dx,dy,3)');assert.deepEqual(Array.from(paths[0][0]),[0,0]);assert.deepEqual(Array.from(paths[0].at(-1)),[c.dx,c.dy]);assert(paths.length>2&&paths.length<=6);assert(paths.flat().every(p=>p.every(Number.isFinite)));assert.equal(JSON.stringify(paths),run('JSON.stringify(lightningPaths(dx,dy,3))'));}
 run("ctx.fillStyle='#101b25';ctx.fillRect(0,0,1200,650);time=1;graphicsQuality='high';");
 for(let i=0;i<4;i++){c.i=i;run("var f=makeFighter('thunder',0);f.x=150+i*280;f.y=280;f.vx=i===1?430:i===2?-430:0;f.dir=i===2?-1:1;f.poseClock=time-1/60;for(let j=0;j<60;j++)thunderCloth(f,1/60);thunderDraw(f);");}
 run("bolt(80,480,1100,490,'#f5db8b',3,3.2);bolt(180,350,280,620,'#f5db8b',5,5.5);");
 const pixels=scene.getContext('2d').getImageData(0,330,1200,320).data;let yellow=0,white=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>150&&pixels[i+1]>100&&pixels[i]>pixels[i+2]+30)yellow++;if(pixels[i]>210&&pixels[i+1]>230&&pixels[i+2]>205)white++;}assert(yellow>300&&white>50);
 const idle=run('THUNDER_DRAPE.idle.flat()');assert(idle.every(p=>p.every(Number.isFinite)));const ends=idle.filter(p=>p[1]>.95);assert(ends.length>0);assert(ends.every(p=>Math.abs(p[0])<.42));
 // Every pose renders at both facings and both quality levels without seams/non-finite transforms.
 for(const quality of ['low','high'])for(const k of ['attack','q','w','e','r'])for(const dir of [-1,1]){c.k=k;c.dir=dir;c.quality=quality;run("graphicsQuality=quality;f.dir=dir;f.action={k,age:.6,duration:1};for(let i=0;i<5;i++){time+=1/60;thunderDraw(f)}");}
 const costs=[];for(let i=0;i<120;i++){const t=process.hrtime.bigint();run("time+=1/60;f.action=null;thunderDraw(f);bolt(80,480,1100,490,'#f5db8b',3,time*18);");costs.push(Number(process.hrtime.bigint()-t)/1e6);}costs.sort((a,b)=>a-b);console.log(JSON.stringify({visualCpuMeanMs:costs.reduce((a,b)=>a+b)/costs.length,visualCpuP95Ms:costs[114]}));
 if(process.env.THUNDER_REVIEW_PNG)fs.writeFileSync(process.env.THUNDER_REVIEW_PNG,scene.toBuffer('image/png'));
 console.log('PASS native canvas lightning terminals/branches/palette, stable cloth at30/60/120Hz, stop/turn, all skills/facings/quality');
})().catch(e=>{console.error(e);process.exitCode=1;});
