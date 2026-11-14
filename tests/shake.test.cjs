const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};function el(id){return els[id]??=( {value:id==='select0'?'thunder':id==='select1'?'soul':'normal',style:{},hidden:false,children:[],classList:{toggle(){}},querySelector(){return el('temp')},addEventListener(){},focus(){},getBoundingClientRect(){return {width:1200,height:800}},getContext(){return {}},firstChild:{textContent:''}})}
const c=vm.createContext({console,Math,document:{getElementById:el,querySelectorAll:s=>s==='.fighterhud'?[el('f0'),el('f1')]:[],activeElement:null,body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},addEventListener(){}},window:{addEventListener(){},motion:{matches:false},matchMedia(){return this.motion;}},Image:class{},requestAnimationFrame(){},devicePixelRatio:1});for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/cylast/'+file+'.js'),'utf8'),c);for(const file of ['base','combat'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/mox/'+file+'.js'),'utf8'),c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/game.js'),'utf8'),c);
function run(code){return vm.runInContext(code,c)}function reset(type='soul'){run(`$('select0').value='${type}';$('select1').value='thunder';mode='pvp';start();phase='fight';fighters[0].x=600;fighters[1].x=750;fighters.forEach(f=>f.y=floor(f.x));`)}function advance(n){run(`for(let i=0;i<${Math.ceil(n*120)};i++)step(1/120);`)}

function practice(type='soul',distance=100){reset(type);run(`mode='sandbox';sandboxOptions.free=false;sandboxOptions.ai=false;sandboxOptions.defend=true;fighters[1].x=fighters[0].x+${distance};fighters[1].y=fighters[0].y;`);}
function tap(k){run(`request(fighters[0],'${k}')`);}
function near(actual,expected,epsilon=.002){assert.ok(Math.abs(actual-expected)<epsilon,`${actual} != ${expected}`);}
function until(predicate,limit=2){for(let i=0;i<limit*120;i++){if(run(predicate))return;advance(1/120);}throw Error('Timeout '+predicate+' '+run('JSON.stringify({a:fighters[0].action,combo:fighters[0].combo})'));}


practice('thunder',150);tap('r');until('fighters[0].action?.fired');assert.ok(run('shake')>=10);until('fighters[0].action?.second');assert.ok(run('shake')>=11);until('fighters[0].action?.third');assert.ok(run('shake')>=15);advance(.7);assert.ok(run('shake')<.01);
practice('soul',100);tap('r');until('fighters[0].action?.fired');assert.ok(run('shake')>=17);
practice('mox',80);tap('r');advance(.3);assert.equal(run('moxShake'),0);advance(1);assert.ok(run('moxShake')>15);
practice('mox',80);run('fighters[0].mox.p.form=1');tap('r');advance(.6);assert.equal(run('shake'),0);advance(.25);assert.ok(run('shake')>0);advance(1);assert.ok(run('shake')<1);
run('shake=100;moxShake=100;phase="fight";');const offset=run('cameraShake()'),len=run('effects.length');for(let i=0;i<1000;i++){run('time+=1/120');const sample=run('cameraShake()');assert.equal(sample,offset);assert.ok(Math.abs(sample.x)<=18);assert.ok(Math.abs(sample.y)<=10.8);}assert.equal(run('effects.length'),len);
c.window.motion.matches=true;near(run('Math.abs(cameraShake().x)+Math.abs(cameraShake().y)'),0);c.window.motion.matches=false;
run('phase="paused"');near(run('Math.abs(cameraShake().x)+Math.abs(cameraShake().y)'),0);run('menu()');assert.equal(run('shake+moxShake'),0);assert.equal(run('cameraPan'),0);
for(const rate of [30,60,120,144]){practice();run('shake=17;moxShake=18;');for(let i=0;i<rate;i++)run(`step(${1/rate})`);near(run('shake'),17*Math.exp(-14));near(run('moxShake'),18*Math.exp(-8));}
console.log('PASS ultimate impact beats, no grab-stage shake, bounded reused camera offset, no extra effects, menu/pause cleanup and time-based decay30/60/120/144Hz');
