# Soulblade Lab 58 and item lab 4

Sources: Soulblade standalone version 58 / lab 3.39, d59716142cf45fc5bdb1152e397fe48c506f3f5f; item lab version 4, 0dcd61dc4eb88d4fafc0006485887e26d0457430. Main baseline: Site 129, 8b7860f2130f12c93d96238136ea143494eae14a.

Integrated shared approved weapon colors; four cached solid liquid Q sheets, optional cached halo and a simulation-owned final afterimage; W destination slash reusing Q geometry without delaying follow-up actions; 28 cached vector R/bleed breakup frames, soft pressure light instead of stroked rings, and 70% bleed burst visual scale. Skin effect contexts are preserved from the item lab for Tử Tinh Kiếm, including vector bodies and cached glow images. The standalone differs from the item renderer only in effect-context plumbing. No new catalog item or price change is present in item lab 4. Both labs remain separate.

The approved body/blade geometry and all 15 Soulblade WAV files match the existing game. Damage, ranges, cooldowns, Q contact attempts, E persistence, W immediate follow-up, audio and bleed stack calculation are unchanged. Online simulation revision 6360-soul58 carries the new visual-tail fields and W event type; both peers must reload.

Verification: 19 relevant tests pass, including native Q/R contours, no per-frame path/canvas creation, hollow/solid liquid geometry, 60/120 Hz afterimage cleanup, read-only rendering, source-owned amethyst Q/W/R/bleed colors, all four shop skin renderers, Soulblade and Thunder DIRECT/WS convergence, Supabase inventory cutover/outage and shop regression. Build contains 167 browser assets. Browser smoke selected Soulblade and entered Sandbox; Q registered four contacts. The cloud browser ran slowly and physical iPhone/iPad FPS was not measured. A Sandbox screenshot is retained under docs/qa.

Inventory/account schemas, Supabase runtime secret, migration mode and existing ownership are untouched by this update.
