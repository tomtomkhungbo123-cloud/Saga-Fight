import test from 'node:test';import assert from 'node:assert/strict';import {client} from './rollback-harness.mjs';import {localDB} from '../scripts/local-db.mjs';
function setup(type='melanta',map='forest'){const DB=localDB(),c=client(DB,null,'window.riftNet = {room:null};');c.run(`window.riftGame.configure({p1:'${type}',p2:'thunder',map:'${map}'});window.riftGame.begin();phase='fight';platforms=[];fighters[0].x=600;fighters[1].x=750;fighters.forEach(f=>{f.y=floor(f.x);f.ground=true;f.vy=f.vx=0;});`);return {...c,close(){DB.close();},advance(seconds){c.run(`for(let i=0;i<${Math.ceil(seconds*120)};i++){time+=1/120;updateFighter(fighters[0],1/120);}`);}};}
test('Mox and Cylast match standard first, second and buffered jump height/timing',()=>{const samples=[];for(const type of ['thunder','mox','cylast']){const c=setup(type);try{c.run("var y0=fighters[0].y;request(fighters[0],'jump');var heights=[];for(let i=0;i<100;i++){if(i===20)request(fighters[0],'jump');time+=1/120;updateFighter(fighters[0],1/120);heights.push(y0-fighters[0].y);}");samples.push(JSON.parse(c.run('JSON.stringify(heights)')));c.run('fighters[0].y=floor(fighters[0].x)-.1;fighters[0].vy=200;fighters[0].ground=false;fighters[0].jumpUntil=time+.14;updateFighter(fighters[0],1/120)');assert.equal(c.run('fighters[0].vy'),-900);}finally{c.close();}}assert.deepEqual(samples[1],samples[0]);assert.deepEqual(samples[2],samples[0]);});
test('Melanta can turn a normal during startup and recovery, with one hit per swing',()=>{const c=setup();try{c.run("fighters[0].dir=1;fighters[0].move=1;request(fighters[0],'attack')");c.advance(.05);c.run('fighters[0].move=-1');c.advance(.02);assert.equal(c.run('fighters[0].melanta.a.dir'),-1);assert.equal(c.run('fighters[0].normal.dir'),-1);c.advance(.3);c.run('fighters[0].move=1');c.advance(.02);assert.equal(c.run('fighters[0].dir'),1);c.advance(.2);c.run("fighters[0].move=-1;request(fighters[0],'attack')");assert.equal(c.run('fighters[0].normal.dir'),-1);assert.equal(c.run('fighters[0].melanta.a.dir'),-1);assert.equal(c.run('fighters[0].normal.use.hitIndex'),0);}finally{c.close();}});
for(const x of [100,2600,3050])test(`Melanta Q shares the locked point with its visual across forest at x=${x}`,()=>{const c=setup();try{c.run(`fighters[0].x=${x};fighters[1].x=${x>2900?x-160:x+160};fighters.forEach(f=>f.y=floor(fighters[0].x));request(fighters[0],'q');var impact=window.MelantaLab.qTip(fighters[0].melanta.a,.72);`);assert.equal(c.run('impact.x'),c.run('fighters[1].x'));c.advance(.74);assert.equal(c.run('fighters[1].hp'),900);}finally{c.close();}});
test('Melanta Q locks a terrain impact and misses an airborne target outside the blast',()=>{
 const c=setup();
 try{
  c.run("fighters[1].y=fighters[0].y-250;fighters[1].ground=false;request(fighters[0],'q');");
  const x=c.run('fighters[1].x'), y=c.run('floor(fighters[1].x)');
  assert.equal(c.run('fighters[0].melanta.a.impactX'),x);
  assert.equal(c.run('fighters[0].melanta.a.impactWorldY'),y);
  c.advance(.74);
  assert.equal(c.run("fighters[0].melanta.fx.find(e=>e.k==='qslam').worldY"),y);
  assert.equal(c.run('fighters[1].hp'),1000);
 }finally{c.close();}
});
test('Melanta Q stays on the chosen platform after the target moves',()=>{
 const c=setup();
 try{
  c.run("platforms=[{x:550,r:850,y:740}];fighters.forEach(f=>{f.y=740});request(fighters[0],'q');fighters[1].x+=500;");
  c.advance(.74);
  assert.equal(c.run('fighters[0].melanta.a.impactX'),750);
  assert.equal(c.run('fighters[0].melanta.a.impactWorldY'),740);
  assert.equal(c.run("fighters[0].melanta.fx.find(e=>e.k==='qslam').worldY"),740);
  assert.equal(c.run('fighters[1].hp'),1000);
 }finally{c.close();}
});
test('R moves at half speed, turns, follows its damage origin, honors roots and ends on schedule',()=>{const c=setup();try{c.run("fighters[1].x=2600;request(fighters[0],'r');fighters[0].move=1");c.advance(.8);assert.ok(c.run('fighters[0].x')>700);assert.ok(c.run('fighters[0].vx')>174&&c.run('fighters[0].vx')<=175);assert.equal(c.run('fighters[0].melanta.a.sx'),c.run('fighters[0].x'));c.run('fighters[0].move=-1');c.advance(.4);assert.ok(c.run('fighters[0].vx')<-170);const x=c.run('fighters[0].x');c.run('fighters[0].rootUntil=time+.2');c.advance(.1);assert.equal(c.run('fighters[0].x'),x);c.advance(3);assert.equal(c.run('fighters[0].melanta.a'),null);assert.ok(c.run('fighters[0].cd.r')>9);}finally{c.close();}});
