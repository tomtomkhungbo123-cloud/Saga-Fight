# Equipped skin effect colors

Integrates item-lab v2 (d1774346fdf2eccc3b9cb81080039dc45973a05b) into the existing account-backed shop. The separate item lab is not included.

Lôi Ảnh Ngọc uses jade effects, Sét tử linh deep crimson, Tử Tinh Kiếm amethyst and Kim Sương amber. Body and effect palettes are separate; white cores and sprite alpha remain intact. Effect ownership routes projectiles, hit effects, bleed, lightning and frost to the equipped skin of their source fighter, including Online room loadouts. Sprite recolors and color/context lookups are cached; Cylast prewarms its Q atlas.

No changes to prices, combat tuning, cooldowns or account balances. Existing shop purchase/equip rules and server-validated cosmetic snapshots remain in place. Update the full web directory and worker/shop.mjs together. Render's existing server/auth configuration is retained; its local database migration runner applies drizzle/0004_scoin_shop.sql.

Validation: all four palettes preserve white/black, alpha and sprite cache identity. Native Canvas renders normals and Q/W/E/R for all four skins without changing packed gameplay state relative to the default palette. Shop account, purchase/equip, reward and Online loadout tests pass. Shared hover-shadow and native Cylast geometry checks pass. Full regression run: 186 pass, three pre-existing failures also reproduced on the unmodified source (old Thunder cloth fixtures and a stale pose/render expectation). Physical iPhone/iPad FPS has not been measured.
