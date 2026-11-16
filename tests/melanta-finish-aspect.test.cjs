const fs=require('fs');let setup=fs.readFileSync(require('node:path').join(__dirname,'melanta.test.cjs'),'utf8').split('function mel()')[0].replaceAll('__dirname',JSON.stringify(process.cwd()+'/tests')).replace('getContext(){return {}}',"getContext(){return this.brush??=require('@napi-rs/canvas').createCanvas(1600,1120).getContext('2d')}");
setup+=`
c.performance={now:()=>1000};for(const file of ['soul-render.js','soul-slam.js'])vm.runInContext(fs.readFileSync('web/'+file,'utf8'),c);
run("var actualFinisher=window.MelantaVisual.finisher;window.MelantaVisual.finisher=function(context,...args){var m=context.getTransform();window.finishProbe={matrix:[m.a,m.b,m.c,m.d,m.e,m.f],width:args[5],height:args[6]};return actualFinisher.call(this,context,...args)}");
for(const size of [[1600,1117],[1280,720],[960,400],[720,960]])for(const arena of ['cavern','forest']){reset('melanta');run(\`selectArena('\${arena}');renderViewport=()=>{viewport={width:\${size[0]},height:\${size[1]}};return viewport};fighters[1].hp=0;melantaKiller=0;beginFinisher();finishLeft=1.8;render();\`);const view=run('window.finishProbe');assert.deepEqual(Array.from(view.matrix),[1,0,0,1,0,0]);assert.equal(view.width,size[0]);assert.equal(view.height,size[1]);}
console.log('PASS Melanta native finisher on both maps: identity output projection and actual dimensions at 4:3, widescreen, ultrawide and portrait; no unequal X/Y stretch');
`;
eval(setup);
