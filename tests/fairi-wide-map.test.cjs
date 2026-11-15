const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const raster=require('@napi-rs/canvas');
function lab(){
 const c=vm.createContext({console,Math,window:{},Path2D:raster.Path2D,document:{createElement:()=>raster.createCanvas(16,16)}});
 for(const name of ['w-skill','normal-combo','reference-shape','rig','dash-vfx','r-visual','clone-motion','visual'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web/fairi/'+name+'.js'),'utf8'),c);
 return {c,run:s=>vm.runInContext(s,c)};
}
test('Q shadows and the fading ribbon follow the actual dash endpoint beyond the old arena',()=>{
 const {run}=lab();
 run('var a={k:"q",sx:2600,sy:0,dir:1,duration:.22,t:.11,end:2940,bounds:{min:45,max:3155}};var echoes=FairiDash.echoes(a,.5,"high",340);');
 assert.ok(run('echoes.length>0&&echoes.every(e=>e.x>=2600&&e.x<=2770)'));
 run('var trail=FairiDash.createTrail();trail.update({x:2770,y:0},a,.5,{wrists:[[0,0],[12,-80]]},1,340);trail.update({x:2940,y:0},null,1,{wrists:[[0,0],[12,-80]]},1.2,340)');
 assert.equal(run('trail.items[0].geometry.x'),2952);
 run('a={...a,sx:3100,end:3155};echoes=FairiDash.echoes(a,.8,"high",340)');assert.ok(run('echoes.every(e=>e.x>=3100&&e.x<=3155)'));
});
test('Fairi Q renders the same opaque main body and trailing shadows in both halves of the map',()=>{
 const {c,run}=lab();
 function draw(x){const canvas=raster.createCanvas(640,480);c.brush=canvas.getContext('2d');c.worldX=x;
  run('window.FairiVisual.reset();brush.translate(320-worldX,400-1400);var f={id:0,type:"fairi",x:worldX,y:1400,vx:1200,vy:0,dir:1,hp:900,action:{k:"q",sx:worldX-170,sy:1400,end:worldX+170,dir:1,age:.11,duration:.22,bounds:{min:45,max:3155}},fairi:{clones:[],events:[]}};window.FairiVisual.character(brush,f,{x:worldX+400},1,{surface:()=>1400,quality:"high",bodyColor:"#446c78",viewer:"owner"});');
  return canvas.getContext('2d').getImageData(0,0,640,480).data;
 }
 const left=draw(800),right=draw(2700);let changed=0,max=0,total=0;for(let i=0;i<left.length;i++){const d=Math.abs(right[i]-left[i]);if(d)changed++;max=Math.max(max,d);total+=d;}// Native raster transforms may round a few antialiased edge samples differently.
 assert.ok(changed<100&&max<32&&total<500,'Both camera positions preserve the same rendered silhouette');
 let opaqueBody=0;for(let y=285;y<375;y++)for(let x=290;x<350;x++){const i=(y*640+x)*4;if(right[i]===68&&right[i+1]===108&&right[i+2]===120&&right[i+3]===255)opaqueBody++;}assert.ok(opaqueBody>50,'The real fighter remains opaque while shadows fade');
});
test('E clones stay in the expanded arena instead of snapping to its old right edge',()=>{
 const {run}=lab();run('var group=FairiClones.plan(123,{min:45,max:3155});var clones=Array.from({length:4},(_,i)=>FairiClones.spawn(i,{x:2700,y:0,vy:0},group));for(let i=0;i<120;i++){FairiClones.prepare(group,clones);for(const c of clones)FairiClones.step(c,1/120,{x:2800},group);}');
 assert.ok(run('clones.every(c=>c.x>1600&&c.x>=70&&c.x<=3130)'));
 run('group=FairiClones.plan(123);clones=Array.from({length:4},(_,i)=>FairiClones.spawn(i,{x:1400,y:0,vy:0},group));for(let i=0;i<240;i++)for(const c of clones)FairiClones.step(c,1/120,{x:1500},group)');assert.ok(run('clones.every(c=>c.x>=70&&c.x<=1530)'));
});
test('R clone launch formation follows the target across the whole wide map',()=>{
 const {run}=lab();run('var a={tx:800,ty:0,actors:[{x:600,y:0},...Array.from({length:4},()=>({x:700,y:0}))],bounds:{min:45,max:3155}};var left=FairiR.layout(a);var right=FairiR.layout({...a,tx:2600});');
 assert.ok(run('right.every((v,i)=>Math.abs(v.x-left[i].x-1800)<1e-7&&Math.abs(v.endX-left[i].endX-1800)<1e-7)'));
});
