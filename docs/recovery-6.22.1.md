# 6.22.1 — recovery handshake regression fix

Observed deployment before patch: /healthz 6.22-rollback1; online.js and rollback-core.js byte hashes match the released 6.22 source. Therefore this report is not explained by the earlier mixed-web deployment issue.

Root cause reproduced: guest receives rb-init, enters suspended state, sends rb-ack, then the fast timer sends rb-resync for the NEW epoch while the guest is still waiting for rb-start. On a nonzero control RTT, that resync may arrive after host accepted ACK and started, triggering another epoch/checkpoint. Repetition causes freezes and apparent reconnect loops even though the sockets are connected. Zero-latency mocked control tests missed this ordering.

Fix:
- Guest explicitly waits for START after ACK, suppressing RESYNC during this state.
- Repeat ACK at 500 ms if START has not arrived; host can repeat its cached START for duplicate ACKs. Duplicate START does not shift an already-running simulation start time.
- Throttle RESYNC to once per second per epoch, ignore redundant requests while a checkpoint is pending, and do not apply ordinary gameplay-input watchdogs during the checkpoint handshake.
- Keep real socket failure handling, checksum verification and repair enabled. No disabling desync detection to hide the symptom.
- Add metrics.lastRecovery with reason/epoch/tick and checksum details when present; count checkpoint initializations in metrics.recoveries (includes the initial checkpoint).
- Verify game/core/client build stamps before enabling room buttons, so partial uploads stop with an actionable error. Protocol 83 requires both clients and relay to update together.

Regression test before fix: with 45 ms outgoing WS delay, session initialization did not complete within 4 seconds (Hybrid condition timed out).

After fix: production online.js with real local WS relay and mocked DIRECT, delayed outgoing control sends at 45 ms and 120 ms, and a dropped first START all initialize once (epoch 2), run actual game frame callbacks at differing 60/30 Hz until fight, and switch DIRECT to WS with exactly one additional checkpoint. No continuing recovery epoch loop in those scenarios. Mixed client builds are blocked before room creation. Existing deliberate-desync repair and socket reconnect tests still pass.

Final full suite: npm test; Node 24.22.1; 125 passed, 0 failed/skipped/cancelled. See validation-6.22.1.txt. Native Chromium launch was attempted but unavailable under test-environment process/socket restrictions; tests above use independent JS contexts and real WS, not a claim of two physical/browser devices verified. Actual Render deployment and the user's Wi-Fi devices require validation after applying the patch. Other network/performance issues are not ruled out by fixing this specific race.
