const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const raster=require('@napi-rs/canvas');
const source=fs.readFileSync(path.join(__dirname,'../web/game.js'),'utf8');
async function scenery(){
 const image=await raster.loadImage(path.join(__dirname,'../web/assets/arena.png'));
 const c=vm.createContext({W:1600,H:1117,map:image,Math,Number,Infinity,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
 vm.runInContext(source.slice(source.indexOf('const CAVERN_FRAME='),source.indexOf('function render(){')),c);
 const canvas=raster.createCanvas(2624,2013);c.brush=canvas.getContext('2d');vm.runInContext('drawCavernScenery(brush)',c);
 return {c,canvas,run:s=>vm.runInContext(s,c)};
}
test('high jumps and grab camera shifts retain opaque scenery at every screen edge',async()=>{
 const {c,canvas,run}=await scenery();
 for(const [w,h] of [[1234,675],[1920,1080],[1024,768]])for(const y of [972,491,100,-220,-900]){
  c.screenW=w;c.screenH=h;c.fighterY=y;
  const view=run('var view=cavernViewport(screenW,screenH);var lift=cavernPanTarget([{y:fighterY,mox:{action:{grab:true}}},{y:972}],view);({...view,lift})');
  for(const shake of [-12,12]){
   const frame=raster.createCanvas(w,h),g=frame.getContext('2d');g.setTransform(view.scale,0,0,view.scale,view.offsetX+shake*view.scale,view.offsetY+(view.lift+shake)*view.scale);g.drawImage(canvas,-512,-768);
   for(const x of [0,Math.floor(w/3),Math.floor(w*.7),w-1])for(const row of [0,30,Math.floor(h/2),h-1])assert.equal(g.getImageData(x,row,1,1).data[3],255,`${w}x${h}, fighter y=${y}, shake=${shake}, pixel ${x},${row}`);
  }
 }
});
test('the newly exposed ceiling contains artwork instead of a flat rectangular band',async()=>{
 const {c,canvas,run}=await scenery();c.fighterY=-220;
 const view=run('var view=cavernViewport(1234,675);({...view,lift:cavernPanTarget([{y:fighterY}],view)})');
 const frame=raster.createCanvas(1234,675),g=frame.getContext('2d');g.setTransform(view.scale,0,0,view.scale,view.offsetX,view.offsetY+view.lift*view.scale);g.drawImage(canvas,-512,-768);
 const colors=new Set();for(let x=50;x<1180;x+=20)colors.add(Array.from(g.getImageData(x,25,1,1).data).join(','));assert.ok(colors.size>10,'The upper view retains the cavern scenery across its width');
});
