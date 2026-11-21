# Mox lab45 → game test

Integrated source68e01c742468d367c4a6a54edc3bafcd69ae9028 (Mox Site45,21 Nov2026) into Saga Fight Site131. Imported Mox base/combat/visual and required cached WebP effects only. Shared game changes are limited to accurate skill names/descriptions; latest Thunder, Soulblade, cosmetics, iOS controls and Supabase inventory code remain.

- Ranged R:8×43.75=350 raw damage,500 range,final ball450 displacement.
- Reference Q,punch,projectile,detonation,burn and melee-R rise/dive/ground VFX. Ground effect1500×1500,foreground,1.2s. No extra damage on projectile miss explosions.
- Existing alternate-hand rig,finisher,combo follow-up and control budgets retained.
- Added WebP MIME to Worker asset delivery; cache versions updated together.

Validation:12 Mox suites including30/60/120Hz combat,hit/miss,exact endpoints,assets and audio; range boundary checks; DIRECT/WS rollback convergence including ranged R; palette regressions. Browser checked roster/Sandbox and a temporary six-phase renderer fixture; fixture removed before publishing. Physical iPhone/iPad performance not measured.

Broader rollback run:110 checks passed,one existing Thunder presentation-state test failed. Reproduced the same failure with unchanged baseline game.js before this integration; outside the Mox change.
