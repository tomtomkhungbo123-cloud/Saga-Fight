import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
test('mirror palettes preserve alpha, cache sprite recolors and tint gradients without arena filters',()=>{let writes=0;const rgba=new Uint8ClampedArray([245,219,139,175,0,0,0,0]);const document={createElement(){return {width:2,height:1,getContext(){return {drawImage(){},getImageData(){return {data:rgba};},putImageData(){writes++;}};}};}};const c=vm.createContext({window:{},document});vm.runInContext(fs.readFileSync(new URL('../web/fighter-palette.js',import.meta.url),'utf8'),c);const p=c.window.FighterPalette;for(const type of ['thunder','soul','cylast','mox','melanta','fairi','aether']){assert.equal(p.color('#ffffff',type),'#ffffff');assert.equal(p.color('#000000',type),'#000000');assert.ok(p.color('#f5db8baa',type).endsWith('aa'));assert.notEqual(p.color('#f5db8b',type),'#f5db8b');}const source={width:2,height:1};assert.equal(p.image(source,'thunder'),p.image(source,'thunder'));assert.equal(writes,1);assert.equal(rgba[3],175);assert.equal(rgba[7],0);const stops=[],target={fillStyle:'',filter:'none',createRadialGradient(){return {addColorStop(i,color){stops.push(color);}};}};const draw=p.context(target,'soul');draw.fillStyle='#ff637d';assert.notEqual(target.fillStyle,'#ff637d');draw.createRadialGradient().addColorStop(0,'#ff637d');assert.equal(stops[0],target.fillStyle);assert.equal(target.filter,'none');assert.equal(draw,p.context(target,'soul'));});

test('Sét tử linh recolors Thunder Stance to deep red with a distinct mirror palette',()=>{
 const context=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync(new URL('../web/fighter-palette.js',import.meta.url),'utf8'),context);
 const palette=context.window.FighterPalette;
 palette.register('thunder-crimson',310);
 assert.equal(palette.color('#e1d490','thunder-crimson'),'#b72432');
 assert.equal(palette.color('#ffff91c0','thunder-crimson').slice(-2),'c0');
 assert.notEqual(palette.color('#e1d490','thunder-crimson-mirror'),'#b72432');
});
