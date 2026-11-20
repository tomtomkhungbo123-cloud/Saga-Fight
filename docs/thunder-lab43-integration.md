# Thunder Stance lab 43 integration

Sources: Thunder lab version 43 at a42ca0dcf49ed1d612286f208deac07256ef643c; separate item lab version 3 at e362129571f6915c29bb2368f6ec24eb024ce44a. Main baseline a144b66e346925fe77b5bc97f71f1b4e4fe7d810.

Integrated reference contours and alpha atlases for normal, W and R, continuous Q orb, E lightning from the original torso position to the final torso position behind fighters. Damage, cooldowns, instant Q and movement remain unchanged. Existing six Thunder audio files already match the source byte-for-byte.

Jade and Sét tử linh retain owner-scoped body/effect palettes. Native source-in tint caches replace first-cast per-pixel atlas recoloring; Path2D caches prevent rebuilding contour geometry each frame. Other fighter palettes keep their existing image pipeline. The standalone item lab remains separate.

Online simulation revision: 6360-thunder43. New clients reject incompatible old simulation revisions.

Validation: full suite 202 pass / 3 pre-existing failures (legacy Thunder cloth/pose fixtures); native alpha rendering checks cover normal/Q/W/E/R in both skins with no extra warm-cache allocations; DIRECT/WS Thunder rollback and four-skin palette tests pass. Build includes all six new VFX assets. Browser and physical iOS performance were not verified in this environment.
