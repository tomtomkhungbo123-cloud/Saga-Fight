# Hover ground shadows

Add a shared cached shadow for Thunder Stance, Cylast and Aether. Apply it in the lobby summary, fighter picker and account portrait, and in combat beneath the actor's supporting ground/platform. Height above the support surface reduces shadow size/opacity; the model's idle bob does not move the shadow off the surface. Preview shadows use a restrained illuminated rim so the dark core remains legible on dark cards.

Cylast's hard in-model ellipse and Aether's separate ellipse are replaced by the shared wrapper. Thunder's previous combat ellipse is replaced without adding a second shadow. Other fighters keep their current rendering. The two 160x48 textures are baked once and reused: no runtime canvas blur or per-frame gradient allocation. Collision, skills, timing, camera and Online simulation revision are unchanged.

Validation: raster alpha and bounds, support-plane placement and height response, draw state restoration, exactly two texture allocations across repeated calls, caller coverage for all hover actors/previews, original Cylast geometry/VFX checks with only the old shadow statement normalized out, fighter-size/muzzle regressions, main release checks and browser summary/picker visual smoke. Real-device FPS was not measured.
