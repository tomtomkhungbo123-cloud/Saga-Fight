import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {client} from './rollback-harness.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,Path2D}=require('@napi-rs/canvas');
const skins=[['thunder','jade','#65e7ce'],['thunder','thunder-crimson','#bd3249'],['soul','amethyst','#c794ff'],['cylast','amber','#ffc77b']];
function harness(){
 const canvas=createCanvas(1200,800),brush=canvas.getContext('2d');
 const c=client({},null,'window.riftNet=null;',null,{brush,createCanvas,Path2D});
 for(const file of ['fighter-palette.js','soul-render.js','soul-slam.js','cylast/visual.js'])vm.runInContext(fs.readFileSync(new URL('../web/'+file,import.meta.url),'utf8'),c.ctx);
 for(const [,palette,color] of skins){c.ctx.palette=palette;c.ctx.color=color;c.run('window.FighterPalette.register(palette,113);window.FighterPalette.registerEffect(palette+"-fx",color)');}
 return {c,canvas,brush};
}
test('skin effect palettes preserve white cores, alpha and cached sprites',()=>{
 const {c}=harness(),p=c.ctx.window.FighterPalette;
 const image=createCanvas(2,1),g=image.getContext('2d');g.fillStyle='#ff3050aa';g.fillRect(0,0,1,1);
 for(const [,palette] of skins){const key=palette+'-fx';assert.equal(p.color('#ffffff',key),'#ffffff');assert.equal(p.color('#000000',key),'#000000');assert.ok(p.color('#ff3050aa',key).endsWith('aa'));assert.notEqual(p.color('#ff3050',key),'#ff3050');const out=p.image(image,key);assert.equal(out,p.image(image,key));assert.equal(out.getContext('2d').getImageData(0,0,1,1).data[3],170);assert.equal(out.getContext('2d').getImageData(1,0,1,1).data[3],0);}
});
for(const [type,palette] of skins)test(type+' '+palette+' renders normals and every skill without changing gameplay',()=>{
 const {c,brush}=harness();
 c.ctx.skinType=type;c.ctx.skinPalette=palette;
 c.run('window.riftGame.configure({p1:skinType,p2:skinType});window.riftGame.begin();phase="fight";fighters[0].x=550;fighters[1].x=700;fighters.forEach(f=>f.y=floor(f.x));var A=window.riftGame.rollback;var skinOn=false;window.SagaShop={decor(){},matchState(){},skin:f=>skinOn&&f.id===0?skinPalette:null};');
 for(const action of ['attack','q','w','e','r']){
  c.ctx.action=action;
  c.run('fighters.forEach(f=>{f.cd={q:0,w:0,e:0,r:0};f.action=null});A.step([{m:0,a:[action]},{m:0,a:[]}]);');
  for(let step=0;step<150;step++){
   c.run('A.step([{m:0,a:[]},{m:0,a:[]}]);');
   if(step%15===0){
    c.run('skinOn=false;render();var beforeSkin=JSON.stringify(window.SagaRollback.pack(A.capture()));skinOn=true;render();');
    assert.equal(c.run('JSON.stringify(window.SagaRollback.pack(A.capture()))'),c.run('beforeSkin'));
    const m=brush.getTransform();assert.ok([m.a,m.b,m.c,m.d,m.e,m.f].every(Number.isFinite));
   }
  }
 }
 c.run('var p0=fighterEffectContext(fighters[0]);var p1=fighterEffectContext(fighters[1]);');
 assert.notEqual(c.ctx.p0,c.ctx.p1,'opponent without skin keeps the default effect context');
});
