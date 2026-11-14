# Melanta6.3

Q/R now reject incoming control through existing canControl authority predicate for the exact lifetime of the active skill, including Rplunge. Does not cleanse already-applied CC or prevent damage. Ends automatically on natural completion, cancellation/death/reset. Pause guide updated.

HealingVFX: native mark timestamps belong to Melanta's local animation clock; translate since/lastAt/until to arena clock during binding. This fixes effects disappearing after time has elapsed in menus/prior rounds. Only real healing when below maximumHP creates the existing mist/+number effect; fullHP and misses still do not fabricate healing.

QMist: save caster identity and actual stun start only after authoritative stun applies; renderer uses real expiry and start, frontmist now painted after target silhouette so it is not hidden. No mist from blocked/stun-immune hit. Existing stun/control budget unchanged.

Slope gait: bind true grounded state into native pose/walk calculations; retain committed weapon coordinateframe during normals; short terrain steps followground in Melanta movement, preserving jump/drop/scriptedskills. Removes false airtime from a fewunits slope difference.

Validation55Nodeentries pass, including Q/Rimmunity duringcast and expiry, Rplunge, damage stillreceived, Qmist tag/timestamps, healclock afterarena100seconds, slopeground continuity and gaitweight. Existing54regressions retained. NativeCanvas tests draw effects; physicalmobile and actualPvPdevices notverified. No othercharacter tuning,damage,cooldown,particle-density change.

Checkpoint bfe565f1 / checkpoint-before-melanta-6.3.
