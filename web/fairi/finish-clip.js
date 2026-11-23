'use strict';

window.FairiFinishClip = (() => {
 const mediaDuration = 4.25;
 const fadeIn = .18;
 const fadeOut = .24;
 const frameWidth = 448, frameHeight = 252, frameRate = 18, frameCount = 77;
 const columns = 4, framesPerSheet = 16;
 const sheets = [];
 let video, unavailable = false, pending = false, wantsPlayback = false;
 let seekOnly = false, audioConnected = false, mutedPlayback = false;

 const smooth = value => {
  const u = Math.max(0, Math.min(1, value));
  return u * u * (3 - 2 * u);
 };

 function prepareFrames() {
  if (sheets.length) return;
  // Each sheet contains up to 16 frames sampled from finisher-clip.mp4.
  for (let page = 1; page <= Math.ceil(frameCount / framesPerSheet); page++) {
   const image = new Image();
   image.src = 'fairi/finisher-frames-' + page + '.webp?v=1';
   sheets.push(image);
   image.decode?.().catch(() => {});
  }
 }

 function prepare() {
  if (video) return;
  const ios = document.documentElement.classList.contains('ios-controls');
  video = document.createElement('video');
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.preload = 'auto';
  video.playsInline = video.defaultMuted = video.muted = true;

  const sources = [['webm','video/webm; codecs="vp9, opus"'], ['mp4','video/mp4']];
  if (ios) {
   sources.reverse();
   prepareFrames();
  }
  for (const [extension, type] of sources) {
   const source = document.createElement('source');
   source.src = 'fairi/finisher-clip.' + extension + '?v=3';
   source.type = type;
   video.append(source);
  }
  const fail = () => {
   unavailable = true;
   video.pause();
   prepareFrames();
  };
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
  if (video.readyState < 2) prepareFrames();

  // On iOS, asking for playback can be what starts decoding the first frame.
  if (!wantsPlayback || pending || !video.paused) return;
  audioConnected ||= window.sagaAudio?.connectCinematic(video) === true;
  video.muted = !audioConnected || mutedPlayback;
  pending = true;
  video.play().catch(async error => {
   if (!wantsPlayback || error.name === 'AbortError') return;
   if (!video.muted) {
    mutedPlayback = video.muted = true;
    try { await video.play(); return; } catch (retryError) {
     if (!wantsPlayback || retryError.name === 'AbortError') return;
    }
   }
   seekOnly = true;
   prepareFrames();
  }).finally(() => {
   pending = false;
   if (!wantsPlayback) video.pause();
  });
 }

 const loaded = image => image?.complete && image.naturalWidth > 0;

 function draw(ctx, width, height, elapsed, isOpaquePass) {
  if (isOpaquePass && (elapsed < fadeIn || elapsed > mediaDuration)) return false;
  const alpha = smooth(elapsed/fadeIn) * (1-smooth((elapsed-mediaDuration)/fadeOut));
  if (alpha <= 0) return false;

  const target = Math.min(elapsed, mediaDuration - 1/48);
  const videoReady = video && !unavailable && video.readyState >= 2 && !video.seeking
   && Math.abs(video.currentTime - target) < .24;
  let frame = Math.min(frameCount - 1, Math.floor(elapsed * frameRate));
  let sheet = sheets[Math.floor(frame / framesPerSheet)];
  if (!videoReady) {
   // Hold the most recent loaded frame if the next sheet is still arriving.
   while (frame >= framesPerSheet && !loaded(sheet)) {
    frame = Math.floor(frame / framesPerSheet) * framesPerSheet - 1;
    sheet = sheets[Math.floor(frame / framesPerSheet)];
   }
   if (!loaded(sheet)) return false;
  }

  const scale = Math.min(width/1280, height/720);
  const w = 1280*scale, h = 720*scale, x = (width-w)/2, y = (height-h)/2;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#1a3335';
  if (x > 0) { ctx.fillRect(0,0,x,height); ctx.fillRect(x+w,0,width-x-w,height); }
  if (y > 0) { ctx.fillRect(0,0,width,y); ctx.fillRect(0,y+h,width,height-y-h); }
  if (videoReady) ctx.drawImage(video,x,y,w,h);
  else {
   const cell = frame % framesPerSheet;
   ctx.drawImage(sheet, (cell % columns)*frameWidth, Math.floor(cell / columns)*frameHeight,
    frameWidth, frameHeight, x, y, w, h);
  }
  ctx.restore();
  return true;
 }

 return {prepare, sync, draw};
})();
