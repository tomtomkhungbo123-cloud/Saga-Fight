# Melanta E disappearance repair — 6.2

Checkpoint317d24d / checkpoint-before-melanta-6.2.

Reproduced root cause: the arena adapter omitted E.airTime while the native airborne pose interpolator used it unconditionally. An airborne E produced NaN pose/rope coordinates, poisoning persistent spring state and subsequent normal rendering. New regression failed against6.1 with `nonfinite rope`, not just an inferred symptom.

Fixes: initialize airTime from arena vertical velocity, height and gravity1900 (same frame of reference); render fallback for older snapshots missing the field; rebuild corrupted cached rig/afterimages/pose state before drawing. No damage/cooldown/hitbox or visual asset changes.

Movement: no sand-zone/friction system exists in source. Removed residual ground horizontal velocity when movement input is released, across the arena. Air momentum, knockback velocity and scripted skills remain independent.

Validation:54 Node test entries passed. New native Canvas regression covers jump→E→normals for both directions and mirror/nonmirror, explicit missing-airTime snapshots, every-frame finite rope/pose checks, immediate ground stop and retained air momentum. Existing fullscene2400steps andcombat/network regressions pass. Browser preview mirror Melanta used jump/E/normal inputs; both fighters, weapons and E afterimages remained visible. Original6.1 renderer fails the same missing-field regression. Physical iOS/Android not available; no hardware FPS claim.
