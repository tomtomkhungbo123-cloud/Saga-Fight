# Build6.7 — damage armor and effects

Checkpoint: checkpoint-before-effects-6.7 at b815000ac0ab4d0ed000eb3fc2f4b21ba682e7eb.

Implemented:
- Shared damage armor during Thunder E/R, Soulblade R, Cylast W/R casting, Mox R in either form. HP loss and authoritative damage remain; ordinary hitstun/push does not cancel the active action. Explicit stun/freeze/grab retain their separate existing rules. Armor expires with action; Cylast zones remain independent after casting.
- Thunder bolt width ×1.5; smoothstep blending of anchored lightning phases,18Hz temporal evolution; W ground arcs. No combat hitbox/timing changes, no additional full-screen flash. Integer-phase LRU remains bounded96entries/4million pixels.
- Mox W knockback210→320, only requested numerical balance change.
- Mox melee R continuous Hermite lift/flip/dive velocities and smooth rotation/landing settle. Impact1.28s, grab1.52s,400base damage and existing CC/SFX unchanged.
- Mox two gauntlet halos use one128² precomputed texture and one sprite draw per fist; no live blur/filter/gradient allocation. Original silhouette/weapon path strings checked identical.
- Build/cache/protocol67 prevents mixed combat revisions connecting.

Validation:
- node --test tests/*.test.*:60/60passed,0fail,~9.38s.
- Damage armor tests all requested moves, both Mox forms: takes100HP damage without flinch/push/action change; expiry and unlisted move interruption.
- Mox motion tests boundary continuity, vertical derivatives, angular settling; one impact and capture release at30/60/120Hz; actual W push320.
- Existing combat/COMBO/hit meter, audio/network duplicate snapshot, render and bounded-cache regression tests pass.
- Native Canvas benchmark, same script90frames/scene, before→after mean/p95ms: Mox idle0.47/0.63→0.51/0.89; Thunder R4.69/17.04→1.00/2.56. Measurements have substantial process/cache scheduling variation (an earlier Thunder-only run1.91/5.26→2.64/5.74); do not infer an FPS improvement or guarantee mobile FPS. These are headless raster draw times, not device frame delivery.
- Worker build succeeded with90embeddedassets; git diff --check clean.

Not verified: real iOS/Android GPU frame time, visual feel on physical devices, two physical devices PvP and network delay. No graphics quality/resolution/particle count reduction introduced by this update.
