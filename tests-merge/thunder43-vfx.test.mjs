import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {client} from './rollback-harness.mjs';
const require=createRequire(import.meta.url),{createCanvas,Path2D,loadImage}=require('@napi-rs/canvas');
const root=new URL('../web/',import.meta.url);
const contours=['normal','r','w'].map(name=>fs.readFileSync(new URL('thunder/vfx/'+name+'-reference-contours.js',root),'utf8')).join('\n');

test('Thunder 43 contours and atlases render source-owned jade/crimson effects with bounded warm caches',async()=>{
 const assets=new Map();for(const file of ['normal-reference-halo.png','r-reference-atlas.png','w-reference-atlas.png'])assets.set('thunder/vfx/'+file,await loadImage(fs.readFileSync(new URL('thunder/vfx/'+file,root))));
 class VfxImage{constructor(){const canvas=createCanvas(1,1);Object.defineProperty(canvas,'src',{set(value){const image=assets.get(value.split('?')[0]);if(image){canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);canvas.complete=true;canvas.naturalWidth=image.width;canvas.naturalHeight=image.height;canvas.onload?.();}}});return canvas;}}
 const canvas=createCanvas(1400,900),brush=canvas.getContext('2d');let allocations=0;
 const make=(w,h)=>{allocations++;return createCanvas(w,h);};
 const c=client({},null,'window.riftNet=null;',contours+'\n'+fs.readFileSync(new URL('game.js',root),'utf8'),{brush,createCanvas:make,Path2D,Image:VfxImage});
 vm.runInContext(fs.readFileSync(new URL('fighter-palette.js',root),'utf8'),c.ctx);
 c.run('window.FighterPalette.register("jade",113);window.FighterPalette.register("thunder-crimson",310);window.FighterPalette.registerEffect("jade-fx","#65e7ce");window.FighterPalette.registerEffect("thunder-crimson-fx","#bd3249");window.riftGame.configure({p1:"thunder",p2:"thunder",map:"forest"});window.riftGame.begin();fighters[0].x=200;fighters[1].x=1200;window.SagaShop={skin:f=>f.id===0?"jade":"thunder-crimson"};');
 const cases=[
  ['normal','drawThunderNormal({owner:owner,x:200,y:300,toX:1100,toY:300,connected:true,age:.08,life:.23},fx)'],
  ['Q','drawThunderProjectile({x:700,y:400,vx:1000,dir:1,age:.25},fx)'],
  ['W','drawThunderWField({x:700,y:750,size:800,age:.2,life:1},fx)'],
  ['E','drawThunderTeleport({x:200,y:400,toX:1100,toY:400,connected:true,type:"thunderTeleport",age:.08,life:.5},fx)'],
  ['R','drawThunderGroundBolt({x:700,y:80,toX:700,toY:800,age:.2,life:1.5},fx)']
 ];
 for(const owner of [0,1])for(const [name,draw] of cases){
  c.ctx.owner=owner;c.run('var fx=fighterEffectContext(fighters[owner]);');brush.clearRect(0,0,1400,900);
  const start=performance.now();c.run(draw);const firstMs=performance.now()-start;
  const pixels=brush.getImageData(0,0,1400,900).data;let colored=0,wrong=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100&&Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>60){colored++;if(owner===0?pixels[i+1]<pixels[i]:pixels[i]<pixels[i+1])wrong++;}
  assert.ok(colored>20,name+' visible colored pixels');assert.equal(wrong,0,name+' follows source skin');
  const warm=allocations;c.run(draw);assert.equal(allocations,warm,name+' reuses tinted images');
  const warmedAt=performance.now();for(let i=0;i<5;i++)c.run(draw);console.log(name+' '+(owner?'crimson':'jade')+' cold '+firstMs.toFixed(1)+'ms, warm avg '+((performance.now()-warmedAt)/5).toFixed(1)+'ms');
  assert.equal(c.run('thunderNormalShapes.length'),30);
 }
 c.run('phase="fight";effects=[];fighters[0].x=500;fighters[0].y=450;fighters[0].dir=1;fighters[0].action=null;fighters[0].normal=null;fighters[0].cd.e=0;request(fighters[0],"e");step(1/120);');
 assert.equal(c.run('effects.find(e=>e.type==="thunderTeleport")?.y'),355,'E starts at pre-teleport torso height');
 assert.equal(c.run('effects.find(e=>e.type==="thunderTeleport")?.behindFighters'),true,'E stays behind the fighter');
 const normalCount=c.run('thunderNormalShapes.length');assert.equal(normalCount,30);
 c.run('var tip=thunderNormalPlacement({toX:600,toY:0,age:.1,life:.23,connected:true},{x:0,y:0})');assert.equal(c.run('tip.length'),600);
 for(const frame of c.ctx.window.ThunderNormalFrames){let count=0;for(const shape of frame)for(const [x,y] of shape){count++;if(x>570)assert.ok(Math.abs(y)<5,'contact tip stays narrow');}assert.ok(count<350,'normal path remains compact');}
});
