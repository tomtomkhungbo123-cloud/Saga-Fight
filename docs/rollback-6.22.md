# Implementation and verification — 6.22

Production entry points: web/rollback-core.js, web/game.js rollback adapter, web/online.js protocol 82; scripts/relay.mjs accepts authenticated room peers. Both clients simulate both fighters at 120 Hz with symmetric two-tick local input scheduling. Missing remote movement repeats the most recent known direction; missing remote button presses are never invented.

Before each predicted sequence, state is retained as an object graph. Shared aliases, undefined and non-finite sentinel values survive checkpoints. Animation presentation caches stay outside deterministic state; Mox prototype and WeakMap combat contexts are rebound on restoration/update. Per-tick numerical normalization uses 1e-9 precision. Seeded simulation RNG is scoped and restored so drawing cannot consume it.

Late input differing from the prediction restores the previous tick and replays every subsequent tick in deterministic P1/P2 action order. Inputs already received are immutable. Duplicate/out-of-order batches are supported; future ticks, batch sizes, action counts and speculative history are bounded. Input/ACK lead is limited to 48 ticks. Confirmed history retains 180 old ticks plus the speculative window. Rollback only changes presentation offsets for small harmless corrections; hit/grab corrections snap. Sound and results commit when both input streams and peer acknowledgment have crossed the tick.

Protocol: rb-init checkpoint/config (host only), rb-ack (guest only), rb-start (host only), rb-input and rb-hash (both), rb-resync (guest request). Checkpoints/control use authenticated WebSocket even when combat inputs use DIRECT. Normal packets cap at 85,000 bytes; checkpoint cap 512,000 bytes. Relay room/role isolation, origin checks, auth timeout, rate limits and bounded backpressure remain. Existing legacy message support is retained for regression coverage, but production clients exclusively use the rollback path. No TURN or STUN service is required. Host coordinates initial seed, route changes and repair checkpoints; this is not a competitive anti-cheat server.

Confirmed state checksums are sent every 30 ticks. A mismatch pauses/resets from the host's last confirmed checkpoint with a new epoch. Inputs from obsolete epochs are discarded. Socket reconnection and DIRECT-to-WS fallback use the same checkpoint handshake; speculative trailing inputs may be discarded at this interruption. The game cannot preserve a room through server process restart.

Tests specific to the production rollback path:

- Graph alias/cycle restoration, non-finite sentinels, unsafe-key rejection.
- All 25 character pairings: uninterrupted simulation equals full restore and resimulation of movement and action sequences.
- Two independent game contexts with delayed/reordered batches (2–24 ticks, approximately 17–200 ms one-way); both sides actually rollback and converge. Does not model UDP loss: both supported transports are ordered/reliable.
- Speculation bound, immutable input, future-tick rejection, committed audio deduplication, pause clock, confirmed results and both-ready round advancement.
- Native canvas rendering of all five characters plus confirmed UI leaves deterministic state unchanged. Thunder transition cache survives render wrappers.
- Perturbed trig functions in one independent context check normalization of tiny rounding noise; this is not a substitute for Safari/Chrome device testing.
- Production online.js and real local authenticated WS relay: DIRECT input routing with mocked RTCPeerConnection, DIRECT failure to WS checkpoint recovery, deliberate checksum divergence repair, blocked DIRECT fallback and socket reconnection.
- Full-world capture/confirmation cost and bounded history measurement on the test machine. These timings do not predict iOS FPS.

The old tests/online-client.test.mjs explicitly loads tests/fixtures/legacy-online-6.21.js to preserve earlier host/guest regression coverage. It is not evidence that production symmetric rollback works; the separate full-rollback*.test.mjs and rollback-performance.test.mjs tests exercise that path. Other combat/visual/control/server tests use current production game code.

Limitations: device-to-device internet/Wi-Fi, native browser WebRTC, Safari-vs-Chrome determinism and mobile performance still require physical-device validation. JavaScript cross-engine floating point differences cannot be guaranteed eliminated by quantization; checksum recovery is a safety net. No claim of zero lag or zero correction under all network conditions.
