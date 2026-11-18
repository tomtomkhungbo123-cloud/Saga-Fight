# Mox Lab 18 integration

Approved integration from Mox Lab source f53cbb0604b67992a294e4a87a70a5643388330d into Saga Fight source d30375ac0a5ed4b6d9b26237f29a6f33b4d2208d. The lab baseline hashes matched the main game before integration.

Includes compact reference model, connected abdomen, planted gait, alternating firing hands with matching muzzle origins, cached glove/wing glow, bounded inertial punch energy, confirmed-hit/whiff audio, melee R follow-up correction and the 2.4-second Mox finisher. Combat damage, cooldowns and normal range remain unchanged. N3 and shortened late-combo R retain escape protection.

Only character runtime changes and two audio assets were imported. Lab UI, automatic Sandbox entry, account restrictions and provenance scaffolding were not imported. Account/admin seasons, mobile lobby, other fighters and server behavior remain intact. The finisher killer ID and firing state are included in snapshots and rollback; the Online simulation revision is now 6360-mox18, rejecting mixed older clients before Ready. Reload both peers after updating.

Validation covers Mox at 30/60/120Hz, alternating projectiles/range, R stun follow-ups and anti-infinite limits, audio hit/whiff/shield behavior, deterministic finisher timing/no extra damage, DIRECT and WS fallback convergence, snapshot/restore and release assets. Browser smoke review covers the integrated main-game Sandbox, both forms and normal damage. Real iPhone/iPad performance and physical-device Internet transport were not measured in this environment.
