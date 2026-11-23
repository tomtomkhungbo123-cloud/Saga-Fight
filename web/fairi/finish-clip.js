'use strict';

window.FairiFinishClip = (() => {
 const mediaDuration = 4.25;
 const fadeIn = .18;
 const fadeOut = .24;
 let video, unavailable = false, pending = false, wantsPlayback = false;
 let seekOnly = false, audioConnected = false;
 const smooth = value => {
  const u = Math.max(0, Math.min(1, value));
  return u * u * (3 - 2 * u);
 };

 function prepare() {
  if (video) return;
  video = document.createElement('video');
  video.hidden = true;
  video.preload = 'auto';
  video.playsInline = video.muted = true;
  for (const [extension, type] of [['webm','video/webm; codecs="vp9, opus"'],['mp4','video/mp4']]) {
   const source = document.createElement('source');
   source.src = 'fairi/finisher-clip.' + extension + '?v=2';
   source.type = type;
   video.append(source);
  }
  const fail = () => { unavailable = true; video.pause(); };
  video.addEventListener('error', fail);
  video.lastElementChild.addEventListener('error', fail);
  document.body.append(video);
 }

 function sync(elapsed, paused) {
  if (elapsed === null) {
   wantsPlayback = false;
   if (video && !video.paused) video.pause();
   return;
  }
  prepare();
  if (unavailable) return;
  const target = Math.max(0, Math.min(mediaDuration - 1/48, elapsed));
  wantsPlayback = !paused && !document.hidden && !seekOnly && elapsed < mediaDuration;
  if (!wantsPlayback && !video.paused) video.pause();
  const tolerance = wantsPlayback && !video.paused ? .18 : .035;
  if (video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - target) > tolerance) video.currentTime = target;
  if (!wantsPlayback || pending || !video.paused || video.readyState < 2) return;
  audioConnected ||= window.sagaAudio?.connectCinematic(video) === true;
  video.muted = !audioConnected;
  pending = true;
  video.play().catch(async error => {
   if (!wantsPlayback || error.name === 'AbortError') return;
   if (video.muted) { seekOnly = true; return; }
   video.muted = true;
   try { await video.play(); } catch { seekOnly = true; }
  }).finally(() => {
   pending = false;
   if (!wantsPlayback) video.pause();
  });
 }

 function draw(ctx, width, height, elapsed, isOpaquePass) {
  if (!video || unavailable || video.readyState < 2) return false;
  if (isOpaquePass && (elapsed < fadeIn || elapsed > mediaDuration)) return false;
  const alpha = smooth(elapsed/fadeIn) * (1-smooth((elapsed-mediaDuration)/fadeOut));
  if (alpha <= 0) return true;
  const scale = Math.min(width/1280, height/720);
  const w = 1280*scale, h = 720*scale, x = (width-w)/2, y = (height-h)/2;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#1a3335';
  if (x > 0) { ctx.fillRect(0,0,x,height); ctx.fillRect(x+w,0,width-x-w,height); }
  if (y > 0) { ctx.fillRect(0,0,width,y); ctx.fillRect(0,y+h,width,height-y-h); }
  ctx.drawImage(video,x,y,w,h);
  ctx.restore();
  return true;
 }

 return {prepare, sync, draw};
})();
