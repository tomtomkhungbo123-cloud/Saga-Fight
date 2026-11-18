const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/app-mode.js','utf8');
function device(nav,coarse=false){
 const classes={},style={},events={},focus={};
 const viewport={height:390,addEventListener(k,fn){events['visual:'+k]=fn;}};
 const document={activeElement:{matches:()=>false},addEventListener(k,fn){focus[k]=fn;},documentElement:{classList:{toggle:(k,v)=>classes[k]=v},style:{setProperty:(k,v)=>style[k]=v}}};
 const context=vm.createContext({navigator:nav,innerHeight:390,document,window:{visualViewport:viewport,matchMedia:q=>({matches:q==='(pointer: coarse)'&&coarse,addEventListener(){}}),addEventListener:(k,fn)=>events[k]=fn}});
 vm.runInContext(source,context);return {classes,style,events,focus,viewport,document,context};
}
test('iPhone, desktop-identifying iPad and coarse-pointer tablets receive a fitted lobby',()=>{
 for(const [nav,coarse] of [[{userAgent:'iPhone'},false],[{platform:'MacIntel',maxTouchPoints:5},false],[{userAgent:'Android'},true]]){
  const d=device(nav,coarse);assert.equal(d.classes['touch-layout'],true);assert.equal(d.style['--lobby-viewport'],'390px');
  d.viewport.height=320;d.events['visual:resize']();assert.equal(d.style['--lobby-viewport'],'320px');
  d.viewport.height=768;d.context.innerHeight=768;d.events.resize();assert.equal(d.style['--lobby-viewport'],'768px');
 }
});
test('desktop mouse layout remains independent of mobile viewport locking',()=>{
 const d=device({userAgent:'Chrome',platform:'Linux',maxTouchPoints:0});assert.equal(d.classes['touch-layout'],false);assert.deepEqual(d.style,{});
});
test('room-code keyboard gets space, then restores the fighter stage after closing',()=>{
 const d=device({userAgent:'iPhone'});d.document.activeElement.matches=()=>true;d.viewport.height=190;d.events['visual:resize']();
 assert.equal(d.classes['lobby-keyboard'],true);assert.equal(d.style['--lobby-viewport'],'190px');
 d.viewport.height=390;d.events['visual:resize']();assert.equal(d.classes['lobby-keyboard'],false);
 d.viewport.height=190;d.document.activeElement.matches=()=>false;d.focus.focusout();assert.equal(d.classes['lobby-keyboard'],false);
});
test('page restoration refreshes visible height without requiring a new resize',()=>{
 const d=device({userAgent:'iPad',standalone:true});assert.equal(d.classes['app-mode'],true);
 d.viewport.height=1024;d.events.pageshow();assert.equal(d.style['--lobby-viewport'],'1024px');
});
