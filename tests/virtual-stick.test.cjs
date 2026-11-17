const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const context={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../web/virtual-stick.js'),'utf8'),context);
const VirtualStick=context.module.exports;
function fixture(floating=false){
 const events=[];
 const stick=new VirtualStick({move:v=>events.push(['move',v]),action:v=>events.push(['action',v]),release:()=>events.push(['release']),draw:()=>{}});
 stick.start(7,100,100,100,100,40,floating);
 return {stick,events};
}
test('dead zone, direction changes and release do not leave movement held',()=>{
 const {stick,events}=fixture();
 stick.move(7,105,100);assert.deepEqual(events,[]);
 stick.move(7,125,100);stick.move(7,75,100);stick.move(7,100,100);stick.end(7);
 assert.deepEqual(events,[['move','KeyD'],['move','KeyA'],['move',null],['release']]);
 assert.equal(stick.id,null);
});
test('second finger cannot steal or cancel the movement finger',()=>{
 const {stick,events}=fixture();
 assert.equal(stick.start(8,200,100,200,100,40,false),false);
 assert.equal(stick.move(8,300,100),false);assert.equal(stick.end(8),false);
 stick.move(7,130,100);assert.deepEqual(events,[['move','KeyD']]);
 stick.end(7);assert.deepEqual(events.at(-1),['release']);
});
test('upward drags never jump; downward drags fire once until neutral',()=>{
 const {stick,events}=fixture();
 stick.move(7,100,65);stick.move(7,100,60);stick.move(7,100,70);
 assert.deepEqual(events,[]);
 stick.move(7,100,100);stick.move(7,100,135);stick.move(7,100,138);
 assert.deepEqual(events,[['action','drop']]);
 stick.move(7,100,100);stick.move(7,100,140);assert.deepEqual(events,[['action','drop'],['action','drop']]);
});
test('floating origin follows a long drag and returns to neutral without a stuck key',()=>{
 const {stick,events}=fixture(true);
 stick.move(7,220,100);assert.equal(stick.x,180);assert.equal(stick.direction,'KeyD');
 stick.move(7,180,100);assert.equal(stick.direction,null);
 stick.end();assert.deepEqual(events,[['move','KeyD'],['move',null],['release']]);
});
test('reset is idempotent and permits a fresh touch',()=>{
 const {stick,events}=fixture();stick.move(7,130,100);stick.end();stick.end();
 assert.equal(events.filter(e=>e[0]==='release').length,1);
 assert.equal(stick.start(9,100,100,100,100,40,false),true);stick.move(9,70,100);
 assert.equal(stick.direction,'KeyA');
});

test('diagonal upward movement preserves left/right without triggering jump in both modes',()=>{for(const floating of [false,true]){const {stick,events}=fixture(floating);stick.move(7,130,60);assert.equal(stick.direction,'KeyD');assert.equal(events.some(e=>e[0]==='action'),false);stick.end();assert.equal(events.at(-1)[0],'release');}});
