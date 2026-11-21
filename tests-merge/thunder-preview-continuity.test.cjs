const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const model = require('../web/thunder/model.js');

test('Thunder waist stays opaque through cloth motion at fractional scales and both facings', () => {
 const context = createCanvas(500, 500).getContext('2d');
 for (const scale of [.58, .85, 1, 1.45]) {
  for (const dir of [-1, 1]) {
   const fighter = {x:0, y:0, dir, vx:0, vy:0, ground:true};
   for (let frame=0; frame<90; frame++) {
    const clock = frame/30;
    fighter.vx = frame<30 ? 330*dir : frame<60 ? -330*dir : 0;
    model.update(fighter, 1/30, clock);
    context.resetTransform();
    context.clearRect(0, 0, 500, 500);
    context.setTransform(scale, 0, 0, scale, 250, 350);
    model.draw(context, fighter, clock, false);
    for (const y of [-113, -110, -107, -104, -101]) {
     for (const x of [-3, 0, 3]) {
      const point = model.transform(fighter, x, y);
      const alpha = context.getImageData(Math.floor(250+scale*point.x), Math.floor(350+scale*point.y), 1, 1).data[3];
      assert.equal(alpha, 255, `Waist at scale ${scale}, facing ${dir}, frame ${frame}, local ${x}/${y}`);
     }
    }
   }
  }
 }
});
