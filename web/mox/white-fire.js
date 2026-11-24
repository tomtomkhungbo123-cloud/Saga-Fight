// A single reusable glint for the silver skin, with no particle state or live blur.
(() => {
 const sprite = document.createElement('canvas');
 sprite.width = sprite.height = 48;
 const paint = sprite.getContext('2d');
 const glow = paint.createRadialGradient(24, 24, 0, 24, 24, 22);
 glow.addColorStop(0, '#f5f9ffb8');
 glow.addColorStop(.32, '#dce5ef60');
 glow.addColorStop(1, '#bec9df00');
 paint.fillStyle = glow;
 paint.fillRect(0, 0, 48, 48);
 paint.fillStyle = '#ffffff';
 paint.beginPath();
 paint.moveTo(24, 5);
 paint.quadraticCurveTo(26, 22, 42, 24);
 paint.quadraticCurveTo(26, 26, 24, 43);
 paint.quadraticCurveTo(22, 26, 6, 24);
 paint.quadraticCurveTo(22, 22, 24, 5);
 paint.fill();

 function glint(ctx, x, y, radius, opacity) {
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * opacity;
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = alpha;
 }

 function aura(ctx, x, y, clock, ranged, scale = 1) {
  for (let i = 0; i < 9; i++) {
   const angle = clock * (i % 2 ? -.75 : .83) + i * 2.39996;
   const pulse = Math.pow(.5 + .5 * Math.sin(clock * (2.5 + i % 3 * .55) + i * 2.1), 2);
   const orbit = (i % 2 ? 52 : 65) + (ranged ? 12 : 0);
   glint(ctx, x + Math.cos(angle) * orbit * scale,
    y + (Math.sin(angle) * 34 + (i % 3 - 1) * 31) * scale,
    (5 + i % 3 * 2 + pulse * 3) * scale, .18 + pulse * .68);
  }
 }

 window.MoxWhiteFire = {palette: 'mox-white-fire', glint, aura};
})();
