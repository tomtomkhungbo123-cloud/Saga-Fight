# Build 5.2 — owned status effects and grab accounting

Soulblade R keeps its 3-second bleed and 60 base explosion. Each subsequent
direct damaging hit by the mark owner adds one stack, capped at ten. The burst
is `60 * (1 + 0.03 * stacks) * capturedUseScale`, then normal target mitigation.
The scale is applied once. DOT, reflections and bursts do not stack or refresh
the mark. Expiry removes the mark before resolving damage. Death and resets
clear it. A burst increments only a still-continuous true combo; after a defense
gap it is recorded separately, without restarting the old combo or adding CC.

Cylast Q tags its freeze with owner and move ID. The first matching normal
contact atomically consumes that freeze, multiplying normal base damage by 1.1
before scaling and mitigation. It remains one hit. Removing the freeze restores
unrelated control state and adds no shatter stun; the normal retains its usual
reaction. Other actors, skills and DOT cannot consume the reward.

Mox melee R retains its 400 damage, 15-second cooldown, 300 range and animation.
Its exported action now retains the authoritative use token through capture.
Only the slam records damage/hit count. Capture preserves the existing combo,
extension points and control deadline; interruption, death and reset release it.

Soft status rendering uses two lazy cached textures and ten fixed ice fragment
templates, with bounded effect lifetimes. It adds no full-screen flash or live
blur. The stable skill HUD from 5.1 remains unchanged.

Validation: all 32 Node test groups pass, including stack cap, duplicate expiry,
captured scaling/mitigation, true-combo gaps, five-hit popup, single shatter,
Mox N1-to-R capture/slam accounting, reset cleanup and host/guest snapshots.
Existing frame-rate and input regressions also pass. Browser sandbox verified
Soulblade R landing and the bleed indicator. Cached status rendering was checked
separately. Physical iPhone performance and real Internet latency remain untested.
