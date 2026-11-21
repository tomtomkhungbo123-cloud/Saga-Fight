import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../web/'+name,import.meta.url),'utf8');
function unitFor(width,height,percent){
 const narrow=height>width&&width<=560,landscape=width>height,padding=landscape?44:narrow?8:16,bottom=landscape?21:18;
 let unit;const nodes=new Map();const node=id=>nodes.get(id)||nodes.set(id,{style:{setProperty(key,value){if(id==='touch'&&key==='--pad-unit')unit=parseFloat(value);}},dataset:{},getBoundingClientRect:()=>({width}),addEventListener(){}}).get(id);
 const context={innerWidth:width,innerHeight:height,localStorage:{getItem:k=>k==='saga-fight.controls.scale.v1'?String(percent):null},getComputedStyle:()=>({paddingLeft:String(padding),paddingRight:String(padding),columnGap:narrow?'10':'24',paddingTop:'14',paddingBottom:String(bottom)}),document:{getElementById:node,querySelectorAll:()=>[],documentElement:{classList:{contains:k=>k==='ios-controls'},style:{setProperty(){}}}},window:{matchMedia:()=>({matches:height>width}),addEventListener(){}}};
 vm.runInNewContext(read('controls-settings.js'),context);return {unit,padding,bottom,gap:narrow?10:24,move:narrow?2.7:2.9};
}
const css=read('ios-controls.css');
function button(name,u){const rule=css.split('\n').find(line=>line.includes('[data-do="'+name+'"]'));assert.ok(rule);const factor=key=>{const value=rule.match(new RegExp(key+':([^;]+)'))[1];return value==='0'?0:Number(value.match(/\*([\d.]+)/)[1]);};const size=rule.includes('width:calc(')?factor('width'):1;return {name,x:factor('left')*u,y:factor('bottom')*u,size:size*u};}
test('iOS reference arc remains reachable, separate and unclipped across iPhone/iPad sizes and 80–140% controls',()=>{
 const sizes=[[320,568],[375,667],[390,844],[430,932],[568,320],[667,375],[852,393],[932,430],[768,1024],[820,1180],[1024,768],[1180,820],[1366,1024]];
 for(const [w,h] of sizes)for(let scale=80;scale<=140;scale+=5){
  const {unit:u,padding,bottom,gap,move}=unitFor(w,h,scale),buttons=['q','w','e','r','attack','jump'].map(n=>button(n,u));
  assert.ok((move+3.9)*u+gap+padding*2<=w+.01,`${w}x${h}/${scale}: groups fit safe width`);
  assert.ok(3.4*u+bottom+14+88<=h+.01,`${w}x${h}/${scale}: controls clear upper HUD`);
  for(const b of buttons){assert.ok(b.size>=44);assert.ok(b.x>=0&&b.y>=0&&b.x+b.size<=3.9*u&&b.y+b.size<=3.4*u);}
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i],b=buttons[j],distance=Math.hypot(a.x+a.size/2-b.x-b.size/2,a.y+a.size/2-b.y-b.size/2);assert.ok(distance-(a.size+b.size)/2>=4,`${w}x${h}/${scale}: ${a.name}/${b.name} have a gap`);}
  const attack=buttons.find(b=>b.name==='attack'),jump=buttons.find(b=>b.name==='jump');assert.ok(attack.size>jump.size&&jump.x>attack.x&&jump.y>attack.y,'jump is upper-right of the larger central attack');
 }
});
test('iPhone and iPadOS desktop UA receive the arc; desktop and Android keep existing controls',()=>{
 for(const [ua,platform,points,coarse,expected] of [['iPhone','iPhone',5,true,true],['iPad','iPad',5,true,true],['Macintosh','MacIntel',5,true,true],['Macintosh','MacIntel',0,false,false],['Windows','Win32',0,false,false],['Android','Linux',5,true,false]]){
  const classes={};vm.runInNewContext(read('app-mode.js'),{navigator:{userAgent:ua,platform,maxTouchPoints:points},innerHeight:800,document:{activeElement:null,addEventListener(){},documentElement:{style:{setProperty(){}},classList:{toggle:(k,v)=>classes[k]=v}}},window:{matchMedia:q=>({matches:q==='(pointer: coarse)'&&coarse,addEventListener(){}}),addEventListener(){}}});assert.equal(classes['ios-controls'],expected);assert.equal(classes['touch-layout'],expected||coarse);
 }
});
