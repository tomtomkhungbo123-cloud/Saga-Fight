# 6.22.3 — symmetric render interpolation and animation preservation

User report: one device sees the opponent stutter. The live server was confirmed to report build 6.22.2-direct1 during investigation. No device-specific FPS/ping log was supplied, so the exact cause on those devices is not established.

Two code paths capable of contributing were identified: drawing immediately at the newest fixed-tick position without residual-time interpolation, and globally clearing Melanta animation state after every rollback correction, including small movement corrections. This patch addresses these paths without changing combat rules or removing desync repair.

Core simulate calls presentation before/after-advance hooks in both normal advancement and replay. Presentation stores only tiny transform samples (x/y/turn, type/phase and discontinuity markers); none are serialized in deterministic world state. After replay the samples represent its final two ticks. Network frame passes its remaining accumulator fraction to presentation, with alpha 1 when speculation stalls. Rendering interpolates transforms and shortest-path angles, then applies existing bounded correction offsets. Ground landing Y is exact. Rendering adds at most one 120 Hz tick of delay (~8.3 ms), equally available to both roles; it does not buffer only the remote player by several network frames.

New hit, KO, grab, phase/type transition and >80-unit single-tick displacement bypass interpolation. Large/control corrections bypass soft offsets. Soft rollback no longer resets Melanta. The visual reset API can target one actor on a hard correction; checkpoint initialization resets all presentation state. Cache/pose data remain outside snapshots and hashes. Physics, hitboxes, projectiles, damage and cooldowns use actual world state, not interpolated transforms.

Local render metrics: window.riftNet.metrics().render (paintFps, renderMs, renderScale, frameMs). FrameMs/paintFps reflect local frame/paint timing, not network ping; the small ping badge remains unchanged.

Verification: full npm test, Node 24.22.1: 142 passed, no failures/skips/cancellations. New tests cover both local player roles at simulated 30/59/60/75/120/144 FPS; presentation cannot mutate combat state; constant-motion display variation drops at uneven 59/75 Hz and avoids zero-movement painted samples at 144 Hz; soft Melanta rollback preserves cache; hard correction resets only affected actor; teleport/hit/grab render at exact current position. Existing full-world restore/replay, native renderer, all 25 pairings, direct/WS recovery and RTT regressions pass. Two production transport tests rerun after adding passive render metrics also pass.

Not verified: two physical devices, native browser/WebRTC timing, mobile GPU FPS, the user's real jitter/loss/network routes. Higher ping, poor Wi-Fi, low render FPS or large prediction corrections may still produce visible stutter. Interpolation reduces quantization/stair-stepping; it cannot create missing frames on an overloaded device or eliminate network latency. The test FPS values are scheduling simulations, not measured mobile/browser throughput.

Protocol 85, BUILD 6.22.3, /healthz build 6.22.3-view1. Both clients, game/core/online scripts and relay must update together. The patch includes all changed files since the original 6.22 bundle, retaining both preceding hotfixes.
