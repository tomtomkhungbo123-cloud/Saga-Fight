# Melanta6.6

Q locks the target's ground X at activation when alive and within the existing565 effective distance (375reach+190radius). Faces chosen target. Outside range uses original forward375point. NativeqTip and authoritative impact share serialized impactX. Lock is not guaranteed damage: actual target location is checked at0.72s against radius190; teleport out avoids it. Windup/recovery/radius/damage unchanged.

W/E have damage armor: ordinary damage/hitstun and generic impact knockback do not interrupt or displace the active skill. HP still decreases. Explicit active control (freeze/stun/grab) retains its own handling; existing Q/R full control immunity unchanged. Eforwarddistance400, existing airbornegravity/airTimeguard preserved.

R65per actual hit, healing10per successful damaging contact, cap13contacts, so845base/130healing maximum before modifiers andHPcaps. Existing common damage andhitmeter commit path retained; each real contact recorded, misses/duplicates/zeroHPdamage notcounted, overkill limited. No independent hitcounter or forcedfalsecombo added. Native old labengine remains reference-only; arenaadapter is runningdamage source. Pauseguide andcache updated. Onlineversion66 requires both peersreload.

58Nodeentriespass. Addedtests: close-targetQlocks real/nativeblade samepoint; Thunderteleportavoidsimpact; outofrangefallback; W/E take100HPwithoutinterruption/hitstun/knock; E400bothdirections; R13confirmedmetercommits totaling845/heal130; lethalRtwoactualcontacts cap100HPandhealonlytofull. Existingstatus/render/comboscales/onlinehostguest regressions retained. No physicalmobile/realWiFiacceptance run this turn.

Checkpoint29cd4533 / checkpoint-before-melanta-6.6.
