import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {client} from './rollback-harness.mjs';
const require=createRequire(import.meta.url),{createCanvas,Path2D}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
test('four fighter silhouettes match Thunder height in both facings; resizing preserves world coordinates',()=>{
 const canvas=createCanvas(1100,1000),brush=canvas.getContext('2d'),c=client({},null,null,null,{brush,createCanvas,Path2D});
 vm.runInContext(fs.readFileSync(new URL('../web/cylast/visual.js',import.meta.url),'utf8'),c.ctx);
 const colors={thunder:'#e1d490',cylast:'#a3cee5',aether:'#94887c',melanta:'#5f2d7d',fairi:'#375857'};
 for(const dir of [-1,1])for(const type of Object.keys(colors)){
  brush.clearRect(0,0,1100,1000);c.ctx.sizeType=type;c.ctx.sizeDir=dir;
  c.run("var f=makeFighter(sizeType,0);f.x=500;f.y=800;f.ground=true;f.dir=sizeDir;var e=makeFighter('thunder',1);e.x=900;e.y=800;");
  if(type==='thunder')c.run('window.ThunderModel.update(f,1/120,0);window.ThunderModel.draw(ctx,f,0,false)');
  if(type==='cylast')c.run('window.CylastVisual.character(ctx,f,0)');
  if(type==='aether')c.run("window.AetherVisual.character(ctx,f,e,0,()=>800,'low')");
  if(type==='melanta')c.run('window.MelantaVisual.character(ctx,f,e,0,800)');
  if(type==='fairi')c.run("window.FairiVisual.character(ctx,f,e,0,{surface:()=>800,quality:'low'})");
  const rgb=colors[type].slice(1).match(/../g).map(x=>parseInt(x,16)),pixels=brush.getImageData(0,0,1100,1000).data;let top=1000,bottom=0,count=0;
  for(let y=0;y<1000;y++)for(let x=350;x<650;x++){const k=(y*1100+x)*4;if(pixels[k+3]>240&&rgb.every((v,i)=>Math.abs(pixels[k+i]-v)<3)){top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}}
  assert.ok(count>4000,type+' continuous opaque body');assert.ok(Math.abs(bottom-top+1-164)<=2,type+' height '+(bottom-top+1));
  assert.equal(c.run('f.x'),500);assert.equal(c.run('f.y'),800);assert.equal(c.run('f.dir'),dir);
 }
});
test('Cylast and Aether projectile origins follow the uniformly scaled weapon hand',()=>{
 const canvas=createCanvas(1,1),c=client({},null,null,null,{brush:canvas.getContext('2d'),createCanvas,Path2D});
 for(const type of ['cylast','aether'])for(const dir of [-1,1]){
  c.ctx.sizeType=type;c.ctx.sizeDir=dir;
  c.run("var p={x:500,y:100,dir:sizeDir,vx:100,vy:0};var pose={angle:.2,reach:5,lift:3,tilt:.1,rise:2};var action={k:'attack',n:1,t:.1,duration:.3,dir:sizeDir};var size=window.FighterSize.scale(sizeType);var getTip=()=>sizeType==='cylast'?window.CylastBase.frostStaffTip(p,pose,.3):window.AetherBase.NORMALS.muzzle(p,action,.3);var scaled=getTip();var keepSize=window.FighterSize;window.FighterSize={scale:()=>1};var unscaled=getTip();window.FighterSize=keepSize;");
  for(const axis of ['x','y'])assert.ok(Math.abs(c.run(`scaled.${axis}-p.${axis}-(unscaled.${axis}-p.${axis})*size`))<1e-9);
 }
});
test('Melanta cinematic renders after gameplay scaling without changing its canvas transform',()=>{
 const canvas=createCanvas(960,540),brush=canvas.getContext('2d'),c=client({},null,null,null,{brush,createCanvas,Path2D});
 c.run("var f=makeFighter('melanta',0);var e=makeFighter('thunder',1);f.x=400;f.y=800;e.x=800;e.y=800;");
 for(const t of [.1,.8,1.2,1.8]){c.ctx.sizeTime=t;c.run('window.MelantaVisual.finisher(ctx,f,e,sizeTime,800,sizeTime,960,540)');const m=brush.getTransform();assert.deepEqual([m.a,m.b,m.c,m.d,m.e,m.f],[1,0,0,1,0,0]);}
});
