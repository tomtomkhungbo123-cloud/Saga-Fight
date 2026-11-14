# Saga Fight 5.9 — Wi-Fi / WebRTC revision

Checkpoint: `checkpoint-before-wifi-netcode-5.9`, commit `47fdbc8d16b3a86a0474ccbc41b14f7f844d2db4` (5.8).

## Verified source findings

5.8 used unordered, zero-retransmit WebRTC with full snapshots every 50 ms. Guest movement waited for host snapshots, then smoothed the actual received fighter position. If the channel failed, HTTP/D1 polling resumed combat synchronization; polling could also refresh peer liveness, concealing channel failure. Same Wi-Fi did not establish that ICE had selected a LAN candidate. Configuration contains STUN services, no TURN credentials or selectable relay regions.

## Implementation

- Combat travels only over the DataChannel. Room HTTP calls carry room/session/signaling data at 1.6 s intervals, never inputs or snapshots. Match startup requires the versioned channel hello. No fallback combat over HTTP.
- 120 Hz simulation; 60 Hz transport. Inputs/actions send immediately on change/tap and are retransmitted until acknowledged. Contiguous input/event sequences prevent duplicate execution and holes; frame queues are capped at 240, pending actions at 32. Snapshot includes simulation tick, input acknowledgment, event acknowledgment and recovery epoch.
- Unordered channel retained; reliability implemented for inputs/actions via ACK/resend. Snapshot deltas refer only to acknowledged baselines, capped at 64. Unknown baselines request a full snapshot. Backpressure checks 16 KB bufferedAmount and bounds message size. Arena/Mox effect descriptors have stable IDs and birth times; procedural rendering remains local. Mox projectile trail samples are retained for exact original appearance.
- Guest predicts movement, jumping and valid cast/normal poses immediately on separate fighter copies using the same movement physics and pose updates. No predicted damage or hit audio. Reconciliation rebuilds from the host and replays unacknowledged input. Visual position correction is separate, bounded and disabled for stun/grab. Host alone resolves HP, hits, cooldown, combo, capture and result.
- Heartbeats every 500 ms measure RTT with local performance.now and unique IDs. getStats reads selected candidate pair, candidate types, protocol and ICE RTT; IPs are neither stored in diagnostics nor displayed. DIRECT does not mean LAN. Missing measurements display “đang đo”. Existing FPS HUD retained. Diagnostics expose measured RTT/jitter, frame interval, processing costs, queue depth and bytes via riftNet.metrics(). No packet-loss percentage is inferred from delayed packets.
- Missing state/peer traffic freezes synchronization. Recovery requires an incremented epoch, cleared stale inputs, a full authoritative state and guest ACK before host resumes. Recovery is bounded to 15 s; startup to 20 s after both join. Native ICE/channel recovery is supported; a permanently closed channel ends the session, requiring a new room. There is no automatic ICE-restart renegotiation yet.
- Cleanup removes channel handlers, polling/fast timers, gather listeners, peer connection and prediction state.

## Checks and measurements

`node --test tests/*.test.*`: 50 passing tests (includes test files containing multiple combat assertions). Two independent VM game clients communicate over a simulated DataChannel with actual application packet handlers. Existing tests cover original damage/cooldown/COMBO, all four characters, Mox grab cleanup and both forms, Soulblade bleed, Cylast shatter, audio deduplication, keyboard and pointer input. Additional tests cover every ability through delayed host/guest synchronization, authoritative HP/cooldown, immediate guest motion/jump without changing authoritative HP, bounded queues, jitter/reordering, deterministic dropped datagrams, interruption/freeze/epoch recovery, getStats privacy and baseline bounds.

Movement/jump test: 6.6 s virtual time, 120 Hz harness. Configured RTT 50 / 100 / 150 / 200 ms produced measured heartbeat RTT 66.7 / 116.7 / 166.7 / 216.7 ms (includes harness delivery quantization). Prediction position changes in the first 8.33 ms simulation step; jump velocity changes in the input call. This is not measured physical input-to-photon latency. Data sent in both directions: 242474 / 279738 / 311328 / 348245 bytes. Jitter ±30 ms and every 11th datagram dropped tested separately; no real-network loss claim.

Same 8 s scenario, Thunder/Soul simultaneous ultimates, snapshot payload only:

| Metric | 5.8 full JSON at 20 Hz | 5.9 deltas at 60 Hz |
|---|---:|---:|
| Snapshot bytes | 768357 | 254418 |
| Snapshot bytes/s | 96045 | 31802 |

Reduction: 66.9% in this scenario, excluding SCTP/DTLS/IP overhead, inputs and heartbeat. New codec encode + decode round trip measured mean 0.76 ms / p95 1.97 ms in one test run (VM and JSON copy overhead included). Not an on-device FPS claim.

`node scripts/benchmark-render.cjs /tmp/saga58/` against checkpoint game.js, then current game.js, same 1200×838 software canvas scenes (90 samples each):

| Scene | Before mean/p95 ms | After mean/p95 ms |
|---|---:|---:|
| Idle | 0.76 / 1.08 | 0.72 / 1.09 |
| Soul Q | 1.57 / 3.08 | 1.25 / 2.01 |
| Thunder R | 1.06 / 2.37 | 1.23 / 3.79 |
| Cylast R | 11.68 / 17.20 | 3.71 / 11.75 |

Software-render benchmark is noisy and does not exercise WebRTC or mobile GPU; no FPS improvement is inferred. Character renderers, images, audio assets and combat tuning are unchanged. Existing graphics-quality policy is unchanged; no quality reduction added for networking.

## Limits / infrastructure

Not full rollback. Combat confirmation and authoritative projectiles/grabs still incur network delay; prediction cannot make real RTT disappear. Direct same-Wi-Fi traffic depends on ICE, AP isolation and browser restrictions. No TURN credentials exist in this project: deploying a Vietnam/SEA TURN service needs external endpoint and short-lived authenticated credentials; none were invented or removed. Signaling runs on the existing Sites Worker/D1 infrastructure, but is no longer in the combat path.

No two physical devices on the user's Wi-Fi or physical iOS device were available. Hardware RTT/input-to-photon/frame-time before/after remains unverified. Browser in this environment cannot reach the local development server; production UI/WebRTC smoke result is documented separately after deployment. The 50/100/150/200 ms results above are simulation, not actual Wi-Fi measurements.

Production smoke: both browser tabs loaded BUILD 5.9 and created/joined the same room. DataChannel did not open within the 20 s deadline; both returned a clear connection failure instead of silently starting HTTP combat. This confirms the safety path, not playable WebRTC in this cloud environment. Added ICE state/candidate-count diagnostics (no IP) and forwarding for candidates gathered after the initial SDP wait.
