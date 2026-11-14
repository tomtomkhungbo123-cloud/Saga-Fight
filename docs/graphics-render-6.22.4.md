# Graphics settings port — Render 6.22.4

Source Site: https://sagafight.neat-bowl-4907.chatgpt.site/; project appgprj_6af280fe2c688191a3f1c934a23af35b, Site version 51, source commit f4c71ac7ffe3ecb608b5e2e9dce252ce62feb205 (Build 6.18 graphics). Target: current GitHub/Render 6.22.3, not a replacement with the older Site netcode. The hosted Site/source repository was read only; no Site deployment was requested or performed.

Ported the graphics section of Settings, its CSS, device-local profiles/storage, viewport raster budgets, adaptive render thresholds and variable paint interval. Preserved the fixed-step/online branches, rollback presentation, ping display and direct negotiation. Build stamps and health updated to 6.22.4 / 6.22.4-graphics1. Online protocol remains 85; no combat-state or network schema changes.

Profiles: auto/high 1,300,000-pixel budget at scale 1; balanced 850,000 at .85; low 480,000 at .75. Auto can further adapt resolution; manual profiles retain the chosen setting. On large viewports low processes less than 30% of high's raster pixels. This is a pixel-count observation, not a measured device FPS improvement. Effects/characters are retained.

Preferences: saga.graphics.v1 in localStorage, validated on startup (own profile keys only), applied immediately by invalidating viewport/scenery cache. Storage exceptions are caught; play/settings continue, although persistence cannot be guaranteed when storage is blocked. No graphics setting is captured by the rollback state or sent to the peer.

FPS: selected 30/60 limits painting only. requestAnimationFrame, fixed 120 Hz simulation, network input scheduling, rollback and input handling remain at their existing cadence. An intentional 30-FPS cap does not itself trigger automatic quality reduction. UI describes reduced sharpness and reduced visual smoothness.

Validation: npm test, Node 24.22.1: 144 passed; no failures/skips/cancellations. Existing 142 regressions preserved. Additional graphics preference reload/corruption/storage-denial test and real-local-relay online test with host low/30 and guest high/60 pass. The latter executes actual game frame callbacks, counts roughly half as many host paints, retains matching confirmed state hashes and no extra recovery epochs. Original graphics pixel-budget, timing, persistence, invalid-value and stable auto/30 regression cases are included in performance.test.cjs. WebRTC is mocked, WS relay real local; native browser/mobile GPU/thermal performance is not verified. Full run: validation-6.22.4.txt.
