# Build 6.13 — Soulblade size and Skill 1 repeat gate

Soulblade body/weapon visual scale changes from 1.1 to 1.0 (9.09% smaller), anchored at the same feet. The shared renderer applies in menu and arena, retaining contours and animations. The outer Skill 1 ribbon compensates the scale change to retain the 400-unit gameplay radius. Collision, range and damage remain unchanged.

Skill 1 now sets cd.q to 0.3 seconds on successful cast, separate from the existing two charges / independent 5-second recharge. Readiness and the legacy entry point both enforce this minimum start-to-start interval, including after interruption. Existing startup, animation recovery and cancel rules may require a longer interval; this is not an added 0.3 seconds after animation ends. Desktop/touch HUD shows the gate and snapshots already carry cd.q. Sandbox uses the base delay unless explicitly overridden.

Validation: 66/66 standard tests passed, zero failures, 20.79s. Added regression: an interrupted Q cannot consume a second charge at 0.1s; a valid retry after 0.3s consumes once, retains two separate recharges, and reset clears gate. Existing keyboard/touch chain, fixed-frame-rate combo and host/guest charge synchronization tests passed. Build: 90 embedded assets. Physical device testing unavailable.
