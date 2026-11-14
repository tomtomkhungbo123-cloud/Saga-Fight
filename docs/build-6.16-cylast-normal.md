# Build 6.16 — Cylast projectile and frozen-target beam

User selected 400 world units/second, down from 1500. Normal frost projectiles retain 1000-unit range, aim, damage and timing; their velocity magnitude now reads the centralized combat config. The legacy adapter also reads the same speed. A 600-unit flight takes about 1.5 seconds (excluding startup and muzzle offset).

At the existing normal startup/impact, a living enemy still frozen by this Cylast's Skill 1, within normal range/height and forward arc, receives one direct beam from staff tip to enemy torso. This is not a projectile or sustained damage zone. It calls the existing authoritative damage path with the same normal use/hit ID, retaining 110% shatter bonus, scaling, immunity, shield, hit accounting and freeze removal. Foreign/expired freeze uses normal slow projectile. No new CC is added. The 220ms blue-white beam uses three straight strokes with no per-frame particle allocation or blur. Existing snapshots carry the short effect; no separate network stream. Online version gate updated to 76 to avoid old clients missing the new visual/state behavior.

Regression tests: velocity exactly 400; owned freeze normal produces one beam/no projectile, one 110% scaled hit and removes freeze; foreign/expired freeze keeps projectile. Updated prior close-range combo expectations to account for real slower projectile travel: Q→beam normal remains confirmed, but subsequent projectile at 80 units has a defensive gap. Hitstun was not extended to preserve obsolete true-combo timing. Full test and online integration results reported in delivery.

Physical mobile and two-device PvP were not available. Automated host/guest uses simulated clients. Listening/graphics quality unchanged.
