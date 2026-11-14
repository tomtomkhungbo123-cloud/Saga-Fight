# BUILD6.10 — monochrome knockout and3second ending

Checkpoint:checkpoint-before-ko-6.10 at d7398ab3c359b1ef6e9de35daed445fc6b68f6ad.

- Shared FINISH_CONFIG:3real seconds at existing0.18simulation speed. Host finish timing remains authoritative. No damage,cooldown,control,combo or AI changes.
- Melanta special ending preserves its existing2second choreography,remapped over3real seconds;no negative elapsed interval or early result.
- Defeated fighters use the cached grayscale palette for vector styles,gradients and sprite images. Alpha preserved;victor keeps its underlying normal/mirror palette. Labels of defeated fighters gray.
- Both world canvases (#game and #arenaBackground) receive grayscale(1) through a scopedko-scene class with180ms transition. HUD,controls,settings and round result overlays retain their colors/readability. No added whole-screen flash,blur or repeated full-canvas pixel readback.
- KO scene remains monochrome in finishing,pause during finishing and round/match result;clears on new round,restart or menu. Timeout with no defeated fighter remains colored. Host/guest derive the same state from existing authoritative HP/phase snapshots,no extra per-frame network packets. Apply guest pausedFrom before computing the visual state.
- BUILD/cache70(6.10),online protocol70requires both devices refresh to avoid mixing old2second and new3second presentation timing.

Validation:
- Full suite66/66passed (~7.79s),0fail.
- New KO tests:all5characters,30/60/120Hz simulation,3real seconds before result,one score,Melanta ending,draw,pause/resume and color cleanup.
- Native Canvas pixel test:gray vector,gradient,sprite pixels haveR=G=B,alpha preserved,unchanged live colors and cached sprite reuse.
- Online host/guest regression25/25passed after paused-state ordering correction:both apply monochrome onKO,remain in finishing beyond old2s threshold,and reset filter next round.
- Updated existing combat/round progression tests from2s to3s;original stun timing stays1.5s.
- Worker build90embeddedassets and git diff --check pass.

Limit:CSS compositing/iOSGPU performance and the complete visual effect on physical phones were not tested. Native pixel tests cover the character palette;scene filter coverage was verified by selectors and synchronized class-state assertions,not a physical-device screenshot.
