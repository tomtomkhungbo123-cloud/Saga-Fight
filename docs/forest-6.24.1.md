# Rừng tiên linh 6.24.1

Camera derives its visible height from the actual canvas aspect ratio and fills the entire canvas width with no horizontal letterboxing. Its world bounds remain clamped independently of the viewer's screen, and local PvP still expands to show both fighters.

Fairi Q shadows interpolate along the authoritative dash endpoint, including shortened dashes at arena edges. Its fading ribbon stays at that endpoint. E clone physics, dodge/roam bounds and Q direction decisions use the room arena bounds. R clone formation uses the same arena bounds. Visual actions carry a small numeric bounds record; no canvas or texture objects enter network state.

Validation: 76 tests passed, 0 failed. New regression checks cover multiple viewport ratios and camera edges, Q trail endpoints, opaque body raster consistency between both halves of the forest, clone movement on both arenas, and R formation translation. Browser QA verified forest coverage at left/right and Fairi on the right side. Existing room/network tests passed; physical two-device LAN testing remains unverified.
