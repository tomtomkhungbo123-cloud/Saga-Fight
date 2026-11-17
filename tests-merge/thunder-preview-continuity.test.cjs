const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const source=fs.readFileSync('web/game.js','utf8');
test('Thunder waist stays opaque through cloth motion at fractional scales and both facings',()=>{
 const context=vm.createContext({Math,Object,time:0,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
 vm.runInContext(source.slice(source.indexOf('const THUNDER_SHAPES='),source.indexOf('// Reference poses keep individual proportions')),context);
 const canvas=native.createCanvas(500,500),g=canvas.getContext('2d');context.g=g;
 for(const scale of [.58,.85,1,1.45])for(const dir of [-1,1])for(let frame=0;frame<90;frame++){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,500,500);g.setTransform(dir*scale,0,0,scale,250,30);
  context.clock=frame/30;context.time=frame/30;context.dir=dir;
  vm.runInContext("drawThunderCloth(g,null,151,220,0,{dir},{bend:Math.sin(clock*2.5)*25,lift:Math.cos(clock)*7},'idle')",context);
  // The former sprite join ran through this interior band at 42% height.
  for(let y=Math.ceil(30+220*.39*scale);y<30+220*.45*scale;y++)for(let x=248;x<=252;x++)assert.ok(g.getImageData(x,y,1,1).data[3]>=250,`No transparent waist stripe: ${scale}/${dir}/${frame}, ${x},${y}`);
 }
});
