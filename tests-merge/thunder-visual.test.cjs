const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const model = require('../web/thunder/model.js');

test('Thunder current renderer paints skill silhouettes and keeps the orb on the casting arm', () => {
 const canvas = createCanvas(480, 480);
 const context = canvas.getContext('2d');
 for (const skill of ['attack', 'q', 'w', 'e', 'r']) {
  for (const dir of [-1, 1]) {
   for (const bloom of [false, true]) {
    const fighter = {x:240, y:345, dir, vx:330*dir, vy:0, ground:true};
    for (let tick=0; tick<=36; tick++) {
     const age = tick/60;
     fighter.action = {k:skill, age, duration:1};
     model.update(fighter, 1/60, age);
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    model.draw(context, fighter, .6, bloom);
    assert.ok(model.skin(fighter, fighter.thunderModel).every(Number.isFinite));
    const silhouette = model.transform(fighter, 0, -110);
    const torsoAlpha = context.getImageData(Math.floor(silhouette.x), Math.floor(silhouette.y), 1, 1).data[3];
    assert.equal(torsoAlpha, 255, `Visible torso for ${skill}, facing ${dir}, bloom ${bloom}`);
    const orb = model.muzzle(fighter);
    assert.ok(Number.isFinite(orb.x) && Number.isFinite(orb.y));
    const orbAlpha = context.getImageData(Math.floor(orb.x), Math.floor(orb.y), 1, 1).data[3];
    assert.ok(orbAlpha>200, `Visible orb for ${skill}, facing ${dir}, bloom ${bloom}`);
   }
  }
 }
});
