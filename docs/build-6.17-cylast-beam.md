# Build 6.17 — Cylast 600 speed and visible beam

Normal frost projectile velocity is now 600 world units/second in the shared combat config and legacy fallback (previously 400). Damage/range/CC/cooldowns unchanged.

Root cause of the invisible frozen-target beam: drawEffect handled frostLink, but the arena dispatcher routed every frost-prefixed effect to CylastVisual.effect, which only handles frostMuzzle/frostBurst. Added a shared drawArenaEffect dispatcher used by the real arena loop, routing frostLink to its actual drawing function.

Beam now uses a 32px outer halo, 16px blue body and 6px white core, with round caps. Lifetime 0.4s, solid first 40%, then smooth fade. Three straight strokes, no blur/particles or per-frame allocation. Existing single authoritative hit and shatter behavior retained. Online version gate 77 prevents mixing clients with the invisible old beam.

Validation extends actual Cylast test context with a real raster canvas, calls the exact arena dispatcher and verifies >=32 visible pixel rows, solid core alpha >240, and fully transparent end. This catches the previous routing regression. Speed assertion updated to 600. Existing own/foreign/expired freeze, one hit/shatter bonus and combo tests retained. Full suite result reported at delivery; no physical-device FPS claim.
