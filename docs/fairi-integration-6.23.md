# Fairi — Saga Fight 6.23

Native integration of Fairi Lab 1.22. The Lab engine, RAF, input, dummy, HP and damage loop are not loaded. Rendering/motion helpers are reused; combat runs in Saga's existing fixed 120 Hz loop. Source opening base: f4c71ac7ffe3ecb608b5e2e9dce252ce62feb205. Render export merges the current Fairi source with the symmetric rollback netcode from Render 6.22.5.

## Configuration

`web/fairi/combat.js` exposes `FairiCombat.C`; native normal/cancel rules are in `SagaCombatConfig`.

- 900 HP, run 330; stealth speed 462 (×1.4). Native gravity/platforms/double jump/input buffer.
- N1/N2/N3: base 38 each, reach 125, 0.36/0.38/0.48s; native hit-confirm, scaling, combo budget and N3 termination apply.
- Q: 65, dash 340/0.22s, three charges, 0.8s repeat lockout, independent 2.5s refill.
- W: fade 0.5s, stealth 4s, CC immunity during stealth, ambush 200/range650. No self-stun. Cooldown6 starts on reveal/end. Offensive casts reveal; only a normal triggers ambush.
- E: four500HP clones, four seconds, no health bars. Seeded1:3/3:1 split and bounded fake skill cadence; fake Q numbers are cosmetic and cannot change HP, combo, meter or KO. Cooldown9 starts when the last clone disappears. Damage does not interrupt E.
- R: windup0.5, impact0.78, recovery ends1.05; range650/CD12. Solo150 or60 per captured participant (maximum5/300). Respects native CC/invulnerability checks, consumes clones and releases native grab state on completion, cancellation or KO.

## Integration

- Roster, skill help, HP/charge/active HUD and touch controls use the existing menu/input path.
- Hit IDs, damage, shields, hit meter, hit-confirm, scaling and KO use the arena functions. Clone collisions feed a decoy HP resolver; they never enter player damage accounting. Arena/Mox projectiles, common melee/AoE, Thunder stomp and Cylast zones support decoys.
- No audio context or volume slider is added. Existing sword/blink/cast cues go through Saga's audio bus. These are reused cues, not a bespoke Fairi recording pack.
- Graphics low/high selects the visual budget. Shared prewarmed R pose/ring/lance caches stay out of snapshots. Compact timed mist events and gameplay clone state are synchronized, never particle arrays.
- Both clients run the same deterministic 120 Hz rollback simulation. Protocol87 and matching build stamps reject mixed releases. Clone gameplay state is captured with the full fighter graph. Integer hashing drives clone decisions; visual caches remain outside snapshots.
- PvE uses native tactical controller with Fairi ranges/style; invisible Fairi is not continuously tracked. The controller can choose decoys without perfect real/clone identification.
- Generic finish sequence only; custom cinematic remains unspecified.

## Verification

Native Fairi tests cover charge replenishment, W ambush200/no self-stun, post-effect CDs, E500HP/death/no owner damage, R150/300, noninterruption, snapshots, Hell AI, actual canvas E/R, free-cooldown lifetime and reset. Two-client transport test covers roster selection, host E→R300, client HP/state convergence, clone consumption, prediction damage rejection and KO replication. Existing regression suite covers other characters, combat, audio, graphics, iOS controls and transport.

Browser QA on the actual main-game preview: roster→Fairi, sandbox model/terrain, E→R ring/mist/clones, reset, HUD3/3, touch W active, no game-origin console errors. Device-specific iOS rendering/audio and real two-device Wi-Fi RTT/FPS were not measured; simulated two-client transport checks are not a real-network performance guarantee.
